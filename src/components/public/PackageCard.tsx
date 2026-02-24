
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { type RentalPackage } from '@/lib/public-rental-packages';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export function PackageCard({ pkg }: { pkg: RentalPackage }) {
  return (
    <div className="group flex flex-col h-full bg-card/30 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm transition-all duration-500 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(132,255,30,0.1)]">
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
          <span className="px-3 py-1 rounded-full bg-primary text-black text-[10px] font-black uppercase tracking-widest">
            Audio Experience
          </span>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-xl font-black font-headline uppercase tracking-tight mb-2 group-hover:text-primary transition-colors">
          {pkg.title}
        </h3>
        <p className="text-sm text-muted-foreground font-body mb-6 line-clamp-2">
          {pkg.subtitle}
        </p>

        <ul className="space-y-2 mb-8 flex-1">
          {pkg.highlights.map((h) => (
            <li key={h} className="flex items-start gap-2 text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
              <CheckCircle2 className="h-3 w-3 text-primary shrink-0 mt-0.5" />
              <span>{h}</span>
            </li>
          ))}
        </ul>

        <Button asChild className="w-full bg-transparent border border-white/10 hover:bg-primary hover:text-black hover:border-primary rounded-full py-6 text-xs font-black uppercase tracking-widest transition-all duration-300">
          <Link href={`/equipamentos/orcamento?estrutura=${pkg.slug}`}>
            Solicitar Orçamento <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
