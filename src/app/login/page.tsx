
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/auth/LoginForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Se o usuário já estiver logado, redireciona para o dashboard imediatamente
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Enquanto verifica o estado da autenticação, mostra um loader
  if (loading) {
    return (
      <div className="flex h-48 w-full flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Verificando sessão...</p>
      </div>
    );
  }

  // Se já estiver logado, não renderiza o formulário (está redirecionando)
  if (user) {
    return null;
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-3xl text-center">Bem-vindo de Volta!</CardTitle>
        <CardDescription className="text-center">
          Faça login para gerenciar sua agência de DJs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
