
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Instagram, FileText, ArrowLeft, MessageCircle } from 'lucide-react';
import type { PublicDj } from '@/lib/public-djs';
import placeholderImages from '@/app/lib/placeholder-images.json';

interface DjProfileClientProps {
  dj: PublicDj;
}

export default function DjProfileClient({ dj }: DjProfileClientProps) {
  const whatsappLink = `https://wa.me/5521976950231?text=Olá! Gostaria de solicitar um orçamento para o DJ ${dj.nome}.`;

  return (
    <div className="container px-4 py-12 sm:px-6 sm:py-20 lg:py-24">
      <Button variant="ghost" size="sm" asChild className="mb-8 -ml-2 text-muted-foreground hover:text-primary">
        <Link href="/djs">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para a lista
        </Link>
      </Button>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start">
        {/* Coluna da Foto */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted ring-1 ring-border shadow-2xl">
          <Image
            src={dj.fotoUrl}
            alt={dj.nome}
            fill
            className="object-cover object-center"
            priority
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = placeholderImages.dj_fallback.url;
            }}
            data-ai-hint="dj artist"
          />
        </div>

        {/* Coluna de Conteúdo */}
        <div className="flex flex-col space-y-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl font-headline">
              {dj.nome}
            </h1>
            <a 
              href={`https://instagram.com/${dj.instagramHandle}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center text-primary font-medium hover:underline"
            >
              <Instagram className="mr-2 h-5 w-5" />
              @{dj.instagramHandle}
            </a>
          </div>

          <div className="flex flex-wrap gap-2">
            {dj.estilos.map((estilo) => (
              <Badge key={estilo} variant="secondary" className="px-3 py-1 text-xs uppercase tracking-widest">
                {estilo}
              </Badge>
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold font-headline text-foreground">Booking Info</h3>
            <p className="text-lg text-primary font-medium leading-relaxed">
              {dj.resumoBooking}
            </p>
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {dj.bioLonga}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t">
            <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
              <a href={whatsappLink} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 h-5 w-5" />
                Contrate agora
              </a>
            </Button>
            <Button size="lg" variant="outline" className="w-full" asChild>
              <a href={dj.presskitUrl} target="_blank" rel="noreferrer">
                <FileText className="mr-2 h-5 w-5" />
                Ver Presskit
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
