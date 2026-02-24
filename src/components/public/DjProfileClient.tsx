
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { type PublicDj } from '@/lib/public-djs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Instagram, FileText, ArrowLeft, MessageCircle, Music2 } from 'lucide-react';

export default function DjProfileClient({ dj }: { dj: PublicDj }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header Mobile / Voltar */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Link href="/djs" className="inline-flex items-center text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o Elenco
        </Link>
      </div>

      <div className="container mx-auto max-w-7xl px-4 pb-24">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          
          {/* Coluna Imagem */}
          <div className="lg:col-span-5">
            <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
              {!imageError ? (
                <Image
                  src={dj.fotoUrl}
                  alt={dj.nome}
                  fill
                  className="object-cover"
                  onError={() => setImageError(true)}
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-secondary">
                  <Music2 className="h-20 w-20 text-primary opacity-20" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
            </div>
          </div>

          {/* Coluna Conteúdo */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              <div className="flex flex-wrap gap-2 mb-6">
                {dj.estilos.map((estilo) => (
                  <Badge key={estilo} variant="secondary" className="bg-white/5 text-primary border-primary/20 font-black uppercase text-[10px] tracking-widest px-3 py-1">
                    {estilo}
                  </Badge>
                ))}
              </div>
              <h1 className="text-6xl sm:text-8xl font-black font-headline tracking-tighter leading-[0.8] uppercase mb-6">
                {dj.nome}
              </h1>
              <p className="text-xl text-muted-foreground font-body leading-relaxed max-w-2xl">
                {dj.resumoBooking}
              </p>
            </div>

            <div className="prose prose-invert max-w-none">
              <div className="space-y-4 text-muted-foreground leading-relaxed whitespace-pre-line font-body">
                {dj.bioLonga}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <Button asChild size="lg" className="bg-primary text-black font-black uppercase tracking-widest rounded-full px-8 py-7 hover:scale-105 transition-transform">
                <Link href={`https://wa.me/5521976950231?text=${encodeURIComponent(`Olá, gostaria de consultar a disponibilidade do DJ ${dj.nome}.`)}`} target="_blank">
                  <MessageCircle className="mr-2 h-5 w-5" /> Reservar Data
                </Link>
              </Button>
              
              <div className="flex gap-2">
                <Button asChild variant="outline" size="lg" className="border-white/10 hover:border-primary hover:text-primary rounded-full px-6 py-7">
                  <Link href={`https://instagram.com/${dj.instagramHandle}`} target="_blank">
                    <Instagram className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-white/10 hover:border-primary hover:text-primary rounded-full px-6 py-7">
                  <Link href={dj.presskitUrl} target="_blank">
                    <FileText className="h-5 w-5" />
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
