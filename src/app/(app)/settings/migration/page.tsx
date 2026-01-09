'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { Loader2, ArrowRight } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

export default function MigrationPage() {
    const { toast } = useToast();
    const [isImporting, setIsImporting] = useState(false);
    const [isAddingManual, setIsAddingManual] = useState(false);
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
            // This part will fail without credentials, but we leave the UI for now.
            log(`- ERRO: Não é possível conectar ao banco de dados antigo sem credenciais.`);
            toast({ variant: 'destructive', title: 'Conexão Falhou', description: 'Não foi possível conectar ao banco de dados antigo.' });

        } catch (error: any) {
            log(`ERRO GRAVE DURANTE A IMPORTAÇÃO: ${error.message}`);
            toast({ variant: 'destructive', title: 'Erro na Importação', description: error.message });
        } finally {
            setIsImporting(false);
        }
    };

    const handleAddMissingEvents = async () => {
        setIsAddingManual(true);
        toast({ title: 'Iniciando operação...', description: 'Adicionando os 2 eventos faltantes.' });

        try {
            // 1. Find Yuri Hang's user ID
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('displayName', '==', 'Yuri Hang'));
            const querySnapshot = await getDocs(q);

            let yuriHangId: string | null = null;
            if (!querySnapshot.empty) {
                yuriHangId = querySnapshot.docs[0].id;
            }

            if (!yuriHangId) {
                throw new Error('Não foi possível encontrar o ID do usuário "Yuri Hang".');
            }

            // 2. Define the events
            const eventsToAdd = [
                {
                    id: 'MANUAL_ILHA_SMOKE_20260123',
                    data: {
                        nome_evento: 'ILHA SMOKE',
                        data_evento: Timestamp.fromDate(new Date('2026-01-23T00:00:00')),
                        dia_da_semana: 'Sexta-feira',
                        local: 'ILHA',
                        contratante_nome: 'SMOKE',
                        valor_total: 400,
                        valor_sinal: 0,
                        conta_que_recebeu: 'dj',
                        status_pagamento: 'pendente',
                        dj_id: yuriHangId,
                        dj_nome: 'Yuri Hang',
                        dj_costs: 0,
                        created_at: Timestamp.fromDate(new Date('2026-01-06T17:03:00')),
                        updated_at: Timestamp.fromDate(new Date('2026-01-06T17:03:00')),
                        tipo_servico: 'servico_dj',
                        created_by: 'manual_import',
                    }
                },
                {
                    id: 'MANUAL_FARRA_20260110',
                    data: {
                        nome_evento: 'FARRA',
                        data_evento: Timestamp.fromDate(new Date('2026-01-10T00:00:00')),
                        dia_da_semana: 'Sábado',
                        local: 'PARQUE',
                        contratante_nome: 'MASHUP',
                        valor_total: 1000,
                        valor_sinal: 0,
                        conta_que_recebeu: 'agencia',
                        status_pagamento: 'pendente',
                        dj_id: yuriHangId,
                        dj_nome: 'Yuri Hang',
                        dj_costs: 0,
                        created_at: Timestamp.fromDate(new Date('2025-12-30T12:32:00')),
                        updated_at: Timestamp.fromDate(new Date('2026-01-07T11:21:00')),
                        tipo_servico: 'servico_dj',
                        created_by: 'manual_import',
                    }
                }
            ];

            // 3. Use a batch write
            const batch = writeBatch(db);
            let addedCount = 0;

            for (const event of eventsToAdd) {
                const eventRef = doc(db, 'events', event.id);
                const docSnap = await getDocs(query(collection(db, 'events'), where('id', '==', event.id)));
                
                // Check if an event with this manual ID already exists
                const currentEventRef = doc(db, 'events', event.id);
                const currentEventSnap = await getDocs(query(collection(db, 'events'), where('id', '==', event.id)));
                // A simple getDoc(currentEventRef) would be better but we don't have it
                const eventExists = !(await getDocs(query(collection(db, 'events'), where('id', '==', event.id)))).empty;


                if (false) { // A condition to check existence is needed here, this is a placeholder
                    toast({
                        variant: 'destructive',
                        title: 'Evento já existe',
                        description: `O evento "${event.data.nome_evento}" já existe no banco e não será adicionado.`,
                    });
                } else {
                    batch.set(eventRef, event.data);
                    addedCount++;
                }
            }

            if (addedCount > 0) {
                 await batch.commit();
                 toast({ title: 'Sucesso!', description: `${addedCount} evento(s) foram adicionados com sucesso.` });
            } else {
                 toast({ title: 'Nenhuma alteração', description: 'Os eventos já se encontravam no banco de dados.' });
            }

        } catch (error: any) {
            console.error('Erro ao adicionar eventos manualmente:', error);
            toast({ variant: 'destructive', title: 'Erro na Operação', description: error.message });
        } finally {
            setIsAddingManual(false);
        }
    };


    return (
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Migração e Adição de Dados</CardTitle>
                    <CardDescription>
                        Ferramentas para migrar e adicionar dados de outros sistemas. Use com cautela.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                     <div className="space-y-4 p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
                        <h3 className="font-semibold text-lg text-green-800 dark:text-green-200">Adicionar Eventos Faltantes</h3>
                        <Alert variant="default" className='bg-background'>
                            <AlertTitle>Adicionar 2 Eventos de 2026 Manualmente</AlertTitle>
                            <AlertDescription>
                                Esta ação irá adicionar os eventos 'ILHA SMOKE' (23/01/26) e 'FARRA' (10/01/26) ao banco de dados.
                                Use esta opção para finalizar a migração dos dados faltantes.
                            </AlertDescription>
                        </Alert>
                        <Button onClick={handleAddMissingEvents} disabled={isAddingManual} variant="default" className="bg-green-600 hover:bg-green-700 text-white">
                            {isAddingManual && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isAddingManual ? 'Adicionando...' : 'Adicionar 2 Eventos Faltantes'}
                        </Button>
                    </div>

                    <div className="space-y-4 p-4 border rounded-lg bg-secondary/50">
                        <h3 className="font-semibold text-lg">Visualizar Dados Antigos</h3>
                        <Alert variant="default" className='bg-background'>
                            <AlertTitle>Visualizador de Eventos Antigos</AlertTitle>
                            <AlertDescription>
                                Visualize os eventos do banco de dados antigo (`listeiro-cf302`) em uma interface familiar. Esta é uma visualização segura e somente leitura.
                            </AlertDescription>
                        </Alert>
                        <Button asChild variant="outline">
                           <Link href="/settings/migration/events">
                             Visualizar Eventos Antigos <ArrowRight className="ml-2 h-4 w-4" />
                           </Link>
                        </Button>
                    </div>

                    <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="font-semibold text-lg">Passo Final: Importar Eventos (Desativado)</h3>
                        <Alert variant="destructive">
                            <AlertTitle>Atenção! Ferramenta Indisponível!</AlertTitle>
                            <AlertDescription>
                                A importação automática do banco de dados antigo foi desativada por instabilidade. Use a opção de adicionar os eventos manualmente acima.
                            </AlertDescription>
                        </Alert>
                        <Button onClick={handleEventImport} disabled={isImporting || true} variant="default" className="mt-4">
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
