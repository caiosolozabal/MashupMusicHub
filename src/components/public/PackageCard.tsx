'use client';

import Image from 'next/image';
import Link from 'next/link';
import { type RentalPackage } from '@/lib/public-rental-packages';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function PackageCard({ pkg }: { pkg: RentalPackage }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="group flex flex-col h-full bg-card/30 rounded-3xl border border-white/5 overflow-hidden transition-all duration-500 hover:border-primary/30 hover:shadow-[0_0_40px_rgba(132,255,30,0.1)]">
      {/* Imagem do Pacote */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {!imageError ? (
          <Image
            src={pkg.images[0]}
            alt={pkg.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary/20">
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Imagem em breve</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        
        {/* Badge Flutuante */}
        <div className="absolute top-4 left-4">
          <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-black text-primary uppercase tracking-widest">
            Premium Choice
          </div>
        </div>
      </div>

      {/* Conteúdo do Card */}
      <div className="flex flex-col flex-1 p-6 sm:p-8">
        <div className="mb-6">
          <h3 className="text-2xl font-black font-headline tracking-tighter uppercase leading-none mb-2 group-hover:text-primary transition-colors">
            {pkg.title}
          </h3>
          <p className="text-sm text-muted-foreground font-body">
            {pkg.subtitle}
          </p>
        </div>

        {/* Highlights com Checks Verdes */}
        <div className="space-y-3 mb-8">
          {pkg.highlights.map((h) => (
            <div key={h} className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-primary fill-primary/10" />
              </div>
              <span className="text-sm font-bold text-foreground/90 tracking-tight">{h}</span>
            </div>
          ))}
        </div>

        {/* Botão de Ação */}
        <div className="mt-auto">
          <Button asChild className="w-full bg-primary text-black font-black uppercase text-xs tracking-widest py-6 rounded-2xl transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <Link href={`/equipamentos/orcamento?estrutura=${pkg.slug}`}>
              Solicitar Orçamento <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          
          <Link 
            href={`/equipamentos/${pkg.slug}`} 
            className="block text-center mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
          >
            Ver detalhes técnicos
          </Link>
        </div>
      </div>
    </div>
  );
}
