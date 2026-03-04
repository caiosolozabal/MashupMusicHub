
'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, writeBatch, serverTimestamp, getDoc } from 'firebase/firestore';
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
  { id: uuidv4(), name: 'Aniversariante: Nome', values: 'CONVIDADO: R$ 50\nANIVERSARIANTE: VIP' },
];

export default function BatchListDialog({ isOpen, onClose, eventId, eventName }: BatchListDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [createdLists, setCreatedLists] = useState<any[]>([]);

  // Form State
  const [packages, setPackages] = useState<ListPackage[]>(INITIAL_PACKAGES);
  const [promoterNames, setPromoterNames] = useState('');
  const [promoterValues, setPromoterValues] = useState('ATÉ 23H: VIP\nATÉ 00H: R$ 70');
  const [slugPrefix, setPrefix] = useState('');

  // Helpers
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const addPackage = () => {
    setPackages([...packages, { id: uuidv4(), name: 'Nova Lista', values: '' }]);
  };

  const updatePackage = (id: string, field: 'name' | 'values', val: string) => {
    setPackages(packages.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  const removePackage = (id: string) => {
    setPackages(packages.filter(p => p.id !== id));
  };

  const handleCreateBatch = async () => {
    const finalItemsToCreate: { name: string; values: string }[] = [];

    // 1. Pacotes Individuais
    packages.forEach(p => {
      if (p.name.trim()) {
        finalItemsToCreate.push({ name: p.name, values: p.values });
      }
    });

    // 2. Promoters em Lote
    const bulkNames = promoterNames.split('\n').map(n => n.trim()).filter(n => n !== '');
    bulkNames.forEach(name => {
      finalItemsToCreate.push({ name, values: promoterValues });
    });

    if (finalItemsToCreate.length === 0) {
      toast({ variant: 'destructive', title: 'Nenhuma lista configurada', description: 'Adicione pelo menos uma lista ou nome de promoter.' });
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
        
        let finalSlug = baseSlug;
        const slugCheck = await getDoc(doc(db, 'slugs', finalSlug));
        if (slugCheck.exists()) {
          finalSlug = `${baseSlug}-${Math.floor(Math.random() * 1000)}`;
        }

        const listData = {
          id: listId,
          eventId,
          name: item.name,
          slug: finalSlug,
          statsToken,
          customPromoText: item.values || null,
          submissionCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        batch.set(doc(db, 'guest_events', eventId, 'lists', listId), listData);
        batch.set(doc(db, 'slugs', finalSlug), { type: 'list', eventId, listId });

        resultSummary.push({
          ...listData,
          publicUrl: `${window.location.origin}/l/${finalSlug}`,
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
              <><Sparkles className="h-6 w-6 text-primary" /> Gerador de Listas Premium</>
            ) : (
              <><CheckCircle2 className="h-6 w-6 text-green-500" /> Listas Prontas!</>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' ? (
          <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="prefix">Prefixo dos Links (Opcional - Ex: farra-mar)</Label>
              <Input id="prefix" placeholder="Omitir para usar apenas o nome da lista" value={slugPrefix} onChange={(e) => setPrefix(e.target.value)} />
            </div>

            <Tabs defaultValue="packages">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="packages">Pacotes & Aniversariantes</TabsTrigger>
                <TabsTrigger value="promoters">Promoters em Lote</TabsTrigger>
              </TabsList>
              
              <TabsContent value="packages" className="pt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {packages.map((pkg) => (
                    <div key={pkg.id} className="flex flex-col gap-3 p-4 border rounded-2xl bg-muted/20 relative group">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Identificação da Lista</Label>
                          <Input 
                            value={pkg.name} 
                            onChange={(e) => updatePackage(pkg.id, 'name', e.target.value)}
                            placeholder="Ex: VIP ou Aniversário do João"
                            className="bg-background font-bold"
                          />
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0 self-end"
                          onClick={() => removePackage(pkg.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Valores por Horário (Uma faixa por linha)
                        </Label>
                        <Textarea 
                          value={pkg.values} 
                          onChange={(e) => updatePackage(pkg.id, 'values', e.target.value)}
                          placeholder="Ex: ATÉ 23H: VIP&#10;ATÉ 00H: R$ 70"
                          className="bg-background min-h-[80px] text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full border-dashed py-6 rounded-2xl" onClick={addPackage}>
                  <Plus className="mr-2 h-4 w-4" /> Adicionar Outra Lista / Aniversariante
                </Button>
              </TabsContent>

              <TabsContent value="promoters" className="pt-4 space-y-6">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Valores Padrão para este Lote
                    </Label>
                    <Textarea 
                      placeholder="Ex: ATÉ 23H: VIP&#10;ATÉ 00H: R$ 70" 
                      className="min-h-[100px] bg-background border-primary/20"
                      value={promoterValues}
                      onChange={(e) => setPromoterValues(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground">Este texto será replicado em todos os nomes colados abaixo.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">Nomes dos Promoters (Um por linha)</Label>
                  <Textarea 
                    placeholder="Lucas Silva&#10;João Pereira&#10;Carol DJ" 
                    className="min-h-[200px]"
                    value={promoterNames}
                    onChange={(e) => setPromoterNames(e.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-3">
              <Ticket className="h-5 w-5 text-primary" />
              <p className="text-sm font-bold">Geradas {createdLists.length} listas para o evento {eventName}.</p>
            </div>
            <div className="space-y-2">
              <Label>Resumo de Links</Label>
              <div className="relative">
                <Textarea 
                  readOnly 
                  className="min-h-[250px] text-[11px] font-mono bg-muted/30"
                  value={createdLists.map(l => `${l.name}: ${l.publicUrl}`).join('\n')}
                />
                <Button 
                  size="sm" 
                  className="absolute bottom-2 right-2"
                  onClick={() => {
                    const text = createdLists.map(l => `📌 ${l.name}\n🔗 ${l.publicUrl}`).join('\n\n');
                    navigator.clipboard.writeText(text);
                    toast({ title: 'Copiado!' });
                  }}
                >
                  <Copy className="mr-2 h-3.5 w-3.5" /> Copiar Tudo
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="p-6 border-t bg-muted/5">
          {step === 'form' ? (
            <>
              <Button variant="outline" onClick={() => onClose()} disabled={isSubmitting}>Cancelar</Button>
              <Button onClick={handleCreateBatch} disabled={isSubmitting} className="min-w-[150px] bg-primary text-black font-black">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Gerar Listas
              </Button>
            </>
          ) : (
            <Button className="w-full" onClick={handleReset}>Concluir e Voltar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
