
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Loader2, UploadCloud } from 'lucide-react';
import type { AppConfig } from '@/lib/types';
import Image from 'next/image';

const brandingFormSchema = z.object({
  companyName: z.string().optional(),
  pixKey: z.string().optional(),
  rentalTerms: z.string().optional(),
  logoUrl: z.string().url().optional().nullable(),
});

type BrandingFormValues = z.infer<typeof brandingFormSchema>;

export default function BrandingPage() {
  const { userDetails } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const form = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingFormSchema),
    defaultValues: {
      companyName: '',
      pixKey: '',
      rentalTerms: '1. O equipamento será entregue em perfeitas condições de uso. 2. Qualquer dano causado por mau uso será de responsabilidade do locatário. 3. O pagamento deve ser realizado 50% na reserva e 50% na entrega do equipamento.',
      logoUrl: null,
    },
  });

  const configDocRef = doc(db, 'app_config', 'branding');

  useEffect(() => {
    const fetchBrandingConfig = async () => {
      setIsLoading(true);
      try {
        const docSnap = await getDoc(configDocRef);
        if (docSnap.exists()) {
          const config = docSnap.data() as AppConfig;
          form.reset(config);
          if (config.logoUrl) {
            setLogoPreview(config.logoUrl);
          }
        }
      } catch (error) {
        console.error("Error fetching branding config:", error);
        toast({ variant: 'destructive', title: 'Erro ao carregar configurações' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchBrandingConfig();
  }, [form, toast]);
  
  useEffect(() => {
    if (logoFile) {
        const objectUrl = URL.createObjectURL(logoFile);
        setLogoPreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }
  }, [logoFile]);


  const handleLogoUpload = async (): Promise<string | null> => {
    if (!logoFile) return form.getValues('logoUrl') || null;

    setIsUploading(true);
    const filePath = `branding/logo-${new Date().getTime()}-${logoFile.name}`;
    const fileRef = storageRef(storage, filePath);

    try {
      const snapshot = await uploadBytesResumable(fileRef, logoFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      toast({ title: 'Logo enviado com sucesso!' });
      return downloadURL;
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({ variant: 'destructive', title: 'Erro no upload do logo', description: (error as Error).message });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: BrandingFormValues) => {
    setIsSubmitting(true);
    try {
      const uploadedLogoUrl = await handleLogoUpload();
      
      const configData: AppConfig = {
        ...data,
        logoUrl: uploadedLogoUrl,
      };

      await setDoc(configDocRef, configData, { merge: true });
      toast({ title: 'Configurações de marca salvas!', description: 'Suas alterações foram salvas com sucesso.' });
    } catch (error) {
      console.error("Error saving branding config:", error);
      toast({ variant: 'destructive', title: 'Erro ao salvar configurações', description: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userDetails && userDetails.role !== 'admin' && userDetails.role !== 'partner') {
    return (
      <Card>
        <CardHeader><CardTitle>Acesso Restrito</CardTitle></CardHeader>
        <CardContent><p>Você não tem permissão para acessar esta página.</p></CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Configurações da Marca</CardTitle>
        <CardDescription>
          Gerencie o logo da sua empresa, chave PIX e outros dados para os orçamentos de locação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label>Logo</Label>
            {logoPreview && (
              <div className="mt-2 w-48 p-2 border rounded-md">
                <Image src={logoPreview} alt="Preview do Logo" width={180} height={180} className="object-contain" />
              </div>
            )}
            <div className="flex items-center gap-2">
                <Input
                    id="logo-upload"
                    type="file"
                    accept="image/png, image/jpeg, image/svg+xml"
                    onChange={(e) => setLogoFile(e.target.files ? e.target.files[0] : null)}
                    className="max-w-xs"
                />
            </div>
            <p className="text-xs text-muted-foreground">Envie um novo arquivo para substituir o logo atual. Recomendado: PNG com fundo transparente.</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="companyName">Nome da Empresa (Opcional)</Label>
            <Input id="companyName" {...form.register('companyName')} />
            <p className="text-xs text-muted-foreground">Aparecerá no PDF do orçamento.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pixKey">Chave PIX Principal</Label>
            <Input id="pixKey" {...form.register('pixKey')} placeholder="CNPJ, Email, Telefone, etc." />
            <p className="text-xs text-muted-foreground">Esta chave PIX será usada nos orçamentos gerados.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rentalTerms">Termos e Condições de Locação</Label>
            <Textarea
              id="rentalTerms"
              {...form.register('rentalTerms')}
              rows={5}
              placeholder="Descreva os termos padrão para locação..."
            />
            <p className="text-xs text-muted-foreground">Estes termos aparecerão no final de cada orçamento em PDF.</p>
          </div>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {(isSubmitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Configurações
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
