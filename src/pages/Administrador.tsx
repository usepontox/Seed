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
    empresas?: { nome: string; cnpj: string; email?: string };
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
    email?: string;
    telefone?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    created_at?: string;
}

interface EmpresaComStatus extends Empresa {
    status: string;
    plano: string;
    assinaturaId?: string;
}

export default function Administrador() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);

    // --- USUÁRIOS STATE ---
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);


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
    const [novaEmpresaTelefone, setNovaEmpresaTelefone] = useState("");
    const [novaEmpresaEndereco, setNovaEmpresaEndereco] = useState("");
    const [novaEmpresaCidade, setNovaEmpresaCidade] = useState("");
    const [novaEmpresaEstado, setNovaEmpresaEstado] = useState("");
    const [novaEmpresaCep, setNovaEmpresaCep] = useState("");

    // Estados para aba de Cadastro de Empresas
    const [empresasComStatus, setEmpresasComStatus] = useState<EmpresaComStatus[]>([]);
    const [empresaDialogOpen, setEmpresaDialogOpen] = useState(false);
    const [empresaEditando, setEmpresaEditando] = useState<Empresa | null>(null);
    const [empresaDeleteDialogOpen, setEmpresaDeleteDialogOpen] = useState(false);
    const [empresaExcluir, setEmpresaExcluir] = useState<Empresa | null>(null);

    // Form fields para empresa
    const [empNome, setEmpNome] = useState("");
    const [empCnpj, setEmpCnpj] = useState("");
    const [empEmail, setEmpEmail] = useState("");
    const [empTelefone, setEmpTelefone] = useState("");
    const [empStatus, setEmpStatus] = useState("ativo");
    const [empPlano, setEmpPlano] = useState("basic");
    const [empValor, setEmpValor] = useState("0");
    const [empEndereco, setEmpEndereco] = useState("");
    const [empCidade, setEmpCidade] = useState("");
    const [empEstado, setEmpEstado] = useState("");
    const [empCep, setEmpCep] = useState("");

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

            // Enriquecer empresas com status e plano
            const enriched = (empData as Empresa[]).map(empresa => {
                const assinatura = (assData as Assinatura[]).find(ass =>
                    ass.empresas?.email === empresa.email
                );

                return {
                    ...empresa,
                    status: assinatura?.status || 'sem_assinatura',
                    plano: assinatura?.plano || '-',
                    valor_mensal: assinatura?.valor_mensal || 0,
                    assinaturaId: assinatura?.id
                };
            });

            setEmpresasComStatus(enriched);

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
        setNovaEmpresaTelefone("");
        setNovaEmpresaEndereco("");
        setNovaEmpresaCidade("");
        setNovaEmpresaEstado("");
        setNovaEmpresaCep("");
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
                                cnpj: novaEmpresaCnpj,
                                email: novaEmpresaEmail,
                                telefone: novaEmpresaTelefone,
                                endereco: novaEmpresaEndereco,
                                cidade: novaEmpresaCidade,
                                estado: novaEmpresaEstado,
                                cep: novaEmpresaCep
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

    // --- EMPRESA HANDLERS ---

    const handleNovaEmpresa = () => {
        setEmpresaEditando(null);
        setEmpNome("");
        setEmpCnpj("");
        setEmpEmail("");
        setEmpTelefone("");
        setEmpEndereco("");
        setEmpCidade("");
        setEmpEstado("");
        setEmpCep("");
        setEmpStatus("ativo");
        setEmpPlano("basic");
        setEmpValor("0");
        setEmpresaDialogOpen(true);
    };

    const handleEditarEmpresa = (empresa: Empresa) => {
        setEmpresaEditando(empresa);
        setEmpNome(empresa.nome);
        setEmpCnpj(empresa.cnpj);
        setEmpEmail(empresa.email || "");
        setEmpTelefone(empresa.telefone || "");
        setEmpEndereco(empresa.endereco || "");
        setEmpCidade(empresa.cidade || "");
        setEmpEstado(empresa.estado || "");
        setEmpCep(empresa.cep || "");
        // @ts-ignore
        setEmpStatus(empresa.status || "ativo");
        // @ts-ignore
        setEmpPlano(empresa.plano || "basic");
        // @ts-ignore
        setEmpValor(empresa.valor_mensal?.toString() || "0");
        setEmpresaDialogOpen(true);
    };

    const handleSalvarEmpresa = async () => {
        if (!empNome || !empCnpj || !empEmail) {
            toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
            return;
        }

        const empresaData = {
            nome: empNome,
            cnpj: empCnpj,
            email: empEmail,
            telefone: empTelefone,
            endereco: empEndereco,
            cidade: empCidade,
            estado: empEstado,
            cep: empCep
        };

        try {
            let empresaId = empresaEditando?.id;

            if (empresaEditando) {
                await supabase.functions.invoke('admin-users', {
                    body: {
                        action: 'updateEmpresa',
                        payload: { empresaId: empresaEditando.id, empresaData }
                    }
                });
                toast({ title: "Empresa atualizada com sucesso!" });
            } else {
                const { data: novaEmpresa } = await supabase.functions.invoke('admin-users', {
                    body: {
                        action: 'createEmpresa',
                        payload: { empresa: empresaData }
                    }
                });
                empresaId = novaEmpresa.id;
                toast({ title: "Empresa cadastrada com sucesso!" });
            }

            // Salvar/Atualizar Assinatura se houver ID da empresa
            if (empresaId) {
                const assinaturaData = {
                    empresa_id: empresaId,
                    plano: empPlano,
                    valor_mensal: parseFloat(empValor.replace(',', '.')),
                    status: empStatus,
                    dia_vencimento: 10 // Default
                };

                // Se editando, tenta manter o ID da assinatura existente
                // @ts-ignore
                if (empresaEditando && empresaEditando.assinaturaId) {
                    // @ts-ignore
                    assinaturaData.id = empresaEditando.assinaturaId;
                }

                await supabase.functions.invoke('admin-users', {
                    body: {
                        action: 'upsertAssinatura',
                        payload: { assinatura: assinaturaData }
                    }
                });
            }

            setEmpresaDialogOpen(false);
            loadData();
        } catch (error: any) {
            toast({ title: "Erro ao salvar empresa", description: error.message, variant: "destructive" });
        }
    };

    const handleExcluirEmpresa = async () => {
        if (!empresaExcluir) return;

        try {
            const { error } = await supabase.functions.invoke('admin-users', {
                body: {
                    action: 'deleteEmpresa',
                    payload: { empresaId: empresaExcluir.id }
                }
            });

            if (error) throw error;
            toast({ title: "Empresa excluída com sucesso!" });
            setEmpresaDeleteDialogOpen(false);
            loadData();
        } catch (error: any) {
            toast({ title: "Erro ao excluir empresa", description: error.message, variant: "destructive" });
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

    const getEmpresaStatusBadge = (status: string) => {
        const statusMap: Record<string, { variant: any; label: string; icon: string }> = {
            ativo: { variant: "default", label: "Ativa", icon: "🟢" },
            inativo: { variant: "secondary", label: "Inativa", icon: "🔴" },
            pendente: { variant: "outline", label: "Pendente", icon: "🟡" },
            bloqueado: { variant: "destructive", label: "Bloqueada", icon: "⚫" },
            sem_assinatura: { variant: "destructive", label: "Sem Assinatura", icon: "🔴" }
        };
        const config = statusMap[status] || statusMap.sem_assinatura;
        return <Badge variant={config.variant} className="gap-1">{config.icon} {config.label}</Badge>;
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

            <Tabs defaultValue="empresas" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="empresas">Cadastro de Empresas</TabsTrigger>
                    <TabsTrigger value="assinaturas">Assinaturas & Planos</TabsTrigger>
                </TabsList>

                {/* --- ABA CADASTRO DE EMPRESAS --- */}
                <TabsContent value="empresas" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Empresas Cadastradas</CardTitle>
                            <Button onClick={handleNovaEmpresa}>
                                <Plus className="h-4 w-4 mr-2" /> Nova Empresa
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome Fantasia</TableHead>
                                        <TableHead>CNPJ</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Telefone</TableHead>
                                        <TableHead>Cidade/UF</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Plano</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {empresasComStatus.map((emp) => (
                                        <TableRow key={emp.id}>
                                            <TableCell className="font-medium">{emp.nome}</TableCell>
                                            <TableCell>{emp.cnpj}</TableCell>
                                            <TableCell>{emp.email || "-"}</TableCell>
                                            <TableCell>{emp.telefone || "-"}</TableCell>
                                            <TableCell>{emp.cidade ? `${emp.cidade}/${emp.estado}` : "-"}</TableCell>
                                            <TableCell>{getEmpresaStatusBadge(emp.status)}</TableCell>
                                            <TableCell className="capitalize">{emp.plano}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => handleEditarEmpresa(emp)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => { setEmpresaExcluir(emp); setEmpresaDeleteDialogOpen(true); }}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {empresasComStatus.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                Nenhuma empresa cadastrada.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- ABA ASSINATURAS --- */}
                <TabsContent value="assinaturas" className="space-y-4">
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
                                        <TableHead>Email</TableHead>
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
                                            <TableCell>{ass.empresas?.email || "-"}</TableCell>
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
                </TabsContent>
            </Tabs>

            {/* --- DIALOGS --- */}

            {/* Dialog Empresa (Criar/Editar) */}
            <Dialog open={empresaDialogOpen} onOpenChange={setEmpresaDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{empresaEditando ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Nome Fantasia *</Label>
                                <Input value={empNome} onChange={e => setEmpNome(e.target.value)} placeholder="Nome da empresa" />
                            </div>
                            <div>
                                <Label>CNPJ *</Label>
                                <Input value={empCnpj} onChange={e => setEmpCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Email * (Vínculo com Assinatura)</Label>
                                <Input type="email" value={empEmail} onChange={e => setEmpEmail(e.target.value)} placeholder="contato@empresa.com" />
                            </div>
                            <div>
                                <Label>Telefone</Label>
                                <Input value={empTelefone} onChange={e => setEmpTelefone(e.target.value)} placeholder="(00) 00000-0000" />
                            </div>
                        </div>
                        <div>
                            <Label>Endereço</Label>
                            <Input value={empEndereco} onChange={e => setEmpEndereco(e.target.value)} placeholder="Rua, número, complemento" />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>Cidade</Label>
                                <Input value={empCidade} onChange={e => setEmpCidade(e.target.value)} placeholder="Cidade" />
                            </div>
                            <div>
                                <Label>Estado</Label>
                                <Input value={empEstado} onChange={e => setEmpEstado(e.target.value)} placeholder="UF" maxLength={2} />
                            </div>
                            <div>
                                <Label>CEP</Label>
                                <Input value={empCep} onChange={e => setEmpCep(e.target.value)} placeholder="00000-000" />
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <h4 className="mb-4 text-sm font-medium leading-none">Dados da Assinatura</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label>Status</Label>
                                    <Select value={empStatus} onValueChange={setEmpStatus}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ativo">Ativa</SelectItem>
                                            <SelectItem value="inativo">Inativa</SelectItem>
                                            <SelectItem value="pendente">Pendente</SelectItem>
                                            <SelectItem value="bloqueado">Bloqueada</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Plano</Label>
                                    <Select value={empPlano} onValueChange={setEmpPlano}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="basic">Basic</SelectItem>
                                            <SelectItem value="pro">Pro</SelectItem>
                                            <SelectItem value="enterprise">Enterprise</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Valor Mensal</Label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-2.5 text-muted-foreground">R$</span>
                                        <Input className="pl-8" value={empValor} onChange={e => setEmpValor(e.target.value)} placeholder="0,00" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEmpresaDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSalvarEmpresa}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Alert Dialog Excluir Empresa */}
            <AlertDialog open={empresaDeleteDialogOpen} onOpenChange={setEmpresaDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Empresa?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir a empresa <b>{empresaExcluir?.nome}</b>?
                            <br /><br />
                            Esta ação não pode ser desfeita. Se houver assinaturas ativas, você precisará cancelá-las primeiro.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleExcluirEmpresa} className="bg-red-600 hover:bg-red-700">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Assinatura Dialog (Existente) */}
            <Dialog open={assinaturaDialogOpen} onOpenChange={setAssinaturaDialogOpen}>
                <DialogContent className="max-w-3xl">
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Email * (usado para criar acesso)</Label>
                                        <Input type="email" value={novaEmpresaEmail} onChange={e => setNovaEmpresaEmail(e.target.value)} placeholder="contato@empresa.com" />
                                    </div>
                                    <div>
                                        <Label>Telefone</Label>
                                        <Input value={novaEmpresaTelefone} onChange={e => setNovaEmpresaTelefone(e.target.value)} placeholder="(00) 00000-0000" />
                                    </div>
                                </div>
                                <div>
                                    <Label>Endereço</Label>
                                    <Input value={novaEmpresaEndereco} onChange={e => setNovaEmpresaEndereco(e.target.value)} placeholder="Rua, número, complemento" />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label>Cidade</Label>
                                        <Input value={novaEmpresaCidade} onChange={e => setNovaEmpresaCidade(e.target.value)} placeholder="Cidade" />
                                    </div>
                                    <div>
                                        <Label>Estado</Label>
                                        <Input value={novaEmpresaEstado} onChange={e => setNovaEmpresaEstado(e.target.value)} placeholder="UF" maxLength={2} />
                                    </div>
                                    <div>
                                        <Label>CEP</Label>
                                        <Input value={novaEmpresaCep} onChange={e => setNovaEmpresaCep(e.target.value)} placeholder="00000-000" />
                                    </div>
                                </div>
                                <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 text-sm text-yellow-800">
                                    <p>Será criado um usuário com o email acima e senha padrão: <b>123456</b></p>
                                </div>
                            </>
                        ) : (
                            <div>
                                <Label>Empresa</Label>
                                <Select value={assEmpresaId} onValueChange={setAssEmpresaId} disabled={!!assinaturaEditando}>
                                    <SelectTrigger><SelectValue placeholder="Selecione uma empresa" /></SelectTrigger>
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
        </div >
    );
}
