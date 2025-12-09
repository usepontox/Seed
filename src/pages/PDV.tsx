import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Minus, Trash2, ShoppingCart, Receipt, Clock, Edit2, DollarSign, Package, ArrowDownCircle, CreditCard, Usb, Globe, XCircle } from "lucide-react";
import CupomFiscal from "@/components/CupomFiscal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import InputMask from "react-input-mask";
import { masks } from "@/lib/masks";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useEmpresa } from "@/hooks/use-empresa";
import { useCaixa } from "@/hooks/use-caixa";
import { usePermissoes } from "@/hooks/use-permissoes";
import { useEstoque } from "@/hooks/use-estoque";
import { useAudit } from "@/hooks/use-audit";
import ProdutoItem from "@/components/pdv/ProdutoItem";
import ModalPesagem from "@/components/pdv/ModalPesagem";
import AberturaCaixa from "@/components/pdv/AberturaCaixa";
import SaldoCaixa from "@/components/pdv/SaldoCaixa";
import ModalSangria from "@/components/pdv/ModalSangria";
import FechamentoCaixa from "@/components/pdv/FechamentoCaixa";
import CancelamentoVenda from "@/components/pdv/CancelamentoVenda";
import { usePos, PosMode } from "@/hooks/use-pos";
import { StatusBar, type StatusType } from "@/components/pdv/StatusBar";
import { KeyboardHelper } from "@/components/pdv/KeyboardHelper";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

interface Produto {
  id: string;
  nome: string;
  preco_venda: number;
  estoque_atual: number;
  codigo_barras?: string;
  sku?: string;
  ncm?: string;
  unidade?: string;
}

interface ItemVenda {
  produto: Produto;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

interface VendaRecente {
  id: string;
  numero_venda: string;
  data_venda: string;
  total: number;
  forma_pagamento: string;
  status: string;
}

interface Cliente {
  id: string;
  nome: string;
  cpf?: string;
  cnpj?: string;
}

export default function PDV() {
  const { toast } = useToast();
  const { empresaId } = useEmpresa();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState<ItemVenda[]>([]);
  const [clienteId, setClienteId] = useState<string>("anonimo");
  const [formaPagamento, setFormaPagamento] = useState<string>("dinheiro");
  const [loading, setLoading] = useState(false);
  const [vendasRecentes, setVendasRecentes] = useState<VendaRecente[]>([]);
  const [cupomVendaId, setCupomVendaId] = useState<string | null>(null);
  const [cupomOpen, setCupomOpen] = useState(false);
  const buscaInputRef = useRef<HTMLInputElement>(null);
  const carrinhoScrollRef = useRef<HTMLDivElement>(null);

  // Modal para ver todos os itens do carrinho
  const [verTodosItensOpen, setVerTodosItensOpen] = useState(false);
  const [ultimoItemAdicionado, setUltimoItemAdicionado] = useState<string | null>(null);

  // Status da operação e CPF
  const [status, setStatus] = useState<StatusType>('idle');
  const [cpfModalOpen, setCpfModalOpen] = useState(false);
  const [cpfNotaAtual, setCpfNotaAtual] = useState("");
  const [keyboardHelperOpen, setKeyboardHelperOpen] = useState(false);

  // Produto manual
  const [produtoManualOpen, setProdutoManualOpen] = useState(false);
  const [produtoManual, setProdutoManual] = useState({ nome: "", preco: "", quantidade: "1", unidade: "UN" });

  // Editar preço
  const [editandoPreco, setEditandoPreco] = useState<{ id: string; preco: string } | null>(null);

  // Modal de Pesagem
  const [modalPesagemOpen, setModalPesagemOpen] = useState(false);
  const [produtoPesagem, setProdutoPesagem] = useState<Produto | null>(null);

  // Sistema de Caixa
  const { caixaAtual, loading: loadingCaixa, verificando, abrirCaixa, fecharCaixa, registrarSangria, registrarSuprimento } = useCaixa();
  const { isSupervisor } = usePermissoes();
  const [aberturaCaixaOpen, setAberturaCaixaOpen] = useState(false);
  const [sangriaOpen, setSangriaOpen] = useState(false);
  const [fechamentoCaixaOpen, setFechamentoCaixaOpen] = useState(false);
  const [cancelamentoOpen, setCancelamentoOpen] = useState(false);
  const [vendaCancelar, setVendaCancelar] = useState<{ id: string, numero: string } | null>(null);

  // Integração POS (CPF)
  const { conectar, desconectar, lerCPF, cancelar, cpf: cpfLido, conectado: posConectado, lendo: posLendo, erro: posErro, modo: posModo } = usePos();
  const [modalPosOpen, setModalPosOpen] = useState(false);

  // Efeito para atualizar CPF quando lido do POS
  useEffect(() => {
    if (cpfLido) {
      setCpfNotaAtual(cpfLido);
      toast({ title: "CPF lido da maquininha!", description: cpfLido });
    }
  }, [cpfLido]);

  const handleLerCpfPos = async () => {
    if (!posConectado) {
      setModalPosOpen(true);
      return;
    }

    const cpf = await lerCPF();
    if (!cpf && posErro) {
      toast({ title: "Erro na leitura", description: posErro, variant: "destructive" });
    }
  };

  const handleConectarPos = async (modo: PosMode) => {
    await conectar(modo);
    setModalPosOpen(false);
    // Tenta ler automaticamente após conectar
    setTimeout(() => handleLerCpfPos(), 500);
  };

  useEffect(() => {
    if (empresaId) {
      loadProdutos();
      loadClientes();
      loadVendasRecentes();
    }
  }, [empresaId]);

  // Focar no input de busca ao carregar
  useEffect(() => {
    if (buscaInputRef.current && caixaAtual) {
      buscaInputRef.current.focus();
    }
  }, [caixaAtual]);

  // Verificar se há caixa aberto e solicitar abertura se necessário
  useEffect(() => {
    if (!verificando && !caixaAtual && empresaId) {
      setAberturaCaixaOpen(true);
    }
  }, [verificando, caixaAtual, empresaId]);

  // Atalhos de Teclado para TEF
  useKeyboardShortcuts({
    onCPF: () => setCpfModalOpen(true),
    onDeleteLast: () => {
      if (carrinho.length > 0) {
        const ultimoItem = carrinho[carrinho.length - 1];
        removerItem(ultimoItem.produto.id);
      }
    },
    onProductManual: () => setProdutoManualOpen(true),
    onFinish: () => { if (carrinho.length > 0) finalizarVenda(); },
    onToggle: () => setKeyboardHelperOpen(prev => !prev),
    onCancel: () => setKeyboardHelperOpen(false),
    onEscape: () => {
      setCpfModalOpen(false);
      setKeyboardHelperOpen(false);
      setStatus('idle');
    },
    onPaymentDinheiro: () => {
      setFormaPagamento('dinheiro');
      toast({ title: '💵 Dinheiro selecionado' });
    },
    onPaymentDebito: () => {
      setFormaPagamento('debito');
      toast({ title: '💳 Débito selecionado' });
    },
    onPaymentCredito: () => {
      setFormaPagamento('credito');
      toast({ title: '💳 Crédito selecionado' });
    },
    onPaymentPix: () => {
      setFormaPagamento('pix');
      toast({ title: '📱 PIX selecionado' });
    },
    onPaymentFiado: () => {
      setFormaPagamento('fiado');
      toast({ title: '📝 Fiado selecionado' });
    },
  });

  const loadProdutos = async () => {
    if (!empresaId) return;

    const { data } = await supabase
      .from("produtos")
      .select("id, nome, preco_venda, estoque_atual, codigo_barras, sku, ncm, unidade")
      .eq("ativo", true)
      .eq("empresa_id", empresaId)
      .order("nome")
      .limit(200);

    if (data) setProdutos(data);
  };

  const loadClientes = async () => {
    if (!empresaId) return;

    const { data } = await supabase
      .from("clientes")
      .select("id, nome, cpf, cnpj")
      .eq("empresa_id", empresaId)
      .order("nome")
      .limit(100);

    if (data) setClientes(data);
  };

  const loadVendasRecentes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("vendas")
      .select("id, numero_venda, data_venda, total, forma_pagamento, status")
      .eq("operador_id", user.id)
      .order("data_venda", { ascending: false })
      .limit(10);

    if (data) setVendasRecentes(data);
  };

  const visualizarCupom = (vendaId: string) => {
    setCupomVendaId(vendaId);
    setCupomOpen(true);
  };

  const adicionarProduto = useCallback((produto: Produto) => {
    if (produto.estoque_atual <= 0) {
      toast({
        title: "Produto sem estoque",
        description: `O produto ${produto.nome} não possui estoque disponível.`,
        variant: "destructive",
      });
      return;
    }

    // Verificar se é produto pesável
    if (produto.unidade && produto.unidade.trim().toUpperCase() === 'KG') {
      setProdutoPesagem(produto);
      setModalPesagemOpen(true);
      return;
    }

    setCarrinho(prevCarrinho => {
      const itemExistente = prevCarrinho.find(item => item.produto.id === produto.id);

      if (itemExistente) {
        if (itemExistente.quantidade + 1 > produto.estoque_atual) {
          toast({
            title: "Estoque insuficiente",
            description: `Apenas ${produto.estoque_atual} unidades disponíveis.`,
            variant: "destructive",
          });
          return prevCarrinho;
        }

        // Marcar como último item adicionado para animação
        setUltimoItemAdicionado(produto.id);
        setTimeout(() => setUltimoItemAdicionado(null), 2000);

        return prevCarrinho.map(item =>
          item.produto.id === produto.id
            ? {
              ...item,
              quantidade: item.quantidade + 1,
              subtotal: (item.quantidade + 1) * item.preco_unitario
            }
            : item
        );
      } else {
        // Marcar como último item adicionado para animação
        setUltimoItemAdicionado(produto.id);
        setTimeout(() => setUltimoItemAdicionado(null), 2000);

        return [...prevCarrinho, {
          produto,
          quantidade: 1,
          preco_unitario: produto.preco_venda,
          subtotal: produto.preco_venda,
        }];
      }
    });
  }, []);

  const handleBuscaKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && busca) {
      // 1. Tentar encontrar na lista local carregada
      // Procura por código de barras exato
      const produtoLocal = produtos.find(p => p.codigo_barras === busca);

      if (produtoLocal) {
        adicionarProduto(produtoLocal);
        setBusca("");
        return;
      }

      // 2. Se não encontrar, buscar no banco (caso não esteja na lista de 200 iniciais)
      // Apenas se tiver um código de barras válido (pelo menos 3 caracteres para evitar buscas inúteis)
      if (busca.length < 3) return;

      try {
        const { data, error } = await supabase
          .from("produtos")
          .select("id, nome, preco_venda, estoque_atual, codigo_barras, sku, ncm, unidade")
          .eq("codigo_barras", busca)
          .eq("empresa_id", empresaId)
          .eq("ativo", true)
          .maybeSingle();

        if (data) {
          // Adiciona à lista local para facilitar próximas buscas e evitar refetch
          setProdutos(prev => {
            if (!prev.find(p => p.id === data.id)) {
              return [...prev, data];
            }
            return prev;
          });

          adicionarProduto(data);
          setBusca("");
          toast({ title: "Produto encontrado!" });
        } else {
          // Opcional: Tocar um som de erro ou apenas mostrar toast
          toast({ title: "Produto não encontrado", description: `Código: ${busca}`, variant: "destructive" });
        }
      } catch (error) {
        console.error("Erro ao buscar produto:", error);
      }
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
      preco_venda: preco,
      estoque_atual: 9999,
      unidade: produtoManual.unidade,
    };

    // Se for produto pesável (KG), abrir modal de pesagem
    if (produtoManual.unidade === 'KG') {
      setProdutoPesagem(produtoTemp);
      setModalPesagemOpen(true);
      setProdutoManualOpen(false);
      return;
    }

    // Produto normal (UN)
    setCarrinho([...carrinho, {
      produto: produtoTemp,
      quantidade,
      preco_unitario: preco,
      subtotal: preco * quantidade,
    }]);

    setProdutoManual({ nome: "", preco: "", quantidade: "1", unidade: "UN" });
    setProdutoManualOpen(false);
    toast({ title: "Produto adicionado ao carrinho!" });
  };

  const confirmarPesagem = (peso: number) => {
    if (!produtoPesagem) return;

    setCarrinho(prevCarrinho => {
      // Para produtos pesados, sempre adicionamos um novo item ou somamos ao existente?
      // Geralmente somamos se for o mesmo produto.
      const itemExistente = prevCarrinho.find(item => item.produto.id === produtoPesagem.id);

      if (itemExistente) {
        const novaQuantidade = itemExistente.quantidade + peso;
        if (novaQuantidade > produtoPesagem.estoque_atual) {
          toast({
            title: "Estoque insuficiente",
            description: `Apenas ${produtoPesagem.estoque_atual}kg disponíveis.`,
            variant: "destructive",
          });
          return prevCarrinho;
        }

        return prevCarrinho.map(item =>
          item.produto.id === produtoPesagem.id
            ? {
              ...item,
              quantidade: novaQuantidade,
              subtotal: novaQuantidade * item.preco_unitario
            }
            : item
        );
      } else {
        return [...prevCarrinho, {
          produto: produtoPesagem,
          quantidade: peso,
          preco_unitario: produtoPesagem.preco_venda,
          subtotal: peso * produtoPesagem.preco_venda
        }];
      }
    });

    setProdutoPesagem(null);
    toast({ title: "Produto pesado adicionado!" });
  };

  const alterarQuantidade = (produtoId: string, delta: number) => {
    setCarrinho(carrinho.map(item => {
      if (item.produto.id === produtoId) {
        const novaQuantidade = item.quantidade + delta;

        if (novaQuantidade <= 0) return item;

        // Verificar estoque apenas se estiver aumentando a quantidade
        if (delta > 0 && novaQuantidade > item.produto.estoque_atual) {
          toast({
            title: "Estoque insuficiente",
            description: `Apenas ${item.produto.estoque_atual} unidades disponíveis.`,
            variant: "destructive",
          });
          return item;
        }

        return {
          ...item,
          quantidade: novaQuantidade,
          subtotal: novaQuantidade * item.preco_unitario,
        };
      }
      return item;
    }));
  };

  const alterarPreco = (produtoId: string) => {
    const item = carrinho.find(i => i.produto.id === produtoId);
    if (item) {
      setEditandoPreco({ id: produtoId, preco: item.preco_unitario.toString() });
    }
  };

  const salvarPreco = () => {
    if (!editandoPreco) return;

    const novoPreco = parseFloat(editandoPreco.preco);
    if (isNaN(novoPreco) || novoPreco <= 0) {
      toast({ title: "Preço inválido", variant: "destructive" });
      return;
    }

    setCarrinho(carrinho.map(item =>
      item.produto.id === editandoPreco.id
        ? {
          ...item,
          preco_unitario: novoPreco,
          subtotal: item.quantidade * novoPreco
        }
        : item
    ));

    setEditandoPreco(null);
    toast({ title: "Preço atualizado!" });
  };

  const removerItem = (produtoId: string) => {
    setCarrinho(carrinho.filter(item => item.produto.id !== produtoId));
  };

  const calcularTotal = () => {
    return carrinho.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const { baixarEstoque } = useEstoque();
  const { registrarLog } = useAudit();

  const finalizarVenda = async () => {
    if (carrinho.length === 0) {
      toast({ title: "Carrinho vazio", variant: "destructive" });
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

      // Validar estoque disponível antes de criar a venda
      const itensReais = carrinho.filter(item => !item.produto.id.startsWith("manual-"));
      for (const item of itensReais) {
        const { data: produto } = await (supabase
          .from("produtos" as any) as any)
          .select("estoque_atual, nome")
          .eq("id", item.produto.id)
          .single();

        if (produto && (produto.estoque_atual || 0) < item.quantidade) {
          toast({
            title: "Estoque insuficiente",
            description: `${produto.nome}: disponível ${produto.estoque_atual || 0}, solicitado ${item.quantidade}`,
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
      }

      // Criar venda
      const { data: venda, error: vendaError } = await supabase
        .from("vendas")
        .insert([{
          operador_id: user.id,
          cliente_id: clienteId === "anonimo" ? null : clienteId,
          numero_venda: `VENDA-${Date.now()}`,
          subtotal: total,
          desconto: 0,
          total,
          forma_pagamento: formaPagamento,
          status: "finalizada",
          empresa_id: empresaId,
          caixa_id: caixaAtual?.id || null,
        }])
        .select()
        .single();

      if (vendaError) throw vendaError;

      // Criar itens da venda e baixar estoque
      if (itensReais.length > 0) {
        const itens = itensReais.map(item => ({
          venda_id: venda.id,
          produto_id: item.produto.id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          subtotal: item.subtotal,
        }));

        const { error: itensError } = await supabase
          .from("vendas_itens")
          .insert(itens);

        if (itensError) throw itensError;

        // Baixar estoque de cada produto
        for (const item of itensReais) {
          await baixarEstoque(
            item.produto.id,
            item.quantidade,
            'venda',
            venda.id,
            caixaAtual?.operador_id
          );
        }
      }

      // Registrar venda em auditoria
      await registrarLog({
        acao: 'venda_criada',
        entidade: 'vendas',
        entidade_id: venda.id,
        dados_depois: {
          numero_venda: venda.numero_venda,
          total: venda.total,
          forma_pagamento: venda.forma_pagamento,
          itens: carrinho.length
        },
        operador_id: caixaAtual?.operador_id
      });

      toast({
        title: "Venda finalizada!",
        description: `Total: ${formatCurrency(total)}${cpfNotaAtual ? ` - CPF: ${cpfNotaAtual}` : ""}`,
      });

      // Mostrar cupom automaticamente
      setCupomVendaId(venda.id);
      setCupomOpen(true);

      setCarrinho([]);
      setClienteId("anonimo");
      setCpfNotaAtual("");
      loadProdutos();
      loadVendasRecentes();

      // Focar no input novamente
      if (buscaInputRef.current) {
        buscaInputRef.current.focus();
      }
    } catch (error: any) {
      toast({
        title: "Erro ao finalizar venda",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const produtosFiltrados = useMemo(() => {
    if (!busca) return produtos.slice(0, 50);
    return produtos.filter(p =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.codigo_barras?.toLowerCase().includes(busca.toLowerCase()) ||
      p.sku?.toLowerCase().includes(busca.toLowerCase())
    );
  }, [produtos, busca]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-3 pb-4">
      {/* Barra de Pesquisa e Produto Manual + Atalhos */}
      <Card className="shadow-lg border-primary/10 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                ref={buscaInputRef}
                placeholder="Buscar produto ou código de barras..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={handleBuscaKeyDown}
                className="pl-10 h-11 border-primary/20 focus:border-primary text-base bg-background"
              />

              {/* Dropdown com sugestões - até 2 produtos */}
              {busca && produtosFiltrados.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-primary/20 rounded-lg shadow-lg z-50 overflow-hidden">
                  {produtosFiltrados.slice(0, 2).map((produto) => (
                    <button
                      key={produto.id}
                      onClick={() => {
                        adicionarProduto(produto);
                        setBusca("");
                        buscaInputRef.current?.focus();
                      }}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/10 transition-colors border-b border-border/50 last:border-0"
                    >
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-sm">{produto.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {produto.codigo_barras || "Sem código"}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          Est: {produto.estoque_atual || 0}
                        </span>
                        <span className="font-bold text-success text-base">
                          {formatCurrency(produto.preco_venda)}
                        </span>
                      </div>
                    </button>
                  ))}
                  {produtosFiltrados.length > 2 && (
                    <div className="px-4 py-2 text-xs text-center text-muted-foreground bg-muted/30">
                      +{produtosFiltrados.length - 2} produto(s) - pressione Enter
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setProdutoManualOpen(true)} className="shadow-sm h-11 px-6">
                <Plus className="h-4 w-4 mr-2" />
                Produto Manual
              </Button>
              <KeyboardHelper isOpen={keyboardHelperOpen} onToggle={() => setKeyboardHelperOpen(prev => !prev)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Carrinho - Agora em tela cheia */}
      <Card className="shadow-lg border-primary/10">
        <CardHeader className="pb-3 md:pb-4 bg-gradient-to-r from-success/5 to-transparent">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-success/20 flex items-center justify-center">
              <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-success" />
            </div>
            Carrinho ({carrinho.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0 px-3 md:px-6">
          {/* Card de Saldo do Caixa */}
          {caixaAtual && (
            <SaldoCaixa
              numeroCaixa={caixaAtual.numero_caixa}
              saldoInicial={caixaAtual.saldo_inicial}
              saldoAtual={caixaAtual.saldo_atual}
              status={caixaAtual.status}
            />
          )}

          {/* Botões de Sangria e Fechamento */}
          {caixaAtual && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSangriaOpen(true)}
                className="h-9 text-xs"
              >
                <ArrowDownCircle className="h-3 w-3 mr-1" />
                Sangria
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFechamentoCaixaOpen(true)}
                className="h-9 text-xs"
              >
                <Receipt className="h-3 w-3 mr-1" />
                Fechar Caixa
              </Button>
            </div>
          )}

          {/* Barra de Status Interativa */}
          <StatusBar status={status} />

          {/* Itens do Carrinho com Scroll - Expandido */}
          <div className="border rounded-xl border-primary/10 bg-card/50 flex flex-col" style={{ height: 'calc(100vh - 380px)', minHeight: '400px' }}>
            {carrinho.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mb-2 opacity-30" />
                <p className="text-sm font-medium">Carrinho vazio</p>
                <p className="text-xs">Adicione produtos para iniciar</p>
              </div>
            ) : (
              <>
                {/* Header com contador */}
                <div className="flex items-center justify-between p-2 border-b border-border/50 bg-muted/30 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                      {carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'}
                    </Badge>
                  </div>
                  {carrinho.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => setVerTodosItensOpen(true)}
                    >
                      Ver todos ({carrinho.length})
                    </Button>
                  )}
                </div>

                {/* Lista de itens com scroll (ordem reversa - últimos adicionados primeiro) */}
                <div ref={carrinhoScrollRef} className="divide-y divide-border/50 overflow-y-auto flex-1 custom-scrollbar">
                  {[...carrinho].reverse().map((item, index) => {
                    const isUltimoAdicionado = item.produto.id === ultimoItemAdicionado;
                    return (
                      <div
                        key={item.produto.id}
                        className={`px-2 py-1.5 transition-all duration-300 ${isUltimoAdicionado
                          ? 'bg-primary/5 border-l-2 border-l-primary shadow-[0_0_10px_hsl(73_100%_50%/0.2)] animate-in slide-in-from-right-2'
                          : index === 0
                            ? 'bg-muted/20'
                            : ''
                          }`}
                      >
                        {/* Tudo em uma linha: Nome | Qtd | Valor */}
                        <div className="flex items-center gap-2">
                          {/* Nome do Produto - compacto */}
                          <p className="text-[11px] font-medium flex-1 line-clamp-1 leading-tight min-w-0">
                            {item.produto.nome}
                          </p>

                          {/* Controles de Quantidade - compacto */}
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-5 w-5"
                              onClick={() => alterarQuantidade(item.produto.id, -1)}
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </Button>
                            <span className="text-xs font-medium min-w-[28px] text-center">
                              {item.quantidade.toFixed(item.produto.unidade === 'KG' ? 3 : 0)}
                            </span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-5 w-5"
                              onClick={() => alterarQuantidade(item.produto.id, 1)}
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </Button>
                          </div>

                          {/* Valor Total - compacto */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <p className={`text-sm font-bold ${isUltimoAdicionado ? 'text-primary' : 'text-success'} min-w-[60px] text-right`}>
                              {formatCurrency(item.subtotal)}
                            </p>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5 hover:bg-accent"
                              onClick={() => alterarPreco(item.produto.id)}
                            >
                              <Edit2 className="h-2.5 w-2.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5 hover:bg-destructive/10"
                              onClick={() => removerItem(item.produto.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Total e Finalização - Compacto */}
          <div className="space-y-2 pt-3 border-t border-primary/10">
            <div className="bg-gradient-primary rounded-lg p-2 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Total da Venda</span>
                <span className="text-lg font-bold">{formatCurrency(calcularTotal())}</span>
              </div>
            </div>

            <Button
              className="w-full h-9 text-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
              onClick={finalizarVenda}
              disabled={loading || carrinho.length === 0}
            >
              {loading ? (
                <>
                  <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <Receipt className="mr-2 h-3 w-3" />
                  Finalizar Venda
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>



      {/* Dialog Produto Manual */}
      <Dialog open={produtoManualOpen} onOpenChange={setProdutoManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Produto Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Produto</Label>
              <Input
                value={produtoManual.nome}
                onChange={(e) => setProdutoManual({ ...produtoManual, nome: e.target.value })}
                placeholder="Ex: Produto Avulso"
              />
            </div>
            <div>
              <Label>Preço Unitário (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={produtoManual.preco}
                onChange={(e) => setProdutoManual({ ...produtoManual, preco: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Unidade</Label>
              <Select value={produtoManual.unidade} onValueChange={(value) => setProdutoManual({ ...produtoManual, unidade: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UN">UN (Unidade)</SelectItem>
                  <SelectItem value="KG">KG (Quilograma)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade</Label>
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

      <ModalPesagem
        open={modalPesagemOpen}
        onOpenChange={setModalPesagemOpen}
        produto={produtoPesagem}
        onConfirmar={confirmarPesagem}
      />

      {/* Dialog Editar Preço */}
      <Dialog open={editandoPreco !== null} onOpenChange={(open) => !open && setEditandoPreco(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Preço do Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Novo Preço Unitário (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={editandoPreco?.preco || ""}
                onChange={(e) => editandoPreco && setEditandoPreco({ ...editandoPreco, preco: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditandoPreco(null)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={salvarPreco} className="flex-1">
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CupomFiscal
        vendaId={cupomVendaId}
        open={cupomOpen}
        onOpenChange={setCupomOpen}
      />

      {/* Modais do Sistema de Caixa */}
      <AberturaCaixa
        open={aberturaCaixaOpen}
        onOpenChange={setAberturaCaixaOpen}
        onConfirm={async (saldo, obs, opId) => {
          const success = await abrirCaixa(saldo, obs, opId);
          if (success) setAberturaCaixaOpen(false);
          return success;
        }}
        loading={loadingCaixa}
      />

      <ModalSangria
        open={sangriaOpen}
        onOpenChange={setSangriaOpen}
        onConfirmSangria={registrarSangria}
        onConfirmSuprimento={registrarSuprimento}
        saldoAtual={caixaAtual?.saldo_atual || 0}
        loading={loadingCaixa}
        isSupervisor={isSupervisor}
      />

      <FechamentoCaixa
        open={fechamentoCaixaOpen}
        onOpenChange={setFechamentoCaixaOpen}
        onConfirm={fecharCaixa}
        loading={loadingCaixa}
        isSupervisor={isSupervisor}
        caixaInfo={caixaAtual ? {
          numero_caixa: caixaAtual.numero_caixa,
          saldo_inicial: caixaAtual.saldo_inicial,
          saldo_atual: caixaAtual.saldo_atual,
          data_abertura: caixaAtual.data_abertura,
        } : null}
      />
      {/* Dialog para Conectar POS */}
      <Dialog open={modalPosOpen} onOpenChange={setModalPosOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar Maquininha para Ler CPF</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Escolha como conectar à maquininha para ler o CPF do cliente:
            </p>
            <div className="grid gap-3">
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => handleConectarPos('serial')}
              >
                <Usb className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">USB / Serial</div>
                  <div className="text-xs text-muted-foreground">Pinpad conectado via USB</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => handleConectarPos('api')}
              >
                <Globe className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">API Local</div>
                  <div className="text-xs text-muted-foreground">Smart POS ou TEF via API</div>
                </div>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para Ver Todos os Itens do Carrinho */}
      <Dialog open={verTodosItensOpen} onOpenChange={setVerTodosItensOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Todos os Itens do Carrinho ({carrinho.length})
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <div className="divide-y divide-border">
              {carrinho.map((item) => (
                <div key={item.produto.id} className="px-3 py-2 hover:bg-muted/50 transition-colors">
                  {/* Layout compacto em uma linha: Nome | Qtd | Valor */}
                  <div className="flex items-center gap-3">
                    {/* Nome do Produto */}
                    <p className="text-sm font-medium flex-1 line-clamp-1 min-w-0">{item.produto.nome}</p>

                    {/* Controles de Quantidade */}
                    <div className="flex items-center gap-1 flex-shrink-0">
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
                        min="0.001"
                        step={item.produto.unidade === 'KG' ? "0.001" : "1"}
                        value={item.quantidade}
                        onChange={(e) => {
                          const novaQtd = parseFloat(e.target.value) || 0;
                          setCarrinho(carrinho.map(i =>
                            i.produto.id === item.produto.id
                              ? { ...i, quantidade: novaQtd, subtotal: novaQtd * i.preco_unitario }
                              : i
                          ));
                        }}
                        className="w-16 h-6 text-center text-sm p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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

                    {/* Valor e Ações */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <p className="text-base font-bold text-success min-w-[70px] text-right">
                        {formatCurrency(item.subtotal)}
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 hover:bg-accent"
                        onClick={() => {
                          alterarPreco(item.produto.id);
                          setVerTodosItensOpen(false);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 hover:bg-destructive/10"
                        onClick={() => {
                          removerItem(item.produto.id);
                          if (carrinho.length <= 1) setVerTodosItensOpen(false);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t pt-4 mt-2">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-primary">{formatCurrency(calcularTotal())}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Cancelamento de Venda */}
      {
        vendaCancelar && (
          <CancelamentoVenda
            open={cancelamentoOpen}
            onOpenChange={setCancelamentoOpen}
            vendaId={vendaCancelar.id}
            vendaNumero={vendaCancelar.numero}
            onSuccess={() => {
              loadVendasRecentes();
              setVendaCancelar(null);
            }}
          />
        )}

      {/* Modal CPF na Nota */}
      <Dialog open={cpfModalOpen} onOpenChange={setCpfModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>CPF na Nota</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>CPF do Cliente</Label>
              <InputMask mask={masks.cpf} value={cpfNotaAtual} onChange={(e) => setCpfNotaAtual(e.target.value)}>
                {(inputProps: any) => (
                  <Input {...inputProps} placeholder="000.000.000-00" className="mt-2" />
                )}
              </InputMask>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCpfModalOpen(false)} className="flex-1">Cancelar</Button>
              <Button onClick={() => { setCpfModalOpen(false); setStatus('idle'); }} className="flex-1">Confirmar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
