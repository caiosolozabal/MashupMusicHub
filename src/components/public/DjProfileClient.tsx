'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { type PublicDj } from '@/lib/public-djs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Instagram, ArrowLeft, MessageSquare } from 'lucide-react';

export default function DjProfileClient({ dj }: { dj: PublicDj }) {
  const [imageError, setImageError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-8 sm:py-12">
        <Button variant="ghost" asChild className="mb-8 -ml-4 text-muted-foreground hover:text-primary">
          <Link href="/djs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o elenco
          </Link>
        </Button>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Coluna da Imagem */}
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-card ring-1 ring-white/10">
            {imageError ? (
              <div className="flex h-full w-full items-center justify-center bg-secondary">
                <span className="text-6xl font-bold text-primary font-headline">
                  {dj.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </span>
              </div>
            ) : (
              <Image
                src={dj.fotoUrl}
                alt={dj.nome}
                fill
                className="object-cover"
                unoptimized={true}
                priority
                onError={() => setImageError(true)}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
          </div>

          {/* Coluna de Texto */}
          <div className="flex flex-col justify-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-7xl font-headline">
                {dj.nome}
              </h1>
              
              <div className="flex flex-wrap gap-2">
                {dj.estilos.map((estilo) => (
                  <Badge key={estilo} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {estilo}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4 text-lg leading-relaxed text-muted-foreground">
                {dj.bioLonga.split('\n\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>

              <div className="pt-6 flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="bg-primary text-black font-bold hover:bg-primary/90 flex-1">
                  <Link href="https://wa.me/5521976950231" target="_blank">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Contratar agora
                  </Link>
                </Button>
                
                <Button asChild variant="outline" size="lg" className="border-white/10 hover:bg-white/5 flex-1">
                  <Link href={`https://instagram.com/${dj.instagramHandle.replace('@', '')}`} target="_blank">
                    <Instagram className="mr-2 h-5 w-5" />
                    Siga no Instagram
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}