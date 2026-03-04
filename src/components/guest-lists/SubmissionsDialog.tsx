
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Download, Users } from 'lucide-react';
import { format } from 'date-fns';
import type { GuestSubmission, GuestList } from '@/lib/types';

interface SubmissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  list: GuestList | null;
}

export default function SubmissionsDialog({ isOpen, onClose, list }: SubmissionsDialogProps) {
  const [submissions, setSubmissions] = useState<GuestSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!list || !isOpen) return;

    setIsLoading(true);
    const q = query(
      collection(db, 'guest_submissions'),
      where('listId', '==', list.id),
      orderBy('submittedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GuestSubmission)));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [list, isOpen]);

  const filteredSubmissions = submissions.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleExportCSV = () => {
    if (submissions.length === 0) return;
    
    const headers = ['Nome', 'WhatsApp', 'Instagram', 'Email', 'Data Inscrição'];
    const rows = submissions.map(s => [
      s.name,
      s.whatsapp || '',
      s.instagram || '',
      s.email || '',
      format(s.submittedAt.toDate(), 'dd/MM/yyyy HH:mm')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inscritos_${list?.slug || 'lista'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <DialogTitle className="font-headline text-2xl flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Inscritos: {list?.name}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Total de {submissions.length} nomes registrados.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={submissions.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 pt-2 space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome ou e-mail..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="border rounded-md flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum inscrito encontrado.
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Instagram</TableHead>
                    <TableHead className="text-right">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">
                        <div>{sub.name}</div>
                        <div className="text-[10px] text-muted-foreground">{sub.email}</div>
                      </TableCell>
                      <TableCell className="text-xs">{sub.whatsapp || '---'}</TableCell>
                      <TableCell className="text-xs">
                        {sub.instagram ? (
                          <span className="text-primary font-bold">@{sub.instagram.replace('@', '')}</span>
                        ) : '---'}
                      </TableCell>
                      <TableCell className="text-right text-[10px] text-muted-foreground">
                        {format(sub.submittedAt.toDate(), 'dd/MM HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
