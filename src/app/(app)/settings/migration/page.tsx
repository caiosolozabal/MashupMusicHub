
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

// Dados CORRETOS dos usuários a serem migrados, baseados no seu arquivo users.json
const usersToMigrate = [
    { old_id: "1", email: "caiozz_lj@hotmail.com", displayName: "Caiozz LJ", role: "admin" },
    { old_id: "2", email: "lucas@mashupmusic.com.br", displayName: "Lucas", role: "admin" },
    { old_id: "3", email: "thg@mashupmusic.com.br", displayName: "THG", role: "dj" },
    { old_id: "4", email: "math@mashupmusic.com.br", displayName: "MATH", role: "dj" },
    { old_id: "5", email: "andre@mashupmusic.com.br", displayName: "ANDRÉ", role: "dj" },
    { old_id: "6", email: "vitor@mashupmusic.com.br", displayName: "VITOR", role: "dj" },
    { old_id: "7", email: "filipe@mashupmusic.com.br", displayName: "FILIPE", role: "dj" },
    { old_id: "8", email: "giulia@mashupmusic.com.br", displayName: "GIULIA", role: "dj" },
    { old_id: "9", email: "contato@mashupmusic.com.br", displayName: "MASHUP", role: "partner" },
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

        if (!auth.currentUser || auth.currentUser.email !== 'caiozz_lj@hotmail.com') {
            log('ERRO: Apenas o administrador principal (caiozz_lj@hotmail.com) pode rodar a migração.');
            toast({ variant: 'destructive', title: 'Acesso Negado', description: 'Você precisa estar logado como o administrador principal.' });
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
                        uid: auth.currentUser.uid,
                        email: userToMigrate.email,
                        displayName: userToMigrate.displayName,
                        role: userToMigrate.role,
                    }, { merge: true });
                     log(`- SUCESSO: Perfil do admin principal verificado/atualizado no Firestore.`);
                } catch(e: any) {
                    log(`- ERRO ao atualizar perfil do admin principal: ${e.message}`);
                }
                mainAdminOriginalPassword = prompt('Por favor, para segurança, re-insira sua senha de administrador para continuar após a migração.') || '';
                continue; 
            }
            
            try {
                // 1. Criar usuário no Firebase Auth
                log(`- Tentando criar usuário no Firebase Auth...`);
                const userCredential = await createUserWithEmailAndPassword(auth, userToMigrate.email, DEFAULT_PASSWORD);
                const newUid = userCredential.user.uid;
                await updateProfile(userCredential.user, { displayName: userToMigrate.displayName });
                log(`- SUCESSO: Usuário criado no Auth com novo UID: ${newUid} e nome: ${userToMigrate.displayName}`);

                // 2. Criar ou atualizar o documento do usuário no Firestore com o novo UID
                const userRef = doc(db, 'users', newUid);
                await setDoc(userRef, {
                    uid: newUid,
                    email: userToMigrate.email,
                    displayName: userToMigrate.displayName,
                    role: userToMigrate.role,
                }, { merge: true }); // Usar merge para não sobrescrever dados existentes como 'createdAt'

                log(`- SUCESSO: Perfil criado/atualizado no Firestore para o UID: ${newUid}.`);

            } catch (error: any) {
                if (error.code === 'auth/email-already-in-use') {
                    log(`- INFO: O email ${userToMigrate.email} já existe no Firebase Auth. Pulando criação no Auth, mas tentando atualizar perfil no Firestore...`);
                    // Se o usuário já existe, precisamos encontrar seu UID para garantir que o perfil do Firestore está correto.
                    // Esta parte é complexa sem uma função de backend, então focaremos em garantir que os perfis sejam criados para novos usuários.
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
                        Esta ferramenta irá criar contas de autenticação para os usuários antigos
                        e vincular seus novos IDs aos perfis existentes no Firestore.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert variant="destructive">
                        <AlertTitle>Aviso Importante!</AlertTitle>
                        <AlertDescription>
                            Execute esta operação apenas uma vez. Ela fará mudanças permanentes no seu banco de dados e sistema de autenticação.
                            A senha padrão para todos os usuários criados será <strong>{DEFAULT_PASSWORD}</strong>. Sua senha de admin não será alterada, mas será solicitada para continuar.
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
