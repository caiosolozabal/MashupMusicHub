'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { type PublicDj } from '@/lib/public-djs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Instagram, FileText, ArrowLeft, MessageCircle } from 'lucide-react';

/**
 * Componente cliente para o perfil do DJ.
 * Gerencia o estado de erro da imagem e apresenta a interface.
 */
export default function DjProfileClient({ dj }: { dj: PublicDj }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="bg-background min-h-screen">
      <div className="container px-4 py-8 sm:px-6 lg:py-16">
        <Button variant="ghost" size="sm" asChild className="mb-8 -ml-2 text-muted-foreground hover:text-primary">
          <Link href="/djs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o elenco
          </Link>
        </Button>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start">
          {/* Coluna da Imagem */}
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted shadow-2xl ring-1 ring-border">
            {imageError ? (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                <span className="text-8xl font-bold text-primary/30 font-headline">
                  {dj.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </span>
              </div>
            ) : (
              <Image
                src={dj.fotoUrl}
                alt={dj.nome}
                fill
                className="object-cover"
                priority
                unoptimized={true}
                onError={() => setImageError(true)}
              />
            )}
          </div>

          {/* Coluna do Conteúdo */}
          <div className="flex flex-col space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl font-headline">
                {dj.nome}
              </h1>
              
              <div className="flex flex-wrap gap-2">
                {dj.estilos.map((estilo) => (
                  <Badge key={estilo} variant="primary" className="bg-primary/10 text-primary border-primary/20 text-xs uppercase tracking-widest px-3 py-1">
                    {estilo}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="prose prose-invert max-w-none">
              <p className="text-xl text-primary font-semibold leading-relaxed">
                {dj.resumoBooking}
              </p>
              <div className="h-px w-12 bg-primary/50 my-6" />
              <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
                {dj.bioLonga}
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row pt-4">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-base h-14 px-8">
                <Link href="https://wa.me/5521976950231" target="_blank">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Contrate agora
                </Link>
              </Button>
              
              <div className="flex gap-4">
                <Button variant="outline" size="lg" className="flex-1 sm:flex-none h-14 border-primary/20 hover:bg-primary/5" asChild>
                  <a href={`https://instagram.com/${dj.instagramHandle}`} target="_blank" rel="noreferrer">
                    <Instagram className="mr-2 h-5 w-5 text-primary" />
                    Instagram
                  </a>
                </Button>
                <Button variant="outline" size="lg" className="flex-1 sm:flex-none h-14 border-primary/20 hover:bg-primary/5" asChild>
                  <a href={dj.presskitUrl} target="_blank" rel="noreferrer">
                    <FileText className="mr-2 h-5 w-5 text-primary" />
                    Presskit
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
