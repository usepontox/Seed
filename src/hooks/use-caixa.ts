import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmpresa } from "@/hooks/use-empresa";

interface Caixa {
    id: string;
    numero_caixa: string;
    operador_id: string;
    empresa_id: string;
    saldo_inicial: number;
    saldo_atual: number;
    saldo_final: number | null;
    data_abertura: string;
    data_fechamento: string | null;
    status: string;
    observacoes: string | null;
}

interface CaixaMovimentacao {
    id: string;
    caixa_id: string;
    tipo: 'sangria' | 'suprimento' | 'venda';
    valor: number;
    descricao: string | null;
    created_at: string;
}

export function useCaixa() {
    const { toast } = useToast();
    const { empresaId } = useEmpresa();
    const [caixaAtual, setCaixaAtual] = useState<Caixa | null>(null);
    const [loading, setLoading] = useState(false);
    const [verificando, setVerificando] = useState(true);

    // Verificar se há caixa aberto ao carregar
    useEffect(() => {
        if (empresaId) {
            verificarCaixaAberto();
        }
    }, [empresaId]);

    // Verificar se o operador tem caixa aberto
    const verificarCaixaAberto = useCallback(async () => {
        try {
            setVerificando(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !empresaId) return;

            const { data, error } = await supabase
                .from("caixas")
                .select("*")
                .eq("operador_id", user.id)
                .eq("empresa_id", empresaId)
                .eq("status", "aberto")
                .order("data_abertura", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            setCaixaAtual(data);
        } catch (error: any) {
            console.error("Erro ao verificar caixa:", error);
        } finally {
            setVerificando(false);
        }
    }, [empresaId]);

    // Abrir novo caixa
    const abrirCaixa = useCallback(async (saldoInicial: number, observacoes?: string, operadorId?: string) => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !empresaId) {
                throw new Error("Usuário não autenticado ou empresa não identificada");
            }

            // Verificar se já existe caixa aberto
            const { data: caixaExistente } = await supabase
                .from("caixas")
                .select("id")
                .eq("operador_id", user.id)
                .eq("empresa_id", empresaId)
                .eq("status", "aberto")
                .maybeSingle();

            if (caixaExistente) {
                toast({
                    title: "Caixa já aberto",
                    description: "Você já possui um caixa aberto. Feche-o antes de abrir outro.",
                    variant: "destructive",
                });
                return false;
            }

            // Criar novo caixa
            const { data: novoCaixa, error } = await supabase
                .from("caixas")
                .insert([{
                    operador_id: user.id,
                    empresa_id: empresaId,
                    saldo_inicial: saldoInicial,
                    saldo_atual: saldoInicial,
                    status: "aberto",
                    observacoes,
                    operador_pdv_id: operadorId || null
                }])
                .select()
                .single();

            if (error) throw error;

            setCaixaAtual(novoCaixa);
            toast({
                title: "Caixa aberto com sucesso!",
                description: `${novoCaixa.numero_caixa} - Saldo inicial: R$ ${saldoInicial.toFixed(2)}`,
            });

            return true;
        } catch (error: any) {
            toast({
                title: "Erro ao abrir caixa",
                description: error.message,
                variant: "destructive",
            });
            return false;
        } finally {
            setLoading(false);
        }
    }, [empresaId, toast]);

    // Registrar sangria
    const registrarSangria = useCallback(async (valor: number, descricao: string) => {
        if (!caixaAtual) {
            toast({
                title: "Nenhum caixa aberto",
                variant: "destructive",
            });
            return false;
        }

        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            // Verificar se o valor não excede o saldo atual
            if (valor > caixaAtual.saldo_atual) {
                toast({
                    title: "Saldo insuficiente",
                    description: `Saldo atual: R$ ${caixaAtual.saldo_atual.toFixed(2)}`,
                    variant: "destructive",
                });
                return false;
            }

            const { error } = await supabase
                .from("caixas_movimentacoes")
                .insert([{
                    caixa_id: caixaAtual.id,
                    tipo: "sangria",
                    valor,
                    descricao,
                    usuario_id: user.id,
                }]);

            if (error) throw error;

            // Atualizar caixa atual
            await verificarCaixaAberto();

            toast({
                title: "Sangria registrada",
                description: `Valor: R$ ${valor.toFixed(2)}`,
            });

            return true;
        } catch (error: any) {
            toast({
                title: "Erro ao registrar sangria",
                description: error.message,
                variant: "destructive",
            });
            return false;
        } finally {
            setLoading(false);
        }
    }, [caixaAtual, toast, verificarCaixaAberto]);

    // Registrar suprimento
    const registrarSuprimento = useCallback(async (valor: number, descricao: string) => {
        if (!caixaAtual) {
            toast({
                title: "Nenhum caixa aberto",
                variant: "destructive",
            });
            return false;
        }

        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const { error } = await supabase
                .from("caixas_movimentacoes")
                .insert([{
                    caixa_id: caixaAtual.id,
                    tipo: "suprimento",
                    valor,
                    descricao,
                    usuario_id: user.id,
                }]);

            if (error) throw error;

            // Atualizar caixa atual
            await verificarCaixaAberto();

            toast({
                title: "Suprimento registrado",
                description: `Valor: R$ ${valor.toFixed(2)}`,
            });

            return true;
        } catch (error: any) {
            toast({
                title: "Erro ao registrar suprimento",
                description: error.message,
                variant: "destructive",
            });
            return false;
        } finally {
            setLoading(false);
        }
    }, [caixaAtual, toast, verificarCaixaAberto]);

    // Fechar caixa
    const fecharCaixa = useCallback(async (saldoFinal: number, observacoes?: string, conferenciaDetalhes?: any) => {
        if (!caixaAtual) {
            toast({
                title: "Nenhum caixa aberto",
                variant: "destructive",
            });
            return false;
        }

        try {
            setLoading(true);

            const updateData: any = {
                status: "fechado",
                saldo_final: saldoFinal,
                data_fechamento: new Date().toISOString(),
                observacoes: observacoes || caixaAtual.observacoes,
            };

            if (conferenciaDetalhes) {
                updateData.conferencia_detalhes = conferenciaDetalhes;
            }

            const { error } = await supabase
                .from("caixas")
                .update(updateData)
                .eq("id", caixaAtual.id);

            if (error) throw error;

            const diferenca = saldoFinal - caixaAtual.saldo_atual;

            toast({
                title: "Caixa fechado com sucesso!",
                description: diferenca !== 0
                    ? `Diferença: R$ ${Math.abs(diferenca).toFixed(2)} ${diferenca > 0 ? '(sobra)' : '(falta)'}`
                    : "Valores conferem!",
                variant: diferenca !== 0 ? "default" : "default",
            });

            setCaixaAtual(null);
            return true;
        } catch (error: any) {
            toast({
                title: "Erro ao fechar caixa",
                description: error.message,
                variant: "destructive",
            });
            return false;
        } finally {
            setLoading(false);
        }
    }, [caixaAtual, toast]);

    // Obter movimentações do caixa
    const obterMovimentacoes = useCallback(async (caixaId?: string): Promise<CaixaMovimentacao[]> => {
        try {
            const id = caixaId || caixaAtual?.id;
            if (!id) return [];

            const { data, error } = await supabase
                .from("caixas_movimentacoes")
                .select("*")
                .eq("caixa_id", id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error: any) {
            console.error("Erro ao obter movimentações:", error);
            return [];
        }
    }, [caixaAtual]);

    return {
        caixaAtual,
        loading,
        verificando,
        abrirCaixa,
        fecharCaixa,
        registrarSangria,
        registrarSuprimento,
        verificarCaixaAberto,
        obterMovimentacoes,
    };
}
