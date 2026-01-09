
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { db_old } from '@/lib/firebase/migration-client';
import { collection, doc, writeBatch, getDocs, query } from 'firebase/firestore';
import { Loader2, ArrowRight } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';


export default function MigrationPage() {
    const { toast } = useToast();
    const [isMigratingUsers, setIsMigratingUsers] = useState(false);
    const [isSyncingEvents, setIsSyncingEvents] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [migrationLog, setMigrationLog] = useState<string[]>([]);
    
    const handleEventImport = async () => {
        setIsImporting(true);
        setMigrationLog([]);
        const log = (message: string) => {
            console.log(message);
            setMigrationLog(prev => [...prev, message]);
        };

        log("\n--- INICIANDO IMPORTAÇÃO INTELIGENTE DE EVENTOS ---");
        try {
            log("1. Buscando IDs de eventos no banco de dados atual...");
            const currentEventsRef = collection(db, 'events');
            const currentEventsSnapshot = await getDocs(currentEventsRef);
            const currentEventIds = new Set(currentEventsSnapshot.docs.map(d => d.id));
            log(`- ${currentEventIds.size} eventos encontrados no banco de dados atual.`);

            log("2. Buscando todos os eventos do banco de dados antigo (listeiro-cf302)...");
            const oldEventsRef = collection(db_old, 'events');
            const oldEventsSnapshot = await getDocs(oldEventsRef);
            log(`- ${oldEventsSnapshot.size} eventos encontrados no banco de dados antigo.`);

            const newEvents = [];
            for (const oldEventDoc of oldEventsSnapshot.docs) {
                if (!currentEventIds.has(oldEventDoc.id)) {
                    newEvents.push({ id: oldEventDoc.id, data: oldEventDoc.data() });
                }
            }
            log(`- ${newEvents.length} novos eventos foram identificados para importação.`);

            if (newEvents.length === 0) {
                log("Nenhum evento novo para importar. O banco de dados atual já está sincronizado.");
                toast({ title: 'Tudo Sincronizado!', description: 'Nenhum evento novo foi encontrado no banco de dados antigo.' });
                setIsImporting(false);
                return;
            }

            log("3. Iniciando a importação dos novos eventos...");
            let batch = writeBatch(db);
            let writeCount = 0;
            const commitPromises = [];

            for (const { id, data } of newEvents) {
                const newEventRef = doc(db, 'events', id);
                batch.set(newEventRef, data);
                writeCount++;
                log(`- Adicionando evento "${data.nome_evento}" ao lote.`);

                if (writeCount >= 499) {
                    log(`- Submetendo lote de ${writeCount} eventos...`);
                    commitPromises.push(batch.commit());
                    batch = writeBatch(db);
                    writeCount = 0;
                }
            }

            if (writeCount > 0) {
                log(`- Submetendo lote final de ${writeCount} eventos...`);
                commitPromises.push(batch.commit());
            }

            await Promise.all(commitPromises);

            log(`\n--- IMPORTAÇÃO INTELIGENTE CONCLUÍDA ---`);
            log(`${newEvents.length} novos eventos foram importados com sucesso.`);
            toast({ title: 'Importação Concluída!', description: `${newEvents.length} novos eventos foram adicionados.` });

        } catch (error: any) {
            log(`ERRO GRAVE DURANTE A IMPORTAÇÃO: ${error.message}`);
            toast({ variant: 'destructive', title: 'Erro na Importação', description: error.message });
        } finally {
            setIsImporting(false);
        }
    };


    return (
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Migração de Dados</CardTitle>
                    <CardDescription>
                        Ferramentas para migrar usuários e sincronizar dados do sistema antigo para o novo. Use com cautela.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="space-y-4 p-4 border rounded-lg bg-secondary/50">
                        <h3 className="font-semibold text-lg">Visualizar Dados Antigos</h3>
                        <Alert variant="default" className='bg-background'>
                            <AlertTitle>Visualizador de Eventos Antigos</AlertTitle>
                            <AlertDescription>
                                Antes de importar, visualize os eventos do banco de dados antigo (`listeiro-cf302`) em uma interface familiar. Esta é uma visualização segura e somente leitura.
                            </AlertDescription>
                        </Alert>
                        <Button asChild variant="outline">
                           <Link href="/settings/migration/events">
                             Visualizar Eventos Antigos <ArrowRight className="ml-2 h-4 w-4" />
                           </Link>
                        </Button>
                    </div>

                    <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="font-semibold text-lg">Passo Final: Importar Eventos</h3>
                        <Alert variant="destructive">
                            <AlertTitle>Atenção! Ação Irreversível!</AlertTitle>
                            <AlertDescription>
                                Esta ferramenta irá copiar todos os eventos do banco de dados antigo que ainda não existem no novo. Execute isso apenas uma vez, depois de visualizar e confirmar os dados.
                            </AlertDescription>
                        </Alert>
                        <Button onClick={handleEventImport} disabled={isMigratingUsers || isSyncingEvents || isImporting} variant="default" className="mt-4">
                            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isImporting ? 'Importando...' : 'Iniciar Importação de Novos Eventos'}
                        </Button>
                    </div>


                    {migrationLog.length > 0 && (
                        <div className="mt-4 p-4 bg-muted rounded-md max-h-96 overflow-y-auto">
                            <h3 className="font-semibold mb-2">Log da Operação:</h3>
                            <pre className="text-xs whitespace-pre-wrap">
                                {migrationLog.join('\n')}
                            </pre>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
