
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { PUBLIC_DJS } from '@/lib/public-djs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Instagram, FileText } from 'lucide-react';
import placeholderImages from '@/app/lib/placeholder-images.json';

/**
 * Página de Catálogo de DJs (Grid).
 */
export default function DjsGridPage() {
  return (
    <div className="container px-4 py-16 sm:px-6 sm:py-24">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl font-headline">
          Nosso <span className="text-primary">Elenco</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          DJs selecionados para transformar a atmosfera do seu evento com técnica e identidade sonora.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
        {PUBLIC_DJS.map((dj) => (
          <Link key={dj.slug} href={`/djs/${dj.slug}`} className="group relative flex flex-col">
            <div className="aspect-[3/4] w-full overflow-hidden rounded-xl bg-muted ring-1 ring-border transition-all group-hover:ring-primary/50 group-hover:shadow-2xl group-hover:shadow-primary/10">
              <Image
                src={dj.fotoUrl}
                alt={dj.nome}
                width={600}
                height={800}
                className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                priority
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = placeholderImages.dj_fallback.url;
                }}
                data-ai-hint="dj profile"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-80" />
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-foreground font-headline group-hover:text-primary transition-colors">
                  {dj.nome}
                </h3>
                <div className="flex gap-2">
                  <a
                    href={`https://instagram.com/${dj.instagramHandle}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {dj.estilos.map((estilo) => (
                  <Badge key={estilo} variant="secondary" className="text-[10px] uppercase tracking-wider">
                    {estilo}
                  </Badge>
                ))}
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2">
                {dj.resumoBooking}
              </p>

              <div className="pt-2 flex gap-2">
                <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                  <span>Ver perfil completo</span>
                </Button>
                <Button variant="ghost" size="sm" className="px-2" asChild>
                  <a
                    href={dj.presskitUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Presskit"
                  >
                    <FileText className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
