'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, writeBatch, serverTimestamp, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, CheckCircle, Upload } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const itemsToImport = [
  { name: 'JBL EON 610', stockQty: 1, basePrice: 200, category: 'Caixas de Som', tags: ['jbl', 'eon', 'ativa'], soundScore: 4, recommendedPeople: 40 },
  { name: 'JBL EON 615', stockQty: 3, basePrice: 250, category: 'Caixas de Som', tags: ['jbl', 'eon', 'ativa'], soundScore: 5, recommendedPeople: 60 },
  { name: 'MACKIE THUMP 15', stockQty: 3, basePrice: 250, category: 'Caixas de Som', tags: ['mackie', 'thump', 'ativa'], soundScore: 5, recommendedPeople: 60 },
  { name: 'JBL PRX 715', stockQty: 2, basePrice: 350, category: 'Caixas de Som', tags: ['jbl', 'prx', 'ativa', 'profissional'], soundScore: 7, recommendedPeople: 80 },
  { name: 'JBL PRX 712 220v (Similar)', stockQty: 2, basePrice: 250, category: 'Caixas de Som', tags: ['jbl', 'prx', 'ativa'], soundScore: 6, recommendedPeople: 70 },
  { name: 'SUB JBL PRX 718', stockQty: 2, basePrice: 350, category: 'Subwoofers', tags: ['jbl', 'prx', 'sub', 'grave'], soundScore: 8, recommendedPeople: 150 },
  { name: 'SUB JBL VL18', stockQty: 2, basePrice: 350, category: 'Subwoofers', tags: ['jbl', 'vl', 'sub', 'grave'], soundScore: 8, recommendedPeople: 150 },
  { name: 'SUB SB218 - JBL SW3P', stockQty: 2, basePrice: 400, category: 'Subwoofers', tags: ['jbl', 'sub', 'grave', 'potente'], soundScore: 9, recommendedPeople: 200 },
  { name: 'Moving head 7R', stockQty: 2, basePrice: 100, category: 'Iluminação', tags: ['moving', '7r', 'beam'], soundScore: null, recommendedPeople: null },
  { name: 'Mini moving wash 100w', stockQty: 2, basePrice: 50, category: 'Iluminação', tags: ['moving', 'wash', 'led'], soundScore: null, recommendedPeople: null },
  { name: 'Par LED', stockQty: 10, basePrice: 15, category: 'Iluminação', tags: ['par', 'led', 'ambiente'], soundScore: null, recommendedPeople: null },
  { name: 'Refletor RGB 200w', stockQty: 4, basePrice: 15, category: 'Iluminação', tags: ['refletor', 'led', 'rgb'], soundScore: null, recommendedPeople: null },
  { name: 'Refletor RGB 100w', stockQty: 3, basePrice: 15, category: 'Iluminação', tags: ['refletor', 'led', 'rgb'], soundScore: null, recommendedPeople: null },
  { name: 'Mesa dobrável', stockQty: 1, basePrice: 50, category: 'Mobiliário', tags: ['mesa', 'dj'], soundScore: null, recommendedPeople: null },
  { name: 'Palco/praticável 2x1m', stockQty: null, basePrice: 250, category: 'Estrutura', tags: ['palco', 'praticavel'], soundScore: null, recommendedPeople: null },
  { name: 'Mesa de som 8 canais', stockQty: 1, basePrice: 100, category: 'Áudio', tags: ['mesa', 'som', 'mixer'], soundScore: null, recommendedPeople: null },
  { name: 'Microfone', stockQty: 6, basePrice: 100, category: 'Áudio', tags: ['microfone', 'shure', 'sem fio'], soundScore: null, recommendedPeople: null },
  { name: 'Pioneer XDJ-XZ', stockQty: 1, basePrice: 700, category: 'Equipamento DJ', tags: ['pioneer', 'xdj', 'controladora'], soundScore: null, recommendedPeople: null },
  { name: 'Treliça Q25 (metro)', stockQty: null, basePrice: 50, category: 'Estrutura', tags: ['trelica', 'q25', 'box truss'], soundScore: null, recommendedPeople: null },
  { name: 'Treliça Q15 (metro)', stockQty: null, basePrice: 30, category: 'Estrutura', tags: ['trelica', 'q15', 'box truss'], soundScore: null, recommendedPeople: null },
];

export default function ImportRentalItemsPage() {
  const { userDetails, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [isImported, setIsImported] = useState(false);

  if (!authLoading && userDetails?.role !== 'admin' && userDetails?.role !== 'partner') {
    router.push('/dashboard');
    return null;
  }

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const batch = writeBatch(db);
      const itemsCollection = collection(db, 'rental_items');
      
      itemsToImport.forEach(item => {
        const docRef = doc(itemsCollection);
        const newItemData = {
          ...item,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        batch.set(docRef, newItemData);
      });

      await batch.commit();
      
      toast({
        title: 'Importação Concluída!',
        description: `${itemsToImport.length} itens foram adicionados ao seu catálogo de locação.`,
        duration: 5000,
      });
      setIsImported(true);

    } catch (error) {
      console.error("Error importing items:", error);
      toast({
        variant: 'destructive',
        title: 'Erro na Importação',
        description: (error as Error).message || 'Não foi possível importar os itens.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <Button variant="ghost" size="sm" asChild className="-ml-3 mb-2 w-fit">
            <Link href="/settings/migration">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Migração
            </Link>
        </Button>
        <CardTitle className="font-headline text-2xl">Importar Itens de Locação</CardTitle>
        <CardDescription>
          A lista abaixo será importada para o seu catálogo de locação. Esta é uma operação única.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isImported ? (
          <Alert variant="default" className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
            <CheckCircle className="h-4 w-4 !text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-300">Importação Realizada com Sucesso!</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-400">
              Os itens foram adicionados. Você já pode gerenciá-los na tela de{' '}
              <Link href="/settings/rental-items" className="font-bold underline hover:text-green-800 dark:hover:text-green-200">
                Configurações &gt; Itens de Locação
              </Link>.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <Upload className="h-4 w-4" />
            <AlertTitle>Pronto para Importar?</AlertTitle>
            <AlertDescription>
              Clique no botão abaixo para adicionar os {itemsToImport.length} itens ao seu catálogo.
              Você poderá editar ou remover qualquer item depois da importação.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço de Locação</TableHead>
                <TableHead>Em Estoque</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsToImport.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.basePrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                  <TableCell>{item.stockQty ?? 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleImport} disabled={isImporting || isImported}>
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isImported ? 'Itens Já Importados' : 'Importar Itens para o Catálogo'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
