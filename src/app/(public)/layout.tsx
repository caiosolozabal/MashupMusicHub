'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Logo from '@/components/shared/Logo';
import { Instagram, Mail } from 'lucide-react';

/**
 * Layout para a área pública (Vitrine).
 * Independente do AppShell e sem dependências obrigatórias de Auth.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header Público */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden md:flex gap-6">
              <Link href="/djs" className="text-sm font-medium transition-colors hover:text-primary">
                Nossos DJs
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <Button asChild variant="default" className="bg-primary hover:bg-primary/90">
              <Link href="https://wa.me/5521999999999" target="_blank">
                Contrate agora
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer Público */}
      <footer className="border-t bg-card py-12">
        <div className="container px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <Logo />
              <p className="text-sm text-muted-foreground max-w-xs">
                A agência que conecta os melhores talentos da música aos eventos mais exclusivos do Brasil.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider">Navegação</h4>
              <nav className="flex flex-col gap-2">
                <Link href="/djs" className="text-sm text-muted-foreground hover:text-primary">DJs</Link>
                <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">Área Restrita</Link>
              </nav>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider">Contato</h4>
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
          
          <div className="mt-12 border-t pt-8 text-center">
            <p className="text-xs text-muted-foreground">
              © {currentYear} Mashup Music Hub. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
