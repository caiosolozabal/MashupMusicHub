
'use client';

import { type PublicDj } from '@/lib/public-djs';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Instagram, FileText, ArrowLeft, Music2, Share2 } from 'lucide-react';
import { useState } from 'react';

interface DjProfileClientProps {
  dj: PublicDj;
}

export default function DjProfileClient({ dj }: DjProfileClientProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12 sm:py-20">
      <Link href="/djs" className="inline-flex items-center text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-8">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o Elenco
      </Link>

      <div className="grid lg:grid-cols-12 gap-12 items-start">
        {/* Foto do DJ */}
        <div className="lg:col-span-5">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-white/10 bg-card shadow-2xl">
            <Image
              src={imgError ? 'https://picsum.photos/seed/dj/800/1200' : dj.fotoUrl}
              alt={dj.nome}
              fill
              className="object-cover"
              onError={() => setImgError(true)}
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
          </div>
        </div>

        {/* Informações */}
        <div className="lg:col-span-7 space-y-8">
          <div>
            <h1 className="text-5xl sm:text-7xl font-black font-headline tracking-tighter leading-none mb-4 uppercase">
              {dj.nome}
            </h1>
            <div className="flex flex-wrap gap-2 mb-6">
              {dj.estilos.map((estilo) => (
                <Badge key={estilo} variant="secondary" className="bg-white/5 border-white/10 text-[10px] font-black uppercase tracking-widest py-1 px-3">
                  {estilo}
                </Badge>
              ))}
            </div>
            <p className="text-xl text-primary font-body font-bold uppercase tracking-widest leading-snug max-w-2xl">
              {dj.resumoBooking}
            </p>
          </div>

          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-muted-foreground font-body leading-relaxed text-lg">
              {dj.bioLonga}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-4">
            <Button asChild size="lg" className="bg-primary text-black font-black hover:bg-primary/90 rounded-full px-8 uppercase tracking-widest">
              <Link href={`https://wa.me/5521976950231?text=Olá, gostaria de consultar a disponibilidade para o DJ ${dj.nome}`} target="_blank">
                Contratar DJ
              </Link>
            </Button>
            
            <div className="flex gap-2">
              <Button asChild variant="outline" size="icon" className="rounded-full border-white/10 hover:border-primary hover:text-primary">
                <Link href={`https://instagram.com/${dj.instagramHandle}`} target="_blank" title="Instagram">
                  <Instagram className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="icon" className="rounded-full border-white/10 hover:border-primary hover:text-primary">
                <Link href={dj.presskitUrl} target="_blank" title="Presskit">
                  <FileText className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
