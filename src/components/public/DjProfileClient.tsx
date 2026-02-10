'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { type PublicDj } from '@/lib/public-djs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Instagram, FileText, ArrowLeft, MessageCircle } from 'lucide-react';

interface DjProfileClientProps {
  dj: PublicDj;
}

export default function DjProfileClient({ dj }: DjProfileClientProps) {
  const [imgError, setImgError] = useState(false);
  const initials = dj.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="bg-background min-h-screen pb-20">
      {/* Top Navigation */}
      <div className="container px-4 py-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground hover:text-primary">
          <Link href="/djs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o elenco
          </Link>
        </Button>
      </div>

      <div className="container px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Foto do DJ */}
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-muted ring-1 ring-border shadow-2xl">
            {!imgError ? (
              <Image
                src={dj.fotoUrl}
                alt={dj.nome}
                fill
                className="object-cover object-center"
                priority
                unoptimized={true}
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                <span className="text-8xl font-bold text-primary/40 font-headline">{initials}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
          </div>

          {/* Informações do DJ */}
          <div className="flex flex-col space-y-8">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {dj.estilos.map((estilo) => (
                  <Badge key={estilo} variant="secondary" className="text-xs uppercase tracking-widest bg-primary/10 text-primary border-none">
                    {estilo}
                  </Badge>
                ))}
              </div>
              <h1 className="text-5xl font-bold tracking-tight text-foreground font-headline sm:text-6xl">
                {dj.nome}
              </h1>
              <a
                href={`https://instagram.com/${dj.instagramHandle}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-lg text-muted-foreground hover:text-primary transition-colors"
              >
                <Instagram className="mr-2 h-5 w-5" />
                @{dj.instagramHandle}
              </a>
            </div>

            <div className="prose prose-invert max-w-none">
              <p className="text-xl text-primary font-medium leading-relaxed italic">
                "{dj.resumoBooking}"
              </p>
              <div className="h-px w-20 bg-primary/30 my-6" />
              <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {dj.bioLonga}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-7 shadow-xl shadow-primary/20">
                <Link href="https://wa.me/5521976950231" target="_blank">
                  <MessageCircle className="mr-2 h-6 w-6" />
                  Contratar Agora
                </Link>
              </Button>
              
              <div className="flex gap-4">
                <Button variant="outline" size="lg" className="flex-1 py-7" asChild>
                  <a href={dj.presskitUrl} target="_blank" rel="noreferrer">
                    <FileText className="mr-2 h-5 w-5" />
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
