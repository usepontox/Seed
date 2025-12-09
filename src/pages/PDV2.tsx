import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Minus, Trash2, ShoppingCart, Receipt, Edit2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEmpresa } from "@/hooks/use-empresa";
import { useCaixa } from "@/hooks/use-caixa";
import { useEstoque } from "@/hooks/use-estoque";
import { SimplifiedHeaderPDV } from "@/components/pdv/SimplifiedHeaderPDV";
import { SeletorPagamento } from "@/components/pdv/SeletorPagamento";
import { FooterAtalhos } from "@/components/pdv/FooterAtalhos";
import { StatusBar, type StatusType } from "@/components/pdv/StatusBar";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import SaldoCaixa from "@/components/pdv/SaldoCaixa";
import AberturaCaixa from "@/components/pdv/AberturaCaixa";
import CupomFiscal from "@/components/CupomFiscal";

interface Produto {
    id: string;
    nome: string;
    preco_venda: number;
    estoque_atual: number;
    codigo_barras?: string;
    sku?: string;
}

interface ItemVenda {
    produto: Produto;
    quantidade: number;
    preco_unitario: number;
    subtotal: number;
}

export default function PDV2() {
    const { toast } = useToast();
    const { empresaId } = useEmpresa();
    const { caixaAtual, abrirCaixa } = useCaixa();
    const { atualizarEstoque } = useEstoque();

    // Estados
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [busca, setBusca] = useState("");
    const [carrinho, setCarrinho] = useState<ItemVenda[]>([]);
    const [formaPagamento, setFormaPagamento] = useState<string>("dinheiro");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<StatusType>('idle');

    // Modals
    const [produtoManualOpen, setProdutoManualOpen] = useState(false);
    const [cupomOpen, setCupomOpen] = useState(false);
    const [cupomVendaId, setCupomVendaId] = useState<string | null>(null);

    // Refs
    const buscaInputRef = useRef<HTMLInputElement>(null);
    const carrinhoScrollRef = useRef<HTMLDivElement>(null);

    // Produto Manual
    const [produtoManual, setProdutoManual] = useState({
        nome: "",
        preco: "",
        quantidade: "1"
    });

    // Carregar produtos
    useEffect(() => {
        if (empresaId) {
            loadProdutos();
        }
    }, [empresaId]);

    const loadProdutos = async () => {
        const { data, error } = await supabase
            .from("produtos")
            .select("*")
            .eq("empresa_id", empresaId!)
            .eq("ativo", true)
            .order("nome");

        if (error) {
            console.error("Erro ao carregar produtos:", error);
        } else {
            setProdutos(data || []);
        }
    };

    // Filtrar produtos
    const produtosFiltrados = useMemo(() => {
        if (!busca) return [];
        return produtos.filter(p =>
            p.nome.toLowerCase().includes(busca.toLowerCase()) ||
            p.codigo_barras?.toLowerCase().includes(busca.toLowerCase()) ||
            p.sku?.toLowerCase().includes(busca.toLowerCase())
        ).slice(0, 5);
    }, [produtos, busca]);

    // FUNCIONALIDADES PRINCIPAIS

    const adicionarProduto = (produto: Produto) => {
        const itemExistente = carrinho.find(item => item.produto.id === produto.id);

        if (itemExistente) {
            setCarrinho(carrinho.map(item =>
                item.produto.id === produto.id
                    ? { ...item, quantidade: item.quantidade + 1, subtotal: (item.quantidade + 1) * item.preco_unitario }
                    : item
            ));
        } else {
            setCarrinho([...carrinho, {
                produto,
                quantidade: 1,
                preco_unitario: produto.preco_venda,
                subtotal: produto.preco_venda
            }]);
        }

        setBusca("");
        buscaInputRef.current?.focus();

        // Auto-scroll para o topo
        setTimeout(() => {
            carrinhoScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);

        toast({
            title: "✅ Produto adicionado",
            description: produto.nome,
        });
    };

    const adicionarProdutoManual = () => {
        if (!produtoManual.nome || !produtoManual.preco) {
            toast({
                title: "⚠️ Preencha todos os campos",
                variant: "destructive"
            });
            return;
        }

        const produtoTemp: Produto = {
            id: `manual-${Date.now()}`,
            nome: produtoManual.nome,
            preco_venda: parseFloat(produtoManual.preco),
            estoque_atual: 999,
        };

        adicionarProduto(produtoTemp);
        setProdutoManualOpen(false);
        setProdutoManual({ nome: "", preco: "", quantidade: "1" });
    };

    const removerItem = (index: number) => {
        setCarrinho(carrinho.filter((_, i) => i !== index));
        toast({ title: "🗑️ Item removido" });
    };

    const alterarQuantidade = (index: number, delta: number) => {
        setCarrinho(carrinho.map((item, i) => {
            if (i === index) {
                const novaQtd = Math.max(1, item.quantidade + delta);
                return {
                    ...item,
                    quantidade: novaQtd,
                    subtotal: novaQtd * item.preco_unitario
                };
            }
            return item;
        }));
    };

    const calcularTotal = () => {
        return carrinho.reduce((sum, item) => sum + item.subtotal, 0);
    };

    const finalizarVenda = async () => {
        if (carrinho.length === 0) {
            toast({ title: "⚠️ Carrinho vazio", variant: "destructive" });
            return;
        }

        if (!caixaAtual) {
            toast({ title: "⚠️ Caixa não aberto", variant: "destructive" });
            return;
        }

        setLoading(true);
        setStatus('processing');

        try {
            // Criar venda
            const { data: venda, error: vendaError } = await supabase
                .from("vendas")
                .insert({
                    empresa_id: empresaId,
                    caixa_id: caixaAtual.id,
                    total: calcularTotal(),
                    forma_pagamento: formaPagamento,
                    status: "finalizada",
                    data_venda: new Date().toISOString()
                })
                .select()
                .single();

            if (vendaError) throw vendaError;

            // Inserir itens
            const itens = carrinho.map(item => ({
                venda_id: venda.id,
                produto_id: item.produto.id.startsWith('manual-') ? null : item.produto.id,
                produto_nome: item.produto.nome,
                quantidade: item.quantidade,
                preco_unitario: item.preco_unitario,
                subtotal: item.subtotal
            }));

            const { error: itensError } = await supabase
                .from("vendas_itens")
                .insert(itens);

            if (itensError) throw itensError;

            // Atualizar estoque
            for (const item of carrinho) {
                if (!item.produto.id.startsWith('manual-')) {
                    await atualizarEstoque(item.produto.id, -item.quantidade, 'venda', venda.id);
                }
            }

            setStatus('success');
            toast({
                title: "✅ Venda finalizada!",
                description: `Total: ${formatCurrency(calcularTotal())}`
            });

            // Abrir cupom
            setCupomVendaId(venda.id);
            setCupomOpen(true);

            // Limpar carrinho
            setCarrinho([]);
            setBusca("");

        } catch (error: any) {
            console.error("Erro ao finalizar venda:", error);
            setStatus('error');
            toast({
                title: "❌ Erro ao finalizar venda",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
            setTimeout(() => setStatus('idle'), 2000);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    // Atalhos de teclado
    const handleBuscaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && produtosFiltrados.length > 0) {
            adicionarProduto(produtosFiltrados[0]);
        }
    };

    useKeyboardShortcuts({
        onFocusSearch: () => buscaInputRef.current?.focus(),
        onPaymentDinheiro: () => setFormaPagamento('dinheiro'),
        onPaymentDebito: () => setFormaPagamento('debito'),
        onPaymentCredito: () => setFormaPagamento('credito'),
        onPaymentPix: () => setFormaPagamento('pix'),
        onPaymentFiado: () => setFormaPagamento('fiado'),
        onFinalizeSale: () => finalizarVenda(),
    });

    // Se caixa não aberto, mostrar tela de abertura
    if (!caixaAtual) {
        return <AberturaCaixa onCaixaAberto={abrirCaixa} />;
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            {/* Header */}
            <SimplifiedHeaderPDV />

            {/* Container Principal - Grid 2 Colunas */}
            <div className="flex-1 grid grid-cols-[30%_1fr] overflow-hidden">

                {/* ========== COLUNA ESQUERDA - Painel de Controles ========== */}
                <div className="border-r border-border bg-muted/5 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">

                    {/* Busca de Produto */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                            Buscar [F2]
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                            <Input
                                ref={buscaInputRef}
                                placeholder="Código ou nome..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                onKeyDown={handleBuscaKeyDown}
                                className="pl-10 h-14 border-primary/30 focus:border-primary text-base font-medium"
                                autoFocus
                            />

                            {/* Dropdown com sugestões */}
                            {busca && produtosFiltrados.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-primary/20 rounded-lg shadow-xl z-50 max-h-[350px] overflow-y-auto custom-scrollbar">
                                    {produtosFiltrados.map((produto) => (
                                        <button
                                            key={produto.id}
                                            onClick={() => adicionarProduto(produto)}
                                            className="w-full px-3 py-3 hover:bg-primary/10 flex items-center justify-between gap-2 border-b border-border/50 last:border-0 transition-all text-left"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-sm truncate">{produto.nome}</div>
                                                <div className="text-xs text-muted-foreground truncate">
                                                    {produto.codigo_barras || "Sem código"}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end flex-shrink-0">
                                                <span className="font-bold text-success text-base">
                                                    {formatCurrency(produto.preco_venda)}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    Est: {produto.estoque_atual}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quantidade (placeholder visual) */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                            Quantidade
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-14 px-4 flex items-center justify-center bg-muted/30 rounded-lg border border-border">
                                <span className="text-2xl font-bold">1</span>
                            </div>
                            <Button size="icon" variant="outline" className="h-14 w-14">
                                <Plus className="h-5 w-5" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-14 w-14">
                                <Minus className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Valor Unitário (placeholder) */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                            Valor Unit.
                        </label>
                        <div className="h-14 px-4 flex items-center justify-between bg-muted/30 rounded-lg border border-border">
                            <span className="text-xl font-bold">R$ 0,00</span>
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>

                    {/* Subtotal */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                            Subtotal
                        </label>
                        <div className="h-14 px-4 flex items-center bg-primary/10 rounded-lg border border-primary/30">
                            <span className="text-2xl font-bold text-primary">
                                {formatCurrency(calcularTotal())}
                            </span>
                        </div>
                    </div>

                    {/* Botão Produto Manual */}
                    <Button
                        onClick={() => setProdutoManualOpen(true)}
                        className="w-full h-12 text-base font-semibold"
                        variant="outline"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Produto Manual
                    </Button>

                </div>

                {/* ========== COLUNA DIREITA - Carrinho e Checkout ========== */}
                <div className="flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">

                        {/* Saldo do Caixa */}
                        <div className="mb-4">
                            <SaldoCaixa
                                numeroCaixa={caixaAtual.numero_caixa}
                                saldoInicial={caixaAtual.saldo_inicial}
                                onSangriaClick={() => { }}
                            />
                        </div>

                        {/* Barra de Status */}
                        <StatusBar status={status} />

                        {/* Carrinho */}
                        <div className="mt-4 border rounded-xl border-primary/10 bg-card flex flex-col" style={{ minHeight: '500px' }}>
                            {carrinho.length === 0 ? (
                                <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground py-20">
                                    <ShoppingCart className="h-20 w-20 mb-4 opacity-20" />
                                    <p className="text-xl font-medium">Carrinho vazio</p>
                                    <p className="text-sm">Adicione produtos para iniciar</p>
                                </div>
                            ) : (
                                <>
                                    {/* Header */}
                                    <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                                        <div className="flex items-center gap-2">
                                            <ShoppingCart className="h-5 w-5 text-primary" />
                                            <Badge className="bg-primary/20 text-primary">
                                                {carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Lista de itens */}
                                    <div ref={carrinhoScrollRef} className="flex-1 divide-y divide-border/50 overflow-y-auto custom-scrollbar">
                                        {[...carrinho].reverse().map((item, index) => {
                                            const realIndex = carrinho.length - 1 - index;
                                            return (
                                                <div key={realIndex} className="p-3 hover:bg-muted/30 transition-colors">
                                                    <div className="flex items-center justify-between gap-3">
                                                        {/* Info do produto */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-semibold text-sm truncate">{item.produto.nome}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {item.quantidade}x {formatCurrency(item.preco_unitario)}
                                                            </div>
                                                        </div>

                                                        {/* Controles */}
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7"
                                                                onClick={() => alterarQuantidade(realIndex, -1)}
                                                            >
                                                                <Minus className="h-3 w-3" />
                                                            </Button>
                                                            <span className="text-lg font-bold min-w-[40px] text-center">
                                                                {item.quantidade}
                                                            </span>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7"
                                                                onClick={() => alterarQuantidade(realIndex, 1)}
                                                            >
                                                                <Plus className="h-3 w-3" />
                                                            </Button>
                                                        </div>

                                                        {/* Subtotal e remover */}
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-base font-bold text-success min-w-[90px] text-right">
                                                                {formatCurrency(item.subtotal)}
                                                            </span>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                                onClick={() => removerItem(realIndex)}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Seletor de Pagamento */}
                                    <div className="p-4 border-t border-border">
                                        <SeletorPagamento
                                            formaPagamento={formaPagamento}
                                            onSelect={setFormaPagamento}
                                        />
                                    </div>

                                    {/* Total e Finalizar */}
                                    <div className="p-4 border-t border-border space-y-3">
                                        <div className="bg-gradient-to-r from-primary/20 to-success/20 rounded-lg p-4 border border-primary/30">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-foreground">Total da Venda</span>
                                                <span className="text-3xl font-bold text-primary">{formatCurrency(calcularTotal())}</span>
                                            </div>
                                        </div>

                                        <Button
                                            className="w-full h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                                            onClick={finalizarVenda}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                                                    Processando...
                                                </>
                                            ) : (
                                                <>
                                                    <Receipt className="mr-2 h-5 w-5" />
                                                    Finalizar Venda - F9
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <FooterAtalhos />

            {/* Dialog Produto Manual */}
            <Dialog open={produtoManualOpen} onOpenChange={setProdutoManualOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adicionar Produto Manual</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div>
                            <label className="text-sm font-medium">Nome do Produto</label>
                            <Input
                                value={produtoManual.nome}
                                onChange={(e) => setProdutoManual({ ...produtoManual, nome: e.target.value })}
                                placeholder="Ex: Produto avulso"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Preço</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={produtoManual.preco}
                                onChange={(e) => setProdutoManual({ ...produtoManual, preco: e.target.value })}
                                placeholder="0.00"
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

            {/* Dialog Cupom Fiscal */}
            <Dialog open={cupomOpen} onOpenChange={setCupomOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Cupom Fiscal</DialogTitle>
                    </DialogHeader>
                    {cupomVendaId && <CupomFiscal vendaId={cupomVendaId} />}
                </DialogContent>
            </Dialog>
        </div>
    );
}
