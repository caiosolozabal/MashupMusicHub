
'use client';

import Image from 'next/image';
import { PublicDj } from '@/lib/public-djs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Instagram, FileText, MessageCircle } from 'lucide-react';
import placeholderImages from '@/app/lib/placeholder-images.json';
import Link from 'next/link';

interface DjProfileClientProps {
  dj: PublicDj;
}

export default function DjProfileClient({ dj }: DjProfileClientProps) {
  const whatsappUrl = `https://wa.me/5521976950231?text=Olá! Gostaria de solicitar um orçamento para o DJ ${dj.nome}.`;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative w-full h-[60vh] md:h-[80vh] overflow-hidden">
        <Image
          src={dj.fotoUrl}
          alt={dj.nome}
          fill
          className="object-cover object-top"
          priority
          unoptimized={true}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = placeholderImages.dj_fallback.url;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full p-6 sm:p-12">
          <div className="container mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground font-headline mb-4">
              {dj.nome}
            </h1>
            <div className="flex flex-wrap gap-2 mb-6">
              {dj.estilos.map((estilo) => (
                <Badge key={estilo} variant="default" className="px-4 py-1 text-sm uppercase tracking-widest font-bold">
                  {estilo}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Bio Side */}
          <div className="lg:col-span-2 space-y-8">
            <div className="prose prose-invert max-w-none">
              <h2 className="text-3xl font-bold font-headline mb-6 text-primary">Biografia</h2>
              <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {dj.bioLonga}
              </p>
            </div>
          </div>

          {/* Booking Side */}
          <div className="space-y-6">
            <div className="p-8 rounded-2xl border bg-card/50 backdrop-blur-sm sticky top-24">
              <h3 className="text-xl font-bold font-headline mb-6">Booking & Social</h3>
              
              <div className="flex flex-col gap-4">
                <Button asChild size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-14 text-lg font-bold">
                  <Link href={whatsappUrl} target="_blank">
                    <MessageCircle className="mr-2 h-6 w-6" />
                    Contrate Agora
                  </Link>
                </Button>

                <Button asChild variant="outline" size="lg" className="w-full h-14">
                  <Link href={`https://instagram.com/${dj.instagramHandle}`} target="_blank">
                    <Instagram className="mr-2 h-5 w-5" />
                    Instagram
                  </Link>
                </Button>

                <Button asChild variant="ghost" size="lg" className="w-full h-14">
                  <Link href={dj.presskitUrl} target="_blank">
                    <FileText className="mr-2 h-5 w-5" />
                    Baixar Presskit
                  </Link>
                </Button>
              </div>

              <div className="mt-8 pt-8 border-t">
                <p className="text-sm text-muted-foreground italic text-center">
                  "{dj.resumoBooking}"
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
