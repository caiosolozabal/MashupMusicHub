'use client';

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Logo from '@/components/shared/Logo';
import { Instagram, Mail } from 'lucide-react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevenção de erro de hidratação: o ano só aparece após a montagem no cliente
  const currentYear = isMounted ? new Date().getFullYear() : '';

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Logo className="text-primary font-black" />
            <nav className="hidden md:flex gap-6">
              <Link href="/djs" className="text-sm font-bold uppercase tracking-widest transition-colors hover:text-primary">
                DJs
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <Button asChild variant="default" className="bg-primary text-black font-bold hover:bg-primary/90">
              <Link href="https://wa.me/5521976950231" target="_blank">
                Contrate agora
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-white/5 bg-black/40 py-12">
        <div className="container px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <Logo className="text-primary font-black" />
              <p className="text-sm text-muted-foreground max-w-xs">
                A agência que conecta os melhores talentos da música aos eventos mais exclusivos do Brasil.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-black uppercase tracking-widest text-primary">Navegação</h4>
              <nav className="flex flex-col gap-2">
                <Link href="/djs" className="text-sm text-muted-foreground hover:text-primary">DJs</Link>
                <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">Área Restrita</Link>
              </nav>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-black uppercase tracking-widest text-primary">Contato</h4>
              <div className="flex gap-4">
                <Link href="https://instagram.com/mashupmusichub" target="_blank" className="text-muted-foreground hover:text-primary">
                  <Instagram className="h-5 w-5" />
                </Link>
                <Link href="mailto:contato@mashupmusic.com.br" className="text-muted-foreground hover:text-primary">
                  <Mail className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
          
          <div className="mt-12 border-t border-white/5 pt-8 text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">
              © {currentYear} Mashup Music Hub. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
