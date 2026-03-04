
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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Copy, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

interface BatchListDialogProps {
  isOpen: boolean;
  onClose: (created?: boolean) => void;
  eventId: string;
  eventName: string;
}

const STANDARD_LISTS = [
  { id: 'vip', name: 'Lista VIP' },
  { id: 'geral', name: 'Lista Geral' },
  { id: 'promocional', name: 'Lista Promocional' },
  { id: 'aniversariantes', name: 'Aniversariantes' },
];

export default function BatchListDialog({ isOpen, onClose, eventId, eventName }: BatchListDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [createdLists, setCreatedLists] = useState<any[]>([]);

  // Form State
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);
  const [promoterNames, setPromoterNames] = useState('');
  const [slugPrefix, setPrefix] = useState('');

  // Auto-slug generator helper
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const handleCreateBatch = async () => {
    const names: string[] = [];
    
    // Coletar nomes das listas padrão
    STANDARD_LISTS.forEach(l => {
      if (selectedStandards.includes(l.id)) names.push(l.name);
    });

    // Coletar nomes do textarea
    const rawNames = promoterNames.split('\n').map(n => n.trim()).filter(n => n !== '');
    names.push(...rawNames);

    if (names.length === 0) {
      toast({ variant: 'destructive', title: 'Nenhuma lista selecionada', description: 'Escolha pelo menos uma lista ou digite o nome de um promoter.' });
      return;
    }

    setIsSubmitting(true);
    const batch = writeBatch(db);
    const newLists: any[] = [];

    try {
      for (const name of names) {
        const listId = uuidv4();
        const statsToken = uuidv4().substring(0, 8);
        
        // Gerar slug com prefixo e garantir unicidade básica
        let baseSlug = slugify(name);
        if (slugPrefix) baseSlug = `${slugify(slugPrefix)}-${baseSlug}`;
        
        // Verificação rápida de colisão (simples para o lote)
        let finalSlug = baseSlug;
        const slugCheck = await getDoc(doc(db, 'slugs', finalSlug));
        if (slugCheck.exists()) {
          finalSlug = `${baseSlug}-${Math.floor(Math.random() * 1000)}`;
        }

        const listData = {
          id: listId,
          eventId,
          name,
          slug: finalSlug,
          statsToken,
          submissionCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const listRef = doc(db, 'guest_events', eventId, 'lists', listId);
        const slugRef = doc(db, 'slugs', finalSlug);

        batch.set(listRef, listData);
        batch.set(slugRef, { type: 'list', eventId, listId });

        newLists.push({
          ...listData,
          publicUrl: `${window.location.origin}/l/${finalSlug}`,
          statsUrl: `${window.location.origin}/stats/${finalSlug}?token=${statsToken}`
        });
      }

      await batch.commit();
      setCreatedLists(newLists);
      setStep('success');
      toast({ title: 'Sucesso!', description: `${newLists.length} listas criadas de uma vez.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao criar lote', description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copySummary = () => {
    const text = createdLists.map(l => 
      `📌 ${l.name}\n🔗 Link: ${l.publicUrl}\n📊 Stats: ${l.statsUrl}\n`
    ).join('\n---\n\n');
    
    navigator.clipboard.writeText(text);
    toast({ title: 'Resumo copiado!', description: 'Texto formatado para o WhatsApp.' });
  };

  const handleReset = () => {
    setStep('form');
    setSelectedStandards([]);
    setPromoterNames('');
    setCreatedLists([]);
    onClose(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && (step === 'success' ? handleReset() : onClose())}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            {step === 'form' ? (
              <><Sparkles className="h-6 w-6 text-primary" /> Gerar Listas em Lote</>
            ) : (
              <><CheckCircle2 className="h-6 w-6 text-green-500" /> Listas Criadas!</>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' ? (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="prefix">Prefixo dos Links (Opcional)</Label>
              <Input 
                id="prefix" 
                placeholder="Ex: farra-0703" 
                value={slugPrefix} 
                onChange={(e) => setPrefix(e.target.value)} 
              />
              <p className="text-[10px] text-muted-foreground">Isso ajuda a organizar os links. Ex: /l/farra-0703-lucas</p>
            </div>

            <Tabs defaultValue="standards">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="standards">Pacotes Padrão</TabsTrigger>
                <TabsTrigger value="promoters">Lista de Promoters</TabsTrigger>
              </TabsList>
              
              <TabsContent value="standards" className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {STANDARD_LISTS.map((list) => (
                    <div key={list.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox 
                        id={list.id} 
                        checked={selectedStandards.includes(list.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedStandards([...selectedStandards, list.id]);
                          else setSelectedStandards(selectedStandards.filter(id => id !== list.id));
                        }}
                      />
                      <label htmlFor={list.id} className="text-sm font-medium leading-none cursor-pointer">
                        {list.name}
                      </label>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="promoters" className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Nomes dos Promoters (Um por linha)</Label>
                  <Textarea 
                    placeholder="Lucas Silva&#10;João Pereira&#10;Carol DJ" 
                    className="min-h-[150px]"
                    value={promoterNames}
                    onChange={(e) => setPromoterNames(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Criaremos uma lista individual para cada nome.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => onClose()} disabled={isSubmitting}>Cancelar</Button>
              <Button onClick={handleCreateBatch} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Gerar Todas as Listas
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <p className="text-sm text-green-700 font-medium">
                Foram geradas <strong>{createdLists.length}</strong> listas para o evento <strong>{eventName}</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Resumo para Compartilhamento</Label>
              <div className="relative">
                <Textarea 
                  readOnly 
                  className="min-h-[200px] text-[11px] font-mono bg-muted/30"
                  value={createdLists.map(l => `${l.name}: ${l.publicUrl}`).join('\n')}
                />
                <Button 
                  size="sm" 
                  className="absolute bottom-2 right-2 h-8"
                  onClick={copySummary}
                >
                  <Copy className="mr-2 h-3.5 w-3.5" /> Copiar Tudo
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button className="w-full" onClick={handleReset}>Concluir e Voltar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
