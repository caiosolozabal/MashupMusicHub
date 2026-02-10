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
      <section className="relative overflow-hidden bg-background py-24 sm:py-32">
        <div className="container relative z-10 px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-8 flex justify-center">
              <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold leading-6 text-primary ring-1 ring-inset ring-primary/20">
                A melhor curadoria de DJs do Brasil
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl font-headline">
              Eleve o nível sonoro do seu <span className="text-primary">Evento</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Conectamos você aos DJs mais talentosos e versáteis do mercado. 
              Da elegância do Deep House à explosão do Open Format.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button asChild size="lg" className="bg-primary text-primary-foreground">
                <Link href="/djs">
                  Ver nosso elenco <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Link href="/login" className="text-sm font-semibold leading-6 text-muted-foreground hover:text-primary">
                Acesso Restrito <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Background Blur Decor */}
        <div className="absolute top-0 -z-10 h-full w-full opacity-20">
          <div className="absolute left-[50%] top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary blur-[120px]" />
        </div>
      </section>

      {/* Stats/Quick Features */}
      <section className="border-y bg-card py-16">
        <div className="container px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 text-center">
            <div className="flex flex-col items-center">
              <Star className="h-8 w-8 text-primary mb-2" />
              <dt className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Curadoria</dt>
              <dd className="text-3xl font-bold tracking-tight text-foreground">Premium</dd>
            </div>
            <div className="flex flex-col items-center">
              <Star className="h-8 w-8 text-primary mb-2" />
              <dt className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Eventos Realizados</dt>
              <dd className="text-3xl font-bold tracking-tight text-foreground">+500</dd>
            </div>
            <div className="flex flex-col items-center">
              <Star className="h-8 w-8 text-primary mb-2" />
              <dt className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Atendimento</dt>
              <dd className="text-3xl font-bold tracking-tight text-foreground">Exclusivo</dd>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
