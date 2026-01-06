'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function TempSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSetAdmin = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você não está logado.' });
      return;
    }
    setIsLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        role: 'admin',
      });
      toast({
        title: 'Sucesso!',
        description: 'Sua função foi definida como admin. Por favor, recarregue a página.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao definir função',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuração de Função Temporária</CardTitle>
          <CardDescription>
            Este é um painel de correção. Se você for o administrador principal, clique no botão abaixo para definir sua função.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Logado como: {user ? user.email : 'Ninguém'}
          </p>
          <Button onClick={handleSetAdmin} disabled={isLoading || !user}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Tornar-se Administrador
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
