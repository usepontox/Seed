import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, AlertTriangle, Edit, Trash2, Upload, Package, DollarSign, XCircle, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, Download, Info } from "lucide-react";
import ProdutoForm from "@/components/ProdutoForm";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useEmpresa } from "@/hooks/use-empresa";
import { type Session } from "@supabase/supabase-js";

export default function Produtos() {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<any>(null);
  const { toast } = useToast();
  const { empresaId } = useEmpresa();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [dadosImportacao, setDadosImportacao] = useState<any[]>([]);
  const [ordenarPor, setOrdenarPor] = useState<'estoque' | null>(null);
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState<'asc' | 'desc'>('asc');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Get session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    loadProdutos();
  }, [empresaId]);

  const loadProdutos = async () => {
    // Admin não deve ver produtos - apenas gerenciar empresas
    const { data: { session } } = await supabase.auth.getSession();
    const userEmail = session?.user?.email || '';

    if (userEmail === 'admin@admin.com' || userEmail === 'admin@admin.com.br') {
      setProdutos([]);
      return;
    }

    // Se não tem empresa vinculada, não carrega produtos
    if (!empresaId) {
      setProdutos([]);
      return;
    }

    const { data } = await supabase
      .from("produtos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nome");
    if (data) setProdutos(data);
  };

  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.codigo_barras?.toLowerCase().includes(busca.toLowerCase()) ||
    p.sku?.toLowerCase().includes(busca.toLowerCase())
  );

  // Aplicar ordenação se ativa
  const produtosOrdenados = [...produtosFiltrados].sort((a, b) => {
    if (ordenarPor === 'estoque') {
      const diff = a.estoque_atual - b.estoque_atual;
      return direcaoOrdenacao === 'asc' ? diff : -diff;
    }
    return 0;
  });

  // Métricas do dashboard
  const totalProdutos = produtos.length;
  const produtosEstoqueBaixo = produtos.filter(p => p.estoque_atual <= p.estoque_minimo).length;
  const valorTotalEstoque = produtos.reduce((acc, p) => acc + (p.custo * p.estoque_atual), 0);
  const valorTotalVenda = produtos.reduce((acc, p) => acc + (p.preco_venda * p.estoque_atual), 0);
  const lucroPossivel = valorTotalVenda - valorTotalEstoque;
  const produtosInativos = produtos.filter(p => !p.ativo).length;
  const produtosIncompletos = produtos.filter(p => !p.ncm || !p.codigo_barras || !p.sku).length;

  const handleOrdenarEstoque = () => {
    if (ordenarPor === 'estoque') {
      // Se já está ordenando por estoque, inverte a direção
      setDirecaoOrdenacao(direcaoOrdenacao === 'asc' ? 'desc' : 'asc');
    } else {
      // Se não está ordenando, ativa ordenação ascendente
      setOrdenarPor('estoque');
      setDirecaoOrdenacao('asc');
    }
  };

  const handleEditar = (produto: any) => {
    setProdutoEditando(produto);
    setDialogOpen(true);
  };

  const handleDeletar = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este produto?")) return;

    const { error } = await supabase
      .from("produtos")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao deletar produto",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({ title: "Produto deletado com sucesso!" });
      loadProdutos();
    }
  };

  const handleNovoClick = () => {
    setProdutoEditando(null);
    setDialogOpen(true);
  };

  const handleImportarExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          toast({ title: "Arquivo vazio", variant: "destructive" });
          return;
        }

        // Validar colunas obrigatórias
        const primeiraLinha = jsonData[0];
        const colunasNecessarias = ['nome', 'preco_venda', 'custo', 'estoque_atual'];
        const colunasFaltando = colunasNecessarias.filter(col =>
          !Object.keys(primeiraLinha).some(key => key.toLowerCase() === col)
        );

        if (colunasFaltando.length > 0) {
          toast({
            title: "Colunas obrigatórias faltando",
            description: `Faltam: ${colunasFaltando.join(', ')}`,
            variant: "destructive"
          });
          return;
        }

        // Normalizar nomes de colunas
        const dadosNormalizados = jsonData.map(item => {
          const normalizado: any = {};
          Object.keys(item).forEach(key => {
            const keyNormalizada = key.toLowerCase().trim();
            normalizado[keyNormalizada] = item[key];
          });
          return normalizado;
        });

        setDadosImportacao(dadosNormalizados);
        setImportDialogOpen(true);
      } catch (error) {
        toast({ title: "Erro ao ler arquivo", variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  const confirmarImportacao = async () => {
    try {
      if (!empresaId) {
        toast({ title: "Erro", description: "Empresa não identificada", variant: "destructive" });
        return;
      }

      const produtosParaInserir = dadosImportacao.map(item => ({
        nome: item.nome,
        preco_venda: parseFloat(item.preco_venda) || 0,
        custo: parseFloat(item.custo) || 0,
        estoque_atual: parseInt(item.estoque_atual) || 0,
        estoque_minimo: parseInt(item.estoque_minimo) || 0,
        descricao: item.descricao || null,
        codigo_barras: item.codigo_barras || null,
        sku: item.sku || null,
        ativo: true,
        empresa_id: empresaId,
      }));

      const { error } = await supabase
        .from('produtos')
        .insert(produtosParaInserir);

      if (error) throw error;

      toast({ title: `${produtosParaInserir.length} produtos importados com sucesso!` });
      setImportDialogOpen(false);
      setDadosImportacao([]);
      loadProdutos();
    } catch (error: any) {
      toast({
        title: "Erro ao importar produtos",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleExportarExcel = () => {
    if (produtos.length === 0) {
      toast({
        title: "Nenhum produto para exportar",
        variant: "destructive"
      });
      return;
    }

    // Preparar dados para exportação
    const dadosExportacao = produtos.map(produto => ({
      'Nome': produto.nome,
      'SKU': produto.sku || '',
      'Código de Barras': produto.codigo_barras || '',
      'NCM': produto.ncm || '',
      'Descrição': produto.descricao || '',
      'Custo (R$)': produto.custo,
      'Preço de Venda (R$)': produto.preco_venda,
      'Margem (%)': produto.preco_venda > 0 ? (((produto.preco_venda - produto.custo) / produto.preco_venda) * 100).toFixed(2) : '0',
      'Estoque Atual': produto.estoque_atual,
      'Estoque Mínimo': produto.estoque_minimo,
      'Unidade': produto.unidade,
      'Status': produto.ativo ? 'Ativo' : 'Inativo',
      'Data Criação': new Date(produto.created_at).toLocaleDateString('pt-BR'),
      'Data Atualização': new Date(produto.updated_at).toLocaleDateString('pt-BR')
    }));

    // Criar workbook e worksheet
    const worksheet = XLSX.utils.json_to_sheet(dadosExportacao);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Estoque');

    // Gerar arquivo
    const dataAtual = new Date().toISOString().split('T')[0];
    const nomeArquivo = `relatorio_estoque_${dataAtual}.xlsx`;
    XLSX.writeFile(workbook, nomeArquivo);

    toast({
      title: "Relatório exportado com sucesso!",
      description: `${produtos.length} produtos exportados.`
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">Gestão de estoque e produtos</p>
        </div>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" className="gap-2" onClick={() => document.getElementById('file-upload')?.click()}>
                  <Upload className="h-4 w-4" />
                  Importar Excel
                </Button>
              </TooltipTrigger>
              <TooltipContent>Importar produtos de planilha Excel</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <div className="space-y-2">
                  <p className="font-semibold">Como importar produtos:</p>
                  <div>
                    <p className="text-xs font-medium">Colunas obrigatórias:</p>
                    <p className="text-xs">• nome, preco_venda, custo, estoque_atual</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium">Colunas opcionais:</p>
                    <p className="text-xs">• estoque_minimo, descricao, codigo_barras, sku, ncm</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Os nomes das colunas não diferenciam maiúsculas/minúsculas</p>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" className="gap-2" onClick={handleExportarExcel}>
                  <Download className="h-4 w-4" />
                  Exportar Excel
                </Button>
              </TooltipTrigger>
              <TooltipContent>Exportar relatório completo do estoque</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button className="gap-2" onClick={handleNovoClick}>
                  <Plus className="h-4 w-4" />
                  Novo Produto
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cadastrar novo produto</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <input
            id="file-upload"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportarExcel}
            className="hidden"
          />
        </div>
      </div>

      {/* Dashboard - Cards de Métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProdutos}</div>
            <p className="text-xs text-muted-foreground">Produtos cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{produtosEstoqueBaixo}</div>
            <p className="text-xs text-muted-foreground">Abaixo do mínimo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total (Custo)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(valorTotalEstoque)}</div>
            <p className="text-xs text-muted-foreground">Custo de aquisição</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total (Venda)</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(valorTotalVenda)}
            </div>
            <p className="text-xs text-muted-foreground">Preço de venda potencial</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Inativos</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{produtosInativos}</div>
            <p className="text-xs text-muted-foreground">Não disponíveis</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Possível</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(lucroPossivel)}</div>
            <p className="text-xs text-muted-foreground">Diferença Venda - Custo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cadastro Incompleto</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{produtosIncompletos}</div>
            <p className="text-xs text-muted-foreground">Sem NCM, código ou SKU</p>
          </CardContent>
        </Card>
      </div>

      {/* Análise - Produtos com Estoque Crítico */}
      {produtosEstoqueBaixo > 0 && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Produtos com Estoque Crítico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {produtos
                .filter(p => p.estoque_atual <= p.estoque_minimo)
                .slice(0, 5)
                .map(produto => (
                  <div key={produto.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{produto.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        Estoque: {produto.estoque_atual} / Mínimo: {produto.estoque_minimo}
                      </p>
                    </div>
                    <Badge variant="destructive">Crítico</Badge>
                  </div>
                ))}
              {produtosEstoqueBaixo > 5 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  ... e mais {produtosEstoqueBaixo - 5} produtos
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto, código de barras ou SKU..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-muted/50"
                  onClick={handleOrdenarEstoque}
                >
                  <div className="flex items-center gap-1">
                    Estoque
                    {ordenarPor === 'estoque' ? (
                      direcaoOrdenacao === 'asc' ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Preço Venda</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtosOrdenados.map(produto => (
                <TableRow key={produto.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {produto.nome}
                      {(!produto.ncm || !produto.codigo_barras || !produto.sku) && (
                        <Badge variant="outline" className="text-orange-500 border-orange-500">
                          Incompleto
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{produto.estoque_atual}</span>
                      {produto.estoque_atual <= produto.estoque_minimo && (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(produto.custo)}</TableCell>
                  <TableCell className="font-medium text-success">
                    {formatCurrency(produto.preco_venda)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={produto.ativo ? "default" : "secondary"}>
                      {produto.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleEditar(produto)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar produto</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleDeletar(produto.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir produto</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProdutoForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadProdutos}
        produtoEditando={produtoEditando}
      />

      {/* Dialog Importação Excel */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pré-visualização da Importação</DialogTitle>
            <DialogDescription>
              {dadosImportacao.length} produtos encontrados. Revise antes de confirmar.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Preço Venda</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Estoque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosImportacao.slice(0, 10).map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.nome}</TableCell>
                    <TableCell>{formatCurrency(parseFloat(item.preco_venda) || 0)}</TableCell>
                    <TableCell>{formatCurrency(parseFloat(item.custo) || 0)}</TableCell>
                    <TableCell>{item.estoque_atual}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {dadosImportacao.length > 10 && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                ... e mais {dadosImportacao.length - 10} produtos
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarImportacao}>
              Confirmar Importação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
