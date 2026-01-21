import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Plus,
  FileText,
  Calendar as CalendarIcon,
  RefreshCw,
  ArrowRight
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useEmpresa } from "@/hooks/use-empresa";
import { useSidebar } from "@/components/ui/sidebar";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const navigate = useNavigate();
  const { empresaId } = useEmpresa();

  // Períodos de comparação
  const [rangeA, setRangeA] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [rangeB, setRangeB] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 1)),
    to: endOfMonth(subMonths(new Date(), 1)),
  });

  const [statsA, setStatsA] = useState({
    vendas: 0,
    faturamento: 0,
    cuponsEmitidos: 0,
    cuponsPendentes: 0,
  });

  const [statsB, setStatsB] = useState({
    vendas: 0,
    faturamento: 0,
    cuponsEmitidos: 0,
    cuponsPendentes: 0,
  });

  const [globalStats, setGlobalStats] = useState({
    produtosEstoque: 0,
    produtosBaixoEstoque: 0,
    totalClientes: 0,
    totalFornecedores: 0,
  });

  const [topProdutos, setTopProdutos] = useState<any[]>([]);
  const [ultimasVendas, setUltimasVendas] = useState<any[]>([]);
  const [graficoVendasA, setGraficoVendasA] = useState<any[]>([]);
  const [graficoVendasB, setGraficoVendasB] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (empresaId) {
      loadDashboardData();
    }
  }, [empresaId, rangeA, rangeB]);

  const fetchPeriodStats = async (range: DateRange | undefined) => {
    if (!range?.from || !empresaId) return null;

    const start = range.from.toISOString();
    const end = (range.to || range.from).toISOString().split('T')[0] + 'T23:59:59';

    const [vendasResult, cuponsResult] = await Promise.all([
      supabase
        .from("vendas")
        .select("total, status, data_venda")
        .eq("empresa_id", empresaId)
        .gte("data_venda", start)
        .lte("data_venda", end),
      supabase
        .from("vendas")
        .select("nfce_status, status")
        .eq("empresa_id", empresaId)
        .gte("data_venda", start)
        .lte("data_venda", end)
    ]);

    const finalizadas = (vendasResult.data || []).filter(v => v.status === 'finalizada');
    const faturamento = finalizadas.reduce((sum, v) => sum + Number(v.total), 0);
    const vendasCount = finalizadas.length;

    const cuponsEmitidos = (cuponsResult.data || []).filter(v => v.nfce_status === 'emitida').length;
    const cuponsPendentes = (cuponsResult.data || []).filter(v =>
      v.nfce_status === 'pendente' && v.status !== 'cancelada'
    ).length;

    // Dados para o gráfico
    const dadosGrafico = (finalizadas || []).reduce((acc: any, venda) => {
      const data = new Date(venda.data_venda).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const existente = acc.find((item: any) => item.data === data);
      if (existente) {
        existente.valor += Number(venda.total);
      } else {
        acc.push({ data, valor: Number(venda.total) });
      }
      return acc;
    }, []);

    return {
      faturamento,
      vendas: vendasCount,
      cuponsEmitidos,
      cuponsPendentes,
      dadosGrafico
    };
  };

  const loadDashboardData = async () => {
    setLoading(true);
    // Admin não deve ver produtos - bloquear carregamento
    const { data: { session } } = await supabase.auth.getSession();
    const userEmail = session?.user?.email || '';

    if (userEmail === 'admin@admin.com' || userEmail === 'admin@admin.com.br') {
      // Zerar stats para admin
      setStatsA({ vendas: 0, faturamento: 0, cuponsEmitidos: 0, cuponsPendentes: 0 });
      setStatsB({ vendas: 0, faturamento: 0, cuponsEmitidos: 0, cuponsPendentes: 0 });
      setGlobalStats({ produtosEstoque: 0, produtosBaixoEstoque: 0, totalClientes: 0, totalFornecedores: 0 });
      setTopProdutos([]);
      setUltimasVendas([]);
      setGraficoVendasA([]);
      setGraficoVendasB([]);
      setLoading(false);
      return;
    }

    const hoje = new Date().toISOString().split('T')[0];
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    try {
      // 1. Fetch Global Stats (independent of period)
      const [produtosResult, clientesResult, fornecedoresResult, ultimasVendasResult] = await Promise.all([
        supabase
          .from("produtos")
          .select("estoque_atual, estoque_minimo")
          .eq("empresa_id", empresaId!)
          .eq("ativo", true),
        supabase
          .from("clientes")
          .select("*", { count: "exact", head: true })
          .eq("empresa_id", empresaId!),
        supabase
          .from("fornecedores")
          .select("*", { count: "exact", head: true })
          .eq("empresa_id", empresaId!),
        supabase
          .from("vendas")
          .select("*, clientes:cliente_id (nome)")
          .eq("empresa_id", empresaId!)
          .order("data_venda", { ascending: false })
          .limit(5)
      ]);

      setGlobalStats({
        produtosEstoque: produtosResult.data?.length || 0,
        produtosBaixoEstoque: (produtosResult.data || []).filter(p => p.estoque_atual <= p.estoque_minimo).length,
        totalClientes: clientesResult.count || 0,
        totalFornecedores: fornecedoresResult.count || 0,
      });
      setUltimasVendas(ultimasVendasResult.data || []);

      // 2. Fetch Comparative Period Stats in Parallel
      const [resA, resB] = await Promise.all([
        fetchPeriodStats(rangeA),
        fetchPeriodStats(rangeB)
      ]);

      if (resA) {
        setStatsA({
          faturamento: resA.faturamento,
          vendas: resA.vendas,
          cuponsEmitidos: resA.cuponsEmitidos,
          cuponsPendentes: resA.cuponsPendentes,
        });
        setGraficoVendasA(resA.dadosGrafico);
      }

      if (resB) {
        setStatsB({
          faturamento: resB.faturamento,
          vendas: resB.vendas,
          cuponsEmitidos: resB.cuponsEmitidos,
          cuponsPendentes: resB.cuponsPendentes,
        });
        setGraficoVendasB(resB.dadosGrafico);
      }

      // Top Produtos do Período A
      if (rangeA?.from) {
        const trintaDiasAtras = rangeA.from.toISOString();
        const itensVendasResult = await supabase
          .from("vendas_itens")
          .select("quantidade, produtos:produto_id (nome, preco_venda), vendas!inner(data_venda)")
          .gte("vendas.data_venda", trintaDiasAtras)
          .lte("vendas.data_venda", (rangeA.to || rangeA.from).toISOString());

        const produtosAgrupados = (itensVendasResult.data || []).reduce((acc: any, item: any) => {
          const produtoNome = item.produtos?.nome || "Desconhecido";
          if (!acc[produtoNome]) {
            acc[produtoNome] = { nome: produtoNome, quantidade: 0, valor: item.produtos?.preco_venda || 0 };
          }
          acc[produtoNome].quantidade += item.quantidade;
          return acc;
        }, {});

        setTopProdutos(Object.values(produtosAgrupados)
          .sort((a: any, b: any) => b.quantidade - a.quantidade)
          .slice(0, 5));
      }

    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDelta = (a: number, b: number) => {
    if (b === 0) return a > 0 ? 100 : 0;
    return ((a - b) / b) * 100;
  };

  const DeltaIndicator = ({ a, b, isCurrency = false }: { a: number, b: number, isCurrency?: boolean }) => {
    const delta = calculateDelta(a, b);
    const isPositive = delta >= 0;

    return (
      <div className={cn(
        "flex items-center text-xs font-semibold mt-1",
        isPositive ? "text-success" : "text-danger"
      )}>
        {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
        <span>{isPositive ? "+" : ""}{delta.toFixed(1)}%</span>
        <span className="text-muted-foreground font-normal ml-2">
          vs {isCurrency ? formatCurrency(b) : b}
        </span>
      </div>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu negócio</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate("/pdv")}
            className="bg-primary text-primary-foreground hover:bg-primary-hover transition-all duration-300"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Venda
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">Período Base (A)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[240px] justify-start text-left font-normal bg-card shadow-sm h-10">
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                  {rangeA?.from ? (
                    rangeA.to ? (
                      <>
                        {format(rangeA.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                        {format(rangeA.to, "dd/MM/yy", { locale: ptBR })}
                      </>
                    ) : (
                      format(rangeA.from, "dd/MM/yy", { locale: ptBR })
                    )
                  ) : (
                    <span>Selecionar período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={rangeA?.from}
                  selected={rangeA}
                  onSelect={setRangeA}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="hidden sm:flex items-center pt-5">
            <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">Período Comparativo (B)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[240px] justify-start text-left font-normal bg-card shadow-sm h-10 border-success/30">
                  <CalendarIcon className="mr-2 h-4 w-4 text-success" />
                  {rangeB?.from ? (
                    rangeB.to ? (
                      <>
                        {format(rangeB.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                        {format(rangeB.to, "dd/MM/yy", { locale: ptBR })}
                      </>
                    ) : (
                      format(rangeB.from, "dd/MM/yy", { locale: ptBR })
                    )
                  ) : (
                    <span>Selecionar período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={rangeB?.from}
                  selected={rangeB}
                  onSelect={setRangeB}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={loadDashboardData}
          disabled={loading}
          className="h-10 px-6 shadow-sm"
        >
          {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Atualizar Comparação
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Faturamento */}
        <Card className="hover:shadow-lg transition-all duration-500 border-primary/30 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento (A)
            </CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary" style={{ textShadow: '0 0 20px hsl(73 100% 50% / 0.3)' }}>
              {formatCurrency(statsA.faturamento)}
            </div>
            <DeltaIndicator a={statsA.faturamento} b={statsB.faturamento} isCurrency />
          </CardContent>
        </Card>

        {/* Volume de Vendas */}
        <Card className="hover:shadow-lg transition-all duration-500 border-success/30 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendas (A)
            </CardTitle>
            <ShoppingCart className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success" style={{ textShadow: '0 0 20px hsl(142 71% 45% / 0.3)' }}>
              {statsA.vendas}
            </div>
            <DeltaIndicator a={statsA.vendas} b={statsB.vendas} />
          </CardContent>
        </Card>

        {/* Produtos */}
        <Card className="hover:shadow-lg transition-all duration-500 border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estoque Ativo
            </CardTitle>
            <Package className="h-5 w-5 text-primary/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{globalStats.produtosEstoque}</div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-muted-foreground">Total de itens</span>
              {globalStats.produtosBaixoEstoque > 0 && (
                <span className="text-[10px] bg-danger/20 text-danger px-2 py-0.5 rounded-full font-medium border border-danger/30">
                  {globalStats.produtosBaixoEstoque} repor
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CRM */}
        <Card className="hover:shadow-lg transition-all duration-500 border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Base de Clientes
            </CardTitle>
            <Users className="h-5 w-5 text-primary/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{globalStats.totalClientes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              + {globalStats.totalFornecedores} fornecedores
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Notas Fiscais */}
        <Card className="hover:shadow-lg transition-all duration-500 border-border bg-card overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <FileText className="h-20 w-20 text-primary" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Notas Fiscais (Autorizadas A)
            </CardTitle>
            <FileText className="h-4 w-4 text-primary/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{statsA.cuponsEmitidos}</div>
            <DeltaIndicator a={statsA.cuponsEmitidos} b={statsB.cuponsEmitidos} />
          </CardContent>
        </Card>

        {/* Pendências */}
        <Card
          className={cn(
            "cursor-pointer hover:shadow-lg transition-all duration-500 bg-card",
            statsA.cuponsPendentes > 0 ? 'border-l-4 border-l-warning shadow-sm' : 'border-border'
          )}
          onClick={() => navigate("/relatorios-fiscais")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cupons Pendentes (A)
            </CardTitle>
            <AlertTriangle className={cn("h-4 w-4", statsA.cuponsPendentes > 0 ? 'text-warning' : 'text-muted-foreground')} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", statsA.cuponsPendentes > 0 ? 'text-warning' : 'text-foreground')}>
              {statsA.cuponsPendentes}
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando transmissão
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Tendência de Faturamento</span>
              <div className="flex gap-4 text-[10px] uppercase font-bold">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-primary" /> Período A</div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graficoVendasA}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
                  <XAxis
                    dataKey="data"
                    stroke="#888888"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                    formatter={(value: number) => [formatCurrency(value), "Faturamento"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Destaques (Período A)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {topProdutos.map((produto, idx) => (
                <div key={produto.nome} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                    #{idx + 1}
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-semibold leading-none">
                      {produto.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {produto.quantidade} unidades vendidas
                    </p>
                  </div>
                  <div className="font-bold text-sm">{formatCurrency(produto.valor * produto.quantidade)}</div>
                </div>
              ))}
              {topProdutos.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4 italic">Nenhum dado para este período.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimas Vendas Realizadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {ultimasVendas.map((venda) => (
              <div key={venda.id} className="flex flex-col p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-primary">#{venda.numero_venda}</span>
                    <span className="text-[10px] text-muted-foreground">{formatDate(venda.data_venda)}</span>
                  </div>
                  <Badge variant={venda.status === 'finalizada' ? 'default' : 'destructive'} className="text-[9px] px-1.5 py-0">
                    {venda.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm font-medium truncate mb-2">
                  {venda.clientes?.nome || "Cliente Balcão"}
                </p>
                <div className="mt-auto font-bold text-lg text-success">
                  {formatCurrency(venda.total)}
                </div>
              </div>
            ))}
            {ultimasVendas.length === 0 && (
              <p className="text-muted-foreground text-sm col-span-full text-center py-8">Nenhuma venda encontrada.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div >
  );
}
