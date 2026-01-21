'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import RentalItemsTab from '@/components/settings/RentalItemsTab';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export default function RentalItemsPage() {
  const { userDetails } = useAuth();
  const { toast } = useToast();

   useEffect(() => {
    if (userDetails && userDetails.role !== 'admin' && userDetails.role !== 'partner') {
        toast({
            variant: 'destructive',
            title: 'Acesso Negado',
            description: 'Você não tem permissão para gerenciar os itens de locação.',
        })
    }
   }, [userDetails, toast])

  if (userDetails?.role !== 'admin' && userDetails?.role !== 'partner') {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Acesso Restrito</CardTitle>
                <CardDescription>Apenas administradores e sócios podem gerenciar o catálogo.</CardDescription>
            </CardHeader>
        </Card>
    )
  }

  return (
    <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="font-headline">Catálogo de Locação</CardTitle>
            <CardDescription>
                Adicione, edite ou remova os itens disponíveis para locação.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <RentalItemsTab />
        </CardContent>
    </Card>
  );
}
