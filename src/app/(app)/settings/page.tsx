'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import UserManagementTab from '@/components/settings/UserManagementTab';
import AgencyAccountsTab from '@/components/settings/AgencyAccountsTab';
import { useAuth } from '@/hooks/useAuth';
import { Building, Cog, Users, DatabaseZap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const { userDetails } = useAuth();

  const canViewSettings = userDetails?.role === 'admin' || userDetails?.role === 'partner';

  if (!canViewSettings && userDetails?.role === 'dj') {
      return (
         <div className="space-y-6">
             <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Configurações</h1>
                <p className="text-muted-foreground">
                    Sua visão de configurações é limitada.
                </p>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Acesso Restrito</CardTitle>
                </CardHeader>
                <CardContent>
                <p>Nesta seção, apenas administradores e sócios podem gerenciar as configurações da plataforma.</p>
                </CardContent>
            </Card>
        </div>
      )
  }


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Configurações da Plataforma</h1>
        <p className="text-muted-foreground">
          Gerencie usuários, dados da agência e outras configurações do sistema.
        </p>
      </div>

       <Card className="shadow-lg bg-secondary/50">
        <CardHeader>
            <CardTitle className="font-headline flex items-center">
                <DatabaseZap className="mr-3 h-6 w-6 text-primary" />
                Backup e Migração de Dados
            </CardTitle>
            <CardDescription>
                Acesse a ferramenta para extrair todos os dados do projeto 'listeiro-cf302' antes de migrarmos para o novo projeto.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild size="lg">
                <Link href="/settings/backup">
                    Ir para a Página de Backup
                </Link>
            </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="user-management" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <TabsTrigger value="user-management">
            <Users className="mr-2 h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="agency-accounts">
            <Building className="mr-2 h-4 w-4" />
            Contas
          </TabsTrigger>
          <TabsTrigger value="general-settings">
            <Cog className="mr-2 h-4 w-4" />
            Geral
          </TabsTrigger>
        </TabsList>

        <TabsContent value="user-management">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="font-headline">Gerenciamento de Usuários e DJs</CardTitle>
              <CardDescription>
                Visualize e edite os perfis, funções e detalhes dos DJs cadastrados na plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagementTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agency-accounts">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="font-headline">Contas Bancárias da Agência</CardTitle>
              <CardDescription>
                Gerencie as contas bancárias da Mashup Music.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgencyAccountsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general-settings">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="font-headline">Configurações Gerais</CardTitle>
              <CardDescription>
                Parâmetros e configurações globais do sistema. (Funcionalidade em desenvolvimento)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em breve: opções como percentual padrão de DJ, modo padrão da agenda, etc.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
