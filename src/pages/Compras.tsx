import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus, Trash2, Package, Search, FileText, Upload, X, AlertTriangle } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import xml2js from "xml2js";
import { z } from "zod";
import { useEmpresa } from "@/hooks/use-empresa";
import { getErrorMessage } from "@/lib/errorUtils";

interface Produto {
  id: string;
  nome: string;
  custo: number;
}

interface Fornecedor {
  id: string;
  nome: string;
}

interface ItemCompra {
  produto: Produto;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

export default function Compras() {
  const { toast } = useToast();
  const { empresaId } = useEmpresa();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [compras, setCompras] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busca, setBusca] = useState("");

  const [fornecedorId, setFornecedorId] = useState<string>("");
  const [numeroNota, setNumeroNota] = useState("");
  const [itens, setItens] = useState<ItemCompra[]>([]);
  const [loading, setLoading] = useState(false);

  // Cancelamento de compra
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [compraSelecionada, setCompraSelecionada] = useState<any>(null);

  // Produto manual
  const [produtoManualOpen, setProdutoManualOpen] = useState(false);
  const [produtoManual, setProdutoManual] = useState({ nome: "", preco: "", quantidade: "1" });

  useEffect(() => {
    loadProdutos();
    loadFornecedores();
  }, []);

  useEffect(() => {
    if (empresaId) {
      loadCompras();
    }
  }, [empresaId]);

  const loadProdutos = async () => {
    const { data } = await supabase
      .from("produtos")
      .select("id, nome, custo")
      .eq("ativo", true);

    if (data) setProdutos(data);
  };

  const loadFornecedores = async () => {
    const { data } = await supabase
      .from("fornecedores")
      .select("id, nome")
      .order("nome");

    if (data) setFornecedores(data);
  };

  const loadCompras = async () => {
    const { data } = await supabase
      .from("compras")
      .select(`
        *,
        fornecedores:fornecedor_id (nome)
      `)
      .eq("empresa_id", empresaId!)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) setCompras(data);
  };

  // Validation schema for NFe XML product data
  const nfeProductSchema = z.object({
    xProd: z.string().trim().min(1, "Nome do produto não pode estar vazio").max(200, "Nome do produto muito longo (máx 200 caracteres)"),
    qCom: z.string().refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0 && num <= 100000;
    }, "Quantidade inválida (deve ser > 0 e ≤ 100000)"),
    vUnCom: z.string().refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 1000000;
    }, "Preço unitário inválido (deve ser ≥ 0 e ≤ 1000000)")
  });

  const handleImportarXML = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(text);

      // Extrair dados da nota fiscal (estrutura padrão NFe)
      const nfe = result.nfeProc?.NFe?.infNFe || result.NFe?.infNFe;

      if (!nfe) {
        toast({ title: "XML inválido", description: "Estrutura de NFe não encontrada", variant: "destructive" });
        return;
      }

      // Extrair e validar número da nota
      const numeroNotaRaw = nfe.ide?.nNF || "";
      if (!numeroNotaRaw) {
        toast({ title: "XML inválido", description: "Número da nota não encontrado", variant: "destructive" });
        return;
      }
      setNumeroNota(String(numeroNotaRaw).slice(0, 50)); // Limit length

      // Processar itens da nota
      const itensNF = Array.isArray(nfe.det) ? nfe.det : [nfe.det];
      const itensImportados: ItemCompra[] = [];
      const errosValidacao: string[] = [];

      for (const [index, item] of itensNF.entries()) {
        const prod = item.prod;

        // Validate product data
        const validation = nfeProductSchema.safeParse(prod);
        if (!validation.success) {
          const erro = validation.error.errors[0];
          errosValidacao.push(`Item ${index + 1}: ${erro.message}`);
          continue; // Skip invalid items
        }

        const nomeProduto = validation.data.xProd.trim();
        const quantidade = parseFloat(validation.data.qCom);
        const precoUnitario = parseFloat(validation.data.vUnCom);

        // Buscar produto existente ou criar placeholder
        const produtoExistente = produtos.find(p =>
          p.nome.toLowerCase() === nomeProduto.toLowerCase()
        );

        const produto: Produto = produtoExistente || {
          id: `temp-${Date.now()}-${Math.random()}`,
          nome: nomeProduto,
          custo: precoUnitario
        };

        itensImportados.push({
          produto,
          quantidade,
          preco_unitario: precoUnitario,
          subtotal: quantidade * precoUnitario
        });
      }

      if (itensImportados.length === 0) {
        toast({
          title: "Nenhum item válido",
          description: errosValidacao.length > 0 ? errosValidacao[0] : "Nenhum produto encontrado no XML",
          variant: "destructive"
        });
        return;
      }

      setItens(itensImportados);

      // Show success with validation warnings if any
      if (errosValidacao.length > 0) {
        toast({
          title: "XML importado com avisos",
          description: `${itensImportados.length} itens carregados, ${errosValidacao.length} itens com erros foram ignorados`,
          variant: "default"
        });
      } else {
        toast({
          title: "XML importado com sucesso!",
          description: `${itensImportados.length} itens carregados`
        });
      }

    } catch (error: any) {
      toast({
        title: "Erro ao processar XML",
        description: "Não foi possível processar o arquivo XML. Verifique se o formato está correto.",
        variant: "destructive"
      });
      console.error("XML import error:", error);
    }

    e.target.value = '';
  };

  const adicionarItem = (produto: Produto) => {
    const itemExistente = itens.find(item => item.produto.id === produto.id);

    if (itemExistente) {
      setItens(itens.map(item =>
        item.produto.id === produto.id
          ? { ...item, quantidade: item.quantidade + 1, subtotal: (item.quantidade + 1) * item.preco_unitario }
          : item
      ));
    } else {
      setItens([...itens, {
        produto,
        quantidade: 1,
        preco_unitario: produto.custo,
        subtotal: produto.custo,
      }]);
    }
  };

  const adicionarProdutoManual = () => {
    if (!produtoManual.nome || !produtoManual.preco || !produtoManual.quantidade) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    const preco = parseFloat(produtoManual.preco);
    const quantidade = parseInt(produtoManual.quantidade);

    if (isNaN(preco) || isNaN(quantidade) || preco <= 0 || quantidade <= 0) {
      toast({ title: "Valores inválidos", variant: "destructive" });
      return;
    }

    const produtoTemp: Produto = {
      id: `manual-${Date.now()}`,
      nome: produtoManual.nome,
      custo: preco,
    };

    setItens([...itens, {
      produto: produtoTemp,
      quantidade,
      preco_unitario: preco,
      subtotal: preco * quantidade,
    }]);

    setProdutoManual({ nome: "", preco: "", quantidade: "1" });
    setProdutoManualOpen(false);
    toast({ title: "Produto adicionado!" });
  };

  const alterarQuantidade = (produtoId: string, delta: number) => {
    setItens(itens.map(item => {
      if (item.produto.id === produtoId) {
        const novaQuantidade = item.quantidade + delta;
        if (novaQuantidade <= 0) return item;
        return {
          ...item,
          quantidade: novaQuantidade,
          subtotal: novaQuantidade * item.preco_unitario,
        };
      }
      return item;
    }));
  };

  const alterarPreco = (produtoId: string, preco: number) => {
    setItens(itens.map(item => {
      if (item.produto.id === produtoId) {
        return {
          ...item,
          preco_unitario: preco,
          subtotal: item.quantidade * preco,
        };
      }
      return item;
    }));
  };

  const removerItem = (produtoId: string) => {
    setItens(itens.filter(item => item.produto.id !== produtoId));
  };

  const calcularTotal = () => {
    return itens.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const finalizarCompra = async () => {
    if (itens.length === 0) {
      toast({ title: "Adicione produtos à compra", variant: "destructive" });
      return;
    }

    if (!numeroNota) {
      toast({ title: "Informe o número da nota", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (!empresaId) {
        toast({ title: "Erro", description: "Empresa não identificada", variant: "destructive" });
        return;
      }

      const total = calcularTotal();

      // 1. Criar a compra
      const { data: compra, error: compraError } = await supabase
        .from("compras")
        .insert([{
          fornecedor_id: fornecedorId && fornecedorId.trim() !== "" ? fornecedorId : null,
          numero_nota: numeroNota,
          valor_total: total,
          usuario_id: user.id,
          empresa_id: empresaId,
        }])
        .select()
        .single();

      if (compraError) throw compraError;

      // 2. Processar itens (criar produtos novos se necessário)
      const itensParaInserir = [];
      let novosProdutosCriados = 0;

      for (const item of itens) {
        let produtoId = item.produto.id;

        // Se for um produto manual ou temporário (importado XML sem match), criar no banco
        if (produtoId.startsWith("manual-") || produtoId.startsWith("temp-")) {
          const { data: novoProduto, error: prodError } = await supabase
            .from("produtos")
            .insert([{
              nome: item.produto.nome,
              custo: item.preco_unitario,
              preco_venda: item.preco_unitario, // Define preço de venda igual ao custo inicialmente
              unidade: "UN",
              estoque_atual: 0, // Trigger vai atualizar com a entrada
              estoque_minimo: 0,
              ativo: true,
              empresa_id: empresaId
            }])
            .select()
            .single();

          if (prodError) {
            console.error("Erro ao criar produto manual:", prodError);
            throw new Error(`Erro ao criar produto: ${item.produto.nome}`);
          }

          produtoId = novoProduto.id;
          novosProdutosCriados++;
        }

        itensParaInserir.push({
          compra_id: compra.id,
          produto_id: produtoId,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          subtotal: item.subtotal,
        });
      }

      // 3. Inserir itens da compra
      if (itensParaInserir.length > 0) {
        const { error: itensError } = await supabase
          .from("compras_itens")
          .insert(itensParaInserir);

        if (itensError) throw itensError;
      }

      // 4. Atualizar estoque dos produtos
      for (const item of itensParaInserir) {
        const { data: produtoAtual } = await supabase
          .from("produtos")
          .select("estoque_atual")
          .eq("id", item.produto_id)
          .single();

        if (produtoAtual) {
          await supabase
            .from("produtos")
            .update({ estoque_atual: produtoAtual.estoque_atual + item.quantidade })
            .eq("id", item.produto_id);
        }
      }

      toast({
        title: "Compra registrada com sucesso!",
        description: `Total: ${formatCurrency(total)}${novosProdutosCriados > 0 ? ` (${novosProdutosCriados} novos produtos cadastrados)` : ""}`,
      });

      // Limpar formulário
      setItens([]);
      setFornecedorId("");
      setNumeroNota("");
      setDialogOpen(false);
      loadCompras(); // Recarregar lista de compras
      loadProdutos(); // Recarregar lista de produtos para incluir os novos
    } catch (error: any) {
      toast({
        title: "Erro ao registrar compra",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelarCompra = async () => {
    if (!compraSelecionada) return;

    try {
      const { error } = await supabase
        .from("compras")
        .update({ status: "cancelada" })
        .eq("id", compraSelecionada.id);

      if (error) throw error;

      toast({
        title: "Compra cancelada com sucesso!",
        description: `NF ${compraSelecionada.numero_nota || "sem número"} foi cancelada.`,
      });

      setCancelDialogOpen(false);
      setCompraSelecionada(null);
      loadCompras();
    } catch (error: any) {
      toast({
        title: "Erro ao cancelar compra",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compras / Entradas</h1>
          <p className="text-muted-foreground">Registre entrada de produtos no estoque</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={() => setDialogOpen(true)}>
                <Package className="mr-2 h-4 w-4" />
                Nova Compra
              </Button>
            </TooltipTrigger>
            <TooltipContent>Registrar nova entrada de produtos</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Compra / Entrada</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Fornecedor (opcional)</Label>
                <Select value={fornecedorId} onValueChange={setFornecedorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Número da Nota *</Label>
                <Input
                  value={numeroNota}
                  onChange={(e) => setNumeroNota(e.target.value)}
                  placeholder="Ex: 123456"
                />
              </div>
              <div>
                <Label>Importar XML NFe</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => document.getElementById('xml-upload')?.click()}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Carregar XML
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Importar produtos de nota fiscal eletrônica (XML)</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <input
                  id="xml-upload"
                  type="file"
                  accept=".xml"
                  onChange={handleImportarXML}
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-lg">Produtos Disponíveis</CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => setProdutoManualOpen(true)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Manual
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Adicionar produto não cadastrado</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar produto..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </CardHeader>
                <CardContent className="max-h-[400px] overflow-auto">
                  {produtosFiltrados.map(produto => (
                    <div
                      key={produto.id}
                      className="flex items-center justify-between p-2 border rounded mb-2 hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => adicionarItem(produto)}
                    >
                      <div>
                        <p className="font-medium">{produto.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Custo: {formatCurrency(produto.custo)}
                        </p>
                      </div>
                      <Plus className="h-4 w-4" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Itens da Compra</span>
                    {itens.length > 0 && (
                      <Badge variant="secondary">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[400px] overflow-auto">
                  {itens.length === 0 ? (
                    <div className="text-center py-12">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">
                        Adicione produtos ou importe XML
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead className="w-32">Qtd</TableHead>
                          <TableHead className="w-32">Preço</TableHead>
                          <TableHead className="w-24">Total</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itens.map(item => (
                          <TableRow key={item.produto.id}>
                            <TableCell className="text-xs">
                              {item.produto.nome}
                              {(item.produto.id.startsWith("temp-") || item.produto.id.startsWith("manual-")) && (
                                <Badge variant="outline" className="ml-2 bg-yellow-100 text-xs">
                                  Novo
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-6 w-6"
                                  onClick={() => alterarQuantidade(item.produto.id, -1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantidade}
                                  onChange={(e) => {
                                    const novaQtd = parseInt(e.target.value) || 1;
                                    setItens(itens.map(i =>
                                      i.produto.id === item.produto.id
                                        ? { ...i, quantidade: novaQtd, subtotal: novaQtd * i.preco_unitario }
                                        : i
                                    ));
                                  }}
                                  className="w-12 h-6 text-center text-xs p-0"
                                />
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-6 w-6"
                                  onClick={() => alterarQuantidade(item.produto.id, 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.preco_unitario}
                                onChange={(e) => alterarPreco(item.produto.id, parseFloat(e.target.value) || 0)}
                                className="h-7 text-xs"
                              />
                            </TableCell>
                            <TableCell className="text-xs font-semibold">
                              {formatCurrency(item.subtotal)}
                            </TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6"
                                      onClick={() => removerItem(item.produto.id)}
                                    >
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Remover item</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-2xl font-bold">
                Total: {formatCurrency(calcularTotal())}
              </div>
              <Button
                onClick={finalizarCompra}
                disabled={loading || itens.length === 0}
                size="lg"
              >
                {loading ? "Processando..." : "Finalizar Compra"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Produto Manual */}
      <Dialog open={produtoManualOpen} onOpenChange={setProdutoManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Produto Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Produto *</Label>
              <Input
                value={produtoManual.nome}
                onChange={(e) => setProdutoManual({ ...produtoManual, nome: e.target.value })}
                placeholder="Ex: Produto Avulso"
              />
            </div>
            <div>
              <Label>Preço Unitário (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={produtoManual.preco}
                onChange={(e) => setProdutoManual({ ...produtoManual, preco: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Quantidade *</Label>
              <Input
                type="number"
                value={produtoManual.quantidade}
                onChange={(e) => setProdutoManual({ ...produtoManual, quantidade: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setProdutoManualOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={adicionarProdutoManual} className="flex-1">
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Relatório de Compras */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Últimas Compras / Entradas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {compras.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                Nenhuma compra registrada ainda
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>NF</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compras.map((compra) => (
                  <TableRow key={compra.id}>
                    <TableCell className="text-sm">
                      {new Date(compra.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {compra.numero_nota || "-"}
                    </TableCell>
                    <TableCell>
                      {compra.fornecedores?.nome || "Sem fornecedor"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          compra.status === "finalizada"
                            ? "default"
                            : compra.status === "cancelada"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {compra.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-success">
                      {formatCurrency(compra.valor_total)}
                    </TableCell>
                    <TableCell className="text-center">
                      {compra.status === "finalizada" && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => {
                                  setCompraSelecionada(compra);
                                  setCancelDialogOpen(true);
                                }}
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cancelar compra</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Cancelamento */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancelar Compra
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja cancelar esta compra? Esta ação não pode ser desfeita.
            </p>
            {compraSelecionada && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Nota Fiscal:</span>
                  <span className="text-sm">{compraSelecionada.numero_nota || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Fornecedor:</span>
                  <span className="text-sm">{compraSelecionada.fornecedores?.nome || "Sem fornecedor"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Valor Total:</span>
                  <span className="text-sm font-semibold">{formatCurrency(compraSelecionada.valor_total)}</span>
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setCancelDialogOpen(false);
                  setCompraSelecionada(null);
                }}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={cancelarCompra}
                className="flex-1"
              >
                Confirmar Cancelamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
