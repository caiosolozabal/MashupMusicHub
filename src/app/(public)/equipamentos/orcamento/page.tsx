
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { RENTAL_PACKAGES } from '@/lib/public-rental-packages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MessageCircle, Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';

const orcamentoSchema = z.object({
  nome: z.string().min(3, 'Por favor, informe seu nome.'),
  data: z.string().min(5, 'Informe a data do evento.'),
  local: z.string().min(3, 'Informe o bairro ou cidade.'),
  tipoEvento: z.string().min(1, 'Selecione o tipo de evento.'),
  horarioInicio: z.string().min(1, 'Informe o início.'),
  horarioFim: z.string().min(1, 'Informe o fim.'),
  ambiente: z.enum(['indoor', 'outdoor', 'barco']),
  luz: z.string(),
  banda: z.string(),
  publico: z.string().optional(),
  observacoes: z.string().optional(),
});

type OrcamentoValues = z.infer<typeof orcamentoSchema>;

// Componente interno que usa os hooks de busca para evitar erro de build
function OrcamentoForm() {
  const searchParams = useSearchParams();
  const estruturaSlug = searchParams.get('estrutura');
  const [estrutura, setEstrutura] = useState(RENTAL_PACKAGES[0]);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<OrcamentoValues>({
    resolver: zodResolver(orcamentoSchema),
    defaultValues: {
      luz: 'Não',
      banda: 'Não',
      ambiente: 'indoor',
    }
  });

  useEffect(() => {
    if (estruturaSlug) {
      const found = RENTAL_PACKAGES.find(p => p.slug === estruturaSlug);
      if (found) setEstrutura(found);
    }
  }, [estruturaSlug]);

  const onSubmit = (data: OrcamentoValues) => {
    const mensagem = `Assunto: Orçamento — Estrutura Mashup (${estrutura.title})

Nome: ${data.nome}
Data: ${data.data}
Evento: ${data.tipoEvento}
Local: ${data.local}
Horário: ${data.horarioInicio} às ${data.horarioFim}
Ambiente: ${data.ambiente}
Luz: ${data.luz}
Banda: ${data.banda}
Público (estimativa): ${data.publico || 'Não informado'}
Observações: ${data.observacoes || 'Nenhuma'}

Pode me passar uma estimativa e disponibilidade?`;

    const whatsappUrl = `https://wa.me/5521976950231?text=${encodeURIComponent(mensagem)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 sm:py-20">
      <Link href="/equipamentos" className="inline-flex items-center text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-8">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Link>

      <div className="mb-12">
        <div className="flex items-center gap-2 text-primary mb-2">
          <Sparkles className="h-5 w-5" />
          <span className="text-xs font-black uppercase tracking-[0.3em]">Personalize sua experiência</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black font-headline tracking-tighter leading-none mb-4">
          Orçamento — <span className="text-primary">{estrutura.title}</span>
        </h1>
        <p className="text-muted-foreground font-body">Preencha os detalhes abaixo para receber uma proposta personalizada via WhatsApp.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-card/30 p-6 sm:p-10 rounded-3xl border border-white/5 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="nome">Seu Nome *</Label>
            <Input id="nome" {...register('nome')} placeholder="Como gostaria de ser chamado?" className="bg-white/5 border-white/10" />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="data">Data do Evento *</Label>
            <Input id="data" {...register('data')} placeholder="Ex: 12/10/2025" className="bg-white/5 border-white/10" />
            {errors.data && <p className="text-xs text-destructive">{errors.data.message}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="local">Bairro e Cidade (Local) *</Label>
            <Input id="local" {...register('local')} placeholder="Onde será o evento?" className="bg-white/5 border-white/10" />
            {errors.local && <p className="text-xs text-destructive">{errors.local.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipoEvento">Tipo de Evento *</Label>
            <Select onValueChange={(v) => setValue('tipoEvento', v)}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Aniversário">Aniversário</SelectItem>
                <SelectItem value="Casamento">Casamento</SelectItem>
                <SelectItem value="Corporativo">Corporativo</SelectItem>
                <SelectItem value="Show / Live">Show / Live</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
            {errors.tipoEvento && <p className="text-xs text-destructive">{errors.tipoEvento.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="publico">Estimativa de Público (Opcional)</Label>
            <Input id="publico" {...register('publico')} placeholder="Ex: 100 pessoas" className="bg-white/5 border-white/10" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="horarioInicio">Horário de Início *</Label>
            <Input id="horarioInicio" type="time" {...register('horarioInicio')} className="bg-white/5 border-white/10" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="horarioFim">Horário de Fim *</Label>
            <Input id="horarioFim" type="time" {...register('horarioFim')} className="bg-white/5 border-white/10" />
          </div>

          <div className="space-y-2">
            <Label>Ambiente *</Label>
            <Select onValueChange={(v) => setValue('ambiente', v as any)} defaultValue="indoor">
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="indoor">Indoor (Fechado)</SelectItem>
                <SelectItem value="outdoor">Outdoor (Aberto)</SelectItem>
                <SelectItem value="barco">Barco / Lancha</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Precisa de Iluminação?</Label>
            <Select onValueChange={(v) => setValue('luz', v)} defaultValue="Não">
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sim">Sim, quero iluminação completa</SelectItem>
                <SelectItem value="Não">Não, apenas som</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Terá banda ou performance ao vivo além do DJ?</Label>
            <Select onValueChange={(v) => setValue('banda', v)} defaultValue="Não">
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sim">Sim, teremos músicos ao vivo</SelectItem>
                <SelectItem value="Não">Não, apenas DJ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="observacoes">Observações Adicionais</Label>
          <Textarea id="observacoes" {...register('observacoes')} placeholder="Detalhes que ajudam no dimensionamento..." className="bg-white/5 border-white/10 min-h-[100px]" />
        </div>

        <Button type="submit" size="lg" className="w-full bg-primary text-black font-black uppercase text-xs tracking-[0.2em] py-8 rounded-full shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-transform">
          <MessageCircle className="mr-2 h-5 w-5" />
          Enviar Solicitação via WhatsApp
        </Button>
      </form>
    </div>
  );
}

export default function OrcamentoPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <OrcamentoForm />
    </Suspense>
  );
}
