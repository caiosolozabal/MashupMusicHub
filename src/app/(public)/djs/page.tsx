
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';
import { PUBLIC_DJS, type PublicDj } from '@/lib/public-djs';
import { RENTAL_PACKAGES } from '@/lib/public-rental-packages';
import { PackageCard } from '@/components/public/PackageCard';
import { cn } from '@/lib/utils';
import { Music2, Star } from 'lucide-react';

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
      className="object-cover transition-transform duration-700 group-hover:scale-110"
      unoptimized={true}
      onError={() => setError(true)}
    />
  );
}

export default function DjsGridPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('Todos');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Extrair todos os estilos únicos para os filtros
  const allStyles = useMemo(() => {
    const styles = new Set<string>();
    PUBLIC_DJS.forEach(dj => dj.estilos.forEach(s => styles.add(s)));
    return ['Todos', ...Array.from(styles).sort()];
  }, []);

  // Filtrar DJs baseados na seleção
  const filteredDjs = useMemo(() => {
    if (selectedStyle === 'Todos') return PUBLIC_DJS;
    return PUBLIC_DJS.filter(dj => dj.estilos.includes(selectedStyle));
  }, [selectedStyle]);

  if (!isMounted) return null;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-16 sm:py-24">
      <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-4">
            <Star className="h-3 w-3 fill-primary" /> Curadoria Exclusiva
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-foreground sm:text-7xl font-headline leading-[0.9]">
            Nosso <span className="text-primary">Elenco</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground font-body leading-relaxed">
            DJs que dominam a técnica e a leitura de pista. Do corporativo sofisticado aos festivais mais intensos.
          </p>
        </div>

        {/* Filtros Interativos */}
        <div className="flex flex-wrap gap-2">
          {allStyles.map((style) => (
            <button
              key={style}
              onClick={() => setSelectedStyle(style)}
              className={cn(
                "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 border",
                selectedStyle === style
                  ? "bg-primary text-black border-primary shadow-[0_0_15px_rgba(132,255,30,0.4)]"
                  : "bg-transparent text-muted-foreground border-white/10 hover:border-primary/50 hover:text-primary"
              )}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8">
        {filteredDjs.map((dj, index) => (
          <div 
            key={dj.slug} 
            className="animate-in fade-in slide-in-from-bottom-4 duration-500" 
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <Link href={`/djs/${dj.slug}`} className="group relative flex flex-col h-full w-full">
              {/* Card da Foto com Glow Neon */}
              <div className="aspect-[3/4] w-full overflow-hidden rounded-xl bg-card ring-1 ring-white/10 transition-all duration-500 group-hover:ring-primary group-hover:shadow-[0_0_30px_rgba(132,255,30,0.2)] relative">
                <div className="relative h-full w-full">
                  <DjImage dj={dj} />
                  {/* Overlay gradiente mais denso */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-80" />
                  
                  {/* Badge de Hover */}
                  <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                    <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                      Ver Perfil <Music2 className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex flex-col flex-1 space-y-3 px-1">
                <h3 className="text-xl font-black text-foreground font-headline truncate group-hover:text-primary transition-colors uppercase tracking-tight leading-none">
                  {dj.nome}
                </h3>
                
                <div className="flex flex-wrap gap-1.5">
                  {dj.estilos.slice(0, 2).map((estilo) => (
                    <span 
                      key={estilo} 
                      className="text-[8px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground uppercase font-black tracking-widest group-hover:border-primary/30 group-hover:text-primary/80 transition-colors"
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
          </div>
        ))}

        {/* Card de Locação como Teaser (sempre aparece se o estilo for "Todos" ou "Open Format") */}
        {(selectedStyle === 'Todos' || selectedStyle === 'Open Format') && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <PackageCard pkg={RENTAL_PACKAGES[2]} />
          </div>
        )}
      </div>
    </div>
  );
}
