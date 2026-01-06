'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface BackupData {
  users: object[];
  events: object[];
  agency_accounts: object[];
  // Adicione outras coleções aqui se necessário
}

// Helper para converter Timestamps do Firestore para strings ISO 8601 legíveis
const replacer = (key: string, value: any) => {
  if (value && typeof value === 'object' && value.hasOwnProperty('seconds') && value.hasOwnProperty('nanoseconds')) {
    const date = new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
    return date.toISOString();
  }
  return value;
};


export default function BackupPage() {
  const [backupData, setBackupData] = useState<BackupData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateBackup = async () => {
    setIsLoading(true);
    setBackupData(null);
    if (!db) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Banco de dados não inicializado.' });
      setIsLoading(false);
      return;
    }

    try {
      const collectionsToBackup = ['users', 'events', 'agency_accounts'];
      const data: Partial<BackupData> = {};

      for (const collectionName of collectionsToBackup) {
        const collRef = collection(db, collectionName);
        const snapshot = await getDocs(collRef);
        // Mapeia os documentos e adiciona o ID a cada objeto
        data[collectionName as keyof BackupData] = snapshot.docs.map(doc => ({
          _id: doc.id,
          ...doc.data(),
        }));
      }

      setBackupData(data as BackupData);
      toast({ title: 'Backup Gerado com Sucesso!', description: 'Copie e salve o conteúdo de cada caixa de texto abaixo em arquivos .json locais.' });

    } catch (error: any) {
      console.error('Error generating backup:', error);
      toast({ variant: 'destructive', title: 'Erro ao Gerar Backup', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
       toast({ title: 'Copiado!', description: `Os dados de ${label} foram copiados para a área de transferência.` });
    }).catch(err => {
       toast({ variant: 'destructive', title: 'Falha ao copiar', description: 'Não foi possível copiar os dados automaticamente.' });
    });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Ferramenta de Backup Manual do Firestore</CardTitle>
          <CardDescription>
            Use esta página para extrair os dados do seu banco de dados (`listeiro-cf302`) em formato JSON.
            Clique no botão para carregar os dados das coleções e depois salve o conteúdo de cada caixa em um arquivo de texto separado (ex: `users.json`).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGenerateBackup} disabled={isLoading} size="lg">
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            {isLoading ? 'Gerando Backup...' : 'Gerar Backup Agora'}
          </Button>
        </CardContent>
      </Card>
      
      {isLoading && (
         <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-lg text-muted-foreground">Lendo o banco de dados...</p>
        </div>
      )}

      {backupData && (
        <div className="space-y-6">
          {Object.entries(backupData).map(([key, value]) => {
            if (!Array.isArray(value)) return null; 
            const jsonString = JSON.stringify(value, replacer, 2);
            return (
              <Card key={key}>
                <CardHeader>
                   <div className="flex justify-between items-center">
                    <CardTitle className="capitalize">{key} ({value.length} documentos)</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => handleCopyToClipboard(jsonString, key)}>Copiar JSON</Button>
                   </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    readOnly
                    value={jsonString}
                    className="h-80 font-mono text-xs bg-muted/50"
                    placeholder={`Dados de ${key} aparecerão aqui...`}
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  );
}
