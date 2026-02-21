'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { PUBLIC_DJS, type PublicDj } from '@/lib/public-djs';
import { RENTAL_PACKAGES } from '@/lib/public-rental-packages';
import { PackageCard } from '@/components/public/PackageCard';

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
      className="object-cover"
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
    <div className="container mx-auto max-w-7xl px-4 py-16 sm:py-24">
      <div className="mb-16">
        <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-6xl font-headline">
          Nosso <span className="text-primary">Elenco</span>
        </h1>
        <p className="mt-4 text-base text-muted-foreground max-w-xl font-body leading-relaxed">
          Curadoria exclusiva dos melhores DJs do Rio de Janeiro para elevar o nível do seu evento.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8">
        {PUBLIC_DJS.map((dj, index) => {
          // Inserir o card de locação na quarta posição (índice 3) para cross-selling
          if (index === 3) {
            return <PackageCard key="rental-teaser" pkg={RENTAL_PACKAGES[2]} />; // Mostra o pacote Casamento como destaque
          }
          
          return (
            <Link key={dj.slug} href={`/djs/${dj.slug}`} className="group relative flex flex-col h-full w-full">
              <div className="aspect-[3/4] w-full overflow-hidden rounded-xl bg-card ring-1 ring-primary/20 transition-all group-hover:ring-primary shadow-2xl relative">
                <div className="relative h-full w-full transition-transform duration-700 group-hover:scale-110">
                  <DjImage dj={dj} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60" />
                </div>
              </div>
              
              <div className="mt-6 flex flex-col flex-1 space-y-3">
                <h3 className="text-lg font-black text-foreground font-headline truncate group-hover:text-primary transition-colors uppercase tracking-tight">
                  {dj.nome}
                </h3>
                
                <div className="flex flex-wrap gap-1.5">
                  {dj.estilos.slice(0, 2).map((estilo) => (
                    <span 
                      key={estilo} 
                      className="text-[8px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary uppercase font-black tracking-widest"
                    >
                      {estilo}
                    </span>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed font-body">
                  {dj.resumoBooking}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
