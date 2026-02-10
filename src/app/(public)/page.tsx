'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Star } from 'lucide-react';

/**
 * Landing Page pública (Vitrine).
 * Ponto de entrada oficial para clientes e booking.
 */
export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background py-24 sm:py-32 flex flex-col items-center justify-center text-center">
        <div className="container relative z-10 px-4 sm:px-6 flex flex-col items-center justify-center">
          <div className="mx-auto max-w-3xl flex flex-col items-center justify-center">
            <div className="mb-8 flex justify-center w-full">
              <div className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold leading-6 text-primary ring-1 ring-inset ring-primary/20 uppercase tracking-widest">
                Curadoria Premium de DJs
              </div>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-7xl font-headline leading-[1.1] text-center">
              Eleve o nível sonoro do seu <span className="text-primary">Evento</span>
            </h1>
            <p className="mt-8 text-lg sm:text-xl leading-8 text-muted-foreground max-w-2xl font-body text-center">
              Conectamos você aos DJs mais talentosos e versáteis do mercado carioca. 
              Da elegância do Deep House à explosão do Open Format.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 w-full">
              <Button asChild size="lg" className="bg-primary text-black font-black hover:bg-primary/90 px-8 py-7 text-lg rounded-full transition-transform hover:scale-105">
                <Link href="/djs">
                  Ver nosso elenco <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Link href="/login" className="text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                Acesso Restrito <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Background Blur Decor */}
        <div className="absolute top-0 -z-10 h-full w-full opacity-30">
          <div className="absolute left-[50%] top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        </div>
      </section>

      {/* Stats/Quick Features */}
      <section className="border-y border-white/5 bg-card/30 backdrop-blur-sm py-20">
        <div className="container px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-3 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-3 rounded-2xl bg-primary/10">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <div className="flex flex-col items-center">
                <dt className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Curadoria</dt>
                <dd className="text-3xl font-black text-foreground font-headline">Premium</dd>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-3 rounded-2xl bg-primary/10">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <div className="flex flex-col items-center">
                <dt className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Eventos Realizados</dt>
                <dd className="text-3xl font-black text-foreground font-headline">+500</dd>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-3 rounded-2xl bg-primary/10">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <div className="flex flex-col items-center">
                <dt className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Atendimento</dt>
                <dd className="text-3xl font-black text-foreground font-headline">Exclusivo</dd>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
