'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { collection, doc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// Dados dos usuários a serem migrados, baseados no seu arquivo users.json
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

        for (const userToMigrate of usersToMigrate) {
            log(`\nProcessando: ${userToMigrate.displayName} (${userToMigrate.email})`);

            // Pular a criação da sua própria conta de admin para não resetar sua senha
            if (userToMigrate.email === auth.currentUser.email) {
                log(`- Usuário ${userToMigrate.displayName} já está logado. Pulando criação no Auth.`);
                log(`- O UID atual para ${userToMigrate.displayName} é ${auth.currentUser.uid}`);
                continue; // Pula para o próximo usuário
            }
            
            try {
                // 1. Criar usuário no Firebase Auth
                log(`- Tentando criar usuário no Firebase Auth...`);
                const userCredential = await createUserWithEmailAndPassword(auth, userToMigrate.email, DEFAULT_PASSWORD);
                const newUid = userCredential.user.uid;
                log(`- SUCESSO: Usuário criado no Auth com novo UID: ${newUid}`);

                // 2. Atualizar o documento do usuário no Firestore com o novo UID
                // Primeiro, encontramos o documento pelo 'email'
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where("email", "==", userToMigrate.email));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    log(`- AVISO: Nenhum perfil encontrado no Firestore para o email ${userToMigrate.email}. Isso pode ser normal se o perfil já foi migrado ou não existe.`);
                    continue;
                }
                
                const userDoc = querySnapshot.docs[0];
                log(`- Perfil encontrado no Firestore com ID antigo: ${userDoc.id}. Atualizando para o novo UID...`);

                const batch = writeBatch(db);

                // Criar um novo documento com o UID correto e deletar o antigo
                const newDocRef = doc(db, 'users', newUid);
                const oldData = userDoc.data();
                batch.set(newDocRef, { ...oldData, uid: newUid });
                batch.delete(userDoc.ref);
                
                await batch.commit();
                log(`- SUCESSO: Perfil no Firestore migrado de ${userDoc.id} para ${newUid}.`);

            } catch (error: any) {
                if (error.code === 'auth/email-already-in-use') {
                    log(`- INFO: O email ${userToMigrate.email} já existe no Firebase Auth. Pulando criação.`);
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
        
        // Re-autenticar o admin com a sua senha correta
        try {
            await signInWithEmailAndPassword(auth, auth.currentUser.email, prompt('Por favor, re-insira sua senha de administrador para continuar.') || '');
            log('\nRe-autenticação do administrador bem-sucedida.');
        } catch(e) {
            log('ERRO: Falha na re-autenticação. Você pode precisar recarregar a página e fazer login novamente.');
        }


        log('\n--- MIGRAÇÃO CONCLUÍDA ---');
        toast({ title: 'Migração Concluída', description: 'Verifique o console para detalhes.' });
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
                            Execute esta operação apenas uma vez. Ela fará mudanças permanentes no seu banco de dados.
                            A senha padrão para todos os usuários criados será <strong>{DEFAULT_PASSWORD}</strong>. Sua senha de admin não será alterada.
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
