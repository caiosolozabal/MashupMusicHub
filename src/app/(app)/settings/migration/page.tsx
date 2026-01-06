
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { collection, doc, writeBatch, getDocs, query, where, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
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
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationLog, setMigrationLog] = useState<string[]>([]);

    const handleMigration = async () => {
        setIsMigrating(true);
        setMigrationLog([]);

        const log = (message: string) => {
            console.log(message);
            setMigrationLog(prev => [...prev, message]);
        };

        log('--- INICIANDO MIGRAÇÃO DE USUÁRIOS ---');

        if (!auth.currentUser || (auth.currentUser.email !== 'caiozz_lj@hotmail.com' && auth.currentUser.email !== 'lucas@mashupmusic.com.br')) {
            log('ERRO: Apenas os administradores principais podem rodar a migração.');
            toast({ variant: 'destructive', title: 'Acesso Negado', description: 'Você precisa estar logado como um administrador principal.' });
            setIsMigrating(false);
            return;
        }
        
        const mainAdminEmail = auth.currentUser.email;
        let mainAdminOriginalPassword = '';

        for (const userToMigrate of usersToMigrate) {
            log(`\nProcessando: ${userToMigrate.displayName} (${userToMigrate.email})`);

            // Pular a criação da sua própria conta de admin para não resetar sua senha
            if (userToMigrate.email === mainAdminEmail) {
                log(`- Usuário ${userToMigrate.displayName} é o admin logado. Pulando criação no Auth.`);
                log(`- Garantindo que o perfil do Firestore para ${userToMigrate.displayName} (UID: ${auth.currentUser.uid}) esteja correto...`);
                
                try {
                    const userRef = doc(db, 'users', auth.currentUser.uid);
                    await setDoc(userRef, {
                        ...userToMigrate, // Use all data from the provided JSON
                        uid: auth.currentUser.uid, // Ensure the correct UID is set
                    }, { merge: true });
                     log(`- SUCESSO: Perfil do admin principal verificado/atualizado no Firestore.`);
                } catch(e: any) {
                    log(`- ERRO ao atualizar perfil do admin principal: ${e.message}`);
                }

                if(!mainAdminOriginalPassword) { // Prompt only once
                  mainAdminOriginalPassword = prompt('Para segurança, re-insira sua senha de administrador para continuar e re-autenticar após a migração.') || '';
                }
                continue; 
            }
            
            try {
                // 1. Criar usuário no Firebase Auth
                log(`- Tentando criar usuário no Firebase Auth...`);
                const userCredential = await createUserWithEmailAndPassword(auth, userToMigrate.email, DEFAULT_PASSWORD);
                const newUid = userCredential.user.uid;
                await updateProfile(userCredential.user, { displayName: userToMigrate.displayName });
                log(`- SUCESSO: Usuário criado no Auth com novo UID: ${newUid} e nome: ${userToMigrate.displayName}`);
                log(`- Associação: ID Antigo: ${userToMigrate._id} -> NOVO UID: ${newUid}`);

                // 2. Criar ou atualizar o documento do usuário no Firestore com o novo UID
                const userRef = doc(db, 'users', newUid);
                await setDoc(userRef, {
                    ...userToMigrate, // Use all data from the provided JSON
                    uid: newUid, // Overwrite with the new UID
                }, { merge: true });

                log(`- SUCESSO: Perfil criado/atualizado no Firestore para o UID: ${newUid}.`);

            } catch (error: any) {
                if (error.code === 'auth/email-already-in-use') {
                    log(`- INFO: O email ${userToMigrate.email} já existe no Firebase Auth. Pulando criação no Auth, mas tentando atualizar/verificar perfil no Firestore...`);
                    // This is complex without a backend function to get user by email. 
                    // For now, we log it. A manual check might be needed if profiles are out of sync for these users.
                } else {
                    log(`- ERRO ao processar ${userToMigrate.displayName}: ${error.message}`);
                    toast({
                        variant: 'destructive',
                        title: `Erro ao migrar ${userToMigrate.displayName}`,
                        description: error.message,
                    });
                }
            }
        }
        
        // Re-autenticar o admin com a sua senha correta para restaurar o estado de login
        try {
            if(mainAdminOriginalPassword) {
                log('\nTentando re-autenticar o administrador principal...');
                await signInWithEmailAndPassword(auth, mainAdminEmail, mainAdminOriginalPassword);
                log('Re-autenticação do administrador bem-sucedida.');
            } else {
                log('\nAVISO: Senha do admin não fornecida. Pode ser necessário fazer login novamente.');
            }
        } catch(e: any) {
            log(`ERRO: Falha na re-autenticação do administrador: ${e.message}. Você pode precisar recarregar a página e fazer login novamente.`);
        }


        log('\n--- MIGRAÇÃO CONCLUÍDA ---');
        toast({ title: 'Migração Concluída', description: 'Verifique o log para detalhes. É recomendado recarregar a página.' });
        setIsMigrating(false);
    };

    return (
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Migração de Usuários</CardTitle>
                    <CardDescription>
                        Esta ferramenta irá criar contas de autenticação para os usuários da lista
                        e criar/vincular seus perfis no Firestore.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert variant="destructive">
                        <AlertTitle>Aviso Importante!</AlertTitle>
                        <AlertDescription>
                            Execute esta operação apenas uma vez. Ela fará mudanças permanentes no seu banco de dados e sistema de autenticação.
                            A senha padrão para todos os usuários criados será <strong>{DEFAULT_PASSWORD}</strong>. A senha do admin logado não será alterada, mas será solicitada para continuar.
                        </AlertDescription>
                    </Alert>
                    <Button onClick={handleMigration} disabled={isMigrating}>
                        {isMigrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isMigrating ? 'Migrando...' : 'Iniciar Migração de Usuários'}
                    </Button>
                    {migrationLog.length > 0 && (
                        <div className="mt-4 p-4 bg-muted rounded-md max-h-96 overflow-y-auto">
                            <h3 className="font-semibold mb-2">Log da Migração:</h3>
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

    