'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { PUBLIC_DJS, type PublicDj } from '@/lib/public-djs';
import { Badge } from '@/components/ui/badge';
import { Instagram } from 'lucide-react';

function DjImage({ dj }: { dj: PublicDj }) {
  const [error, setError] = useState(false);

  if (error) {
    const initials = dj.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    return (
      <div className="flex h-full w-full items-center justify-center bg-secondary">
        <span className="text-2xl font-bold text-primary font-headline">{initials}</span>
      </div>
    );
  }

  return (
    <Image
      src={dj.fotoUrl}
      alt={dj.nome}
      fill
      className="object-cover transition-transform duration-500 group-hover:scale-105"
      unoptimized={true}
      onError={() => setError(true)}
    />
  );
}

export default function DjsGridPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="container px-4 py-12 sm:py-20">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl font-headline">
          Nosso <span className="text-primary">Elenco</span>
        </h1>
        <p className="mt-3 text-base text-muted-foreground max-w-xl mx-auto">
          Curadoria exclusiva dos melhores DJs do Rio de Janeiro para o seu evento.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
        {PUBLIC_DJS.map((dj) => (
          <Link key={dj.slug} href={`/djs/${dj.slug}`} className="group relative flex flex-col">
            <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-card ring-1 ring-border transition-all group-hover:ring-primary/50">
              <DjImage dj={dj} />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-40 group-hover:opacity-60" />
            </div>
            
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground font-headline truncate pr-2">
                  {dj.nome}
                </h3>
                <span className="text-muted-foreground hover:text-primary transition-colors">
                  <Instagram className="h-4 w-4" />
                </span>
              </div>
              
              <p className="text-[10px] text-primary font-semibold uppercase tracking-tighter line-clamp-1">
                {dj.estilos.join(' • ')}
              </p>
              
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {dj.resumoBooking}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
