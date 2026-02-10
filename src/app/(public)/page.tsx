'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Star } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background py-24 sm:py-32">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-8">
              <div className="rounded-full bg-primary/10 px-4 py-1.5 text-[10px] font-black leading-6 text-primary ring-1 ring-inset ring-primary/20 uppercase tracking-[0.3em]">
                Curadoria Premium de DJs
              </div>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-7xl font-headline leading-[1] max-w-4xl">
              Eleve o nível sonoro do seu <span className="text-primary">Evento</span>
            </h1>
            <p className="mt-8 text-lg sm:text-xl leading-relaxed text-muted-foreground max-w-2xl font-body">
              Conectamos você aos DJs mais talentosos e versáteis do mercado carioca. 
              Da elegância do Deep House à explosão do Open Format.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button asChild size="lg" className="bg-primary text-black font-black hover:bg-primary/90 px-10 py-7 text-lg rounded-full transition-transform hover:scale-105 uppercase tracking-widest">
                <Link href="/djs">
                  Ver elenco <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Link href="/login" className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors">
                Acesso Restrito <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Background Blur Decor */}
        <div className="absolute top-0 -z-10 h-full w-full opacity-30 pointer-events-none">
          <div className="absolute left-[50%] top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        </div>
      </section>

      {/* Stats/Quick Features */}
      <section className="border-y border-white/5 bg-card/30 backdrop-blur-sm py-20">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Curadoria</span>
                <span className="text-3xl font-black text-foreground font-headline">Premium</span>
              </div>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Eventos Realizados</span>
                <span className="text-3xl font-black text-foreground font-headline">+500</span>
              </div>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Atendimento</span>
                <span className="text-3xl font-black text-foreground font-headline">Exclusivo</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
