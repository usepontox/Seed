import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface Produto {
    id: string;
    nome: string;
    preco_venda: number;
    estoque_atual: number;
    codigo_barras?: string;
    sku?: string;
    ncm?: string;
    ativo?: boolean; // Adicionado para compatibilidade
}

interface ProdutoItemProps {
    produto: Produto;
    onAdd: (produto: Produto) => void;
}

const ProdutoItem = memo(({ produto, onAdd }: ProdutoItemProps) => {
    return (
        <div
            className="group flex items-center justify-between p-3 md:p-4 border rounded-xl hover:bg-primary/5 hover:border-primary/30 active:scale-[0.98] cursor-pointer transition-all duration-200 hover:shadow-md"
            onClick={() => onAdd(produto)}
        >
            <div className="flex-1 min-w-0 pr-3">
                <p className="font-semibold text-sm md:text-base group-hover:text-primary transition-colors truncate">
                    {produto.nome}
                </p>
                <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                        Est: {produto.estoque_atual}
                    </Badge>
                    {produto.estoque_atual < 10 && (
                        <Badge variant="destructive" className="text-xs">
                            Baixo
                        </Badge>
                    )}
                </div>
            </div>
            <div className="text-right flex-shrink-0">
                <p className="font-bold text-lg md:text-xl text-success">
                    {formatCurrency(produto.preco_venda)}
                </p>
                <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">
                    Toque para adicionar
                </p>
            </div>
        </div>
    );
});

ProdutoItem.displayName = "ProdutoItem";

export default ProdutoItem;
