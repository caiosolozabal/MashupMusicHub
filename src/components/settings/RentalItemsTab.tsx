'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import type { RentalItem } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Edit, Trash2, PlusCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import RentalItemFormDialog, { type RentalItemFormValues } from './RentalItemFormDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

export default function RentalItemsTab() {
  const { toast } = useToast();
  const [items, setItems] = useState<RentalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RentalItem | null>(null);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      if (!db) throw new Error('Firestore not initialized');
      const itemsCollection = collection(db, 'rental_items');
      const q = query(itemsCollection, orderBy('category'), orderBy('name'));
      const itemsSnapshot = await getDocs(q);
      const itemsList = itemsSnapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      } as RentalItem));
      setItems(itemsList);
    } catch (error) {
      console.error('Error fetching rental items:', error);
      toast({ variant: 'destructive', title: 'Erro ao buscar itens', description: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenFormDialog = (item?: RentalItem) => {
    setSelectedItem(item || null);
    setIsFormDialogOpen(true);
  };

  const handleCloseFormDialog = (refetch?: boolean) => {
    setIsFormDialogOpen(false);
    setSelectedItem(null);
    if (refetch) {
      fetchItems();
    }
  };

  const handleOpenDeleteDialog = (item: RentalItem) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (values: RentalItemFormValues, newPhotoUrl: string | null) => {
    if (!db) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Firestore não inicializado.'});
      return;
    }
    setIsSubmitting(true);

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
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem || !db) return;
    setIsSubmitting(true);
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
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando itens...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => handleOpenFormDialog()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <PlusCircle className="mr-2 h-5 w-5" />
          Adicionar Item
        </Button>
      </div>
      {items.length === 0 ? (
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
              {items.map((item) => (
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
      {isFormDialogOpen && (
        <RentalItemFormDialog
          isOpen={isFormDialogOpen}
          onClose={handleCloseFormDialog}
          onSubmit={handleFormSubmit}
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
            <AlertDialogCancel onClick={() => setSelectedItem(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
