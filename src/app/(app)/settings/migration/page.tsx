
'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { writeBatch, doc, collection, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UploadCloud } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

type CollectionName = 'users' | 'events' | 'agency_accounts';

const collectionLabels: Record<CollectionName, string> = {
  users: 'Usuários (users.json)',
  events: 'Eventos (events.json)',
  agency_accounts: 'Contas da Agência (agency_accounts.json)',
};

const isFirestoreTimestamp = (value: any): value is { seconds: number; nanoseconds: number } => {
  return value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value;
};

// Recursively search for ISO date strings and convert them
const convertData = (data: any): any => {
    if (!data) return data;
    if (Array.isArray(data)) {
        return data.map(item => convertData(item));
    }
    if (typeof data === 'object') {
        const newData = { ...data };
        for (const key in newData) {
            const value = newData[key];
            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) {
                newData[key] = Timestamp.fromDate(new Date(value));
            } else if (isFirestoreTimestamp(value)) { // Handle objects that look like Timestamps already
                newData[key] = new Timestamp(value.seconds, value.nanoseconds);
            } else if (typeof value === 'object') {
                newData[key] = convertData(value);
            }
        }
        return newData;
    }
    return data;
};


export default function MigrationPage() {
  const { toast } = useToast();
  const [files, setFiles] = useState<Record<CollectionName, File | null>>({
    users: null,
    events: null,
    agency_accounts: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, collection: CollectionName) => {
    const file = e.target.files?.[0];
    if (file) {
      setFiles(prev => ({ ...prev, [collection]: file }));
    }
  };

  const handleMigration = async () => {
    if (!files.users || !files.events || !files.agency_accounts) {
      toast({ variant: 'destructive', title: 'Arquivos Faltando', description: 'Por favor, selecione os 3 arquivos JSON para a migração.' });
      return;
    }
    
    setIsLoading(true);
    setLogs(['Iniciando migração...']);
    setProgress(0);

    try {
        if (!db) throw new Error("Conexão com Firestore não disponível.");

        for (const key of Object.keys(files) as CollectionName[]) {
            const file = files[key];
            if (!file) continue;

            setLogs(prev => [...prev, `Lendo o arquivo ${file.name}...`]);

            const text = await file.text();
            const data = JSON.parse(text);

            if (!Array.isArray(data)) {
                 throw new Error(`O arquivo ${file.name} não contém um array JSON válido.`);
            }

            setLogs(prev => [...prev, `Processando ${data.length} documentos para a coleção '${key}'...`]);
            
            const collectionRef = collection(db, key);
            const batchSize = 400; // Firestore batch limit is 500 writes
            let overallProgress = 0;

            for (let i = 0; i < data.length; i += batchSize) {
                const batch = writeBatch(db);
                const chunk = data.slice(i, i + batchSize);
                
                chunk.forEach((item: any) => {
                    // O `_id` foi salvo no backup, usamos ele para manter os IDs originais
                    const docId = item._id; 
                    if (!docId) {
                        console.warn(`Item sem '_id' encontrado na coleção ${key}, pulando:`, item);
                        return;
                    }
                    const docRef = doc(collectionRef, docId);
                    
                    // Remove o _id do objeto antes de salvar
                    const { _id, ...itemData } = item;
                    
                    // Converte strings de data ISO e objetos parecidos com Timestamp de volta para Timestamps do Firestore
                    const convertedData = convertData(itemData);

                    batch.set(docRef, convertedData);
                });

                await batch.commit();
                overallProgress = ((i + chunk.length) / data.length) * 100;
                setProgress(overallProgress);
                setLogs(prev => [...prev, `Lote ${i / batchSize + 1} para '${key}' com ${chunk.length} documentos salvo com sucesso.`]);
            }

             setLogs(prev => [...prev, `Coleção '${key}' importada com sucesso!`]);
        }

        toast({ title: 'Migração Concluída!', description: 'Todos os dados foram importados com sucesso para o novo projeto.' });

    } catch (error: any) {
        console.error('Migration failed:', error);
        toast({ variant: 'destructive', title: 'Falha na Migração', description: error.message });
        setLogs(prev => [...prev, `ERRO: ${error.message}`]);
    } finally {
        setIsLoading(false);
        setProgress(100);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Ferramenta de Migração de Dados</CardTitle>
          <CardDescription>
            Faça o upload dos arquivos JSON que você salvou do projeto antigo. Esta ferramenta irá importar todos os dados para o novo projeto `mashup-music-hub`.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {(Object.keys(collectionLabels) as CollectionName[]).map(key => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{collectionLabels[key]}</Label>
                <Input
                  id={key}
                  type="file"
                  accept=".json"
                  onChange={(e) => handleFileChange(e, key)}
                  disabled={isLoading}
                />
              </div>
            ))}
          </div>
          <Button onClick={handleMigration} disabled={isLoading || !Object.values(files).every(f => f !== null)} size="lg">
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
            {isLoading ? 'Migrando...' : 'Iniciar Migração'}
          </Button>
        </CardContent>
      </Card>
      
      {isLoading && (
        <Card>
            <CardHeader>
                <CardTitle>Progresso da Migração</CardTitle>
            </CardHeader>
            <CardContent>
                <Progress value={progress} className="w-full" />
                <div className="mt-4 h-64 overflow-y-auto rounded-md border bg-muted p-4 font-mono text-sm">
                    {logs.map((log, i) => (
                        <p key={i}>{log}</p>
                    ))}
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
