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

    // --- LOGS STATE ---
    interface Log {
        id: string;
        user_id: string | null;
        user_email: string | null;
        ip_address: string | null;
        user_agent: string | null;
        created_at: string;
    }
    const [logs, setLogs] = useState<Log[]>([]);

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
    const [empresaEditando, setEmpresaEditando] = useState<EmpresaComStatus | null>(null);
    const [empresaDeleteDialogOpen, setEmpresaDeleteDialogOpen] = useState(false);
    const [empresaExcluir, setEmpresaExcluir] = useState<Empresa | null>(null);
    const [mrrGrowth, setMrrGrowth] = useState(0);

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

    const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('admin-active-tab') || 'dashboard');

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Carregar Usuários via Edge Function
            // @ts-ignore
            const { data: usersData, error: usersError } = await (supabase as any).functions.invoke('admin-users', {
                body: { action: 'listUsers' }
            });
            if (usersError) throw usersError;

            const users = usersData || [];

            const formattedUsers: Usuario[] = users.map(u => ({
                id: u.id,
                email: u.email || "",
                created_at: u.created_at,
                raw_user_meta_data: {
                    nome: u.user_metadata?.nome,
                    role: u.user_metadata?.role
                }
            }));
            setUsuarios(formattedUsers);

            // 2. Carregar Assinaturas
            const { data: assinaturasData, error: assinaturasError } = await supabase
                .from('assinaturas')
                .select('*, empresas(nome, cnpj, email)');

            if (assinaturasError) throw assinaturasError;
            // @ts-ignore
            setAssinaturas(assinaturasData || []);

            // 3. Carregar Empresas
            const { data: empresasData, error: empresasError } = await supabase
                .from('empresas')
                .select('*');

            if (empresasError) throw empresasError;
            setEmpresas(empresasData || []);

            // Combinar dados para Carteira de Clientes
            const empresasStatus = (empresasData || []).map(emp => {
                // @ts-ignore
                const assinatura = assinaturasData?.find(a => a.empresa_id === emp.id);
                return {
                    ...emp,
                    status: assinatura?.status || 'sem_assinatura',
                    plano: assinatura?.plano || 'sem_plano',
                    assinaturaId: assinatura?.id
                };
            });
            setEmpresasComStatus(empresasStatus);

            // 4. Carregar Logs
            const { data: logsData, error: logsError } = await supabase
                .from('access_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (logsError) {
                console.error('Erro ao carregar logs:', logsError);
            } else {
                setLogs(logsData || []);

                // Calcular usuários online (últimos 5 minutos)
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
                const { count, error: onlineError } = await supabase
                    .from('access_logs')
                    .select('user_email', { count: 'exact', head: true })
                    .neq('user_email', 'admin@admin.com')
                    .gte('created_at', fiveMinutesAgo);

                if (!onlineError) {
                    setOnlineUsers(count || 0);
                }
            }

        } catch (error: any) {
            console.error('Erro ao carregar dados:', error);
            toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Salvar aba ativa no sessionStorage quando mudar
    useEffect(() => {
        sessionStorage.setItem('admin-active-tab', activeTab);
    }, [activeTab]);

    // Limpar sessionStorage quando sair da página (unmount)
    useEffect(() => {
        return () => {
            sessionStorage.removeItem('admin-active-tab');
        };
    }, []);

    // --- REALTIME ONLINE USERS ---
    useEffect(() => {
        const fetchOnlineUsers = async () => {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const { count, error } = await supabase
                .from('access_logs')
                .select('user_email', { count: 'exact', head: true })
                .neq('user_email', 'admin@admin.com')
                .gte('created_at', fiveMinutesAgo);

            if (!error) {
                setOnlineUsers(count || 0);
            }
        };

        fetchOnlineUsers(); // Busca inicial
        const interval = setInterval(fetchOnlineUsers, 10000); // Atualiza a cada 10 segundos

        return () => clearInterval(interval);
    }, []);

    // --- ONLINE USERS STATE ---
    const [onlineUsers, setOnlineUsers] = useState(0);

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

    const handleEditarEmpresa = (empresa: EmpresaComStatus) => {
        setEmpresaEditando(empresa);
        setEmpNome(empresa.nome);
        setEmpCnpj(empresa.cnpj);
        setEmpEmail(empresa.email || "");
        setEmpTelefone(empresa.telefone || "");
        setEmpEndereco(empresa.endereco || "");
        setEmpCidade(empresa.cidade || "");
        setEmpEstado(empresa.estado || "");
        setEmpCep(empresa.cep || "");

        // Buscar assinatura relacionada à empresa
        const assinaturaEmpresa = assinaturas.find(ass => ass.empresa_id === empresa.id);

        if (assinaturaEmpresa) {
            setEmpStatus(assinaturaEmpresa.status || "ativo");
            setEmpPlano(assinaturaEmpresa.plano || "basic");
            setEmpValor(assinaturaEmpresa.valor_mensal?.toString() || "0");
        } else {
            // Se não tem assinatura, usar valores padrão
            setEmpStatus("ativo");
            setEmpPlano("basic");
            setEmpValor("0");
        }

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

            // Gerenciar Assinatura baseado no checkbox
            if (empresaId) {
                const assinaturaExistente = assinaturas.find(ass => ass.empresa_id === empresaId);

                if (empStatus === "ativo") {
                    // Criar ou atualizar assinatura
                    const assinaturaData = {
                        empresa_id: empresaId,
                        plano: empPlano,
                        valor_mensal: parseFloat(empValor.replace(',', '.')),
                        status: empStatus,
                        dia_vencimento: 10 // Default
                    };

                    // Se já existe assinatura, incluir o ID para fazer UPDATE ao invés de INSERT
                    // @ts-ignore
                    if (assinaturaExistente) {
                        // @ts-ignore
                        assinaturaData.id = assinaturaExistente.id;
                    }

                    const { error: upsertError } = await supabase.functions.invoke('admin-users', {
                        body: {
                            action: 'upsertAssinatura',
                            payload: { assinatura: assinaturaData }
                        }
                    });

                    if (upsertError) {
                        console.error('Erro ao salvar assinatura:', upsertError);
                        throw new Error(`Erro ao salvar assinatura: ${upsertError.message}`);
                    }

                    toast({ title: "Assinatura salva com sucesso!" });
                } else if (empStatus === "sem_assinatura" && assinaturaExistente) {
                    // Se desmarcou o checkbox e existe assinatura, excluir assinatura
                    const { error: deleteError } = await supabase.functions.invoke('admin-users', {
                        body: {
                            action: 'deleteAssinatura',
                            payload: { assinaturaId: assinaturaExistente.id }
                        }
                    });

                    if (deleteError) {
                        console.error('Erro ao excluir assinatura:', deleteError);
                    }

                    // E excluir o usuário associado
                    if (empEmail) {
                        const userToDelete = usuarios.find(u => u.email === empEmail);
                        if (userToDelete) {
                            const { error: delUserError } = await supabase.functions.invoke('admin-users', {
                                body: {
                                    action: 'deleteUser',
                                    payload: { userId: userToDelete.id }
                                }
                            });
                            if (delUserError) {
                                console.error('Erro ao excluir usuário:', delUserError);
                            } else {
                                toast({ title: "Acesso do usuário removido." });
                            }
                        }
                    }
                }
            }

            // Criar usuário automaticamente se for uma nova empresa COM ASSINATURA
            if (!empresaEditando && empresaId && empEmail && empStatus === "ativo") {
                try {
                    const { data: userData, error: userError } = await supabase.functions.invoke('admin-users', {
                        body: {
                            action: 'createUser',
                            payload: {
                                email: empEmail,
                                password: 'Mudar@123',
                                nome: empNome,
                                role: 'user'
                            }
                        }
                    });

                    if (userError || (userData && userData.error)) {
                        const msg = userError?.message || userData?.error || "Erro desconhecido";
                        console.error('Erro ao criar usuário:', msg);
                        toast({
                            title: "Aviso",
                            description: `Erro ao criar acesso: ${msg}`,
                            variant: "default"
                        });
                    } else {
                        toast({
                            title: "Acesso criado!",
                            description: `Email: ${empEmail} | Senha: Mudar@123`
                        });
                    }
                } catch (userCreateError) {
                    console.error('Erro ao criar usuário:', userCreateError);
                }
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
            // Primeiro, verificar se existe assinatura para esta empresa e excluir
            const assinaturaEmpresa = assinaturas.find(ass => ass.empresa_id === empresaExcluir.id);

            if (assinaturaEmpresa) {
                const { error: assError } = await supabase.functions.invoke('admin-users', {
                    body: {
                        action: 'deleteAssinatura',
                        payload: { assinaturaId: assinaturaEmpresa.id }
                    }
                });

                if (assError) {
                    console.error('Erro ao excluir assinatura:', assError);
                }
            }

            // Excluir usuário associado se existir
            if (empresaExcluir.email) {
                const userToDelete = usuarios.find(u => u.email === empresaExcluir.email);
                if (userToDelete) {
                    const { error: delUserError } = await supabase.functions.invoke('admin-users', {
                        body: {
                            action: 'deleteUser',
                            payload: { userId: userToDelete.id }
                        }
                    });
                    if (delUserError) {
                        console.error('Erro ao excluir usuário:', delUserError);
                    }
                }
            }

            // Depois, excluir a empresa
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

    const formatCNPJ = (cnpj: string) => {
        if (!cnpj) return '';
        const cleaned = cnpj.replace(/\D/g, '');
        if (cleaned.length !== 14) return cnpj;
        return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
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

    const getStatusBadge = (status: string) => {
        const map: Record<string, any> = {
            ativo: "default",
            inativo: "secondary",
            pendente: "outline",
            bloqueado: "destructive"
        };
        return <Badge variant={map[status] || "outline"}>{status.toUpperCase()}</Badge>;
    };

    const getEmpresaStatusBadge = (empresa: EmpresaComStatus) => {
        // Verde (Ativa) apenas se status for 'ativo' E plano for 'basic'
        const isAtiva = empresa.status === 'ativo' && empresa.plano === 'basic';

        const statusMap: Record<string, { variant: any; label: string; icon: string }> = {
            ativo: { variant: isAtiva ? "default" : "secondary", label: isAtiva ? "Ativa" : "Ativa (Outro Plano)", icon: isAtiva ? "🟢" : "🟡" },
            inativo: { variant: "secondary", label: "Inativa", icon: "🔴" },
            pendente: { variant: "outline", label: "Pendente", icon: "🟡" },
            bloqueado: { variant: "destructive", label: "Bloqueada", icon: "⚫" },
            sem_assinatura: { variant: "destructive", label: "Sem Assinatura", icon: "🔴" }
        };
        const config = statusMap[empresa.status] || statusMap.sem_assinatura;
        return <Badge variant={config.variant} className="gap-1">{config.icon} {config.label}</Badge>;
    };

    // --- DASHBOARD METRICS ---
    const totalMRR = assinaturas.reduce((acc, curr) => acc + (curr.status === 'ativo' ? curr.valor_mensal : 0), 0);
    const totalEmpresasAtivas = assinaturas.filter(a => a.status === 'ativo').length;
    const totalInadimplentes = assinaturas.filter(a => a.status === 'bloqueado').length;

    // Calcular novos clientes deste mês
    const inicioDoMes = new Date();
    inicioDoMes.setDate(1);
    inicioDoMes.setHours(0, 0, 0, 0);
    const novosClientesMes = empresas.filter(emp => {
        if (!emp.created_at) return false;
        const dataEmpresa = new Date(emp.created_at);
        return dataEmpresa >= inicioDoMes;
    }).length;

    return (
        <div className="space-y-6" >
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Shield className="h-8 w-8 text-primary" />
                        Administrador
                    </h1>
                    <p className="text-muted-foreground">Gerenciamento completo de usuários, empresas e assinaturas</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => {
                setActiveTab(value);
                sessionStorage.setItem('admin-active-tab', value);
            }} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="carteira">Carteira de Clientes</TabsTrigger>
                    <TabsTrigger value="assinaturas">Assinaturas & Planos</TabsTrigger>
                    <TabsTrigger value="logs">Logs de Acesso</TabsTrigger>
                </TabsList>

                {/* --- ABA DASHBOARD --- */}
                <TabsContent value="dashboard" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Receita Mensal (MRR)</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(totalMRR)}</div>
                                <p className="text-xs text-muted-foreground">
                                    {mrrGrowth > 0 ? `+${mrrGrowth.toFixed(1)}%` : '0%'} em relação ao mês passado
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Empresas Ativas</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalEmpresasAtivas}</div>
                                <p className="text-xs text-muted-foreground">
                                    Total de {empresas.length} cadastradas
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Inadimplentes</CardTitle>
                                <AlertCircle className="h-4 w-4 text-destructive" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalInadimplentes}</div>
                                <p className="text-xs text-muted-foreground">
                                    Ação necessária
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Novos Clientes</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">+{novosClientesMes}</div>
                                <p className="text-xs text-muted-foreground">
                                    Neste mês
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4">
                            <CardHeader>
                                <CardTitle>Acesso Rápido</CardTitle>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <div className="flex gap-4 p-4">
                                    <Button onClick={handleNovaEmpresa} className="h-24 w-full flex flex-col gap-2" variant="outline">
                                        <Plus className="h-8 w-8" />
                                        <span>Nova Empresa/Cliente</span>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="col-span-3">
                            <CardHeader>
                                <CardTitle>Usuários Online</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-8">
                                    <div className="flex items-center">
                                        <div className="ml-4 space-y-1">
                                            <p className="text-sm font-medium leading-none">{onlineUsers}</p>

                                        </div>
                                        <div className="ml-auto font-medium text-green-500">Online</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* --- ABA CARTEIRA DE CLIENTES (ANTIGA EMPRESAS) --- */}
                <TabsContent value="carteira" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Carteira de Clientes</CardTitle>
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
                                            <TableCell>{formatCNPJ(emp.cnpj)}</TableCell>
                                            <TableCell>{emp.email || "-"}</TableCell>
                                            <TableCell>{emp.telefone || "-"}</TableCell>
                                            <TableCell>{emp.cidade ? `${emp.cidade}/${emp.estado}` : "-"}</TableCell>
                                            <TableCell>{getEmpresaStatusBadge(emp)}</TableCell>
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
                                            <TableCell>{formatCNPJ(ass.empresas?.cnpj) || "N/A"}</TableCell>
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

                {/* --- ABA LOGS --- */}
                <TabsContent value="logs" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Logs de Acesso</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data/Hora</TableHead>
                                        <TableHead>Usuário</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Navegador</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>{new Date(log.created_at).toLocaleString("pt-BR")}</TableCell>
                                            <TableCell>{log.user_id}</TableCell>
                                            <TableCell>{log.user_email}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{log.user_agent?.substring(0, 50)}...</TableCell>
                                        </TableRow>
                                    ))}
                                    {logs.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                Nenhum registro encontrado.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* --- DIALOGS --- */}

            {/* Dialog Empresa (Criar/Editar) */}
            <Dialog open={empresaDialogOpen} onOpenChange={setEmpresaDialogOpen} >
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
                                <Input
                                    value={empCnpj}
                                    onChange={e => {
                                        const rawValue = e.target.value.replace(/\D/g, '');
                                        if (rawValue.length <= 14) {
                                            setEmpCnpj(formatCNPJ(rawValue));
                                        }
                                    }}
                                    placeholder="00.000.000/0000-00"
                                    maxLength={18}
                                />
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
                            <h4 className="mb-4 text-sm font-medium leading-none">Assinatura</h4>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="possuiAssinatura"
                                        checked={empStatus === "ativo"}
                                        onChange={(e) => setEmpStatus(e.target.checked ? "ativo" : "sem_assinatura")}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <Label htmlFor="possuiAssinatura" className="cursor-pointer">Possui Assinatura Basic</Label>
                                </div>
                                {empStatus === "ativo" && (
                                    <div className="flex-1">
                                        <Label>Valor Mensal</Label>
                                        <div className="relative">
                                            <span className="absolute left-2 top-2.5 text-muted-foreground">R$</span>
                                            <Input className="pl-8" value={empValor} onChange={e => setEmpValor(e.target.value)} placeholder="0,00" />
                                        </div>
                                    </div>
                                )}
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
                                        <Input
                                            value={novaEmpresaCnpj}
                                            onChange={e => {
                                                const rawValue = e.target.value.replace(/\D/g, '');
                                                if (rawValue.length <= 14) {
                                                    setNovaEmpresaCnpj(formatCNPJ(rawValue));
                                                }
                                            }}
                                            placeholder="00.000.000/0000-00"
                                            maxLength={18}
                                        />
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
