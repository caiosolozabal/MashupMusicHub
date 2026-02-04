
'use client';

import type { Event, FinancialSettlement } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, FileDown, CheckCircle2, History, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, badgeVariants } from '@/components/ui/badge';
import type { VariantProps } from 'class-variance-authority';
import { Separator } from '@/components/ui/separator';
import { generateSettlementPdf } from './SettlementPDFDocument';
import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface SettlementDetailViewProps {
  settlement: FinancialSettlement;
  events: Event[];
  onBack: () => void;
  onDelete?: () => Promise<void>;
  isDeleting?: boolean;
}

const getStatusVariant = (status?: Event['status_pagamento']): VariantProps<typeof badgeVariants>['variant'] => {
    switch (status) {
      case 'pago': return 'default';
      case 'parcial': return 'secondary';
      case 'pendente': return 'outline';
      case 'vencido': return 'destructive';
      case 'cancelado': return 'destructive';
      default: return 'outline';
    }
};
  
const getStatusText = (status?: Event['status_pagamento']): string => {
    switch (status) {
      case 'pago': return 'Pago';
      case 'parcial': return 'Parcial';
      case 'pendente': return 'Pendente';
      case 'vencido': return 'Vencido';
      case 'cancelado': return 'Cancelado';
      default: return status || 'N/A';
    }
};

export default function SettlementDetailView({ settlement, events, onBack, onDelete, isDeleting }: SettlementDetailViewProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { summary, djName, generatedAt, status, periodStart, periodEnd, notes } = settlement;
  
  const generatedDate = generatedAt.toDate();
  const periodString = periodStart && periodEnd 
    ? `${format(periodStart.toDate(), 'dd/MM/yy')} a ${format(periodEnd.toDate(), 'dd/MM/yy')}`
    : 'Período aberto';

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
        await generateSettlementPdf(settlement, events);
    } catch (error) {
        console.error("PDF Error:", error);
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  return (
    <Card className="shadow-lg border-primary/20">
        <CardHeader className="bg-primary/5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                    <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-3">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para a Lista
                    </Button>
                    <CardTitle className="font-headline text-2xl flex items-center gap-2">
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                        Fechamento Concluído
                    </CardTitle>
                    <CardDescription>
                        Referente a <span className="font-semibold text-primary">{djName}</span> • Criado em {format(generatedDate, 'dd/MM/yyyy HH:mm')}
                    </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {onDelete && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-destructive border-destructive/20 hover:bg-destructive/10">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir Fechamento
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Tem certeza que deseja excluir este fechamento? Os eventos vinculados serão liberados para serem fechados novamente. Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                        onClick={onDelete}
                                        className="bg-destructive hover:bg-destructive/90"
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir Definitivamente'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    <Button onClick={handleDownloadPdf} disabled={isGeneratingPdf} variant="outline" size="sm">
                        {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                        Baixar PDF
                    </Button>
                    <Badge variant="default" className="text-lg px-4">Pago</Badge>
                </div>
            </div>
        </CardHeader>
        <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <Card className="lg:col-span-2 bg-secondary/30">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Resumo Financeiro</CardTitle>
                        <CardDescription>Período de referência: {periodString}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Eventos</p>
                            <p className="text-lg font-bold">{summary?.totalEvents || 0}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Bruto Total</p>
                            <p className="text-lg font-bold">{(summary?.grossRevenue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Valor Calculado</p>
                            <p className="text-lg font-bold">{(summary?.finalBalance || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <div className={`p-2 rounded-md bg-primary text-primary-foreground shadow-md`}>
                            <p className="text-xs font-semibold uppercase tracking-wider">Valor Final Pago</p>
                            <p className={`text-xl font-black`}>
                                {(summary?.finalPaidValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-background shadow-sm">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-muted-foreground">
                            <History className="h-4 w-4" />
                            Ajuste Manual
                        </h4>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Variação (Delta):</span>
                            <span className={`font-bold ${(summary?.deltaValue || 0) === 0 ? 'text-muted-foreground' : (summary?.deltaValue || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(summary?.deltaValue || 0) > 0 ? '+' : ''}{(summary?.deltaValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                    </div>
                    {notes && (
                        <div className="p-4 border rounded-lg bg-yellow-50/50 dark:bg-yellow-900/10">
                            <h4 className="text-sm font-semibold mb-1">Observações:</h4>
                            <p className="text-sm text-muted-foreground italic">"{notes}"</p>
                        </div>
                    )}
                </div>
            </div>

            <Separator className="my-6"/>

            <div>
                <h3 className="font-headline text-lg mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Detalhamento dos Eventos
                </h3>
                <div className="overflow-x-auto border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>Data</TableHead>
                                <TableHead>Evento</TableHead>
                                <TableHead>Status Pag.</TableHead>
                                <TableHead>Recebimento</TableHead>
                                <TableHead className="text-right">Valor Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {events.length > 0 ? events.map(event => (
                                <TableRow key={event.id} className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium">{format(event.data_evento, 'dd/MM/yy')}</TableCell>
                                    <TableCell className="font-medium text-sm">{event.nome_evento}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(event.status_pagamento)} className="capitalize text-xs font-normal">
                                            {getStatusText(event.status_pagamento)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="capitalize text-sm">{event.conta_que_recebeu === 'agencia' ? 'Agência' : 'DJ'}</TableCell>
                                    <TableCell className="text-right font-semibold text-sm">
                                        {Number(event.valor_total).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        Dados dos eventos não disponíveis para este fechamento histórico.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </CardContent>
        <CardFooter className="bg-muted/20 text-[10px] text-muted-foreground flex justify-between py-2">
            <span>ID do Documento: {settlement.id}</span>
            <span>Gerado por: {settlement.generatedByName || settlement.generatedBy}</span>
        </CardFooter>
    </Card>
  );
}
