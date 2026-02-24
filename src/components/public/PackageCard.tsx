'use client';

import Link from 'next/link';
import Image from 'next/image';
import { type RentalPackage } from '@/lib/public-rental-packages';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronRight } from 'lucide-react';

interface PackageCardProps {
  pkg: RentalPackage;
}

export function PackageCard({ pkg }: PackageCardProps) {
  return (
    <div className="group flex flex-col h-full bg-card/20 rounded-2xl border border-white/5 overflow-hidden transition-all duration-500 hover:border-primary/30 hover:shadow-[0_0_30px_rgba(132,255,30,0.1)]">
      {/* Imagem com Overlay */}
      <div className="relative aspect-[4/5] overflow-hidden">
        <Image
          src={pkg.images[0]}
          alt={pkg.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        
        {/* Detalhes ao Hover */}
        <div className="absolute inset-0 p-6 flex flex-col justify-end translate-y-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 bg-black/60 backdrop-blur-sm">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Destaques</h4>
          <ul className="space-y-2">
            {pkg.highlights.map((h) => (
              <li key={h} className="text-[11px] text-white/80 flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1 shrink-0" />
                {h}
              </li>
            ))}
          </ul>
          <Link 
            href={`/equipamentos/${pkg.slug}`}
            className="mt-4 inline-flex items-center text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
          >
            Ver detalhes técnicos <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Conteúdo do Card */}
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-xl font-black font-headline uppercase tracking-tight text-foreground group-hover:text-primary transition-colors">
          {pkg.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-2 font-body font-medium leading-relaxed flex-1">
          {pkg.subtitle}
        </p>
        
        <Button asChild className="mt-6 w-full bg-primary text-black font-black uppercase text-[10px] tracking-widest rounded-full py-6 hover:scale-105 transition-transform shadow-lg shadow-primary/10">
          <Link href={`/equipamentos/orcamento?estrutura=${pkg.slug}`}>
            Solicitar Orçamento
          </Link>
        </Button>
      </div>
    </div>
  );
}
