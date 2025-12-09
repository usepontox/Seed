import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Produto {
    id: string;
    nome: string;
    preco_venda: number;
    estoque_atual: number;
    codigo_barras?: string;
    sku?: string;
}

interface ModalPesquisaProdutoProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    produtos: Produto[];
    onSelectProduto: (produto: Produto) => void;
    formatCurrency: (value: number) => string;
}

export function ModalPesquisaProduto({
    open,
    onOpenChange,
    produtos,
    onSelectProduto,
    formatCurrency
}: ModalPesquisaProdutoProps) {
    const [busca, setBusca] = useState("");

    const produtosFiltrados = produtos.filter(p =>
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.codigo_barras?.toLowerCase().includes(busca.toLowerCase()) ||
        p.sku?.toLowerCase().includes(busca.toLowerCase())
    ).slice(0, 50);

    const handleSelect = (produto: Produto) => {
        onSelectProduto(produto);
        setBusca("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>🔍 Pesquisar Produto</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Campo de busca */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Digite o nome, código de barras ou SKU..."
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            className="pl-10 h-12 text-lg"
                            autoFocus
                        />
                    </div>

                    {/* Lista de resultados */}
                    <div className="border rounded-lg max-h-[400px] overflow-y-auto custom-scrollbar">
                        {produtosFiltrados.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                {busca ? "Nenhum produto encontrado" : "Digite para buscar produtos"}
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {produtosFiltrados.map((produto) => (
                                    <button
                                        key={produto.id}
                                        onClick={() => handleSelect(produto)}
                                        className="w-full px-4 py-3 hover:bg-primary/10 flex items-center justify-between gap-4 transition-colors text-left"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-base truncate">{produto.nome}</div>
                                            <div className="text-sm text-muted-foreground truncate">
                                                {produto.codigo_barras && `Cód: ${produto.codigo_barras}`}
                                                {produto.sku && ` | SKU: ${produto.sku}`}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end flex-shrink-0">
                                            <span className="font-bold text-success text-xl">
                                                {formatCurrency(produto.preco_venda)}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                Estoque: {produto.estoque_atual}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
