import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePermissoes() {
    const [isSupervisor, setIsSupervisor] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        verificarPermissoes();
    }, []);

    const verificarPermissoes = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setIsSupervisor(false);
                return;
            }

            // Verificar role do usuário
            const { data: roleData } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id)
                .single();

            // Supervisor, gerente ou admin podem fazer sangria e fechar caixa
            const supervisorRoles = ['admin', 'supervisor', 'gerente'];
            setIsSupervisor(roleData ? supervisorRoles.includes(roleData.role) : false);
        } catch (error) {
            console.error("Erro ao verificar permissões:", error);
            setIsSupervisor(false);
        } finally {
            setLoading(false);
        }
    };

    return { isSupervisor, loading, verificarPermissoes };
}
