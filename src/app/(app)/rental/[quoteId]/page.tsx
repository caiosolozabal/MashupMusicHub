'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, FileDown, Edit, Save } from 'lucide-react';
import type { RentalQuote, RentalQuoteStatus, AppConfig } from '@/lib/types';
import { format } from 'date-fns';
import { generateQuotePdf } from '@/components/rental/QuotePDFDocument';

const statusMap: Record<RentalQuoteStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: 'Rascunho', variant: 'outline' },
    sent: { label: 'Enviado', variant: 'secondary' },
    approved: { label: 'Aprovado', variant: 'default' },
    cancelled: { label: 'Cancelado', variant: 'destructive' },
};


export default function RentalQuoteDetailPage() {
    const { quoteId } = useParams();
    const { userDetails } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [quote, setQuote] = useState<RentalQuote | null>(null);
    const [brandingConfig, setBrandingConfig] = useState<AppConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    useEffect(() => {
        if (!userDetails || !quoteId) return;
        if (userDetails.role !== 'admin' && userDetails.role !== 'partner') {
            toast({ variant: 'destructive', title: 'Acesso Negado' });
            router.push('/dashboard');
            return;
        }

        const fetchQuoteAndConfig = async () => {
            setIsLoading(true);
            try {
                const quoteRef = doc(db, 'rental_quotes', quoteId as string);
                const configRef = doc(db, 'app_config', 'branding');
                
                const [quoteSnap, configSnap] = await Promise.all([getDoc(quoteRef), getDoc(configRef)]);

                if (quoteSnap.exists()) {
                    setQuote({ id: quoteSnap.id, ...quoteSnap.data() } as RentalQuote);
                } else {
                    toast({ variant: 'destructive', title: 'Orçamento não encontrado' });
                    router.push('/rental/history');
                }

                if(configSnap.exists()) {
                    setBrandingConfig(configSnap.data() as AppConfig);
                }

            } catch (error) {
                console.error("Error fetching data:", error);
                toast({ variant: 'destructive', title: 'Erro ao buscar dados', description: (error as Error).message });
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuoteAndConfig();
    }, [userDetails, quoteId, router, toast]);

    const handleStatusChange = async (newStatus: RentalQuoteStatus) => {
        if (!quote) return;
        setIsUpdatingStatus(true);
        try {
            const quoteRef = doc(db, 'rental_quotes', quote.id);
            await updateDoc(quoteRef, {
                status: newStatus,
                updatedAt: serverTimestamp(),
            });
            setQuote(prev => prev ? { ...prev, status: newStatus } : null);
            toast({ title: 'Status atualizado com sucesso!' });
        } catch (error) {
            console.error("Error updating status:", error);
            toast({ variant: 'destructive', title: 'Erro ao atualizar status', description: (error as Error).message });
        } finally {
            setIsUpdatingStatus(false);
        }
    };
    
    const handleGeneratePdf = async () => {
        if (!quote) return;
        setIsGeneratingPdf(true);
        try {
            await generateQuotePdf(quote, brandingConfig);
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({ variant: 'destructive', title: 'Erro ao gerar PDF', description: (error as Error).message });
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!quote) {
        return (
            <Card>
                <CardHeader><CardTitle>Orçamento não encontrado</CardTitle></CardHeader>
                <CardContent><p>O orçamento que você está procurando não existe ou foi movido.</p></CardContent>
            </Card>
        );
    }
    
    const { clientName, eventName, eventDate, eventLocation, kitName, items, fees, discount, totals, notes, capacitySummary, createdAt, createdByName, status } = quote;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                             <Button variant="ghost" size="sm" asChild className="-ml-3 mb-2 w-fit">
                                <Link href="/rental/history">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Voltar para o Histórico
                                </Link>
                            </Button>
                            <CardTitle className="text-2xl font-bold">{kitName || 'Orçamento de Locação'}</CardTitle>
                            <CardDescription>Criado por {createdByName} em {format(createdAt.toDate(), 'dd/MM/yyyy')}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button asChild variant="outline">
                                <Link href={`/rental?edit=${quote.id}`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar Orçamento
                                </Link>
                            </Button>
                             <Select value={status} onValueChange={handleStatusChange} disabled={isUpdatingStatus}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Alterar status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(statusMap).map(([key, { label }]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
                                {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileDown className="mr-2 h-4 w-4" />}
                                Gerar PDF
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 border rounded-lg bg-muted/20">
                        <h3 className="font-semibold mb-4">Detalhes do Cliente e Evento</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><p className="text-sm font-medium">Cliente</p><p className="text-muted-foreground">{clientName}</p></div>
                            <div><p className="text-sm font-medium">Evento</p><p className="text-muted-foreground">{eventName || 'N/A'}</p></div>
                            <div><p className="text-sm font-medium">Data do Evento</p><p className="text-muted-foreground">{eventDate ? format(eventDate.toDate(), 'dd/MM/yyyy') : 'N/A'}</p></div>
                            <div><p className="text-sm font-medium">Local</p><p className="text-muted-foreground">{eventLocation || 'N/A'}</p></div>
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="font-semibold mb-2">Itens do Orçamento</h3>
                         <div className="overflow-x-auto border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-center">Qtd.</TableHead>
                                        <TableHead className="text-right">Preço Unit.</TableHead>
                                        <TableHead className="text-right">Total Linha</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map(item => (
                                        <TableRow key={item.itemId}>
                                            <TableCell className="font-medium">{item.nameSnapshot}</TableCell>
                                            <TableCell className="text-center">{item.qty}</TableCell>
                                            <TableCell className="text-right">{item.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                            <TableCell className="text-right font-semibold">{(item.qty * item.unitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            {notes && (
                                <>
                                    <h3 className="font-semibold mb-2">Observações</h3>
                                    <p className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/20 whitespace-pre-wrap">{notes}</p>
                                </>
                            )}
                            {capacitySummary && (
                                <>
                                    <h3 className="font-semibold mb-2 mt-4">Sugestão do Sistema</h3>
                                    <p className="text-sm text-muted-foreground p-3 border rounded-md bg-primary/10">{capacitySummary}</p>
                                </>
                            )}
                        </div>

                        <div className="p-4 border rounded-lg flex flex-col justify-end">
                            <div className="space-y-2 text-right">
                                <p>Subtotal Itens: <span className="font-semibold">{totals.itemsSubtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
                                {fees.frete > 0 && <p>+ Frete: <span className="font-semibold">{fees.frete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>}
                                {fees.montagem > 0 && <p>+ Montagem: <span className="font-semibold">{fees.montagem.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>}
                                {fees.tecnico > 0 && <p>+ Técnico: <span className="font-semibold">{fees.tecnico.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>}
                                {fees.outros > 0 && <p>+ Outros: <span className="font-semibold">{fees.outros.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>}
                                {discount > 0 && <p className="text-green-600">- Desconto: <span className="font-semibold">{discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>}
                                <Separator className="my-2"/>
                                <p className="text-xl font-bold">Total Final: <span className="text-primary">{totals.grandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
                            </div>
                        </div>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
