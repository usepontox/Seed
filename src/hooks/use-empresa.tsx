import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useEmpresa() {
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmpresaId();
  }, []);

  const loadEmpresaId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Obter empresa_id do usuário
      const { data } = await supabase
        .from("usuarios_empresas")
        .select("empresa_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (data) {
        setEmpresaId(data.empresa_id);
      }
    } catch (error) {
      console.error("Erro ao carregar empresa:", error);
    } finally {
      setLoading(false);
    }
  };

  return { empresaId, loading };
}
