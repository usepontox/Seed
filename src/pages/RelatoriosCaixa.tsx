import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmpresa } from "@/hooks/use-empresa";
import {
    FileText,
    Download,
    TrendingUp,
    DollarSign,
    Users,
    Calendar,
    ArrowUpCircle,
    ArrowDownCircle,
    Eye,
    RefreshCw
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CaixaResumo {
    id: string;
    numero_caixa: string;
    operador_nome: string;
    operador_email: string;
    saldo_inicial: number;
    saldo_atual: number;
    saldo_final: number | null;
    data_abertura: string;
    data_fechamento: string | null;
    status: string;
    total_vendas: number;
    total_vendido: number;
    total_dinheiro: number;
    total_debito: number;
    total_credito: number;
    total_pix: number;
    total_fiado: number;
    total_sangrias: number;
    valor_sangrias: number;
    total_suprimentos: number;
    valor_suprimentos: number;
    diferenca: number | null;
}

interface Movimentacao {
    id: string;
    tipo: string;
    valor: number;
    descricao: string;
    created_at: string;
}

export default function RelatoriosCaixa() {
    const { toast } = useToast();
    const { empresaId } = useEmpresa();
    const [caixas, setCaixas] = useState<CaixaResumo[]>([]);
    const [loading, setLoading] = useState(false);
    const [filtroStatus, setFiltroStatus] = useState<string>("todos");
    const [filtroOperador, setFiltroOperador] = useState<string>("todos");
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    const [caixaSelecionado, setCaixaSelecionado] = useState<CaixaResumo | null>(null);
    const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
    const [detalhesOpen, setDetalhesOpen] = useState(false);

    useEffect(() => {
        if (empresaId) {
            loadCaixas();
        }
    }, [empresaId]);

    const loadCaixas = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("vw_resumo_caixas")
                .select("*")
                .eq("empresa_id", empresaId)
                .order("data_abertura", { ascending: false });

            if (error) throw error;
            setCaixas(data || []);
        } catch (error: any) {
            toast({
                title: "Erro ao carregar relatórios",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const loadMovimentacoes = async (caixaId: string) => {
        try {
            const { data, error } = await supabase
                .from("caixas_movimentacoes")
                .select("*")
                .eq("caixa_id", caixaId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setMovimentacoes(data || []);
        } catch (error: any) {
            console.error("Erro ao carregar movimentações:", error);
        }
    };

    const verDetalhes = async (caixa: CaixaResumo) => {
        setCaixaSelecionado(caixa);
        await loadMovimentacoes(caixa.id);
        setDetalhesOpen(true);
    };

    const exportarExcel = () => {
        // Preparar dados para exportação
        const dados = caixasFiltrados.map(c => ({
            "Número": c.numero_caixa,
            "Operador": c.operador_nome,
            "Status": c.status,
            "Abertura": formatDateTime(c.data_abertura),
            "Fechamento": c.data_fechamento ? formatDateTime(c.data_fechamento) : "-",
            "Saldo Inicial": c.saldo_inicial,
            "Saldo Final": c.saldo_final || c.saldo_atual,
            "Total Vendas": c.total_vendas,
            "Total Vendido": c.total_vendido,
            "Sangrias": c.valor_sangrias,
            "Suprimentos": c.valor_suprimentos,
            "Diferença": c.diferenca || 0,
        }));

        // Converter para CSV
        const headers = Object.keys(dados[0] || {});
        const csv = [
            headers.join(","),
            ...dados.map(row => headers.map(h => row[h as keyof typeof row]).join(","))
        ].join("\n");

        // Download
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio_caixas_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        toast({
            title: "Relatório exportado!",
            description: "Arquivo CSV baixado com sucesso.",
        });
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDateTime = (date: string) => {
        return new Date(date).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Filtros
    const caixasFiltrados = caixas.filter(c => {
        if (filtroStatus !== "todos" && c.status !== filtroStatus) return false;
        if (filtroOperador !== "todos" && c.operador_nome !== filtroOperador) return false;
        if (dataInicio && new Date(c.data_abertura) < new Date(dataInicio)) return false;
        if (dataFim && new Date(c.data_abertura) > new Date(dataFim)) return false;
        return true;
    });

    // Estatísticas gerais
    const totalVendido = caixasFiltrados.reduce((sum, c) => sum + c.total_vendido, 0);
    const totalSangrias = caixasFiltrados.reduce((sum, c) => sum + c.valor_sangrias, 0);
    const totalSuprimentos = caixasFiltrados.reduce((sum, c) => sum + c.valor_suprimentos, 0);
    const caixasAbertos = caixasFiltrados.filter(c => c.status === "aberto").length;

    // Operadores únicos para filtro
    const operadores = Array.from(new Set(caixas.map(c => c.operador_nome)));

    return (
        <div className="space-y-6 pb-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                            <FileText className="h-6 w-6 text-white" />
                        </div>
                        Relatórios de Caixa
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Acompanhe e analise o desempenho dos caixas em tempo real
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={loadCaixas} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Atualizar
                    </Button>
                    <Button onClick={exportarExcel} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Exportar
                    </Button>
                </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Vendido</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(totalVendido)}</div>
                        <p className="text-xs text-muted-foreground">
                            {caixasFiltrados.reduce((sum, c) => sum + c.total_vendas, 0)} vendas
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Caixas Abertos</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{caixasAbertos}</div>
                        <p className="text-xs text-muted-foreground">
                            {caixasFiltrados.length} total
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sangrias</CardTitle>
                        <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(totalSangrias)}</div>
                        <p className="text-xs text-muted-foreground">
                            {caixasFiltrados.reduce((sum, c) => sum + c.total_sangrias, 0)} operações
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Suprimentos</CardTitle>
                        <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(totalSuprimentos)}</div>
                        <p className="text-xs text-muted-foreground">
                            {caixasFiltrados.reduce((sum, c) => sum + c.total_suprimentos, 0)} operações
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filtros */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Filtros</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                        <div>
                            <Label>Status</Label>
                            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos</SelectItem>
                                    <SelectItem value="aberto">Abertos</SelectItem>
                                    <SelectItem value="fechado">Fechados</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Operador</Label>
                            <Select value={filtroOperador} onValueChange={setFiltroOperador}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos</SelectItem>
                                    {operadores.map(op => (
                                        <SelectItem key={op} value={op}>{op}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Data Início</Label>
                            <Input
                                type="date"
                                value={dataInicio}
                                onChange={(e) => setDataInicio(e.target.value)}
                            />
                        </div>

                        <div>
                            <Label>Data Fim</Label>
                            <Input
                                type="date"
                                value={dataFim}
                                onChange={(e) => setDataFim(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabela de Caixas */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Histórico de Caixas</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Caixa</TableHead>
                                    <TableHead>Operador</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Abertura</TableHead>
                                    <TableHead>Saldo Inicial</TableHead>
                                    <TableHead>Saldo Atual</TableHead>
                                    <TableHead>Total Vendido</TableHead>
                                    <TableHead>Diferença</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8">
                                            Carregando...
                                        </TableCell>
                                    </TableRow>
                                ) : caixasFiltrados.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                            Nenhum caixa encontrado
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    caixasFiltrados.map((caixa) => (
                                        <TableRow key={caixa.id}>
                                            <TableCell className="font-medium">{caixa.numero_caixa}</TableCell>
                                            <TableCell>{caixa.operador_nome}</TableCell>
                                            <TableCell>
                                                <Badge variant={caixa.status === "aberto" ? "default" : "secondary"}>
                                                    {caixa.status === "aberto" ? "🟢 Aberto" : "🔴 Fechado"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{formatDateTime(caixa.data_abertura)}</TableCell>
                                            <TableCell>{formatCurrency(caixa.saldo_inicial)}</TableCell>
                                            <TableCell className="font-semibold">
                                                {formatCurrency(caixa.saldo_final || caixa.saldo_atual)}
                                            </TableCell>
                                            <TableCell className="text-green-600 font-semibold">
                                                {formatCurrency(caixa.total_vendido)}
                                            </TableCell>
                                            <TableCell>
                                                {caixa.diferenca !== null && caixa.diferenca !== 0 ? (
                                                    <span className={caixa.diferenca > 0 ? "text-green-600" : "text-red-600"}>
                                                        {caixa.diferenca > 0 ? "+" : ""}{formatCurrency(caixa.diferenca)}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => verDetalhes(caixa)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Modal de Detalhes */}
            <Dialog open={detalhesOpen} onOpenChange={setDetalhesOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">
                            Detalhes - {caixaSelecionado?.numero_caixa}
                        </DialogTitle>
                    </DialogHeader>

                    {caixaSelecionado && (
                        <div className="space-y-6">
                            {/* Informações Gerais */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm">Informações do Caixa</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Operador:</span>
                                            <span className="font-semibold">{caixaSelecionado.operador_nome}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Status:</span>
                                            <Badge variant={caixaSelecionado.status === "aberto" ? "default" : "secondary"}>
                                                {caixaSelecionado.status}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Abertura:</span>
                                            <span>{formatDateTime(caixaSelecionado.data_abertura)}</span>
                                        </div>
                                        {caixaSelecionado.data_fechamento && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Fechamento:</span>
                                                <span>{formatDateTime(caixaSelecionado.data_fechamento)}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm">Resumo Financeiro</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Saldo Inicial:</span>
                                            <span className="font-semibold">{formatCurrency(caixaSelecionado.saldo_inicial)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Total Vendido:</span>
                                            <span className="text-green-600 font-semibold">{formatCurrency(caixaSelecionado.total_vendido)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Sangrias:</span>
                                            <span className="text-red-600">{formatCurrency(caixaSelecionado.valor_sangrias)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Suprimentos:</span>
                                            <span className="text-green-600">{formatCurrency(caixaSelecionado.valor_suprimentos)}</span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t">
                                            <span className="font-semibold">Saldo Final:</span>
                                            <span className="font-bold text-lg">{formatCurrency(caixaSelecionado.saldo_final || caixaSelecionado.saldo_atual)}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Formas de Pagamento */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Vendas por Forma de Pagamento</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground">Dinheiro</p>
                                            <p className="text-lg font-semibold">{formatCurrency(caixaSelecionado.total_dinheiro)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground">Débito</p>
                                            <p className="text-lg font-semibold">{formatCurrency(caixaSelecionado.total_debito)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground">Crédito</p>
                                            <p className="text-lg font-semibold">{formatCurrency(caixaSelecionado.total_credito)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground">PIX</p>
                                            <p className="text-lg font-semibold">{formatCurrency(caixaSelecionado.total_pix)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground">Fiado</p>
                                            <p className="text-lg font-semibold">{formatCurrency(caixaSelecionado.total_fiado)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Movimentações */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Movimentações (Sangrias e Suprimentos)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {movimentacoes.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-4">Nenhuma movimentação registrada</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {movimentacoes.map((mov) => (
                                                <div key={mov.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        {mov.tipo === "sangria" ? (
                                                            <ArrowDownCircle className="h-5 w-5 text-red-500" />
                                                        ) : (
                                                            <ArrowUpCircle className="h-5 w-5 text-green-500" />
                                                        )}
                                                        <div>
                                                            <p className="font-medium capitalize">{mov.tipo}</p>
                                                            <p className="text-xs text-muted-foreground">{mov.descricao}</p>
                                                            <p className="text-xs text-muted-foreground">{formatDateTime(mov.created_at)}</p>
                                                        </div>
                                                    </div>
                                                    <p className={`font-semibold ${mov.tipo === "sangria" ? "text-red-600" : "text-green-600"}`}>
                                                        {mov.tipo === "sangria" ? "-" : "+"}{formatCurrency(mov.valor)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
