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
    ativo?: boolean;
}

interface ProdutoItemProps {
    produto: Produto;
    onAdd: (produto: Produto) => void;
}

const ProdutoItem = memo(({ produto, onAdd }: ProdutoItemProps) => {
    return (
        <div
            className="group flex flex-col justify-between p-2.5 border rounded-xl hover:bg-primary/5 hover:border-primary/50 active:scale-[0.98] cursor-pointer transition-all duration-200 hover:shadow-sm bg-card"
            onClick={() => onAdd(produto)}
        >
            <div className="mb-2">
                <p className="font-medium text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2 h-10">
                    {produto.nome}
                </p>
            </div>

            <div className="flex items-center justify-between mt-auto">
                <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        Estoque
                    </span>
                    <span className={`text-xs font-bold ${produto.estoque_atual < 10 ? "text-destructive" : "text-foreground"}`}>
                        {produto.estoque_atual}
                    </span>
                </div>

                <p className="font-bold text-base text-success">
                    {formatCurrency(produto.preco_venda)}
                </p>
            </div>
        </div>
    );
});

ProdutoItem.displayName = "ProdutoItem";

export default ProdutoItem;
