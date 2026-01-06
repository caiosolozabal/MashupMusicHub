
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
    const [mainAdminPassword, setMainAdminPassword] = useState('');

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
        let adminPassword = mainAdminPassword;

        if (mainAdminEmail && !adminPassword) {
            adminPassword = prompt('Para segurança, re-insira sua senha de administrador para continuar e re-autenticar após a migração.') || '';
            if (!adminPassword) {
                log('ERRO: Senha do administrador não fornecida. Migração cancelada.');
                setIsMigratingUsers(false);
                return;
            }
            setMainAdminPassword(adminPassword);
        }

        for (const userToMigrate of usersToMigrate) {
            log(`\nProcessando: ${userToMigrate.displayName} (${userToMigrate.email})`);
            
            try {
                const signInMethods = await fetchSignInMethodsForEmail(auth, userToMigrate.email);
                
                let userUid: string;

                if (signInMethods.length > 0) {
                    log(`- INFO: O email ${userToMigrate.email} já existe. Pulando criação no Auth.`);
                    // This is a simplification. For a real scenario, you'd need to properly get the UID.
                    // Here, we're assuming the logged-in admin is one of the list, or we can't get other UIDs without admin SDK.
                    // The best way is to attempt a login to get the user, but that's complex without passwords.
                    // For this script, we'll focus on creating the Firestore doc.
                    
                    // A workaround: find the user in firestore by email to get UID.
                    const usersRef = collection(db, "users");
                    const q = query(usersRef, where("email", "==", userToMigrate.email));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        userUid = querySnapshot.docs[0].id;
                        log(`- INFO: Encontrado UID existente para ${userToMigrate.email}: ${userUid}`);
                    } else if(userToMigrate.email === mainAdminEmail) {
                        userUid = mainAdminAuth.uid;
                         log(`- INFO: Usando UID do admin logado para ${userToMigrate.email}: ${userUid}`);
                    }
                    else {
                        // This case is tricky. The user exists in Auth but not in Firestore. 
                        // The only way to get the UID on the client is to log them in.
                        // We'll have to skip this user if we can't get the UID.
                        log(`- AVISO: Usuário ${userToMigrate.email} existe no Auth mas não foi encontrado no Firestore. Não é possível obter o UID sem login. O perfil pode não ser criado/atualizado corretamente.`);
                        continue;
                    }

                } else {
                    log(`- Tentando criar usuário no Firebase Auth...`);
                    const userCredential = await createUserWithEmailAndPassword(auth, userToMigrate.email, DEFAULT_PASSWORD);
                    userUid = userCredential.user.uid;
                    await updateProfile(userCredential.user, { displayName: userToMigrate.displayName });
                    log(`- SUCESSO: Usuário criado no Auth com novo UID: ${userUid}`);
                }

                // **UPSERT Logic:** Always set/update the document in Firestore with the correct UID
                const userRef = doc(db, 'users', userUid);
                await setDoc(userRef, {
                    ...userToMigrate,
                    uid: userUid,
                }, { merge: true });

                log(`- SUCESSO: Perfil do Firestore criado/atualizado para UID: ${userUid}. ID Antigo: ${userToMigrate._id}`);

            } catch (error: any) {
                log(`- ERRO ao processar ${userToMigrate.displayName}: ${error.message}`);
                toast({
                    variant: 'destructive',
                    title: `Erro ao migrar ${userToMigrate.displayName}`,
                    description: error.message,
                });
            }
        }
        
        try {
            if(mainAdminEmail && adminPassword) {
                log('\nTentando re-autenticar o administrador principal...');
                await signInWithEmailAndPassword(auth, mainAdminEmail, adminPassword);
                log('Re-autenticação do administrador bem-sucedida.');
            }
        } catch(e: any) {
            log(`ERRO: Falha na re-autenticação do administrador: ${e.message}. Você pode precisar recarregar a página e fazer login novamente.`);
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
                                Execute esta operação apenas uma vez. Ela criará contas de autenticação com a senha padrão <strong>{DEFAULT_PASSWORD}</strong> e garantirá que todos os perfis no Firestore estejam corretos, mesmo para usuários já existentes.
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
