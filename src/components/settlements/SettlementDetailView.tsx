
'use client';

import type { Event, FinancialSettlement } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, badgeVariants } from '@/components/ui/badge';
import type { VariantProps } from 'class-variance-authority';
import { Separator } from '@/components/ui/separator';

interface SettlementDetailViewProps {
  settlement: FinancialSettlement;
  events: Event[];
  onBack: () => void;
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

export default function SettlementDetailView({ settlement, events, onBack }: SettlementDetailViewProps) {

  const { summary, djName, generatedAt, status, periodStart, periodEnd } = settlement;
  const generatedDate = generatedAt.toDate();
  const periodString = periodStart && periodEnd 
    ? `${format(periodStart.toDate(), 'dd/MM/yy')} a ${format(periodEnd.toDate(), 'dd/MM/yy')}`
    : 'Período aberto';

  return (
    <Card className="shadow-lg">
        <CardHeader>
            <div className="flex items-start justify-between">
                <div>
                    <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-3">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar
                    </Button>
                    <CardTitle className="font-headline text-2xl">Detalhes do Fechamento</CardTitle>
                    <CardDescription>
                        Fechamento para <span className="font-semibold text-primary">{djName}</span> gerado em {format(generatedDate, 'dd/MM/yyyy')}
                    </CardDescription>
                </div>
                 <Badge variant={status === 'paid' ? 'default' : 'secondary'} className="capitalize text-lg">
                    {status === 'paid' ? 'Pago' : 'Pendente'}
                </Badge>
            </div>
        </CardHeader>
        <CardContent>
            <Card className="mb-6 bg-secondary/50">
                <CardHeader>
                    <CardTitle className="text-xl">Resumo Financeiro</CardTitle>
                    <CardDescription>Período de referência: {periodString}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <p className="text-sm text-muted-foreground">Eventos Incluídos</p>
                        <p className="text-lg font-bold">{summary.totalEvents}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Valor Bruto Total</p>
                        <p className="text-lg font-bold">{summary.grossRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Parcela Líquida do DJ</p>
                        <p className="text-lg font-bold">{summary.djNetEntitlement.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <div className={`p-2 rounded-md ${summary.finalBalance >= 0 ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                        <p className="text-sm font-semibold">{summary.finalBalance >= 0 ? 'Valor PAGO ao DJ' : 'Valor RECEBIDO do DJ'}</p>
                        <p className={`text-xl font-bold ${summary.finalBalance >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        {Math.abs(summary.finalBalance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Separator className="my-6"/>

            <div>
                <h3 className="font-headline text-lg mb-4">Eventos Incluídos neste Fechamento</h3>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Evento</TableHead>
                                <TableHead>Status Pag.</TableHead>
                                <TableHead>Recebido por</TableHead>
                                <TableHead className="text-right">Valor Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {events.map(event => (
                                <TableRow key={event.id}>
                                    <TableCell>{format(event.data_evento, 'dd/MM/yy')}</TableCell>
                                    <TableCell className="font-medium">{event.nome_evento}</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(event.status_pagamento)} className="capitalize text-xs">
                                            {getStatusText(event.status_pagamento)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="capitalize">{event.conta_que_recebeu}</TableCell>
                                    <TableCell className="text-right">{Number(event.valor_total).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </CardContent>
    </Card>
  );
}
