'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, PlusCircle, Trash2, Save, X, Lightbulb, Sparkles, Tag, Users } from 'lucide-react';
import type { RentalItem, RentalQuote, RentalQuoteItem, RentalQuoteStatus } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const quoteItemSchema = z.object({
  itemId: z.string(),
  nameSnapshot: z.string(),
  categorySnapshot: z.string().optional(),
  photoUrlSnapshot: z.string().url().optional().nullable(),
  qty: z.coerce.number().min(1),
  basePriceSnapshot: z.coerce.number(),
  unitPrice: z.coerce.number(),
  lineTotal: z.coerce.number(),
});

const rentalQuoteFormSchema = z.object({
  clientName: z.string().min(1, 'Nome do cliente é obrigatório.'),
  clientContact: z.string().optional(),
  eventName: z.string().optional(),
  eventDate: z.date().optional().nullable(),
  eventLocation: z.string().optional(),
  kitName: z.string().optional(),
  items: z.array(quoteItemSchema).min(1, 'O orçamento deve ter pelo menos um item.'),
  fees: z.object({
    frete: z.coerce.number().min(0).default(0),
    montagem: z.coerce.number().min(0).default(0),
    tecnico: z.coerce.number().min(0).default(0),
    outros: z.coerce.number().min(0).default(0),
  }),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

type RentalQuoteFormValues = z.infer<typeof rentalQuoteFormSchema>;

export default function RentalPage() {
  const { user, userDetails } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [catalogItems, setCatalogItems] = useState<RentalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const form = useForm<RentalQuoteFormValues>({
    resolver: zodResolver(rentalQuoteFormSchema),
    defaultValues: {
      clientName: '',
      items: [],
      fees: { frete: 0, montagem: 0, tecnico: 0, outros: 0 },
      discount: 0,
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Fetch catalog items
  useEffect(() => {
    const fetchItems = async () => {
      if (userDetails?.role !== 'admin' && userDetails?.role !== 'partner') {
          toast({ variant: 'destructive', title: 'Acesso Negado' });
          router.push('/dashboard');
          return;
      }
      setIsLoading(true);
      try {
        const itemsQuery = query(collection(db, 'rental_items'), where('isActive', '==', true), orderBy('category'), orderBy('name'));
        const querySnapshot = await getDocs(itemsQuery);
        const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RentalItem));
        setCatalogItems(items);
      } catch (error) {
        console.error("Error fetching rental items:", error);
        toast({ variant: 'destructive', title: 'Erro ao carregar catálogo', description: (error as Error).message });
      } finally {
        setIsLoading(false);
      }
    };
    if(userDetails) fetchItems();
  }, [userDetails, toast, router]);

  const categories = useMemo(() => {
    const cats = new Set(catalogItems.map(item => item.category));
    return ['all', ...Array.from(cats)];
  }, [catalogItems]);

  const filteredItems = useMemo(() => {
    return catalogItems.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = searchTerm === '' || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
      return matchesCategory && matchesSearch;
    });
  }, [catalogItems, selectedCategory, searchTerm]);

  const handleAddItem = (item: RentalItem) => {
    const existingItemIndex = fields.findIndex(cartItem => cartItem.itemId === item.id);
    if (existingItemIndex > -1) {
      const existingItem = fields[existingItemIndex];
      update(existingItemIndex, { ...existingItem, qty: existingItem.qty + 1 });
    } else {
      append({
        itemId: item.id,
        nameSnapshot: item.name,
        categorySnapshot: item.category,
        photoUrlSnapshot: item.photoUrl,
        qty: 1,
        basePriceSnapshot: item.basePrice,
        unitPrice: item.basePrice,
        lineTotal: item.basePrice, // Will be updated by watch
      });
    }
  };

  const handleRemoveItem = (index: number) => {
    remove(index);
  };
  
  const watchedItems = form.watch('items');
  const watchedFees = form.watch('fees');
  const watchedDiscount = form.watch('discount');

  const totals = useMemo(() => {
    const itemsSubtotal = watchedItems.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
    const feesTotal = Object.values(watchedFees).reduce((sum, fee) => sum + fee, 0);
    const discountTotal = watchedDiscount;
    const grandTotal = itemsSubtotal + feesTotal - discountTotal;
    return { itemsSubtotal, feesTotal, discountTotal, grandTotal };
  }, [watchedItems, watchedFees, watchedDiscount]);


  // Suggestion Engine
  const capacitySummary = useMemo(() => {
    if (!watchedItems || watchedItems.length === 0) {
      return null;
    }
    let people = 0;
    let score = 0;
    let eonCount = 0;
    let prxCount = 0;
    let subCount = 0;
    let topCount = 0;

    watchedItems.forEach(item => {
      const catalogItem = catalogItems.find(ci => ci.id === item.itemId);
      if (catalogItem?.recommendedPeople) {
        people += (catalogItem.recommendedPeople * item.qty);
      }
      if (catalogItem?.soundScore) {
        score += (catalogItem.soundScore * item.qty);
      }
      if (catalogItem?.name.toLowerCase().includes('eon')) eonCount += item.qty;
      if (catalogItem?.name.toLowerCase().includes('prx')) prxCount += item.qty;
      if (catalogItem?.category.toLowerCase() === 'subwoofers') subCount += item.qty;
      if (catalogItem?.category.toLowerCase() === 'caixas de som') topCount += item.qty;

    });

    if (score > 10) return `🔊 Sistema de grande porte, ideal para mais de ${Math.max(150, people)} pessoas.`;
    if (topCount >= 2 && subCount >= 1) return `🔊 Kit robusto para até ${Math.max(100, people)} pessoas com bom grave.`;
    if (prxCount > 0) return `🔊 Sistema de som profissional para até ${Math.max(40 * prxCount, people)} pessoas.`;
    if (eonCount > 0) return `🔊 Som ambiente de qualidade para até ${Math.max(30 * eonCount, people)} pessoas.`;
    if (people > 0) return `👥 Capacidade estimada para aproximadamente ${people} pessoas.`;

    return 'ℹ️ Não há informações suficientes para uma sugestão de capacidade.';

  }, [watchedItems, catalogItems]);


  const handleSaveQuote = async (status: RentalQuoteStatus) => {
    const result = await form.trigger();
    if (!result) {
      toast({ variant: 'destructive', title: 'Verifique os campos', description: 'Preencha as informações obrigatórias para salvar.' });
      return;
    }
    
    setIsSaving(true);
    const values = form.getValues();

    const quoteData: Omit<RentalQuote, 'id'| 'createdAt' | 'updatedAt'> = {
      createdBy: user?.uid!,
      createdByName: userDetails?.displayName || user?.email || 'N/A',
      status: status,
      clientName: values.clientName,
      clientContact: values.clientContact,
      eventName: values.eventName,
      eventDate: values.eventDate ? serverTimestamp.fromDate(values.eventDate) : null,
      eventLocation: values.eventLocation,
      kitName: values.kitName,
      items: values.items.map(item => ({ ...item, lineTotal: item.qty * item.unitPrice })),
      fees: values.fees,
      discount: values.discount,
      totals: {
        itemsSubtotal: totals.itemsSubtotal,
        feesTotal: totals.feesTotal,
        discountTotal: totals.discountTotal,
        grandTotal: totals.grandTotal,
      },
      capacitySummary: capacitySummary,
      notes: values.notes,
    };

    try {
      const docRef = await addDoc(collection(db, 'rental_quotes'), {
          ...quoteData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
      });
      toast({ title: 'Orçamento Salvo!', description: `O orçamento para ${values.clientName} foi salvo com sucesso.`});
      router.push(`/rental/${docRef.id}`);
    } catch (error) {
      console.error("Error saving quote:", error);
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: (error as Error).message });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <form>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Coluna do Catálogo */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Catálogo de Itens</CardTitle>
            <Input
              placeholder="Buscar item ou tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {/* Filtro de Categoria pode ser adicionado aqui */}
          </CardHeader>
          <CardContent className="max-h-[70vh] overflow-y-auto">
            {filteredItems.length > 0 ? (
              <div className="space-y-3">
                {filteredItems.map(item => (
                  <div key={item.id} className="flex items-center gap-4 p-2 border rounded-md hover:bg-muted/50">
                    {item.photoUrl && (
                      <Image src={item.photoUrl} alt={item.name} width={50} height={50} className="rounded-md object-cover" />
                    )}
                    <div className="flex-grow">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.basePrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <Button type="button" size="icon" variant="outline" onClick={() => handleAddItem(item)}>
                      <PlusCircle className="h-5 w-5 text-primary" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center">Nenhum item encontrado.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coluna do Orçamento */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Montagem do Orçamento</CardTitle>
            <CardDescription>Adicione itens do catálogo e preencha os detalhes abaixo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 p-4 border rounded-md">
              <h3 className="font-semibold">Informações do Cliente e Evento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Input placeholder="Nome do Cliente *" {...form.register('clientName')} className={form.formState.errors.clientName ? 'border-destructive' : ''}/>
                 <Input placeholder="Contato (Telefone/Email)" {...form.register('clientContact')} />
                 <Input placeholder="Nome do Evento (Opcional)" {...form.register('eventName')} />
                 <Controller
                    control={form.control}
                    name="eventDate"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn('justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'dd/MM/yyyy') : <span>Data do Evento</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                      </Popover>
                    )}
                  />
                 <Input placeholder="Local do Evento" {...form.register('eventLocation')} />
                 <Input placeholder="Nome do Kit (Ex: Kit Festa 100)" {...form.register('kitName')} />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Itens no Orçamento</h3>
              {fields.length === 0 ? (
                <p className="text-muted-foreground text-sm p-4 text-center bg-muted/50 rounded-md">O carrinho está vazio.</p>
              ) : (
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2 p-2 border rounded-md">
                      <div className="flex-grow space-y-1">
                        <p className="font-semibold">{field.nameSnapshot}</p>
                        <div className="flex items-center gap-2">
                          <Input type="number" min="1" className="h-8 w-20" {...form.register(`items.${index}.qty`)} />
                          <span className="text-muted-foreground text-sm">x</span>
                          <Input type="number" step="0.01" className="h-8 w-28" {...form.register(`items.${index}.unitPrice`)} />
                           <span className="text-sm font-medium w-32 text-right">
                              = {(form.watch(`items.${index}.qty`) * form.watch(`items.${index}.unitPrice`)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      </div>
                      <Button type="button" size="icon" variant="ghost" onClick={() => handleRemoveItem(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {capacitySummary && (
                <Alert className="bg-primary/5 border-primary/20">
                    <Sparkles className="h-4 w-4 text-primary/80" />
                    <AlertTitle className="text-primary font-semibold">Sugestão do Sistema</AlertTitle>
                    <AlertDescription className="text-primary/90">
                       {capacitySummary}
                    </AlertDescription>
                </Alert>
            )}

            <div className="space-y-4 p-4 border rounded-md">
              <h3 className="font-semibold">Taxas e Descontos</h3>
               <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Input type="number" placeholder="Frete" {...form.register('fees.frete')} />
                    <Input type="number" placeholder="Montagem" {...form.register('fees.montagem')} />
                    <Input type="number" placeholder="Técnico" {...form.register('fees.tecnico')} />
                    <Input type="number" placeholder="Outros" {...form.register('fees.outros')} />
                    <Input type="number" placeholder="Desconto (-)" {...form.register('discount')} className="border-green-500" />
               </div>
            </div>

            <Textarea placeholder="Observações e notas adicionais para o orçamento..." {...form.register('notes')} />

            <Separator />
            <div className="space-y-2 text-right">
              <p>Subtotal Itens: <span className="font-semibold">{totals.itemsSubtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
              <p>Total Taxas: <span className="font-semibold">{totals.feesTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
              <p className="text-green-600">Desconto: <span className="font-semibold">-{totals.discountTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
              <Separator className="my-2"/>
              <p className="text-xl font-bold">Total Final: <span className="text-primary">{totals.grandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
            </div>

            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => form.reset({ clientName: '', items: [], fees: { frete: 0, montagem: 0, tecnico: 0, outros: 0 }, discount: 0 })} disabled={isSaving}>Limpar Tudo</Button>
                <Button type="button" onClick={() => handleSaveQuote('draft')} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Rascunho
                </Button>
                <Button type="button" onClick={() => handleSaveQuote('sent')} disabled={isSaving} className="bg-primary">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                    Salvar e Ver Detalhes
                </Button>
            </div>
             {form.formState.errors.items && (
                <p className="text-sm text-destructive text-center">{form.formState.errors.items.message}</p>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
    </form>
  );
}
