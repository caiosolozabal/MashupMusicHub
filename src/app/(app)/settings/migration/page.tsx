
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Database } from 'lucide-react';

export default function MigrationPage() {
  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Ferramentas de Migração</h1>
            <p className="text-muted-foreground">
            Acesse dados de sistemas anteriores para consulta.
            </p>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Banco de Dados Antigo (listeiro-cf302)</CardTitle>
                <CardDescription>
                    Acesse uma visualização somente leitura dos dados do sistema legado.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/settings/migration/events">
                        <Database className="mr-2 h-4 w-4" />
                        Ver Eventos Antigos
                    </Link>
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
