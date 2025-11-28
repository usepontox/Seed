import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Venda {
  id: string;
  numero_venda: string;
  data_venda: string;
  subtotal: number;
  desconto: number;
  total: number;
  forma_pagamento: string;
  cliente_id?: string;
  clientes?: {
    nome: string;
    cpf?: string;
    cnpj?: string;
  } | null;
}

interface ItemVenda {
  id: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  produtos: {
    nome: string;
  };
}

interface CupomFiscalProps {
  vendaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CupomFiscal({ vendaId, open, onOpenChange }: CupomFiscalProps) {
  const [venda, setVenda] = useState<Venda | null>(null);
  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vendaId && open) {
      carregarDados();
    } else {
      setVenda(null);
      setItens([]);
    }
  }, [vendaId, open]);

  const carregarDados = async () => {
    if (!vendaId) return;
    setLoading(true);

    try {
      const { data: vendaData } = await supabase
        .from("vendas")
        .select(`
          *,
          clientes:cliente_id (nome, cpf, cnpj)
        `)
        .eq("id", vendaId)
        .single();

      const { data: itensData } = await supabase
        .from("vendas_itens")
        .select(`
          *,
          produtos:produto_id (nome)
        `)
        .eq("venda_id", vendaId);

      if (vendaData) setVenda(vendaData);
      if (itensData) setItens(itensData as any);
    } catch (error) {
      console.error("Erro ao carregar cupom:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("pt-BR");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cupom Fiscal</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !venda ? (
          <div className="text-center py-8 text-muted-foreground">
            Erro ao carregar dados da venda.
          </div>
        ) : (
          <>
            <div className="print:p-4" id="cupom-fiscal">
              <div className="space-y-4 font-mono text-sm">
                {/* Cabeçalho */}
                <div className="text-center border-b-2 border-dashed pb-4">
                  <h2 className="font-bold text-lg">SISTEMA PDV</h2>
                  <p className="text-xs mt-2">CUPOM NÃO FISCAL</p>
                </div>

                {/* Dados da Venda */}
                <div className="border-b-2 border-dashed pb-4 space-y-1">
                  <p>
                    <strong>Nº Venda:</strong> {venda.numero_venda}
                  </p>
                  <p>
                    <strong>Data/Hora:</strong> {formatDate(venda.data_venda)}
                  </p>
                  <p>
                    <strong>Pagamento:</strong> {venda.forma_pagamento.toUpperCase()}
                  </p>
                  {venda.clientes && (
                    <>
                      <p>
                        <strong>Cliente:</strong> {venda.clientes.nome}
                      </p>
                      {venda.clientes.cpf && (
                        <p>
                          <strong>CPF:</strong> {venda.clientes.cpf}
                        </p>
                      )}
                      {venda.clientes.cnpj && (
                        <p>
                          <strong>CNPJ:</strong> {venda.clientes.cnpj}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Itens */}
                <div className="border-b-2 border-dashed pb-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1">Item</th>
                        <th className="text-center py-1">Qtd</th>
                        <th className="text-right py-1">Unit.</th>
                        <th className="text-right py-1">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((item, index) => (
                        <tr key={item.id} className="border-b">
                          <td className="py-2 text-left">
                            {index + 1}. {item.produtos?.nome || "Produto Removido"}
                          </td>
                          <td className="text-center">{item.quantidade}</td>
                          <td className="text-right">{formatCurrency(item.preco_unitario)}</td>
                          <td className="text-right font-bold">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totais */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(venda.subtotal)}</span>
                  </div>
                  {venda.desconto > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Desconto:</span>
                      <span>-{formatCurrency(venda.desconto)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t-2 pt-2">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(venda.total)}</span>
                  </div>
                </div>

                {/* Rodapé */}
                <div className="text-center text-xs border-t-2 border-dashed pt-4 space-y-1">
                  <p>Obrigado pela preferência!</p>
                  <p className="text-muted-foreground">
                    Documento não válido como Nota Fiscal
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 print:hidden">
              <div className="flex gap-2">
                <Button onClick={handleImprimir} className="flex-1">
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Precisa de ajuda? Consulte o arquivo <span className="font-mono">GUIA_IMPRESSORA.md</span> na área de trabalho.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
