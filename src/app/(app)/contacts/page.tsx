
'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import type { Contact } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Search, 
  Download, 
  ChevronRight, 
  Loader2, 
  Filter, 
  TrendingUp, 
  Phone, 
  Mail, 
  Instagram 
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CRMContactsPage() {
  const { userDetails } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros
  const [filterHasWA, setFilterHasWA] = useState(false);
  const [filterHasEmail, setFilterHasEmail] = useState(false);

  useEffect(() => {
    if (!userDetails) return;

    const q = query(collection(db, 'contacts'), orderBy('lastActivity', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setContacts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact)));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userDetails]);

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = !searchTerm || 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.whatsapp && c.whatsapp.includes(searchTerm)) ||
        (c.instagram && c.instagram.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesWA = !filterHasWA || !!c.whatsapp;
      const matchesEmail = !filterHasEmail || !!c.email;

      return matchesSearch && matchesWA && matchesEmail;
    });
  }, [contacts, searchTerm, filterHasWA, filterHasEmail]);

  const rankingContacts = useMemo(() => {
    return [...contacts]
      .sort((a, b) => (b.attendanceCount || 0) - (a.attendanceCount || 0))
      .slice(0, 10);
  }, [contacts]);

  const handleExportCSV = () => {
    if (filteredContacts.length === 0) return;
    
    const headers = ['Nome', 'WhatsApp', 'Instagram', 'Email', 'Total Inscricoes (RSVP)', 'Ultima Atividade'];
    const rows = filteredContacts.map(c => [
      c.name,
      c.whatsapp || '',
      c.instagram || '',
      c.email || '',
      c.attendanceCount || 0,
      c.lastActivity ? format(c.lastActivity.toDate(), 'dd/MM/yyyy HH:mm') : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `crm_contatos_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Carregando inteligência de contatos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">CRM de Frequentadores</h1>
          <p className="text-muted-foreground">Base consolidada de convidados e histórico de RSVP.</p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Exportar Lista Filtrada
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Coluna de Ranking/Stats */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Top Inscritos (RSVP)
              </CardTitle>
              <CardDescription className="text-[10px]">Frequentadores mais recorrentes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {rankingContacts.map((c, idx) => (
                <Link key={c.id} href={`/contacts/${c.id}`}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-background transition-colors border border-transparent hover:border-border">
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-black">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{c.name}</p>
                      <p className="text-[9px] text-muted-foreground">{c.attendanceCount} inscrições</p>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros Rápidos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="wa-filter" className="text-xs font-medium cursor-pointer">Tem WhatsApp</label>
                <input 
                  type="checkbox" 
                  id="wa-filter" 
                  checked={filterHasWA} 
                  onChange={(e) => setFilterHasWA(e.target.checked)}
                  className="h-4 w-4 accent-primary" 
                />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="email-filter" className="text-xs font-medium cursor-pointer">Tem E-mail</label>
                <input 
                  type="checkbox" 
                  id="email-filter" 
                  checked={filterHasEmail} 
                  onChange={(e) => setFilterHasEmail(e.target.checked)}
                  className="h-4 w-4 accent-primary" 
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Contatos */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome, insta, e-mail ou whatsapp..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Convidado</TableHead>
                      <TableHead>Contatos</TableHead>
                      <TableHead className="text-center">RSVPs</TableHead>
                      <TableHead className="text-right">Última Atividade</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          Nenhum contato encontrado com os filtros atuais.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredContacts.map((c) => (
                        <TableRow key={c.id} className="hover:bg-muted/30 cursor-pointer" asChild>
                          <Link href={`/contacts/${c.id}`}>
                            <TableCell className="py-4">
                              <div className="font-bold text-sm">{c.name}</div>
                              {c.instagram && (
                                <div className="text-[10px] text-primary font-bold flex items-center gap-1 mt-0.5">
                                  <Instagram className="h-2.5 w-2.5" />
                                  @{c.instagram.replace('@', '')}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-3">
                                {c.whatsapp && (
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title={c.whatsapp}>
                                    <Phone className="h-3 w-3" />
                                    Sim
                                  </div>
                                )}
                                {c.email && (
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title={c.email}>
                                    <Mail className="h-3 w-3" />
                                    Sim
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="text-[10px] font-black">{c.attendanceCount || 0}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-[10px] text-muted-foreground font-medium">
                              {c.lastActivity ? format(c.lastActivity.toDate(), 'dd/MM/yy HH:mm') : '---'}
                            </TableCell>
                            <TableCell>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                          </Link>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
