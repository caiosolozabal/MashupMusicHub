'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Database, Upload } from 'lucide-react';

export default function MigrationPage() {
  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Ferramentas de Migração</h1>
            <p className="text-muted-foreground">
            Acesse dados de sistemas anteriores ou execute importações em lote.
            </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
             <Card>
                <CardHeader>
                    <CardTitle>Importar Itens de Locação</CardTitle>
                    <CardDescription>
                       Execute a importação em lote dos itens de locação da sua planilha.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/settings/migration/items">
                            <Upload className="mr-2 h-4 w-4" />
                            Importar Itens
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
