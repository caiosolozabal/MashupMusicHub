
'use client';

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Logo from '@/components/shared/Logo';
import { Instagram, MessageCircle } from 'lucide-react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="theme-neon flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300">
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/95 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-12">
              <Logo />
              <nav className="hidden md:flex gap-8">
                <Link href="/djs" className="text-xs font-black uppercase tracking-widest transition-colors hover:text-primary">
                  Elenco
                </Link>
                <Link href="/equipamentos" className="text-xs font-black uppercase tracking-widest transition-colors hover:text-primary">
                  Audio Experience
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              <Button asChild variant="default" className="bg-primary text-black font-black hover:bg-primary/90 rounded-full px-6 text-xs uppercase tracking-widest">
                <Link href="https://wa.me/5521976950231" target="_blank">
                  Contrate agora
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10 bg-background">
        {children}
      </main>

      <footer className="relative z-20 border-t border-white/5 bg-[#050505] py-16">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="flex flex-col items-start space-y-6">
              <Logo />
              <p className="text-sm text-white/70 max-w-xs font-body leading-relaxed">
                A agência que conecta os melhores talentos da música aos eventos mais exclusivos do Brasil.
              </p>
            </div>
            
            <div className="flex flex-col items-start space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Navegação</h4>
              <nav className="flex flex-col gap-3">
                <Link href="/djs" className="text-sm text-white/80 hover:text-primary transition-colors font-body">Elenco</Link>
                <Link href="/equipamentos" className="text-sm text-white/80 hover:text-primary transition-colors font-body">Audio Experience</Link>
                <Link href="/login" className="text-sm text-white/80 hover:text-primary transition-colors font-body">Área Restrita</Link>
              </nav>
            </div>

            <div className="flex flex-col items-start space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Contato</h4>
              <div className="flex gap-6">
                <Link 
                  href="https://instagram.com/mashuprio" 
                  target="_blank" 
                  className="text-white/80 hover:text-primary transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="h-6 w-6" />
                </Link>
                <Link 
                  href="https://wa.me/5521976950231" 
                  target="_blank" 
                  className="text-white/80 hover:text-primary transition-colors"
                  aria-label="WhatsApp"
                >
                  <MessageCircle className="h-6 w-6" />
                </Link>
              </div>
            </div>
          </div>
          
          <div className="mt-16 border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-black">
              © {isMounted ? new Date().getFullYear() : ''} Mashup Music Hub. Todos os direitos reservados.
            </p>
            <span className="text-[10px] font-black text-primary/40 tracking-widest uppercase">Preview Mode v1.1</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
