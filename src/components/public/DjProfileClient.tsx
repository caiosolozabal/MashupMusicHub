'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { type PublicDj } from '@/lib/public-djs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Instagram, FileText, ArrowLeft, MessageCircle } from 'lucide-react';

interface DjProfileClientProps {
  dj: PublicDj;
}

export default function DjProfileClient({ dj }: DjProfileClientProps) {
  const [imageError, setImageError] = useState(false);

  const whatsappMessage = `Olá! Vi o perfil do DJ ${dj.nome} no site Mashup e gostaria de solicitar um orçamento para meu evento.`;
  const whatsappUrl = `https://wa.me/5521976950231?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="bg-background">
      {/* Botão Voltar */}
      <div className="container px-4 pt-8">
        <Button variant="ghost" asChild className="-ml-4 gap-2 text-muted-foreground hover:text-primary">
          <Link href="/djs">
            <ArrowLeft className="h-4 w-4" />
            Voltar para o elenco
          </Link>
        </Button>
      </div>

      <section className="container px-4 py-8 md:py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Coluna da Imagem */}
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted ring-1 ring-border shadow-2xl">
            {imageError ? (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                <span className="text-6xl font-bold text-primary/40 font-headline">
                  {dj.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </span>
              </div>
            ) : (
              <Image
                src={dj.fotoUrl}
                alt={dj.nome}
                fill
                className="object-cover object-center"
                priority
                unoptimized={true}
                onError={() => setImageError(true)}
              />
            )}
          </div>

          {/* Coluna do Conteúdo */}
          <div className="flex flex-col justify-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl font-headline">
                {dj.nome}
              </h1>
              
              <div className="flex flex-wrap gap-2">
                {dj.estilos.map((estilo) => (
                  <Badge key={estilo} variant="secondary" className="px-3 py-1 text-sm uppercase tracking-wider">
                    {estilo}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-6 text-lg leading-relaxed text-muted-foreground">
              <p className="font-semibold text-foreground italic border-l-4 border-primary pl-4">
                "{dj.resumoBooking}"
              </p>
              <p>{dj.bioLonga}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
              <Button asChild size="lg" className="w-full gap-2 bg-primary hover:bg-primary/90">
                <Link href={whatsappUrl} target="_blank">
                  <MessageCircle className="h-5 w-5" />
                  Contratar Agora
                </Link>
              </Button>
              
              <div className="flex gap-2">
                <Button variant="outline" size="lg" className="flex-1 gap-2" asChild>
                  <a href={`https://instagram.com/${dj.instagramHandle}`} target="_blank" rel="noreferrer">
                    <Instagram className="h-5 w-5" />
                    Instagram
                  </a>
                </Button>
                <Button variant="outline" size="lg" className="flex-1 gap-2" asChild>
                  <a href={dj.presskitUrl} target="_blank" rel="noreferrer">
                    <FileText className="h-5 w-5" />
                    Presskit
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
