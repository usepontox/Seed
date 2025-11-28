import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  AlertTriangle,
  Users,
  Plus,
  FileText
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useEmpresa } from "@/hooks/use-empresa";

export default function Dashboard() {
  const navigate = useNavigate();
  const { empresaId } = useEmpresa();
  const [stats, setStats] = useState({
    vendasHoje: 0,
    faturamentoHoje: 0,
    faturamentoMes: 0,
    produtosEstoque: 0,
    produtosBaixoEstoque: 0,
    totalClientes: 0,
    totalFornecedores: 0,
    cuponsEmitidos: 0,
    cuponsPendentes: 0,
  });
  const [topProdutos, setTopProdutos] = useState<any[]>([]);
  const [ultimasVendas, setUltimasVendas] = useState<any[]>([]);
  const [graficoVendas, setGraficoVendas] = useState<any[]>([]);

  useEffect(() => {
    if (empresaId) {
      loadDashboardData();
    }
  }, [empresaId]);

  const loadDashboardData = async () => {
    const hoje = new Date().toISOString().split('T')[0];
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    try {
      const [
        vendasHojeResult,
        vendasMesResult,
        produtosResult,
        clientesResult,
        fornecedoresResult,
        cuponsEmitidosResult,
        cuponsPendentesResult,
        itensVendasResult,
        ultimasVendasResult,
        graficoVendasResult
      ] = await Promise.all([
        // 1. Vendas de hoje
        supabase
          .from("vendas")
          .select("total")
          .eq("empresa_id", empresaId!)
          .eq("status", "finalizada")
          .gte("data_venda", `${hoje}T00:00:00`)
          .lte("data_venda", `${hoje}T23:59:59`),

        // 2. Faturamento do mês
        supabase
          .from("vendas")
          .select("total")
          .eq("empresa_id", empresaId!)
          .eq("status", "finalizada")
          .gte("data_venda", `${inicioMes}T00:00:00`),

        // 3. Produtos em estoque
        supabase
          .from("produtos")
          .select("estoque_atual, estoque_minimo")
          .eq("empresa_id", empresaId!)
          .eq("ativo", true),

        // 4. Clientes
        supabase
          .from("clientes")
          .select("*", { count: "exact", head: true })
          .eq("empresa_id", empresaId!),

        // 5. Fornecedores
        supabase
          .from("fornecedores")
          .select("*", { count: "exact", head: true })
          .eq("empresa_id", empresaId!),

        // 6. Cupons emitidos
        supabase
          .from("vendas")
          .select("*", { count: "exact", head: true })
          .eq("empresa_id", empresaId!)
          .eq("nfce_status", "emitida"),

        // 7. Cupons pendentes
        supabase
          .from("vendas")
          .select("*", { count: "exact", head: true })
          .eq("empresa_id", empresaId!)
          .eq("nfce_status", "pendente")
          .neq("status", "cancelada"),

        // 8. Top produtos (limitado a 30 dias para performance)
        supabase
          .from("vendas_itens")
          .select(`
            quantidade,
            produtos:produto_id (nome, preco_venda),
            vendas!inner(data_venda)
          `)
          .gte("vendas.data_venda", trintaDiasAtras),

        // 9. Últimas vendas
        supabase
          .from("vendas")
          .select(`
            *,
            clientes:cliente_id (nome)
          `)
          .eq("empresa_id", empresaId!)
          .order("data_venda", { ascending: false })
          .limit(5),

        // 10. Gráfico de vendas
        supabase
          .from("vendas")
          .select("data_venda, total")
          .eq("empresa_id", empresaId!)
          .eq("status", "finalizada")
          .gte("data_venda", trintaDiasAtras)
          .order("data_venda")
      ]);

      // Processamento dos resultados
      const vendasHoje = vendasHojeResult.data?.length || 0;
      const faturamentoHoje = vendasHojeResult.data?.reduce((sum, v) => sum + Number(v.total), 0) || 0;
      const faturamentoMes = vendasMesResult.data?.reduce((sum, v) => sum + Number(v.total), 0) || 0;

      const produtos = produtosResult.data || [];
      const produtosEstoque = produtos.length;
      const produtosBaixoEstoque = produtos.filter(p => p.estoque_atual <= p.estoque_minimo).length;

      // Processamento Top Produtos
      const produtosAgrupados = (itensVendasResult.data || []).reduce((acc: any, item: any) => {
        const produtoNome = item.produtos?.nome || "Desconhecido";
        if (!acc[produtoNome]) {
          acc[produtoNome] = {
            nome: produtoNome,
            quantidade: 0,
            valor: item.produtos?.preco_venda || 0,
          };
        }
        acc[produtoNome].quantidade += item.quantidade;
        return acc;
      }, {});

      const topProdutos = Object.values(produtosAgrupados)
        .sort((a: any, b: any) => b.quantidade - a.quantidade)
        .slice(0, 5);

      // Processamento Gráfico
      const dadosGrafico = (graficoVendasResult.data || []).reduce((acc: any, venda) => {
        const data = new Date(venda.data_venda).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        const existente = acc.find((item: any) => item.data === data);
        if (existente) {
          existente.valor += Number(venda.total);
        } else {
          acc.push({ data, valor: Number(venda.total) });
        }
        return acc;
      }, []);

      setStats({
        vendasHoje,
        faturamentoHoje,
        faturamentoMes,
        produtosEstoque,
        produtosBaixoEstoque,
        totalClientes: clientesResult.count || 0,
        totalFornecedores: fornecedoresResult.count || 0,
        cuponsEmitidos: cuponsEmitidosResult.count || 0,
        cuponsPendentes: cuponsPendentesResult.count || 0,
      });

      setTopProdutos(topProdutos);
      setUltimasVendas(ultimasVendasResult.data || []);
      setGraficoVendas(dadosGrafico);

    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    }
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
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu negócio</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/pdv")}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Venda
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Faturamento Hoje */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-all duration-300 border-none bg-gradient-to-br from-blue-500 to-blue-600 text-white"
          onClick={() => navigate("/pdv")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">
              Faturamento Hoje
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.faturamentoHoje)}
            </div>
            <p className="text-xs text-blue-100/80 mt-1">
              {stats.vendasHoje} vendas realizadas
            </p>
          </CardContent>
        </Card>

        {/* Faturamento Mensal */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-all duration-300 border-none bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
          onClick={() => navigate("/relatorios")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-100">
              Faturamento Mensal
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.faturamentoMes)}
            </div>
            <p className="text-xs text-emerald-100/80 mt-1">
              Total do mês atual
            </p>
          </CardContent>
        </Card>

        {/* Produtos Ativos */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-all duration-300 border-none bg-white shadow-sm hover:bg-gray-50"
          onClick={() => navigate("/produtos")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Produtos Ativos
            </CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">{stats.produtosEstoque}</div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">Em estoque</p>
              {stats.produtosBaixoEstoque > 0 && (
                <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                  {stats.produtosBaixoEstoque} baixo
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Clientes */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-all duration-300 border-none bg-white shadow-sm hover:bg-gray-50"
          onClick={() => navigate("/clientes")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">{stats.totalClientes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalFornecedores} fornecedores
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cupons Emitidos */}
        <Card
          className="cursor-pointer hover:shadow-md transition-all duration-300"
          onClick={() => navigate("/relatorios-fiscais")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cupons Emitidos (NFC-e)
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cuponsEmitidos}</div>
            <p className="text-xs text-muted-foreground">
              Notas fiscais autorizadas
            </p>
          </CardContent>
        </Card>

        {/* Cupons Pendentes */}
        <Card
          className={`cursor-pointer hover:shadow-md transition-all duration-300 ${stats.cuponsPendentes > 0 ? 'border-l-4 border-l-yellow-500' : ''}`}
          onClick={() => navigate("/relatorios-fiscais")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cupons Pendentes
            </CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.cuponsPendentes > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cuponsPendentes}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando emissão
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
