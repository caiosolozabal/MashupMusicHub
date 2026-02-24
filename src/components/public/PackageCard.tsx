
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { type RentalPackage } from '@/lib/public-rental-packages';
import { Button } from '@/components/ui/button';
import { ArrowRight, Package } from 'lucide-react';

interface PackageCardProps {
  pkg: RentalPackage;
}

export function PackageCard({ pkg }: PackageCardProps) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-card/30 transition-all duration-500 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(132,255,30,0.1)]">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={pkg.images[0]}
          alt={pkg.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-4">
          <div className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-primary backdrop-blur-md">
            <Package className="h-3 w-3" /> Audio Experience
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-headline text-xl font-black uppercase tracking-tight text-foreground group-hover:text-primary transition-colors">
          {pkg.title}
        </h3>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {pkg.subtitle}
        </p>
        
        <ul className="mt-6 flex-1 space-y-2">
          {pkg.highlights.map((h) => (
            <li key={h} className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-medium">
              <div className="h-1 w-1 rounded-full bg-primary" />
              {h}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-3">
          <Button asChild variant="outline" className="w-full border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-black hover:border-primary">
            <Link href={`/equipamentos/${pkg.slug}`}>
              Ver Detalhes
            </Link>
          </Button>
          <Button asChild className="w-full bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:bg-primary/90">
            <Link href={`/equipamentos/orcamento?estrutura=${pkg.slug}`}>
              Solicitar Orçamento <ArrowRight className="ml-2 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
