
'use client';

import type { NextPage } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, badgeVariants } from '@/components/ui/badge';
import type { Event } from '@/lib/types';
import { format, parseISO, startOfDay, getYear, getMonth, startOfMonth, endOfMonth } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Loader2, Link as LinkIcon, Disc, Truck, Calendar as CalendarIcon, X, ArrowLeft, Download } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { useEffect, useState, useMemo } from 'react';
import { db_old } from '@/lib/firebase/migration-client'; // <<<====== USANDO O BANCO DE DADOS ANTIGO
import { collection, getDocs, Timestamp, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


const getDayOfWeek = (date: Date | undefined): string => {
  if (!date) return '';
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[date.getDay()];
};

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

const OldEventsPage: NextPage = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>();
  const [selectedYear, setSelectedYear] = useState<string | undefined>();
  const availableYears = useMemo(() => {
    const currentYear = getYear(new Date());
    const years = [];
    for (let i = currentYear + 1; i >= currentYear - 5; i--) {
        years.push(i.toString());
    }
    return years;
  }, []);

  const fetchOldEvents = async () => {
    setIsLoading(true);
    try {
      const eventsCollectionRef = collection(db_old, 'events');
      let eventsQuery = query(eventsCollectionRef, orderBy('data_evento', 'desc'));
      
      const eventsSnapshot = await getDocs(eventsQuery);
      const eventsList = eventsSnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          path: docSnapshot.ref.path,
          ...data,
          data_evento: data.data_evento instanceof Timestamp ? data.data_evento.toDate() : new Date(data.data_evento),
          created_at: data.created_at instanceof Timestamp ? data.created_at.toDate() : new Date(data.created_at),
          updated_at: data.updated_at && (data.updated_at instanceof Timestamp ? data.updated_at.toDate() : new Date(data.updated_at)),
          dj_costs: data.dj_costs ?? 0, 
        } as Event;
      });
      setEvents(eventsList);

    } catch (error) {
      console.error("Error fetching old events data: ", error);
      toast({ variant: 'destructive', title: 'Erro ao buscar dados antigos', description: 'Verifique as permissões de leitura no banco de dados listeiro-cf302. Detalhe: ' + (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOldEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
    if (selectedYear && selectedMonth) {
        const year = parseInt(selectedYear, 10);
        const month = parseInt(selectedMonth, 10);
        const start = startOfMonth(new Date(year, month));
        const end = endOfMonth(new Date(year, month));
        setDateRange({ from: start, to: end });
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
      if (dateRange && dateRange.from) {
        const from = dateRange.from;
        if (!selectedYear || !selectedMonth || getYear(from) !== parseInt(selectedYear, 10) || getMonth(from) !== parseInt(selectedMonth, 10)) {
            setSelectedYear(undefined);
            setSelectedMonth(undefined);
        }
      }
  }, [dateRange, selectedMonth, selectedYear]);


  const filteredEvents = useMemo(() => {
    let filtered = [...events];
    
    if (dateRange?.from) {
      const fromDate = startOfDay(dateRange.from); 
      const toDate = dateRange.to ? new Date(dateRange.to) : new Date(8640000000000000); // Far future
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(event => event.data_evento >= fromDate && event.data_evento <= toDate);
    }
    
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(event => 
        event.nome_evento.toLowerCase().includes(lowerSearchTerm) ||
        (event.contratante_nome && event.contratante_nome.toLowerCase().includes(lowerSearchTerm)) ||
        event.local.toLowerCase().includes(lowerSearchTerm)
      );
    }

    return filtered;
  }, [events, dateRange, searchTerm]);

  const handleDownloadPdf = () => {
    if (filteredEvents.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhum evento para exportar',
        description: 'Não há eventos na tabela para serem exportados para PDF.',
      });
      return;
    }
  
    const doc = new jsPDF({
      orientation: 'landscape',
    });
  
    doc.setFontSize(16);
    doc.text('Relatório de Eventos (Banco de Dados Antigo)', 14, 15);
  
    const tableColumn = ["Data", "Evento", "Local", "Contratante", "Valor Total", "Status Pag.", "DJ"];
    const tableRows: (string | number)[][] = [];
  
    filteredEvents.forEach(event => {
      const eventData = [
        format(event.data_evento, 'dd/MM/yyyy'),
        event.nome_evento,
        event.local,
        event.contratante_nome || 'N/A',
        Number(event.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        getStatusText(event.status_pagamento),
        event.dj_nome || 'N/A'
      ];
      tableRows.push(eventData);
    });
  
    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
  
    doc.save(`relatorio_eventos_antigos_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <div>
              <Button variant="ghost" size="sm" asChild className="-ml-3 mb-2">
                  <Link href="/settings/migration">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar para Migração
                  </Link>
              </Button>
              <CardTitle className="font-headline text-2xl">Eventos do Banco de Dados Antigo</CardTitle>
              <CardDescription>Visualização somente leitura dos eventos de `listeiro-cf302`.</CardDescription>
            </div>
            <Button onClick={handleDownloadPdf} variant="outline" className="ml-auto">
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <Input 
              placeholder="Buscar por evento, contratante, local..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="lg:col-span-2"
            />
             <div className="flex items-center gap-1 lg:col-span-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          `A partir de ${format(dateRange.from, "LLL dd, y")}`
                        )
                      ) : (
                        <span>Todo o período</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
                {dateRange && (
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setDateRange(undefined)}>
                        <X className="h-4 w-4" />
                    </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 lg:col-span-1">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={!selectedYear}>
                      <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
                      <SelectContent>
                          {[{ value: '0', label: 'Janeiro' }, { value: '1', label: 'Fevereiro' }, { value: '2', label: 'Março' }, { value: '3', label: 'Abril' }, { value: '4', label: 'Maio' }, { value: '5', label: 'Junho' }, { value: '6', label: 'Julho' }, { value: '7', label: 'Agosto' }, { value: '8', label: 'Setembro' }, { value: '9', label: 'Outubro' }, { value: '10', label: 'Novembro' }, { value: '11', label: 'Dezembro' }].map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                  </Select>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
                      <SelectContent>
                          {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
          </div>
          
          {isLoading ? (
             <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Carregando eventos antigos...</p>
             </div>
          ) : filteredEvents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum evento encontrado para os filtros selecionados.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Contratante</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Conta Recebeu</TableHead>
                    <TableHead>Status Pag.</TableHead>
                    <TableHead>DJ (Nome Antigo)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="font-medium">{format(event.data_evento, 'dd/MM/yyyy')}</div>
                        <div className="text-xs text-muted-foreground">{event.dia_da_semana}</div>
                        <div className="text-xs text-muted-foreground">{event.horario_inicio ? format(parseISO(`2000-01-01T${event.horario_inicio}`), 'HH:mm') : ''}</div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                            {event.tipo_servico === 'locacao_equipamento' ? <Truck className="h-4 w-4 text-muted-foreground" /> : <Disc className="h-4 w-4 text-muted-foreground" />}
                            <span>{event.nome_evento}</span>
                            {event.settlementId && <LinkIcon className="h-4 w-4 text-primary" title={`Este evento pertence a um fechamento`} />}
                        </div>
                      </TableCell>
                      <TableCell>{event.local}</TableCell>
                      <TableCell>{event.contratante_nome}</TableCell>
                      <TableCell>
                        {Number(event.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                       <TableCell className="capitalize">
                        {event.conta_que_recebeu === 'agencia' ? 'Agência' : 'DJ'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(event.status_pagamento)} className="capitalize text-xs">
                          {getStatusText(event.status_pagamento)}
                        </Badge>
                      </TableCell>
                      <TableCell>{event.dj_nome}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OldEventsPage;

    