'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { collection, doc, writeBatch, getDocs, query, where, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, fetchSignInMethodsForEmail } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// Dados CORRETOS dos usuários a serem migrados, baseados no seu arquivo.
const usersToMigrate = [
  { "_id": "EHF5NOE47IUzfC2ikacf5la54Ar2", "email": "caiosolozabal@gmail.com", "displayName": "Solô", "role": "dj", "dj_percentual": 0.7, "rental_percentual": 0.8, "pode_locar": true, "dj_color": "hsl(195, 100%, 80%)", "pixKey": "48.716.222/0001-31" },
  { "_id": "IJlQeKdjPeatJDlpZ2SB2mpbB8j2", "email": "djingridnepomuceno@gmail.com", "displayName": "Ingrid", "role": "dj", "dj_percentual": 0.75, "dj_color": "hsl(0, 90%, 85%)" },
  { "_id": "MiHG3uIO77ZT5Q5E7NmiVXrS1jd2", "email": "pontes_wp@hotmail.com", "displayName": "pontes_wp", "role": "partner" },
  { "_id": "SqDeLhNYLbOtItHXs3SkCUTf6sR2", "email": "lucaspostigo@gmail.com", "displayName": "Lucas Postigo", "role": "partner" },
  { "_id": "WDWNdUrMcwUTj31eQorfOGL5Ii62", "email": "caiozz_lj@hotmail.com", "displayName": "Caio Solozabal", "role": "admin" },
  { "_id": "fuzdD36MoARlNNnbtoC0T64k1C42", "email": "felipelidio@hotmail.com", "displayName": "Feeli", "role": "dj", "dj_percentual": 0.7, "dj_color": "hsl(260, 100%, 85%)" },
  { "_id": "j2rhrlHKvvPuFH106cAVvPxdFC63", "email": "deejaypivete@gmail.com", "displayName": "Pivete", "role": "dj", "dj_percentual": 0.7, "dj_color": "hsl(90, 100%, 85%)" },
  { "_id": "lqoYKLlSqqUXR8HkmPbXbXo7clG3", "email": "ynigri44@gmail.com", "displayName": "Yuri Hang", "role": "dj", "dj_percentual": 0.7, "dj_color": "hsl(300, 100%, 85%)" }
];


const DEFAULT_PASSWORD = 'Mashup';


export default function MigrationPage() {
    const { toast } = useToast();
    const [isMigratingUsers, setIsMigratingUsers] = useState(false);
    const [isSyncingEvents, setIsSyncingEvents] = useState(false);
    const [migrationLog, setMigrationLog] = useState<string[]>([]);

    const handleUserMigration = async () => {
        setIsMigratingUsers(true);
        setMigrationLog([]);

        const log = (message: string) => {
            console.log(message);
            setMigrationLog(prev => [...prev, message]);
        };

        log('--- INICIANDO MIGRAÇÃO DE USUÁRIOS ---');

        const mainAdminAuth = auth.currentUser;
        if (!mainAdminAuth) {
            log('ERRO: Você precisa estar logado como administrador para rodar a migração.');
            toast({ variant: 'destructive', title: 'Acesso Negado', description: 'Logue novamente e tente outra vez.' });
            setIsMigratingUsers(false);
            return;
        }

        const mainAdminEmail = mainAdminAuth.email;

        for (const userToMigrate of usersToMigrate) {
            log(`\nProcessando: ${userToMigrate.displayName} (${userToMigrate.email})`);
            
            // Se for a conta do admin logado, pula a criação/login para não invalidar a sessão atual.
            // Apenas garante que o perfil no Firestore esteja correto.
            if (userToMigrate.email === mainAdminEmail) {
                try {
                    log(`- INFO: É a conta do admin logado. Atualizando perfil do Firestore para UID: ${mainAdminAuth.uid}`);
                    const userRef = doc(db, 'users', mainAdminAuth.uid);
                    await setDoc(userRef, { ...userToMigrate, uid: mainAdminAuth.uid }, { merge: true });
                    log(`- SUCESSO: Perfil de admin no Firestore atualizado.`);
                    continue; // Pula para o próximo usuário
                } catch (error: any) {
                    log(`- ERRO ao atualizar o perfil do admin: ${error.message}`);
                    continue;
                }
            }

            try {
                // Tenta criar o usuário. Se já existir, vai dar um erro que pegaremos no catch.
                const userCredential = await createUserWithEmailAndPassword(auth, userToMigrate.email, DEFAULT_PASSWORD);
                const newUser = userCredential.user;
                log(`- SUCESSO: Usuário criado no Auth com UID: ${newUser.uid}`);

                await updateProfile(newUser, { displayName: userToMigrate.displayName });
                log(`- INFO: Nome de exibição "${userToMigrate.displayName}" definido no Auth.`);

                const userRef = doc(db, 'users', newUser.uid);
                await setDoc(userRef, { ...userToMigrate, uid: newUser.uid }, { merge: true });
                log(`- SUCESSO: Perfil do Firestore criado/atualizado para UID: ${newUser.uid}.`);

            } catch (error: any) {
                // Se o erro for "email-already-in-use", isso é o que queremos.
                if (error.code === 'auth/email-already-in-use') {
                    log(`- INFO: O email ${userToMigrate.email} já existe no Auth. Sincronizando perfil...`);
                    try {
                        // Faz login temporário para obter o UID do usuário existente.
                        const tempUserCredential = await signInWithEmailAndPassword(auth, userToMigrate.email, DEFAULT_PASSWORD);
                        const existingUser = tempUserCredential.user;
                        log(`- INFO: Login temporário bem-sucedido. UID existente é: ${existingUser.uid}`);

                        const userRef = doc(db, 'users', existingUser.uid);
                        await setDoc(userRef, { ...userToMigrate, uid: existingUser.uid }, { merge: true });
                        log(`- SUCESSO: Perfil do Firestore sincronizado para o UID existente: ${existingUser.uid}.`);
                        
                        // IMPORTANTE: Faz o logout do usuário temporário e re-autentica o admin.
                        await auth.updateCurrentUser(mainAdminAuth);
                        log(`- INFO: Sessão restaurada para o administrador.`);

                    } catch (signInError: any) {
                         log(`- ERRO CRÍTICO: O email ${userToMigrate.email} existe, mas o login com a senha padrão falhou. A senha pode ter sido alterada. Erro: ${signInError.message}`);
                         // Restaura a sessão do admin mesmo em caso de erro.
                         await auth.updateCurrentUser(mainAdminAuth);
                    }
                } else {
                    log(`- ERRO ao criar usuário ${userToMigrate.email} no Auth: ${error.message}`);
                }
            }
        }
        
        log('\n--- MIGRAÇÃO DE USUÁRIOS CONCLUÍDA ---');
        toast({ title: 'Migração de Usuários Concluída', description: 'Verifique o log para detalhes. O próximo passo é sincronizar os eventos.' });
        setIsMigratingUsers(false);
    };

    const handleEventSync = async () => {
        setIsSyncingEvents(true);
        const log = (message: string) => {
            console.log(message);
            setMigrationLog(prev => [...prev, message]);
        };

        log("\n--- INICIANDO SINCRONIZAÇÃO DE IDs DE EVENTOS ---");

        try {
            // 1. Criar mapa de ID antigo para novo UID
            log("1. Buscando todos os usuários para criar o mapa de IDs...");
            const usersQuery = query(collection(db, 'users'));
            const usersSnapshot = await getDocs(usersQuery);
            const idMap = new Map<string, string>();
            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                if (userData._id && userData.uid) {
                    idMap.set(userData._id, userData.uid);
                }
            });
            log(`- Mapa criado com ${idMap.size} usuários.`);
            idMap.forEach((v, k) => log(`  - ${k} -> ${v}`));

            // 2. Buscar todos os eventos
            log("2. Buscando todos os eventos para atualização...");
            const eventsRef = collection(db, 'events');
            const eventsSnapshot = await getDocs(eventsRef);
            log(`- ${eventsSnapshot.size} eventos encontrados.`);

            // 3. Atualizar eventos em lotes (batches)
            let batch = writeBatch(db);
            let writeCount = 0;
            let eventsUpdatedCount = 0;
            const commitPromises = [];

            for (const eventDoc of eventsSnapshot.docs) {
                const eventData = eventDoc.data();
                const oldDjId = eventData.dj_id;

                if (oldDjId && idMap.has(oldDjId)) {
                    const newUid = idMap.get(oldDjId)!;
                    if (newUid !== oldDjId) {
                        log(`- Evento "${eventData.nome_evento}" (${eventDoc.id}) precisa de atualização. DJ ID: ${oldDjId} -> ${newUid}`);
                        const eventRef = doc(db, 'events', eventDoc.id);
                        batch.update(eventRef, { dj_id: newUid });
                        writeCount++;
                        eventsUpdatedCount++;
                    }
                }

                if (writeCount === 499) {
                    log(`- Submetendo lote de ${writeCount} atualizações...`);
                    commitPromises.push(batch.commit());
                    batch = writeBatch(db);
                    writeCount = 0;
                }
            }

            if (writeCount > 0) {
                log(`- Submetendo lote final de ${writeCount} atualizações...`);
                commitPromises.push(batch.commit());
            }
            
            await Promise.all(commitPromises);

            log(`\n--- SINCRONIZAÇÃO CONCLUÍDA ---`);
            log(`${eventsUpdatedCount} eventos foram atualizados.`);
            if (eventsUpdatedCount === 0) {
              log("Nenhum evento precisou de atualização. Parece que já estavam sincronizados!");
            }
            toast({ title: 'Sincronização Concluída!', description: `${eventsUpdatedCount} eventos foram atualizados com os novos IDs de DJ.` });

        } catch (error: any) {
            log(`ERRO GRAVE DURANTE A SINCRONIZAÇÃO: ${error.message}`);
            toast({ variant: 'destructive', title: 'Erro na Sincronização', description: error.message });
        } finally {
            setIsSyncingEvents(false);
        }
    };


    return (
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Migração de Dados</CardTitle>
                    <CardDescription>
                        Ferramentas para migrar usuários e sincronizar dados do sistema antigo para o novo.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="font-semibold text-lg">Passo 1: Migração de Usuários</h3>
                        <Alert variant="destructive">
                            <AlertTitle>Aviso Importante!</AlertTitle>
                            <AlertDescription>
                                Execute esta operação para garantir que todos os usuários da sua lista existam na autenticação e no banco de dados com os IDs corretos. A senha padrão para novos usuários ou usuários existentes com a senha padrão será <strong>{DEFAULT_PASSWORD}</strong>.
                            </AlertDescription>
                        </Alert>
                        <Button onClick={handleUserMigration} disabled={isMigratingUsers || isSyncingEvents}>
                            {isMigratingUsers && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isMigratingUsers ? 'Migrando...' : 'Iniciar Migração de Usuários'}
                        </Button>
                    </div>

                     <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="font-semibold text-lg">Passo 2: Sincronizar Eventos</h3>
                        <Alert>
                            <AlertTitle>Atenção!</AlertTitle>
                            <AlertDescription>
                                Execute este passo APÓS a migração de usuários ser concluída com sucesso. Isso atualizará todos os eventos para usar os novos IDs de DJ.
                            </AlertDescription>
                        </Alert>
                        <Button onClick={handleEventSync} disabled={isMigratingUsers || isSyncingEvents} variant="secondary">
                            {isSyncingEvents && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSyncingEvents ? 'Sincronizando...' : 'Sincronizar IDs de Eventos'}
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
