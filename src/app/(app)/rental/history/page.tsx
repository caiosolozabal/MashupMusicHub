'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Eye } from 'lucide-react';
import type { RentalQuote, RentalQuoteStatus } from '@/lib/types';
import { format } from 'date-fns';

const statusMap: Record<RentalQuoteStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: 'Rascunho', variant: 'outline' },
    sent: { label: 'Enviado', variant: 'secondary' },
    approved: { label: 'Aprovado', variant: 'default' },
    cancelled: { label: 'Cancelado', variant: 'destructive' },
};


export default function RentalHistoryPage() {
    const { userDetails } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [quotes, setQuotes] = useState<RentalQuote[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<RentalQuoteStatus | 'all'>('all');

    useEffect(() => {
        if (!userDetails) return;
        if (userDetails.role !== 'admin' && userDetails.role !== 'partner') {
            toast({ variant: 'destructive', title: 'Acesso Negado' });
            router.push('/dashboard');
            return;
        }

        const fetchQuotes = async () => {
            setIsLoading(true);
            try {
                const quotesRef = collection(db, 'rental_quotes');
                const q = query(quotesRef, orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                const quotesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RentalQuote));
                setQuotes(quotesList);
            } catch (error) {
                console.error("Error fetching quotes:", error);
                toast({ variant: 'destructive', title: 'Erro ao buscar orçamentos', description: (error as Error).message });
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuotes();
    }, [userDetails, router, toast]);

    const filteredQuotes = useMemo(() => {
        return quotes.filter(quote => {
            const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
            const matchesSearch = searchTerm === '' ||
                quote.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (quote.eventName && quote.eventName.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesStatus && matchesSearch;
        });
    }, [quotes, searchTerm, statusFilter]);

    return (
        <Card>
            <CardHeader>
                 <Button variant="ghost" size="sm" asChild className="-ml-3 mb-2 w-fit">
                    <Link href="/rental">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para Locação
                    </Link>
                </Button>
                <CardTitle>Histórico de Orçamentos</CardTitle>
                <CardDescription>Visualize todos os orçamentos de locação criados.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mb-4 flex gap-4">
                    <Input
                        placeholder="Buscar por cliente ou evento..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-grow"
                    />
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar por status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Status</SelectItem>
                            {Object.entries(statusMap).map(([key, { label }]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {isLoading ? (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Evento</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredQuotes.length > 0 ? (
                                    filteredQuotes.map(quote => (
                                        <TableRow key={quote.id}>
                                            <TableCell>{format(quote.createdAt.toDate(), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell className="font-medium">{quote.clientName}</TableCell>
                                            <TableCell>{quote.eventName || 'N/A'}</TableCell>
                                            <TableCell>
                                                <Badge variant={statusMap[quote.status].variant}>
                                                    {statusMap[quote.status].label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{quote.totals.grandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                            <TableCell className="text-right">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/rental/${quote.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" /> Ver
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                                            Nenhum orçamento encontrado para os filtros selecionados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
