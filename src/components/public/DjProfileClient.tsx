'use client';

import { useState, useEffect } from 'react';
import type { PublicDj } from '@/lib/public-djs';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Instagram, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DjProfileClient({ dj }: { dj: PublicDj }) {
  const [error, setError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="container px-4 py-8 sm:py-16">
      <Button variant="ghost" size="sm" asChild className="mb-8 -ml-2 text-muted-foreground hover:text-primary">
        <Link href="/djs">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para o elenco
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Foto do DJ */}
        <div className="relative aspect-[3/4] w-full max-w-md mx-auto lg:mx-0 overflow-hidden rounded-2xl bg-card ring-1 ring-border shadow-2xl shadow-primary/10">
          {!error ? (
            <Image
              src={dj.fotoUrl}
              alt={dj.nome}
              fill
              className="object-cover"
              priority
              unoptimized={true}
              onError={() => setError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary">
              <span className="text-6xl font-bold text-primary/40 font-headline">
                {dj.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Informações */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-black text-foreground sm:text-6xl font-headline tracking-tighter">
              {dj.nome}
            </h1>
            <div className="flex flex-wrap gap-2">
              {dj.estilos.map((estilo) => (
                <Badge key={estilo} variant="secondary" className="text-xs uppercase tracking-widest bg-primary/10 text-primary border-primary/20">
                  {estilo}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="prose prose-invert max-w-none">
              {dj.bioLonga.split('\n\n').map((paragraph, idx) => (
                <p key={idx} className="text-lg text-muted-foreground leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="bg-primary text-black font-bold text-lg px-10 hover:scale-105 transition-transform" asChild>
              <Link href="https://wa.me/5521976950231" target="_blank">
                Contrate agora
              </Link>
            </Button>
            
            <Button variant="outline" size="lg" className="border-primary/50 text-primary hover:bg-primary/10" asChild>
              <a href={`https://instagram.com/${dj.instagramHandle.replace('@', '')}`} target="_blank" rel="noreferrer">
                <Instagram className="mr-2 h-5 w-5" />
                Instagram
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
