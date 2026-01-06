'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AgencyAccountsTab from '@/components/settings/AgencyAccountsTab';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export default function AgencyAccountsPage() {
  const { userDetails } = useAuth();
  const { toast } = useToast();

   useEffect(() => {
    if (userDetails && userDetails.role !== 'admin' && userDetails.role !== 'partner') {
        toast({
            variant: 'destructive',
            title: 'Acesso Negado',
            description: 'Você não tem permissão para gerenciar as contas da agência.',
        })
    }
   }, [userDetails, toast])

  if (userDetails?.role !== 'admin' && userDetails?.role !== 'partner') {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Acesso Restrito</CardTitle>
                <CardDescription>Apenas administradores e sócios podem gerenciar as contas da agência.</CardDescription>
            </CardHeader>
        </Card>
    )
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Contas Bancárias da Agência</CardTitle>
        <CardDescription>
          Gerencie as contas bancárias da agência para recebimentos e pagamentos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AgencyAccountsTab />
      </CardContent>
    </Card>
  );
}