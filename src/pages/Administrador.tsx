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
import { Shield, Users, Edit, Calendar, Plus, Trash2, Key, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Usuario {
    id: string;
    email: string;
    created_at: string;
    raw_user_meta_data: {
        nome?: string;
        role?: string;
    };
}

interface Assinatura {
    id: string;
    empresa_id: string;
    empresas?: { nome: string; cnpj: string };
    plano: string;
    valor_mensal: number;
    dia_vencimento: number;
    status: string;
    ultimo_pagamento?: string;
    proximo_vencimento?: string;
}

interface Empresa {
    id: string;
    nome: string;
    cnpj: string;
}

export default function Administrador() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);

    // --- USUÁRIOS STATE ---
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
    const [nome, setNome] = useState("");
    const [role, setRole] = useState("");

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newNome, setNewNome] = useState("");
    const [newRole, setNewRole] = useState("user");

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [usuarioExcluir, setUsuarioExcluir] = useState<Usuario | null>(null);

    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [newPasswordUpdate, setNewPasswordUpdate] = useState("");

    // --- FATURAMENTO STATE ---
    const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [assinaturaDialogOpen, setAssinaturaDialogOpen] = useState(false);
    const [assinaturaEditando, setAssinaturaEditando] = useState<Assinatura | null>(null); // null = creating

    // Form Assinatura
    const [assEmpresaId, setAssEmpresaId] = useState("");
    const [assPlano, setAssPlano] = useState("basic");
    const [assValor, setAssValor] = useState("0");
    const [assDiaVencimento, setAssDiaVencimento] = useState("10");
    const [assStatus, setAssStatus] = useState("ativo");

    // Form Nova Empresa
    const [modoNovaEmpresa, setModoNovaEmpresa] = useState(false);
    const [novaEmpresaNome, setNovaEmpresaNome] = useState("");
    const [novaEmpresaCnpj, setNovaEmpresaCnpj] = useState("");
    const [novaEmpresaEmail, setNovaEmpresaEmail] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Carregar Usuários
            const { data: usersData, error: usersError } = await supabase.functions.invoke('admin-users', {
                body: { action: 'listUsers' }
            });
            if (usersError) throw usersError;
            setUsuarios(usersData as Usuario[]);

            // Carregar Assinaturas
            const { data: assData, error: assError } = await supabase.functions.invoke('admin-users', {
                body: { action: 'listAssinaturas' }
            });
            if (assError) throw assError;
            setAssinaturas(assData as Assinatura[]);

            // Carregar Empresas (para o select)
            const { data: empData, error: empError } = await supabase.functions.invoke('admin-users', {
                body: { action: 'listEmpresas' }
            });
            if (empError) throw empError;
            setEmpresas(empData as Empresa[]);

        } catch (error: any) {
            console.error('Erro ao carregar dados:', error);
            toast({
                title: "Erro ao carregar dados",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    // --- USUÁRIOS HANDLERS ---

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
                    payload: { id: usuarioEditando.id, updates: { nome, role } }
                }
            });
            if (error) throw error;
            toast({ title: "Usuário atualizado com sucesso!" });
            setEditDialogOpen(false);
            loadData();
        } catch (error: any) {
            toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
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
                    payload: { email: newEmail, password: newPassword, nome: newNome, role: newRole }
                }
            });
            if (error) throw error;
            toast({ title: "Usuário criado com sucesso!" });
            setCreateDialogOpen(false);
            setNewEmail(""); setNewPassword(""); setNewNome(""); setNewRole("user");
            loadData();
        } catch (error: any) {
            toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
        }
    };

    const handleExcluirUsuario = async () => {
        if (!usuarioExcluir) return;
        try {
            const { error } = await supabase.functions.invoke('admin-users', {
                body: { action: 'deleteUser', payload: { userId: usuarioExcluir.id } }
            });
            if (error) throw error;
            toast({ title: "Usuário excluído com sucesso!" });
            setDeleteDialogOpen(false);
            loadData();
        } catch (error: any) {
            toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
        }
    };

    const handleAlterarSenha = async () => {
        if (!usuarioEditando || !newPasswordUpdate) return;
        try {
            const { error } = await supabase.functions.invoke('admin-users', {
                body: {
                    action: 'updateUserPassword',
                    payload: { userId: usuarioEditando.id, newPassword: newPasswordUpdate }
                }
            });
            if (error) throw error;
            toast({ title: "Senha alterada com sucesso!" });
            setPasswordDialogOpen(false);
            setNewPasswordUpdate("");
        } catch (error: any) {
            toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" });
        }
    };

    // --- FATURAMENTO HANDLERS ---

    const handleNovaAssinatura = () => {
        setAssinaturaEditando(null);
        setAssEmpresaId("");
        setAssPlano("basic");
        setAssValor("0");
        setAssDiaVencimento("10");
        setAssStatus("ativo");
        setModoNovaEmpresa(false);
        // Limpar form nova empresa
        setNovaEmpresaNome("");
        setNovaEmpresaCnpj("");
        setNovaEmpresaEmail("");
        setAssinaturaDialogOpen(true);
    };

    const handleEditarAssinatura = (ass: Assinatura) => {
        setAssinaturaEditando(ass);
        setAssEmpresaId(ass.empresa_id);
        setAssPlano(ass.plano);
        setAssValor(ass.valor_mensal.toString());
        setAssDiaVencimento(ass.dia_vencimento.toString());
        setAssStatus(ass.status);
        setAssinaturaDialogOpen(true);
    };

    const handleSalvarAssinatura = async () => {
        try {
            let empresaId = assEmpresaId;

            // Se está no modo de nova empresa, criar a empresa primeiro
            if (modoNovaEmpresa) {
                if (!novaEmpresaNome || !novaEmpresaCnpj) {
                    toast({ title: "Preencha nome e CNPJ da empresa", variant: "destructive" });
                    return;
                }

                if (!novaEmpresaEmail) {
                    toast({ title: "Email é obrigatório para criar acesso", variant: "destructive" });
                    return;
                }

                // Criar nova empresa via Edge Function (bypass RLS)
                const { data: novaEmpresa, error: empresaError } = await supabase.functions.invoke('admin-users', {
                    body: {
                        action: 'createEmpresa',
                        payload: {
                            empresa: {
                                nome: novaEmpresaNome,
                                cnpj: novaEmpresaCnpj
                            }
                        }
                    }
                });

                if (empresaError) {
                    let errorMessage = empresaError.message;
                    try {
                        // Tentar extrair mensagem detalhada da resposta
                        if (empresaError && typeof empresaError === 'object' && 'context' in empresaError) {
                            // @ts-ignore
                            const body = await empresaError.context.json();
                            if (body.error) errorMessage = body.error;
                        }
                    } catch (e) {
                        console.error("Erro ao ler resposta de erro:", e);
                    }
                    throw new Error(errorMessage);
                }
                empresaId = novaEmpresa.id;
                toast({ title: "Empresa cadastrada com sucesso!" });

                // Criar usuário automaticamente com senha padrão
                try {
                    const { error: userError } = await supabase.functions.invoke('admin-users', {
                        body: {
                            action: 'createUser',
                            payload: {
                                email: novaEmpresaEmail,
                                password: '123456',
                                nome: novaEmpresaNome,
                                role: 'user'
                            }
                        }
                    });

                    if (userError) {
                        console.error('Erro ao criar usuário:', userError);
                        toast({
                            title: "Aviso",
                            description: "Empresa criada, mas houve erro ao criar o acesso. Crie manualmente na aba de usuários.",
                            variant: "default"
                        });
                    } else {
                        toast({
                            title: "Acesso criado!",
                            description: `Email: ${novaEmpresaEmail} | Senha: 123456`
                        });
                    }
                } catch (userCreateError) {
                    console.error('Erro ao criar usuário:', userCreateError);
                    toast({
                        title: "Aviso",
                        description: "Empresa criada, mas houve erro ao criar o acesso.",
                        variant: "default"
                    });
                }
            } else {
                if (!empresaId) {
                    toast({ title: "Selecione uma empresa", variant: "destructive" });
                    return;
                }
            }

            const payload = {
                id: assinaturaEditando?.id,
                empresa_id: empresaId,
                plano: assPlano,
                valor_mensal: parseFloat(assValor),
                dia_vencimento: parseInt(assDiaVencimento),
                status: assStatus
            };

            const { error } = await supabase.functions.invoke('admin-users', {
                body: {
                    action: 'upsertAssinatura',
                    payload: { assinatura: payload }
                }
            });
            if (error) throw error;
            toast({ title: "Assinatura salva com sucesso!" });
            setAssinaturaDialogOpen(false);
            loadData();
        } catch (error: any) {
            toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        }
    };

    const handleExcluirAssinatura = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir esta assinatura?")) return;
        try {
            const { error } = await supabase.functions.invoke('admin-users', {
                body: { action: 'deleteAssinatura', payload: { assinaturaId: id } }
            });
            if (error) throw error;
            toast({ title: "Assinatura excluída!" });
            loadData();
        } catch (error: any) {
            toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
        }
    };

    // --- UTILS ---
    const formatDate = (date: string) => new Date(date).toLocaleDateString("pt-BR");
    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const getRoleBadge = (role?: string) => {
        const roleMap: Record<string, { variant: any; label: string }> = {
            admin: { variant: "default", label: "Admin" },
            user: { variant: "secondary", label: "Usuário" },
            super_admin: { variant: "destructive", label: "Super Admin" },
        };
        const config = roleMap[role || "user"] || roleMap.user;
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, any> = {
            ativo: "default",
            inativo: "secondary",
            pendente: "outline",
            bloqueado: "destructive"
        };
        return <Badge variant={map[status] || "outline"}>{status.toUpperCase()}</Badge>;
    };

    // --- DASHBOARD METRICS ---
    const totalMRR = assinaturas.reduce((acc, curr) => acc + (curr.status === 'ativo' ? curr.valor_mensal : 0), 0);
    const totalEmpresasAtivas = assinaturas.filter(a => a.status === 'ativo').length;
    const totalInadimplentes = assinaturas.filter(a => a.status === 'bloqueado').length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Shield className="h-8 w-8 text-primary" />
                        Gestão Deep
                    </h1>
                    <p className="text-muted-foreground">Gerenciamento completo de usuários, empresas e assinaturas</p>
                </div>
            </div>

            {/* Dashboard Metrics */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                        <Users className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{usuarios.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">MRR (Mensal)</CardTitle>
                        <DollarSign className="h-5 w-5 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(totalMRR)}</div>
                        <p className="text-xs text-muted-foreground">Receita recorrente mensal</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Empresas Ativas</CardTitle>
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{totalEmpresasAtivas}</div>
                        <p className="text-xs text-muted-foreground">Assinaturas ativas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Inadimplentes</CardTitle>
                        <AlertCircle className="h-5 w-5 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{totalInadimplentes}</div>
                        <p className="text-xs text-muted-foreground">Assinaturas bloqueadas</p>
                    </CardContent>
                </Card>
            </div>

            {/* Usuários Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Usuários do Sistema</CardTitle>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" /> Novo Usuário
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Data Criação</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {usuarios.map((usuario) => (
                                <TableRow key={usuario.id}>
                                    <TableCell className="font-medium">{usuario.email}</TableCell>
                                    <TableCell>{usuario.raw_user_meta_data?.nome || "-"}</TableCell>
                                    <TableCell>{getRoleBadge(usuario.raw_user_meta_data?.role)}</TableCell>
                                    <TableCell>{formatDate(usuario.created_at)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="outline" onClick={() => handleEditar(usuario)}>
                                                <Edit className="h-4 w-4 mr-1" /> Editar
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => { setUsuarioExcluir(usuario); setDeleteDialogOpen(true); }}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Assinaturas & Planos Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Assinaturas & Planos</CardTitle>
                    <Button onClick={handleNovaAssinatura}>
                        <Plus className="h-4 w-4 mr-2" /> Nova Assinatura
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Empresa</TableHead>
                                <TableHead>CNPJ</TableHead>
                                <TableHead>Plano</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Vencimento</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assinaturas.map((ass) => (
                                <TableRow key={ass.id}>
                                    <TableCell className="font-medium">{ass.empresas?.nome || "N/A"}</TableCell>
                                    <TableCell>{ass.empresas?.cnpj || "N/A"}</TableCell>
                                    <TableCell className="capitalize">{ass.plano}</TableCell>
                                    <TableCell>{formatCurrency(ass.valor_mensal)}</TableCell>
                                    <TableCell>Dia {ass.dia_vencimento}</TableCell>
                                    <TableCell>{getStatusBadge(ass.status)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="outline" onClick={() => handleEditarAssinatura(ass)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleExcluirAssinatura(ass.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* --- DIALOGS --- */}

            {/* Criar Usuário */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email" />
                        <Input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Senha" type="password" />
                        <Input value={newNome} onChange={e => setNewNome(e.target.value)} placeholder="Nome" />
                        <Select value={newRole} onValueChange={setNewRole}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">Usuário</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCriarUsuario}>Criar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Editar Usuário */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <Input value={usuarioEditando?.email || ""} disabled />
                        <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome" />
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">Usuário</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="secondary" className="w-full" onClick={() => setPasswordDialogOpen(true)}>
                            <Key className="h-4 w-4 mr-2" /> Alterar Senha
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSalvarEdicao}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Alterar Senha */}
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Alterar Senha de {usuarioEditando?.email}</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <Input value={newPasswordUpdate} onChange={e => setNewPasswordUpdate(e.target.value)} placeholder="Nova Senha" type="password" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAlterarSenha}>Confirmar Alteração</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Excluir Usuário */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Usuário?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação é irreversível.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleExcluirUsuario} className="bg-destructive">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Assinatura Dialog */}
            <Dialog open={assinaturaDialogOpen} onOpenChange={setAssinaturaDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{assinaturaEditando ? "Editar Assinatura" : "Nova Assinatura"}</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        {!assinaturaEditando && (
                            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                                <Label className="flex-1">Cadastrar nova empresa?</Label>
                                <Button
                                    type="button"
                                    variant={modoNovaEmpresa ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setModoNovaEmpresa(!modoNovaEmpresa)}
                                >
                                    {modoNovaEmpresa ? "Sim, cadastrar nova" : "Não, selecionar existente"}
                                </Button>
                            </div>
                        )}

                        {modoNovaEmpresa && !assinaturaEditando ? (
                            // Formulário de Nova Empresa
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Nome Fantasia *</Label>
                                        <Input value={novaEmpresaNome} onChange={e => setNovaEmpresaNome(e.target.value)} placeholder="Nome da empresa" />
                                    </div>
                                    <div>
                                        <Label>CNPJ *</Label>
                                        <Input value={novaEmpresaCnpj} onChange={e => setNovaEmpresaCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                                    </div>
                                </div>
                                <div>
                                    <Label>Email * (usado para criar acesso)</Label>
                                    <Input type="email" value={novaEmpresaEmail} onChange={e => setNovaEmpresaEmail(e.target.value)} placeholder="contato@empresa.com" />
                                    <p className="text-xs text-muted-foreground mt-1">Será criado um usuário com este email e senha padrão: 123456</p>
                                </div>
                            </>
                        ) : (
                            // Seleção de Empresa Existente
                            <div>
                                <Label>Empresa</Label>
                                <Select value={assEmpresaId} onValueChange={setAssEmpresaId} disabled={!!assinaturaEditando}>
                                    <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                                    <SelectContent>
                                        {empresas.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id}>{emp.nome} ({emp.cnpj})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Plano</Label>
                                <Select value={assPlano} onValueChange={setAssPlano}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="free">Free</SelectItem>
                                        <SelectItem value="basic">Basic</SelectItem>
                                        <SelectItem value="pro">Pro</SelectItem>
                                        <SelectItem value="enterprise">Enterprise</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Valor Mensal (R$)</Label>
                                <Input type="number" value={assValor} onChange={e => setAssValor(e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Dia Vencimento</Label>
                                <Input type="number" min="1" max="31" value={assDiaVencimento} onChange={e => setAssDiaVencimento(e.target.value)} />
                            </div>
                            <div>
                                <Label>Status</Label>
                                <Select value={assStatus} onValueChange={setAssStatus}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ativo">Ativo</SelectItem>
                                        <SelectItem value="inativo">Inativo</SelectItem>
                                        <SelectItem value="pendente">Pendente</SelectItem>
                                        <SelectItem value="bloqueado">Bloqueado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssinaturaDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSalvarAssinatura}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
