import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Minus, Edit2 } from 'lucide-react';

interface PainelEntradaProps {
    busca: string;
    setBusca: (value: string) => void;
    handleBuscaKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    buscaInputRef: React.RefObject<HTMLInputElement>;
    quantidade: number;
    setQuantidade: (value: number) => void;
    valorUnitario: number;
    subtotalCarrinho: number;
    onProdutoManual: () => void;
    produtosFiltrados: any[];
    onAdicionarProduto: (produto: any) => void;
    formatCurrency: (value: number) => string;
}

export function PainelEntrada({
    busca,
    setBusca,
    handleBuscaKeyDown,
    buscaInputRef,
    quantidade,
    setQuantidade,
    valorUnitario,
    subtotalCarrinho,
    onProdutoManual,
    produtosFiltrados,
    onAdicionarProduto,
    formatCurrency,
}: PainelEntradaProps) {
    return (
        <div className="space-y-4">
            {/* Campo de Busca Grande */}
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
                        className="pl-10 h-14 border-primary/30 focus:border-primary text-lg font-medium bg-background"
                    />

                    {/* Dropdown com sugestões */}
                    {busca && produtosFiltrados.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-primary/20 rounded-lg shadow-lg z-50 overflow-hidden max-h-[200px] overflow-y-auto custom-scrollbar">
                            {produtosFiltrados.slice(0, 3).map((produto) => (
                                <button
                                    key={produto.id}
                                    onClick={() => {
                                        onAdicionarProduto(produto);
                                        setBusca('');
                                    }}
                                    className="w-full px-3 py-2 hover:bg-primary/10 flex items-center justify-between gap-2 border-b border-border/50 last:border-0 transition-colors text-left"
                                >
                                    <div className="flex-1">
                                        <div className="font-semibold text-xs">{produto.nome}</div>
                                        <div className="text-[10px] text-muted-foreground">
                                            {produto.codigo_barras || "Sem código"}
                                        </div>
                                    </div>
                                    <span className="font-bold text-success text-sm">
                                        {formatCurrency(produto.preco_venda)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Controles de Quantidade */}
            <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                    Quantidade
                </label>
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        value={quantidade}
                        onChange={(e) => setQuantidade(Number(e.target.value))}
                        className="flex-1 h-12 text-center text-xl font-bold border-primary/30"
                    />
                    <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setQuantidade(Math.max(1, quantidade + 1))}
                        className="h-12 w-12"
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                    <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                        className="h-12 w-12"
                    >
                        <Minus className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Valor Unitário */}
            <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                    Valor Unit.
                </label>
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-12 px-4 flex items-center justify-between bg-muted/30 rounded-lg border border-border">
                        <span className="text-lg font-bold">{formatCurrency(valorUnitario)}</span>
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
            </div>

            {/* Subtotal */}
            <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                    Subtotal
                </label>
                <div className="h-12 px-4 flex items-center bg-primary/10 rounded-lg border border-primary/30">
                    <span className="text-xl font-bold text-primary">
                        {formatCurrency(subtotalCarrinho)}
                    </span>
                </div>
            </div>

            {/* Botão Produto Manual */}
            <Button
                onClick={onProdutoManual}
                className="w-full h-12 text-base font-semibold"
                variant="outline"
            >
                <Plus className="h-4 w-4 mr-2" />
                Produto Manual
            </Button>
        </div>
    );
}
