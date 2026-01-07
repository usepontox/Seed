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
import { ModalPagamentoPix } from "@/components/pdv/ModalPagamentoPix";

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
  const [cpfNota, setCpfNota] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<string>("dinheiro");
  const [loading, setLoading] = useState(false);
  const [vendasRecentes, setVendasRecentes] = useState<VendaRecente[]>([]);
  const [cupomVendaId, setCupomVendaId] = useState<string | null>(null);
  const [cupomOpen, setCupomOpen] = useState(false);

  const buscaInputRef = useRef<HTMLInputElement>(null);
  const carrinhoScrollRef = useRef<HTMLDivElement>(null);

  // Estado para efeito visual do último item
  const [ultimoItemAdicionado, setUltimoItemAdicionado] = useState<string | null>(null);

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

  // PIX - Mercado Pago
  const [modalPixOpen, setModalPixOpen] = useState(false);
  const [pixConfigAtiva, setPixConfigAtiva] = useState(false);
  const [vendaIdPix, setVendaIdPix] = useState<string | null>(null);

  // Efeito para atualizar CPF quando lido do POS
  useEffect(() => {
    if (cpfLido) {
      setCpfNota(cpfLido);
      toast({ title: "CPF lido da maquininha!", description: cpfLido });
    }
  }, [cpfLido]);

  // Verificar se empresa tem PIX ativo
  useEffect(() => {
    const verificarConfigPix = async () => {
      if (!empresaId) return

      try {
        const { data } = await supabase
          .from('configuracoes_pix' as any)
          .select('ativo')
          .eq('empresa_id', empresaId)
          .eq('ativo', true)
          .maybeSingle()

        setPixConfigAtiva(!!data)
      } catch (error) {
        // Tabela ainda não existe, PIX desativado
        setPixConfigAtiva(false)
      }
    }

    verificarConfigPix()
  }, [empresaId])

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

  // Scroll automático para o último item adicionado
  useEffect(() => {
    if (ultimoItemAdicionado) {
      const element = document.getElementById(`item-${ultimoItemAdicionado}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [ultimoItemAdicionado, carrinho.length]);

  // Verificar se há caixa aberto e solicitar abertura se necessário
  useEffect(() => {
    if (!verificando && !caixaAtual && empresaId) {
      setAberturaCaixaOpen(true);
    }
  }, [verificando, caixaAtual, empresaId]);

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

  // Criar venda para PIX automático
  const criarVendaParaPix = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (!empresaId) {
        toast({ title: "Erro", description: "Empresa não identificada", variant: "destructive" });
        setLoading(false);
        return;
      }

      const total = calcularTotal();

      // Validar estoque
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

      // Criar venda com status pendente
      const { data: venda, error: vendaError } = await supabase
        .from("vendas")
        .insert([{
          operador_id: user.id,
          cliente_id: clienteId === "anonimo" ? null : clienteId,
          numero_venda: `VENDA-${Date.now()}`,
          subtotal: total,
          desconto: 0,
          total,
          forma_pagamento: 'pix',
          status: "pendente",
          empresa_id: empresaId,
          caixa_id: caixaAtual?.id || null,
        }])
        .select()
        .single();

      if (vendaError) throw vendaError;

      // Criar itens da venda
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
      }

      // Salvar ID da venda e abrir modal PIX
      setVendaIdPix(venda.id);
      setModalPixOpen(true);
      setLoading(false);

    } catch (error: any) {
      console.error("Erro ao criar venda para PIX:", error);
      toast({ title: "Erro ao criar venda", description: error.message, variant: "destructive" });
      setLoading(false);
    }
  };

  const finalizarVenda = async () => {
    if (carrinho.length === 0) {
      toast({ title: "Carrinho vazio", variant: "destructive" });
      return;
    }

    // Verificar se é PIX e se tem configuração ativa
    if (formaPagamento === 'pix' && pixConfigAtiva) {
      // Perguntar se quer usar PIX automático
      const usarAutomatico = window.confirm(
        'Deseja gerar QR Code automático via Mercado Pago?\n\n' +
        'Sim = QR Code automático\n' +
        'Não = Registrar PIX manual'
      )

      if (usarAutomatico) {
        // Criar venda primeiro, depois abrir modal PIX
        await criarVendaParaPix()
        return
      }
      // Se não, continua fluxo normal (PIX manual)
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
        description: `Total: ${formatCurrency(total)}${cpfNota ? ` - CPF: ${cpfNota}` : ""}`,
      });

      // Mostrar cupom automaticamente
      setCupomVendaId(venda.id);
      setCupomOpen(true);

      setCarrinho([]);
      setClienteId("anonimo");
      setCpfNota("");
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
    <div className="space-y-4 md:space-y-6 pb-4">
      <div className="grid gap-4 md:gap-6 lg:grid-cols-[1fr_3fr] h-full">


        {/* Produtos */}
        <Card className="shadow-lg border-primary/10">
          <CardHeader className="pb-3 md:pb-4 bg-gradient-to-r from-primary/5 to-transparent pt-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                <Input
                  ref={buscaInputRef}
                  placeholder="Buscar..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={handleBuscaKeyDown}
                  className="pl-9 md:pl-10 h-10 md:h-11 border-primary/20 focus:border-primary text-sm md:text-base"
                />
              </div>
              <Button size="icon" onClick={() => setProdutoManualOpen(true)} className="shadow-sm h-10 w-10 md:h-11 md:w-11 shrink-0" title="Produto Manual">
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-3 md:px-6">
            <div className="max-h-[500px] md:max-h-[calc(100vh-180px)] overflow-auto space-y-2 pr-1 md:pr-2">
              {produtosFiltrados.length === 0 ? (
                <div className="text-center py-8 md:py-12">
                  <Package className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm md:text-base text-muted-foreground font-medium">
                    Nenhum produto encontrado
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">
                    {busca ? "Tente buscar com outros termos" : "Digite para buscar produtos"}
                  </p>
                </div>
              ) : (
                produtosFiltrados.map(produto => (
                  <ProdutoItem
                    key={produto.id}
                    produto={produto}
                    onAdd={adicionarProduto}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Carrinho */}
        <Card className="shadow-lg border-primary/10">
          <CardContent className="space-y-3 pt-4 px-3 md:px-6">
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

            {/* Cliente */}
            <div>
              <Label className="text-xs md:text-sm">Cliente (opcional)</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger className="mt-1 h-10 md:h-11">
                  <SelectValue placeholder="Venda Anônima" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anonimo">Venda Anônima</SelectItem>
                  {clientes.map(cliente => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* CPF/CNPJ do Cliente */}
            {clienteId !== "anonimo" && (
              <div>
                <Label className="text-xs md:text-sm">CPF/CNPJ do Cliente</Label>
                <Input
                  value={
                    clientes.find(c => c.id === clienteId)?.cpf ||
                    clientes.find(c => c.id === clienteId)?.cnpj ||
                    ""
                  }
                  disabled
                  className="mt-1 h-10 md:h-11 bg-muted"
                />
              </div>
            )}

            {/* CPF na Nota (quando anônimo) */}
            {clienteId === "anonimo" && (
              <div>
                <Label className="text-xs md:text-sm">CPF na Nota (opcional)</Label>
                <InputMask
                  mask={masks.cpf}
                  value={cpfNota}
                  onChange={(e) => setCpfNota(e.target.value)}
                >
                  {(inputProps: any) => (
                    <div className="flex gap-2">
                      <Input {...inputProps} placeholder="000.000.000-00" className="mt-1 h-10 md:h-11 flex-1" />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={posConectado ? "default" : "outline"}
                              size="icon"
                              className={`mt-1 h-10 w-10 md:h-11 md:w-11 ${posLendo ? "animate-pulse" : ""}`}
                              onClick={handleLerCpfPos}
                              disabled={posLendo}
                            >
                              {posLendo ? (
                                <Clock className="h-4 w-4 animate-spin" />
                              ) : (
                                <CreditCard className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{posConectado ? `Ler da Maquininha (${posModo === 'serial' ? 'USB' : 'API'})` : "Conectar Maquininha"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </InputMask>
              </div>
            )}

            {/* Itens do Carrinho */}
            <div className="border rounded-xl border-primary/10">
              <div ref={carrinhoScrollRef} className="max-h-[350px] md:max-h-[calc(100vh-450px)] min-h-[120px] md:min-h-[150px] overflow-auto custom-scrollbar">
                {carrinho.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[120px] md:h-[150px] text-muted-foreground">
                    <ShoppingCart className="h-10 w-10 md:h-12 md:w-12 mb-2 opacity-30" />
                    <p className="text-xs md:text-sm font-medium">Carrinho vazio</p>
                    <p className="text-[10px] md:text-xs">Adicione produtos para iniciar</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {carrinho.map(item => (
                      <div
                        key={item.produto.id}
                        id={`item-${item.produto.id}`}
                        className={`py-1 px-2 flex items-center justify-between gap-2 transition-colors duration-500 border-b border-border/50 last:border-0 ${ultimoItemAdicionado === item.produto.id ? "bg-primary/20 border-l-2 border-primary" : "hover:bg-muted/50"}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${ultimoItemAdicionado === item.produto.id ? "text-primary font-bold" : ""}`}>
                            {item.produto.nome}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center bg-muted/50 rounded-md border text-[10px] h-5">
                            <button
                              className="w-5 h-full flex items-center justify-center hover:bg-muted active:scale-95 text-muted-foreground transition-colors"
                              onClick={() => alterarQuantidade(item.produto.id, -1)}
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                            <span className="min-w-[1.5rem] text-center font-medium border-x border-border/50 h-full flex items-center justify-center bg-background px-1 text-xs">{item.quantidade}</span>
                            <button
                              className="w-5 h-full flex items-center justify-center hover:bg-muted active:scale-95 text-muted-foreground transition-colors"
                              onClick={() => alterarQuantidade(item.produto.id, 1)}
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                          </div>

                          <div className="text-right min-w-[50px]">
                            <p className="text-xs font-bold text-success">{formatCurrency(item.subtotal)}</p>
                          </div>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 text-muted-foreground hover:text-destructive"
                            onClick={() => removerItem(item.produto.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pagamento e Total */}
            <div className="space-y-3 md:space-y-4 pt-3 md:pt-4 border-t border-primary/10">
              <div>
                <Label className="text-xs md:text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="h-3 w-3 md:h-4 md:w-4" />
                  Forma de Pagamento
                </Label>
                <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                  <SelectTrigger className="mt-2 h-10 md:h-11 border-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">💵 Dinheiro</SelectItem>
                    <SelectItem value="debito">💳 Débito</SelectItem>
                    <SelectItem value="credito">💳 Crédito</SelectItem>
                    <SelectItem value="pix">📱 PIX</SelectItem>
                    <SelectItem value="fiado">📝 Fiado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-gradient-primary rounded-xl p-3 md:p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm md:text-lg font-medium">Total da Venda</span>
                  <span className="text-2xl md:text-3xl font-bold">{formatCurrency(calcularTotal())}</span>
                </div>
              </div>

              <Button
                className="w-full h-12 md:h-14 text-base md:text-lg font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
                onClick={finalizarVenda}
                disabled={loading || carrinho.length === 0}
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 md:h-5 md:w-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Receipt className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                    Finalizar Venda
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendas Recentes */}
      <Card className="shadow-lg border-primary/10">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-3 md:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Clock className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
            Vendas Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs md:text-sm">Nº Venda</TableHead>
                  <TableHead className="text-xs md:text-sm hidden md:table-cell">Data/Hora</TableHead>
                  <TableHead className="text-xs md:text-sm">Total</TableHead>
                  <TableHead className="text-xs md:text-sm hidden sm:table-cell">Pagamento</TableHead>
                  <TableHead className="text-xs md:text-sm">Status</TableHead>
                  <TableHead className="text-xs md:text-sm text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendasRecentes.map((venda) => (
                  <TableRow key={venda.id}>
                    <TableCell className="font-medium text-xs md:text-sm">{venda.numero_venda}</TableCell>
                    <TableCell className="text-xs md:text-sm hidden md:table-cell">{formatDate(venda.data_venda)}</TableCell>
                    <TableCell className="font-bold text-success text-xs md:text-sm">
                      {formatCurrency(venda.total)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs">{venda.forma_pagamento.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          venda.status === "finalizada"
                            ? "default"
                            : venda.status === "cancelada"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-xs"
                      >
                        {venda.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 md:h-9"
                          onClick={() => visualizarCupom(venda.id)}
                        >
                          <Receipt className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                          <span className="hidden md:inline">Cupom</span>
                        </Button>
                        {venda.status === 'finalizada' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 md:h-9 text-destructive hover:text-destructive"
                            onClick={() => {
                              setVendaCancelar({ id: venda.id, numero: venda.numero_venda });
                              setCancelamentoOpen(true);
                            }}
                          >
                            <XCircle className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                            <span className="hidden md:inline">Cancelar</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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

      <ModalPagamentoPix
        open={modalPixOpen}
        onClose={() => setModalPixOpen(false)}
        vendaId={vendaIdPix || ''}
        valor={calcularTotal()}
        empresaId={empresaId || ''}
        onSuccess={() => {
          // Limpar carrinho e recarregar vendas
          setCarrinho([])
          setClienteId('anonimo')
          setCpfNota('')
          loadVendasRecentes()
          toast({ title: 'Venda finalizada com sucesso!' })
        }}
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
      {/* Modal de Seleção de Modo POS */}
      <Dialog open={modalPosOpen} onOpenChange={setModalPosOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar Maquininha (POS)</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary"
              onClick={() => handleConectarPos('serial')}
            >
              <Usb className="h-8 w-8 text-primary" />
              <span className="font-semibold">Cabo USB</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                Pinpads via USB
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary"
              onClick={() => handleConectarPos('api')}
            >
              <Globe className="h-8 w-8 text-primary" />
              <span className="font-semibold">Rede / API</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                Smart POS ou API
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Cancelamento de Venda */}
      {vendaCancelar && (
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
    </div>
  );
}
