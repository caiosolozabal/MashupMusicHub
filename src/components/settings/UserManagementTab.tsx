'use client';

import { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import type { UserDetails } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Edit, CheckCircle2, XCircle, UserPlus, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import EditUserDialog from './EditUserDialog';
import { Badge } from '../ui/badge';
import InviteUserDialog from './InviteUserDialog';
import { sendPasswordResetEmail } from 'firebase/auth';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function UserManagementTab() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados para os diálogos
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);


  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      if (!db) throw new Error('Firestore not initialized');
      const usersCollection = collection(db, 'users');
      const q = query(usersCollection, orderBy('displayName'));
      const usersSnapshot = await getDocs(q);
      const usersList = usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
      } as UserDetails));
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ variant: 'destructive', title: 'Erro ao buscar usuários', description: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditUser = (user: UserDetails) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleEditDialogClose = (updated?: boolean) => {
    setIsEditDialogOpen(false);
    setSelectedUser(null);
    if (updated) {
      fetchUsers();
    }
  };
  
  const handleInviteDialogClose = (created?: boolean) => {
    setIsInviteDialogOpen(false);
    if (created) {
        fetchUsers();
    }
  }

  const openPasswordResetConfirm = (user: UserDetails) => {
    setSelectedUser(user);
    setIsResetConfirmOpen(true);
  };
  
  const handlePasswordReset = async () => {
    if (!selectedUser || !selectedUser.email) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Usuário ou email não selecionado.'});
        return;
    }
    setIsResettingPassword(true);
    try {
        await sendPasswordResetEmail(auth, selectedUser.email);
        toast({
            title: 'Email de Redefinição Enviado',
            description: `Um link para redefinir a senha foi enviado para ${selectedUser.email}.`,
        });
    } catch (error: any) {
        console.error("Password reset error:", error);
        toast({
            variant: 'destructive',
            title: 'Erro ao Enviar Email',
            description: error.message,
        });
    } finally {
        setIsResettingPassword(false);
        setIsResetConfirmOpen(false);
        setSelectedUser(null);
    }
  }


  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando usuários...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setIsInviteDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <UserPlus className="mr-2 h-5 w-5" />
          Convidar Novo Usuário
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>% Serviço DJ</TableHead>
              <TableHead>% Locação</TableHead>
              <TableHead>Pode Locar?</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.uid}>
                <TableCell className="font-medium">{user.displayName || 'N/A'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="capitalize">{user.role || 'N/A'}</TableCell>
                <TableCell>
                  {user.role === 'dj' ? (user.dj_percentual ? `${(user.dj_percentual * 100).toFixed(0)}%` : 'Não definido') : 'N/A'}
                </TableCell>
                <TableCell>
                  {user.role === 'dj' ? (user.rental_percentual ? `${(user.rental_percentual * 100).toFixed(0)}%` : 'N/D') : 'N/A'}
                </TableCell>
                <TableCell>
                  {user.role === 'dj' ? (
                     <Badge variant={user.pode_locar ? 'default' : 'outline'}>
                      {user.pode_locar ? <CheckCircle2 className="h-4 w-4 mr-1"/> : <XCircle className="h-4 w-4 mr-1"/>}
                      {user.pode_locar ? 'Sim' : 'Não'}
                    </Badge>
                  ) : 'N/A'}
                </TableCell>
                <TableCell>
                  {user.role === 'dj' && user.dj_color ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: user.dj_color }}></div>
                      <span className="font-mono text-xs">{user.dj_color}</span>
                    </div>
                  ) : 'N/A'}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                    <Edit className="mr-1 h-4 w-4" />
                    Editar
                  </Button>
                   <Button variant="secondary" size="sm" onClick={() => openPasswordResetConfirm(user)}>
                    <KeyRound className="mr-1 h-4 w-4" />
                    Resetar Senha
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {selectedUser && (
        <EditUserDialog
          user={selectedUser}
          isOpen={isEditDialogOpen}
          onClose={handleEditDialogClose}
        />
      )}
      <InviteUserDialog 
        isOpen={isInviteDialogOpen}
        onClose={handleInviteDialogClose}
      />
       <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Redefinição de Senha</AlertDialogTitle>
            <AlertDialogDescription>
              Um e-mail de redefinição de senha será enviado para <span className="font-semibold">{selectedUser?.email}</span>. O usuário precisará clicar no link contido no e-mail para criar uma nova senha. Você confirma o envio?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUser(null)} disabled={isResettingPassword}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePasswordReset}
              disabled={isResettingPassword}
            >
              {isResettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
