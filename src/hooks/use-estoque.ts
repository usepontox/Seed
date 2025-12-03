import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "./use-empresa";
import { useAudit } from "./use-audit";
import { useToast } from "./use-toast";

interface MovimentacaoEstoque {
    produto_id: string;
    tipo: 'entrada' | 'saida' | 'ajuste' | 'estorno';
    quantidade: number;
    referencia_tipo?: string;
    referencia_id?: string;
    observacao?: string;
    operador_id?: string;
}

export function useEstoque() {
    const { empresaId } = useEmpresa();
    const { registrarLog } = useAudit();
    const { toast } = useToast();

    const registrarMovimentacao = async (movimentacao: MovimentacaoEstoque) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!empresaId) {
                throw new Error("Empresa não identificada");
            }

            // Buscar estoque atual do produto
            const { data: produto, error: produtoError } = await (supabase
                .from("produtos" as any) as any)
                .select("estoque_atual")
                .eq("id", movimentacao.produto_id)
                .eq("empresa_id", empresaId)
                .single();

            if (produtoError) throw produtoError;

            const estoqueAnterior = produto.estoque_atual || 0;
            let estoqueNovo = estoqueAnterior;

            // Calcular novo estoque baseado no tipo
            switch (movimentacao.tipo) {
                case 'entrada':
                case 'estorno':
                    estoqueNovo = estoqueAnterior + movimentacao.quantidade;
                    break;
                case 'saida':
                    estoqueNovo = estoqueAnterior - movimentacao.quantidade;
                    break;
                case 'ajuste':
                    estoqueNovo = movimentacao.quantidade; // Ajuste define o valor absoluto
                    break;
            }

            // Validar estoque negativo
            if (estoqueNovo < 0) {
                throw new Error(`Estoque insuficiente. Disponível: ${estoqueAnterior}`);
            }

            // Atualizar estoque do produto
            const { error: updateError } = await (supabase
                .from("produtos" as any) as any)
                .update({ estoque_atual: estoqueNovo })
                .eq("id", movimentacao.produto_id)
                .eq("empresa_id", empresaId);

            if (updateError) throw updateError;

            // Registrar movimentação
            const { error: movError } = await (supabase
                .from("estoque_movimentacoes" as any) as any)
                .insert([{
                    produto_id: movimentacao.produto_id,
                    empresa_id: empresaId,
                    tipo: movimentacao.tipo,
                    quantidade: movimentacao.quantidade,
                    estoque_anterior: estoqueAnterior,
                    estoque_novo: estoqueNovo,
                    referencia_tipo: movimentacao.referencia_tipo || null,
                    referencia_id: movimentacao.referencia_id || null,
                    usuario_id: user?.id || null,
                    operador_id: movimentacao.operador_id || null,
                    observacao: movimentacao.observacao || null,
                }]);

            if (movError) throw movError;

            // Registrar em auditoria
            await registrarLog({
                acao: `estoque_${movimentacao.tipo}`,
                entidade: 'produtos',
                entidade_id: movimentacao.produto_id,
                dados_antes: { estoque_atual: estoqueAnterior },
                dados_depois: { estoque_atual: estoqueNovo },
                motivo: movimentacao.observacao,
                operador_id: movimentacao.operador_id,
            });

            return { success: true, estoqueNovo };
        } catch (error: any) {
            console.error("Erro ao registrar movimentação de estoque:", error);
            toast({
                title: "Erro ao atualizar estoque",
                description: error.message,
                variant: "destructive",
            });
            return { success: false, error: error.message };
        }
    };

    const baixarEstoque = async (
        produto_id: string,
        quantidade: number,
        referencia_tipo: string,
        referencia_id: string,
        operador_id?: string
    ) => {
        return await registrarMovimentacao({
            produto_id,
            tipo: 'saida',
            quantidade,
            referencia_tipo,
            referencia_id,
            observacao: `Baixa automática - ${referencia_tipo}`,
            operador_id,
        });
    };

    const estornarEstoque = async (
        produto_id: string,
        quantidade: number,
        referencia_tipo: string,
        referencia_id: string,
        operador_id?: string
    ) => {
        return await registrarMovimentacao({
            produto_id,
            tipo: 'estorno',
            quantidade,
            referencia_tipo,
            referencia_id,
            observacao: `Estorno - ${referencia_tipo}`,
            operador_id,
        });
    };

    const verificarDisponibilidade = async (produto_id: string, quantidade: number) => {
        try {
            const { data: produto, error } = await (supabase
                .from("produtos" as any) as any)
                .select("estoque_atual, nome")
                .eq("id", produto_id)
                .eq("empresa_id", empresaId)
                .single();

            if (error) throw error;

            const disponivel = (produto.estoque_atual || 0) >= quantidade;

            return {
                disponivel,
                estoque_atual: produto.estoque_atual || 0,
                nome: produto.nome,
            };
        } catch (error) {
            console.error("Erro ao verificar disponibilidade:", error);
            return { disponivel: false, estoque_atual: 0, nome: '' };
        }
    };

    const buscarMovimentacoes = async (produto_id?: string, limit: number = 50) => {
        try {
            let query = (supabase
                .from("estoque_movimentacoes" as any) as any)
                .select("*")
                .eq("empresa_id", empresaId)
                .order("created_at", { ascending: false })
                .limit(limit);

            if (produto_id) {
                query = query.eq("produto_id", produto_id);
            }

            const { data, error } = await query;

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error("Erro ao buscar movimentações:", error);
            return [];
        }
    };

    return {
        registrarMovimentacao,
        baixarEstoque,
        estornarEstoque,
        verificarDisponibilidade,
        buscarMovimentacoes,
    };
}
