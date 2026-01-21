'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, serverTimestamp, orderBy, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, PlusCircle, Trash2, Save, X, Sparkles, Edit, CheckCircle2, XCircle, History } from 'lucide-react';
import type { RentalItem, RentalQuote, RentalQuoteItem, RentalQuoteStatus } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import RentalItemFormDialog, { type RentalItemFormValues } from '@/components/settings/RentalItemFormDialog';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Label } from '@/components/ui/label';


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

  // --- MERGED STATE ---
  const [catalogItems, setCatalogItems] = useState<RentalItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  // --- QUOTE CREATION STATE ---
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [searchTermForQuote, setSearchTermForQuote] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // --- CATALOG MANAGEMENT STATE ---
  const [isItemFormSubmitting, setIsItemFormSubmitting] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RentalItem | null>(null);

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

  // --- MERGED DATA FETCHING ---
  const fetchItems = async () => {
    setIsLoadingCatalog(true);
    if (userDetails?.role !== 'admin' && userDetails?.role !== 'partner') {
        toast({ variant: 'destructive', title: 'Acesso Negado' });
        router.push('/dashboard');
        return;
    }
    try {
      if (!db) throw new Error('Firestore not initialized');
      const itemsCollection = collection(db, 'rental_items');
      const q = query(itemsCollection, orderBy('category'), orderBy('name'));
      const itemsSnapshot = await getDocs(q);
      const itemsList = itemsSnapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      } as RentalItem));
      setCatalogItems(itemsList);
    } catch (error) {
      console.error('Error fetching rental items:', error);
      toast({ variant: 'destructive', title: 'Erro ao buscar itens', description: (error as Error).message });
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  useEffect(() => {
    if(userDetails) fetchItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDetails]);
  
  // --- QUOTE CREATION LOGIC ---
  const categories = useMemo(() => {
    const cats = new Set(catalogItems.map(item => item.category));
    return ['all', ...Array.from(cats)];
  }, [catalogItems]);

  const filteredItemsForQuote = useMemo(() => {
    return catalogItems.filter(item => {
      if (!item.isActive) return false;
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = searchTermForQuote === '' || 
        item.name.toLowerCase().includes(searchTermForQuote.toLowerCase()) || 
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTermForQuote.toLowerCase())));
      return matchesCategory && matchesSearch;
    });
  }, [catalogItems, selectedCategory, searchTermForQuote]);

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
  const watchedDiscount = form.watch('discount');
  const watchedFrete = form.watch('fees.frete');
  const watchedMontagem = form.watch('fees.montagem');
  const watchedTecnico = form.watch('fees.tecnico');
  const watchedOutros = form.watch('fees.outros');


  const totals = useMemo(() => {
    const itemsSubtotal = watchedItems.reduce((sum, item) => sum + (Number(item.qty) * Number(item.unitPrice)), 0);
    const feesTotal = Number(watchedFrete || 0) + Number(watchedMontagem || 0) + Number(watchedTecnico || 0) + Number(watchedOutros || 0);
    const discountTotal = Number(watchedDiscount || 0);
    const grandTotal = itemsSubtotal + feesTotal - discountTotal;
    return { itemsSubtotal, feesTotal, discountTotal, grandTotal };
  }, [watchedItems, watchedFrete, watchedMontagem, watchedTecnico, watchedOutros, watchedDiscount]);


  const capacitySummary = useMemo(() => {
    if (!watchedItems || watchedItems.length === 0) return null;
    let people = 0, score = 0, eonCount = 0, prxCount = 0, subCount = 0, topCount = 0;
    watchedItems.forEach(item => {
      const catalogItem = catalogItems.find(ci => ci.id === item.itemId);
      if (catalogItem?.recommendedPeople) people += (catalogItem.recommendedPeople * item.qty);
      if (catalogItem?.soundScore) score += (catalogItem.soundScore * item.qty);
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
    
    setIsSavingQuote(true);
    const values = form.getValues();
    const quoteData: Omit<RentalQuote, 'id'| 'createdAt' | 'updatedAt'> = {
      createdBy: user?.uid!,
      createdByName: userDetails?.displayName || user?.email || 'N/A',
      status: status,
      clientName: values.clientName,
      clientContact: values.clientContact,
      eventName: values.eventName,
      eventDate: values.eventDate ? Timestamp.fromDate(values.eventDate) : null,
      eventLocation: values.eventLocation,
      kitName: values.kitName,
      items: values.items.map(item => ({ ...item, lineTotal: item.qty * item.unitPrice })),
      fees: values.fees,
      discount: values.discount,
      totals,
      capacitySummary: capacitySummary,
      notes: values.notes,
    };
    try {
      const docRef = await addDoc(collection(db, 'rental_quotes'), { ...quoteData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      toast({ title: 'Orçamento Salvo!', description: `O orçamento para ${values.clientName} foi salvo com sucesso.`});
      router.push(`/rental/${docRef.id}`);
    } catch (error) {
      console.error("Error saving quote:", error);
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: (error as Error).message });
    } finally {
      setIsSavingQuote(false);
    }
  };

  // --- CATALOG MANAGEMENT LOGIC ---
  const handleOpenFormDialog = (item?: RentalItem) => {
    setSelectedItem(item || null);
    setIsFormDialogOpen(true);
  };

  const handleCloseFormDialog = (refetch?: boolean) => {
    setIsFormDialogOpen(false);
    setSelectedItem(null);
    if (refetch) fetchItems();
  };

  const handleOpenDeleteDialog = (item: RentalItem) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleItemFormSubmit = async (values: RentalItemFormValues, newPhotoUrl: string | null) => {
    if (!db) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Firestore não inicializado.'});
      return;
    }
    setIsItemFormSubmitting(true);
    const itemData = {
        ...values,
        tags: values.tags ? values.tags.split(',').map(tag => tag.trim()) : [],
        photoUrl: newPhotoUrl,
    };
    try {
      if (selectedItem) {
        const itemRef = doc(db, 'rental_items', selectedItem.id);
        await updateDoc(itemRef, { ...itemData, updatedAt: serverTimestamp() });
        toast({ title: 'Item Atualizado!', description: `O item "${values.name}" foi atualizado.` });
      } else {
        await addDoc(collection(db, 'rental_items'), { ...itemData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        toast({ title: 'Item Adicionado!', description: `O item "${values.name}" foi criado.` });
      }
      handleCloseFormDialog(true);
    } catch (error) {
      console.error('Error saving rental item:', error);
      toast({ variant: 'destructive', title: 'Erro ao salvar item', description: (error as Error).message });
    } finally {
      setIsItemFormSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem || !db) return;
    setIsItemFormSubmitting(true);
    try {
      await deleteDoc(doc(db, 'rental_items', selectedItem.id));
      toast({ title: 'Item Excluído!', description: `O item "${selectedItem.name}" foi excluído.` });
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
      fetchItems();
    } catch (error) {
      console.error('Error deleting rental item:', error);
      toast({ variant: 'destructive', title: 'Erro ao excluir item', description: (error as Error).message });
    } finally {
      setIsItemFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
          <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Locação de Equipamentos</CardTitle>
                <CardDescription>Crie orçamentos ou gerencie seu catálogo de itens.</CardDescription>
              </div>
              <Button asChild variant="outline">
                <Link href="/rental/history">
                    <History className="mr-2 h-4 w-4" />
                    Ver Histórico
                </Link>
              </Button>
          </CardHeader>
      </Card>
      <Tabs defaultValue="quote">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="quote">Criar Orçamento</TabsTrigger>
          <TabsTrigger value="catalog">Catálogo de Itens</TabsTrigger>
        </TabsList>
        <TabsContent value="quote" className="mt-4">
          <form>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Coluna do Catálogo */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Catálogo de Itens</CardTitle>
                    <Input
                      placeholder="Buscar item ou tag..."
                      value={searchTermForQuote}
                      onChange={(e) => setSearchTermForQuote(e.target.value)}
                    />
                    {/* Filtro de Categoria pode ser adicionado aqui */}
                  </CardHeader>
                  <CardContent className="max-h-[70vh] overflow-y-auto">
                    {isLoadingCatalog ? (
                       <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : filteredItemsForQuote.length > 0 ? (
                      <div className="space-y-3">
                        {filteredItemsForQuote.map(item => (
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
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus /></PopoverContent>
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
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="frete">Frete</Label>
                          <Input id="frete" type="number" placeholder="0.00" {...form.register('fees.frete')} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="montagem">Montagem</Label>
                          <Input id="montagem" type="number" placeholder="0.00" {...form.register('fees.montagem')} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="tecnico">Técnico</Label>
                          <Input id="tecnico" type="number" placeholder="0.00" {...form.register('fees.tecnico')} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="outros">Outros</Label>
                          <Input id="outros" type="number" placeholder="0.00" {...form.register('fees.outros')} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="discount">Desconto (-)</Label>
                          <Input id="discount" type="number" placeholder="0.00" {...form.register('discount')} className="border-green-500" />
                        </div>
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
                        <Button type="button" variant="outline" onClick={() => form.reset({ clientName: '', items: [], fees: { frete: 0, montagem: 0, tecnico: 0, outros: 0 }, discount: 0 })} disabled={isSavingQuote}>Limpar Tudo</Button>
                        <Button type="button" onClick={() => handleSaveQuote('draft')} disabled={isSavingQuote}>
                            {isSavingQuote ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                            Salvar Rascunho
                        </Button>
                        <Button type="button" onClick={() => handleSaveQuote('sent')} disabled={isSavingQuote} className="bg-primary">
                            {isSavingQuote ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
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
        </TabsContent>
        <TabsContent value="catalog" className="mt-4">
             <Card>
                <CardHeader>
                    <CardTitle>Gerenciador do Catálogo</CardTitle>
                    <CardDescription>Adicione, edite ou remova os itens disponíveis para locação.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 flex justify-end">
                      <Button onClick={() => handleOpenFormDialog()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Adicionar Item
                      </Button>
                    </div>
                    {isLoadingCatalog ? (
                      <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-2">Carregando itens...</p>
                      </div>
                    ) : catalogItems.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">Nenhum item de locação cadastrado.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Foto</TableHead>
                              <TableHead>Nome</TableHead>
                              <TableHead>Categoria</TableHead>
                              <TableHead>Preço Base</TableHead>
                              <TableHead>Ativo</TableHead>
                              <TableHead>Tags</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {catalogItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  {item.photoUrl ? (
                                    <Image src={item.photoUrl} alt={item.name} width={40} height={40} className="rounded-md object-cover" />
                                  ) : (
                                    <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                                      <Loader2 className="h-4 w-4"/>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>{item.category}</TableCell>
                                <TableCell>{item.basePrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                <TableCell>
                                  <Badge variant={item.isActive ? 'default' : 'outline'}>
                                    {item.isActive ? <CheckCircle2 className="h-4 w-4 mr-1"/> : <XCircle className="h-4 w-4 mr-1"/>}
                                    {item.isActive ? 'Sim' : 'Não'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-xs">
                                  <div className="flex flex-wrap gap-1">
                                    {item.tags?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right space-x-1">
                                  <Button variant="outline" size="icon" aria-label="Editar Item" onClick={() => handleOpenFormDialog(item)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="destructive" size="icon" aria-label="Excluir Item" onClick={() => handleOpenDeleteDialog(item)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                </CardContent>
             </Card>
        </TabsContent>
      </Tabs>
      
      {isFormDialogOpen && (
        <RentalItemFormDialog
          isOpen={isFormDialogOpen}
          onClose={handleCloseFormDialog}
          onSubmit={handleItemFormSubmit}
          item={selectedItem}
        />
      )}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o item "{selectedItem?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedItem(null)} disabled={isItemFormSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              disabled={isItemFormSubmitting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isItemFormSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
