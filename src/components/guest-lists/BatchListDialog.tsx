'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Copy, CheckCircle2, Sparkles, Plus, Trash2, Ticket, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

interface BatchListDialogProps {
  isOpen: boolean;
  onClose: (created?: boolean) => void;
  eventId: string;
  eventName: string;
  eventSlug: string;
}

interface ListPackage {
  id: string;
  name: string;
  values: string;
}

const INITIAL_PACKAGES: ListPackage[] = [
  { id: uuidv4(), name: 'Lista VIP', values: 'ATÉ 23H: VIP\nAPÓS 23H: R$ 50' },
  { id: uuidv4(), name: 'Lista Promocional', values: 'ATÉ 00H: R$ 60\nAPÓS 00H: R$ 80' },
  { id: uuidv4(), name: 'Lista Geral', values: 'VALOR ÚNICO: R$ 100' },
];

export default function BatchListDialog({ isOpen, onClose, eventId, eventName, eventSlug }: BatchListDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [createdLists, setCreatedLists] = useState<any[]>([]);

  const [packages, setPackages] = useState<ListPackage[]>(INITIAL_PACKAGES);
  const [promoterNames, setPromoterNames] = useState('');
  const [promoterValues, setPromoterValues] = useState('ATÉ 23H: VIP\nATÉ 00H: R$ 70');
  const [slugPrefix, setPrefix] = useState('');

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const handleCreateBatch = async () => {
    const finalItemsToCreate: { name: string; values: string }[] = [];

    packages.forEach(p => {
      if (p.name.trim()) {
        finalItemsToCreate.push({ name: p.name, values: p.values });
      }
    });

    const bulkNames = promoterNames.split('\n').map(n => n.trim()).filter(n => n !== '');
    bulkNames.forEach(name => {
      finalItemsToCreate.push({ name, values: promoterValues });
    });

    if (finalItemsToCreate.length === 0) {
      toast({ variant: 'destructive', title: 'Nenhuma lista configurada' });
      return;
    }

    setIsSubmitting(true);
    const batch = writeBatch(db);
    const resultSummary: any[] = [];

    try {
      for (const item of finalItemsToCreate) {
        const listId = uuidv4();
        const statsToken = uuidv4().substring(0, 8);
        
        let baseSlug = slugify(item.name);
        if (slugPrefix) baseSlug = `${slugify(slugPrefix)}-${baseSlug}`;
        
        const listData = {
          id: listId,
          eventId,
          name: item.name,
          slug: baseSlug,
          statsToken,
          customPromoText: item.values || null,
          submissionCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        batch.set(doc(db, 'guest_events', eventId, 'lists', listId), listData);

        resultSummary.push({
          ...listData,
          publicUrl: `${window.location.origin}/l/${eventSlug}/${baseSlug}`,
        });
      }

      await batch.commit();
      setCreatedLists(resultSummary);
      setStep('success');
      toast({ title: 'Sucesso!', description: `${resultSummary.length} listas geradas.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao criar lote', description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep('form');
    setPackages(INITIAL_PACKAGES);
    setPromoterNames('');
    setCreatedLists([]);
    onClose(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && (step === 'success' ? handleReset() : onClose())}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            {step === 'form' ? (
              <><Sparkles className="h-6 w-6 text-primary" /> Gerador de Listas Hierárquico</>
            ) : (
              <><CheckCircle2 className="h-6 w-6 text-green-500" /> Listas Geradas!</>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' ? (
          <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-6">
            <div className="space-y-2">
              <Label>Prefixo dos Identificadores (Opcional)</Label>
              <Input placeholder="Ex: promoter" value={slugPrefix} onChange={(e) => setPrefix(e.target.value)} />
            </div>

            <Tabs defaultValue="packages">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="packages">Listas Padrão</TabsTrigger>
                <TabsTrigger value="promoters">Nomes de Promoters</TabsTrigger>
              </TabsList>
              
              <TabsContent value="packages" className="pt-4 space-y-4">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="flex flex-col gap-3 p-4 border rounded-2xl bg-muted/20">
                    <Input 
                      value={pkg.name} 
                      onChange={(e) => setPackages(packages.map(p => p.id === pkg.id ? { ...p, name: e.target.value } : p))}
                      placeholder="Nome da Lista"
                    />
                    <Textarea 
                      value={pkg.values} 
                      onChange={(e) => setPackages(packages.map(p => p.id === pkg.id ? { ...p, values: e.target.value } : p))}
                      placeholder="Valores por horário..."
                    />
                  </div>
                ))}
                <Button variant="outline" className="w-full" onClick={() => setPackages([...packages, { id: uuidv4(), name: '', values: '' }])}>
                  <Plus className="mr-2 h-4 w-4" /> Adicionar Outra
                </Button>
              </TabsContent>

              <TabsContent value="promoters" className="pt-4 space-y-4">
                <Textarea 
                  placeholder="Valores padrão para os promoters..." 
                  value={promoterValues}
                  onChange={(e) => setPromoterValues(e.target.value)}
                />
                <Textarea 
                  placeholder="Nomes dos promoters (um por linha)..." 
                  className="min-h-[200px]"
                  value={promoterNames}
                  onChange={(e) => setPromoterNames(e.target.value)}
                />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {createdLists.map(l => (
              <div key={l.id} className="p-3 border rounded-lg flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{l.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{l.publicUrl}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => {
                  navigator.clipboard.writeText(l.publicUrl);
                  toast({ title: 'Copiado!' });
                }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="p-6 border-t bg-muted/5">
          {step === 'form' ? (
            <>
              <Button variant="outline" onClick={() => onClose()}>Cancelar</Button>
              <Button onClick={handleCreateBatch} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gerar Todas
              </Button>
            </>
          ) : (
            <Button className="w-full" onClick={handleReset}>Concluir</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
