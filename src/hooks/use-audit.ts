import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "./use-empresa";

interface AuditLogData {
    acao: string;
    entidade: string;
    entidade_id?: string;
    dados_antes?: any;
    dados_depois?: any;
    motivo?: string;
    operador_id?: string;
}

export function useAudit() {
    const { empresaId } = useEmpresa();

    const registrarLog = async (data: AuditLogData) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!empresaId) {
                console.error("Empresa ID não encontrado para auditoria");
                return;
            }

            // Tentar obter IP e user agent (pode não estar disponível em todos os ambientes)
            let ip_address = null;
            let user_agent = null;

            try {
                user_agent = navigator.userAgent;
            } catch (e) {
                // Ignorar se não disponível
            }

            const logData = {
                empresa_id: empresaId,
                usuario_id: user?.id || null,
                operador_id: data.operador_id || null,
                acao: data.acao,
                entidade: data.entidade,
                entidade_id: data.entidade_id || null,
                dados_antes: data.dados_antes || null,
                dados_depois: data.dados_depois || null,
                motivo: data.motivo || null,
                ip_address,
                user_agent,
            };

            const { error } = await (supabase
                .from("audit_logs" as any) as any)
                .insert([logData]);

            if (error) {
                console.error("Erro ao registrar log de auditoria:", error);
            }
        } catch (error) {
            console.error("Erro ao registrar log de auditoria:", error);
        }
    };

    const buscarLogs = async (filtros?: {
        acao?: string;
        entidade?: string;
        entidade_id?: string;
        data_inicio?: string;
        data_fim?: string;
        limit?: number;
    }) => {
        try {
            let query = (supabase
                .from("audit_logs" as any) as any)
                .select("*")
                .eq("empresa_id", empresaId)
                .order("created_at", { ascending: false });

            if (filtros?.acao) {
                query = query.eq("acao", filtros.acao);
            }

            if (filtros?.entidade) {
                query = query.eq("entidade", filtros.entidade);
            }

            if (filtros?.entidade_id) {
                query = query.eq("entidade_id", filtros.entidade_id);
            }

            if (filtros?.data_inicio) {
                query = query.gte("created_at", filtros.data_inicio);
            }

            if (filtros?.data_fim) {
                query = query.lte("created_at", filtros.data_fim);
            }

            if (filtros?.limit) {
                query = query.limit(filtros.limit);
            } else {
                query = query.limit(100); // Limite padrão
            }

            const { data, error } = await query;

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error("Erro ao buscar logs:", error);
            return [];
        }
    };

    return {
        registrarLog,
        buscarLogs,
    };
}
