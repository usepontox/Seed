import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, Edit, Calendar, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Usuario {
    id: string;
    email: string;
    created_at: string;
    raw_user_meta_data: {
        nome?: string;
        role?: string;
    };
}

export default function Administrador() {
    const { toast } = useToast();
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit State
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
    const [nome, setNome] = useState("");
    const [role, setRole] = useState("");

    // Create State
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newNome, setNewNome] = useState("");
    const [newRole, setNewRole] = useState("user");

    // Delete State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [usuarioExcluir, setUsuarioExcluir] = useState<Usuario | null>(null);

    useEffect(() => {
        loadUsuarios();
    }, []);

    const loadUsuarios = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('admin-users', {
                body: { action: 'listUsers' }
            });

            if (error) throw error;

            setUsuarios(data as Usuario[]);
        } catch (error: any) {
            console.error('Erro ao carregar usuários:', error);
            toast({
                title: "Erro ao carregar usuários",
                description: error.message || "Verifique se você tem permissão.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEditar = (usuario: Usuario) => {
        setUsuarioEditando(usuario);
        setNome(usuario.raw_user_meta_data?.nome || "");
        setRole(usuario.raw_user_meta_data?.role || "user");
        setEditDialogOpen(true);
    };

    const handleSalvarEdicao = async () => {
        if (!usuarioEditando) return;

        try {
            const { error } = await supabase.functions.invoke('admin-users', {
                body: {
                    action: 'updateUser',
                    payload: {
                        id: usuarioEditando.id,
                        updates: { nome, role }
                    }
                }
            });

            if (error) throw error;

            toast({ title: "Usuário atualizado com sucesso!" });
            setEditDialogOpen(false);
            loadUsuarios();
        } catch (error: any) {
            toast({
                title: "Erro ao atualizar usuário",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleCriarUsuario = async () => {
        if (!newEmail || !newPassword || !newNome) {
            toast({ title: "Preencha todos os campos", variant: "destructive" });
            return;
        }

        try {
            const { error } = await supabase.functions.invoke('admin-users', {
                body: {
                    action: 'createUser',
                    payload: {
                        email: newEmail,
                        password: newPassword,
                        nome: newNome,
                        role: newRole
                    }
                }
            });

            if (error) throw error;

            toast({ title: "Usuário criado com sucesso!" });
            setCreateDialogOpen(false);
            setNewEmail("");
            setNewPassword("");
            setNewNome("");
            setNewRole("user");
            loadUsuarios();
        } catch (error: any) {
            toast({
                title: "Erro ao criar usuário",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const confirmExcluir = (usuario: Usuario) => {
        setUsuarioExcluir(usuario);
        setDeleteDialogOpen(true);
    };

    const handleExcluirUsuario = async () => {
        if (!usuarioExcluir) return;

        try {
            const { error } = await supabase.functions.invoke('admin-users', {
                body: {
                    action: 'deleteUser',
                    payload: { userId: usuarioExcluir.id }
                }
            });

            if (error) throw error;

            toast({ title: "Usuário excluído com sucesso!" });
            setDeleteDialogOpen(false);
            loadUsuarios();
        } catch (error: any) {
            toast({
                title: "Erro ao excluir usuário",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getRoleBadge = (role?: string) => {
        const roleMap: Record<string, { variant: any; label: string }> = {
            admin: { variant: "default", label: "Admin" },
            user: { variant: "secondary", label: "Usuário" },
            super_admin: { variant: "destructive", label: "Super Admin" },
        };

        const config = roleMap[role || "user"] || roleMap.user;
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Shield className="h-8 w-8 text-primary" />
                        Administrador
                    </h1>
                    <p className="text-muted-foreground">Gerenciamento de usuários do sistema</p>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Usuário
                </Button>
            </div>

            {/* Cards de resumo */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                        <Users className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{usuarios.length}</div>
                        <p className="text-xs text-muted-foreground">Usuários cadastrados</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Administradores</CardTitle>
                        <Shield className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">
                            {usuarios.filter(u => u.raw_user_meta_data?.role === "admin" || u.raw_user_meta_data?.role === "super_admin").length}
                        </div>
                        <p className="text-xs text-muted-foreground">Com privilégios elevados</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de usuários */}
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Usuários</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-center py-8 text-muted-foreground">Carregando...</p>
                    ) : usuarios.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Data de Criação</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {usuarios.map((usuario) => (
                                    <TableRow key={usuario.id}>
                                        <TableCell className="font-medium">{usuario.email}</TableCell>
                                        <TableCell>{usuario.raw_user_meta_data?.nome || "-"}</TableCell>
                                        <TableCell>{getRoleBadge(usuario.raw_user_meta_data?.role)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                                {formatDate(usuario.created_at)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEditar(usuario)}
                                                >
                                                    <Edit className="h-4 w-4 mr-1" />
                                                    Editar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => confirmExcluir(usuario)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Dialog de edição */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Usuário</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Email</Label>
                            <Input value={usuarioEditando?.email || ""} disabled />
                        </div>
                        <div>
                            <Label>Nome</Label>
                            <Input
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                placeholder="Nome do usuário"
                            />
                        </div>
                        <div>
                            <Label>Role</Label>
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">Usuário</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="super_admin">Super Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSalvarEdicao}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog de criação */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Novo Usuário</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Email</Label>
                            <Input
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="email@exemplo.com"
                                type="email"
                            />
                        </div>
                        <div>
                            <Label>Senha</Label>
                            <Input
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="******"
                                type="password"
                            />
                        </div>
                        <div>
                            <Label>Nome</Label>
                            <Input
                                value={newNome}
                                onChange={(e) => setNewNome(e.target.value)}
                                placeholder="Nome do usuário"
                            />
                        </div>
                        <div>
                            <Label>Role</Label>
                            <Select value={newRole} onValueChange={setNewRole}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">Usuário</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="super_admin">Super Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCriarUsuario}>Criar Usuário</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog de confirmação de exclusão */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente o usuário
                            <strong> {usuarioExcluir?.email}</strong> e removerá seus dados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleExcluirUsuario} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
