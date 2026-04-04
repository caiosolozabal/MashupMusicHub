
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, FileText, UploadCloud, Link as LinkIcon, X, Search } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, getDayOfWeek } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import type { Event, EventFile, UserDetails } from '@/lib/types';
import { Timestamp, doc, updateDoc, arrayUnion, serverTimestamp, collection, query, where, getDocs, orderBy, getDoc } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect, useMemo } from 'react';
import { db, storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/hooks/useAuth';
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Textarea } from '../ui/textarea';


const eventFormSchema = z.object({
  nome_evento: z.string().min(3, { message: 'Nome do evento deve ter pelo menos 3 caracteres.' }),
  local: z.string().min(3, { message: 'Local deve ter pelo menos 3 caracteres.' }),
  data_evento: z.date({ required_error: 'Data do evento é obrigatória.' }),
  horario_inicio: z.string().optional().nullable(),
  horario_fim: z.string().optional().nullable(),
  contratante_nome: z.string().min(3, { message: 'Nome do contratante deve ter pelo menos 3 caracteres.' }),
  contratante_contato: z.string().optional().nullable(),
  valor_total: z.coerce.number().positive({ message: 'Valor total deve ser positivo.' }),
  valor_sinal: z.coerce.number().min(0, { message: 'Valor do sinal não pode ser negativo.' }),
  conta_que_recebeu: z.enum(['agencia', 'dj'], { required_error: 'Selecione quem recebeu o sinal.' }),
  status_pagamento: z.enum(['pendente', 'parcial', 'pago', 'vencido', 'cancelado'], { required_error: 'Status do pagamento é obrigatório.' }),
  tipo_servico: z.enum(['servico_dj', 'locacao_equipamento'], { required_error: 'O tipo de serviço é obrigatório.'}),
  dj_nome: z.string().min(2, { message: 'Nome do prestador é obrigatório.' }),
  dj_id: z.string().min(1, { message: 'ID do prestador é obrigatório.' }),
  dj_costs: z.coerce.number().min(0, { message: 'Custos não podem ser negativos.' }).default(0).optional(),
  linkedEventId: z.string().optional().nullable(),
  linkedEventName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  event?: Event | null;
  onSubmit: (values: EventFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  onSuccessfulProofUpload?: (updatedEvent: Event) => void;
}

export default function EventForm({ event, onSubmit, onCancel, isLoading, onSuccessfulProofUpload }: EventFormProps) {
  const { toast } = useToast();
  const { user, userDetails } = useAuth();
  const [selectedProofFile, setSelectedProofFile] = useState<File | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [availableDjs, setAvailableDjs] = useState<UserDetails[]>([]);
  const [isLoadingDjs, setIsLoadingDjs] = useState(false);

  // For event linking
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Event[]>([]);
  const [isSearching, setIsSearching] = useState(false);


  const isUserAdminOrPartner = userDetails?.role === 'admin' || userDetails?.role === 'partner';
  const canUserCreateRental = isUserAdminOrPartner || (userDetails?.role === 'dj' && userDetails?.pode_locar);

  useEffect(() => {
    const fetchDjs = async () => {
      if (isUserAdminOrPartner && db) {
        setIsLoadingDjs(true);
        try {
          // Busca todos os usuários que têm permissão de prestador
          const djsQuery = query(collection(db, 'users'), where('role', '==', 'dj'));
          const querySnapshot = await getDocs(djsQuery);
          const djsList = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserDetails));
          setAvailableDjs(djsList);
        } catch (error) {
          console.error("Error fetching DJs: ", error);
          toast({ variant: 'destructive', title: 'Erro ao buscar prestadores' });
        } finally {
          setIsLoadingDjs(false);
        }
      }
    };
    fetchDjs();
  }, [isUserAdminOrPartner, toast]);
  
  const defaultValuesForCreate = useMemo<EventFormValues>(() => ({
    nome_evento: '',
    local: '',
    data_evento: undefined as any, 
    horario_inicio: '',
    horario_fim: '',
    contratante_nome: '',
    contratante_contato: '',
    valor_total: 0,
    valor_sinal: 0,
    conta_que_recebeu: 'agencia',
    status_pagamento: 'pendente',
    tipo_servico: 'servico_dj',
    dj_nome: (userDetails?.role === 'dj' ? userDetails.displayName || '' : ''),
    dj_id: (userDetails?.role === 'dj' ? userDetails.uid : ''),
    dj_costs: 0,
    linkedEventId: null,
    linkedEventName: null,
    notes: '',
  }), [userDetails]);


  const defaultValues = useMemo<EventFormValues>(() => {
    if (event) {
      let eventDate = event.data_evento;
      if (event.data_evento instanceof Timestamp) {
        eventDate = event.data_evento.toDate();
      } else if (typeof event.data_evento === 'string') {
        eventDate = parseISO(event.data_evento);
      }

      return {
        ...event,
        nome_evento: event.nome_evento || '',
        local: event.local || '',
        data_evento: eventDate as Date,
        horario_inicio: event.horario_inicio ?? '',
        horario_fim: event.horario_fim ?? '',
        contratante_nome: event.contratante_nome || '',
        contratante_contato: event.contratante_contato ?? '',
        valor_total: Number(event.valor_total),
        valor_sinal: Number(event.valor_sinal),
        conta_que_recebeu: event.conta_que_recebeu || 'agencia',
        status_pagamento: event.status_pagamento || 'pendente',
        tipo_servico: event.tipo_servico || 'servico_dj',
        dj_nome: event.dj_nome || '',
        dj_id: event.dj_id || '',
        dj_costs: event.dj_costs ? Number(event.dj_costs) : 0,
        linkedEventId: event.linkedEventId ?? null,
        linkedEventName: event.linkedEventName ?? null,
        notes: event.notes ?? '',
      };
    }
    return defaultValuesForCreate;
  }, [event, defaultValuesForCreate]);


  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues, 
  });

  useEffect(() => {
    form.reset(defaultValues);
    if (!canUserCreateRental) {
      form.setValue('tipo_servico', 'servico_dj');
    }
  }, [defaultValues, form, canUserCreateRental]);

  useEffect(() => {
      const handleSearch = async () => {
          if (searchQuery.length < 3 || !db) {
              setSearchResults([]);
              return;
          }
          setIsSearching(true);
          try {
              const eventsRef = collection(db, "events");
              const q = query(eventsRef, orderBy('data_evento', 'desc'));

              const querySnapshot = await getDocs(q);
              const allEvents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), data_evento: doc.data().data_evento.toDate() } as Event));

              const lowerCaseQuery = searchQuery.toLowerCase();
              let results = allEvents.filter(e => 
                e.nome_evento.toLowerCase().includes(lowerCaseQuery) && 
                e.id !== event?.id
              );

              if(form.getValues('linkedEventId')) {
                results = results.filter(e => e.id !== form.getValues('linkedEventId'))
              }

              setSearchResults(results);
          } catch (error) {
              console.error("Error searching events:", error);
          } finally {
              setIsSearching(false);
          }
      };

      const debounceSearch = setTimeout(() => {
          handleSearch();
      }, 300);

      return () => clearTimeout(debounceSearch);
  }, [searchQuery, event?.id, toast, form]);


  const handleSubmit = async (values: EventFormValues) => {
    if (values.linkedEventId && event?.id) {
        const otherEventRef = doc(db, 'events', values.linkedEventId);
        await updateDoc(otherEventRef, {
            linkedEventId: event.id,
            linkedEventName: values.nome_evento
        });
    } else if (!values.linkedEventId && event?.linkedEventId) {
        const otherEventRef = doc(db, 'events', event.linkedEventId);
        const otherEventSnap = await getDoc(otherEventRef);
        if(otherEventSnap.exists() && otherEventSnap.data().linkedEventId === event.id) {
            await updateDoc(otherEventRef, {
                linkedEventId: null,
                linkedEventName: null
            });
        }
    }

    const submissionValues = {
      ...values,
      horario_inicio: values.horario_inicio === '' ? null : values.horario_inicio,
      horario_fim: values.horario_fim === '' ? null : values.horario_fim,
      contratante_contato: values.contratante_contato === '' ? null : values.contratante_contato,
      dj_costs: values.dj_costs ? Number(values.dj_costs) : 0,
    };
    await onSubmit(submissionValues);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedProofFile(e.target.files[0]);
    } else {
      setSelectedProofFile(null);
    }
  };

 const handleProofUpload = async () => {
    if (!selectedProofFile || !event?.id || !storage || !db) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Salve o evento primeiro.' });
      return;
    }

    setIsUploadingProof(true);
    const proofId = uuidv4();
    const fileName = `${proofId}-${selectedProofFile.name}`;
    const filePath = `events/${event.id}/payment_proofs/${fileName}`;
    const fileSRef = storageRef(storage, filePath);

    try {
      const uploadTask = uploadBytesResumable(fileSRef, selectedProofFile);
      uploadTask.on('state_changed',
        null,
        (error) => { 
          toast({ variant: 'destructive', title: 'Falha no Upload', description: error.message });
          setIsUploadingProof(false);
        },
        async () => { 
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            const newProofData: EventFile = {
              id: proofId,
              name: selectedProofFile.name,
              url: downloadURL,
              type: 'dj_receipt', 
              uploadedAt: new Date(), 
            };

            const eventRef = doc(db, 'events', event.id!);
            await updateDoc(eventRef, {
              payment_proofs: arrayUnion(newProofData),
              updated_at: serverTimestamp(),
            });
            
            toast({ title: 'Comprovante Enviado!' });
            setSelectedProofFile(null); 
            
            if (onSuccessfulProofUpload) {
              const updatedEventWithNewProof: Event = {
                ...event, 
                payment_proofs: [...(event.payment_proofs || []), newProofData],
                updated_at: new Date() 
              };
              onSuccessfulProofUpload(updatedEventWithNewProof);
            }
          } catch (firestoreError: any) {
            toast({ variant: 'destructive', title: 'Erro ao Salvar Comprovante' });
          } finally {
            setIsUploadingProof(false);
          }
        }
      );
    } catch (initialError: any) { 
      setIsUploadingProof(false);
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nome_evento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Evento</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Festa de Aniversário" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="local"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Local</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Salão XYZ" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
       {canUserCreateRental ? (
          <FormField
            control={form.control}
            name="tipo_servico"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Serviço</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de serviço" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="servico_dj">Serviço de DJ/Profissional</SelectItem>
                    <SelectItem value="locacao_equipamento">Locação de Equipamento</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
             <FormField
                control={form.control}
                name="tipo_servico"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Serviço</FormLabel>
                     <Input disabled value="Serviço de DJ/Profissional" />
                     <Input type="hidden" {...field} value="servico_dj" />
                     <FormMessage />
                  </FormItem>
                )}
              />
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
            control={form.control}
            name="data_evento"
            render={({ field }) => (
                <FormItem className="flex flex-col md:col-span-2">
                <FormLabel>Data do Evento</FormLabel>
                <Popover modal={true}>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant={'outline'}
                        className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                        )}
                        >
                        {field.value ? (
                            format(field.value, 'dd/MM/yyyy')
                        ) : (
                            <span>Escolha uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => field.onChange(date)}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
                {field.value && <FormDescription>Dia da semana: {getDayOfWeek(field.value)}</FormDescription>}
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
              control={form.control}
              name="horario_inicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário Início</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contratante_nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Contratante</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: João Silva" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contratante_contato"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contato do Contratante</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: (21) 99999-9999" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Anotações do Evento</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Instruções para o prestador, cronograma, etc."
                  className="resize-y"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Separator />

         <div>
          <h3 className="text-lg font-medium mb-4">Vincular Evento</h3>
           <Controller
              name="linkedEventId"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  {field.value && form.getValues('linkedEventName') ? (
                     <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                        <div className="flex items-center gap-2">
                           <LinkIcon className="h-5 w-5 text-primary"/>
                           <div className="text-sm">
                              <span className="text-muted-foreground">Vinculado a: </span>
                              <span className="font-semibold">{form.getValues('linkedEventName')}</span>
                           </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                          field.onChange(null);
                          form.setValue('linkedEventName', null);
                        }}>
                           <X className="h-4 w-4"/>
                        </Button>
                     </div>
                  ) : (
                    <Command shouldFilter={false} className="overflow-visible">
                        <div className="flex items-center border rounded-md px-2 focus-within:ring-2 focus-within:ring-ring">
                           <Search className="h-4 w-4 shrink-0 opacity-50 mr-1"/>
                            <CommandInput 
                              value={searchQuery}
                              onValueChange={setSearchQuery}
                              placeholder="Buscar evento para vincular..."
                              className="border-0 h-9 px-1 focus:ring-0"
                            />
                        </div>
                      <CommandList>
                         {isSearching && <CommandItem disabled>Buscando...</CommandItem>}
                         {searchResults.length === 0 && searchQuery.length > 2 && !isSearching && <CommandItem disabled>Nenhum evento encontrado.</CommandItem>}
                        {searchResults.map((result) => (
                          <CommandItem
                            key={result.id}
                            value={result.id}
                            onSelect={() => {
                              field.onChange(result.id);
                              form.setValue('linkedEventName', result.nome_evento);
                              setSearchQuery('');
                              setSearchResults([]);
                            }}
                          >
                            <span>{result.nome_evento}</span>
                             <span className="text-xs text-muted-foreground ml-2">({format(result.data_evento instanceof Timestamp ? result.data_evento.toDate() : new Date(result.data_evento), 'dd/MM/yy')})</span>
                          </CommandItem>
                        ))}
                      </CommandList>
                    </Command>
                  )}
                </FormItem>
              )}
            />
        </div>


        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="valor_total"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Total (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="Ex: 1500.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="valor_sinal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor do Sinal (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="Ex: 500.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dj_costs"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custos Logísticos (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="Ex: 100.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="conta_que_recebeu"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sinal Recebido Por:</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="agencia">Agência</SelectItem>
                    <SelectItem value="dj">Prestador</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status_pagamento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status Financeiro (Cliente)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isUserAdminOrPartner ? (
          <FormField
            control={form.control}
            name="dj_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Atribuir Responsável</FormLabel>
                <Select
                  value={field.value || ''} 
                  onValueChange={(value) => {
                    const selectedDj = availableDjs.find(dj => dj.uid === value);
                    if (selectedDj) {
                      form.setValue('dj_id', selectedDj.uid, { shouldValidate: true });
                      form.setValue('dj_nome', selectedDj.displayName || '', { shouldValidate: true });
                    }
                  }}
                  disabled={isLoadingDjs}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingDjs ? "Carregando..." : "Selecione o profissional"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableDjs.length > 0 ? (
                      availableDjs.map((dj) => (
                        <SelectItem key={dj.uid} value={dj.uid}>
                          [{dj.professionalType || 'Prestador'}] {dj.displayName}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-djs" disabled>Nenhum prestador cadastrado</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          event?.dj_id && (
            <div className="space-y-2">
                <FormLabel>Responsável</FormLabel>
                <p className="text-sm font-bold p-2 border rounded-md bg-muted">
                    {form.getValues('dj_nome')}
                </p>
                <Input {...form.register('dj_nome')} type="hidden" />
                <Input {...form.register('dj_id')} type="hidden" />
            </div>
          )
        )}


        <Separator />

        <div>
          <h3 className="text-lg font-medium mb-2">Comprovantes</h3>
          {event?.payment_proofs && event.payment_proofs.length > 0 && (
            <ul className="space-y-2 mb-3">
              {event.payment_proofs.map((proof, index) => (
                <li key={proof.id || index} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <a href={proof.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                      {proof.name}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <FormItem>
            <div className="flex items-center gap-2">
              <FormControl>
                <Input 
                  id="payment-proof-upload" 
                  type="file" 
                  className="flex-grow" 
                  onChange={handleFileSelect}
                  accept="image/*,application/pdf"
                  disabled={isUploadingProof || !event?.id}
                /> 
              </FormControl>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleProofUpload} 
                disabled={isUploadingProof || !selectedProofFile || !event?.id}
              >
                {isUploadingProof ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                Upload
              </Button>
            </div>
             { !event?.id && <FormDescription className="text-primary font-bold">Salve o evento primeiro para habilitar o upload.</FormDescription>}
          </FormItem>
        </div>


        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || isUploadingProof}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading || isUploadingProof} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {(isLoading || isUploadingProof) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {event ? 'Salvar Alterações' : 'Criar Evento'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
