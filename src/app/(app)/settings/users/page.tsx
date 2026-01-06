'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import UserManagementTab from '@/components/settings/UserManagementTab';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export default function UserManagementPage() {
  const { userDetails } = useAuth();
  const { toast } = useToast();

   useEffect(() => {
    if (userDetails && userDetails.role !== 'admin' && userDetails.role !== 'partner') {
        toast({
            variant: 'destructive',
            title: 'Acesso Negado',
            description: 'Você não tem permissão para gerenciar usuários.',
        })
    }
   }, [userDetails, toast])

  if (userDetails?.role !== 'admin' && userDetails?.role !== 'partner') {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Acesso Restrito</CardTitle>
                <CardDescription>Apenas administradores e sócios podem gerenciar usuários.</CardDescription>
            </CardHeader>
        </Card>
    )
  }

  return (
    <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="font-headline">Gerenciar Usuários</CardTitle>
            <CardDescription>
                Edite funções, permissões e detalhes dos usuários da plataforma.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <UserManagementTab />
        </CardContent>
    </Card>
  );
}