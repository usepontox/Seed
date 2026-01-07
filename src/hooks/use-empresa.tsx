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
        console.log("[useEmpresa] No user found");
        setLoading(false);
        return;
      }

      console.log("[useEmpresa] Loading empresa for user:", user.email);

      // Obter empresa_id do usuário
      const { data, error } = await supabase
        .from("usuarios_empresas")
        .select("empresa_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[useEmpresa] Error fetching from usuarios_empresas:", error);
      }

      if (data?.empresa_id) {
        console.log("[useEmpresa] Found empresa_id from usuarios_empresas:", data.empresa_id);
        setEmpresaId(data.empresa_id);
      } else {
        console.log("[useEmpresa] No empresa found in usuarios_empresas, checking admin fallback");

        // Fallback: Se não tiver empresa vinculada, verificar se é admin/super_admin
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (roleError) {
          console.error("[useEmpresa] Error fetching user role:", roleError);
        }

        const isAdmin = roleData?.role === 'admin' ||
          roleData?.role === 'super_admin' ||
          user.email === 'admin@admin.com';

        console.log("[useEmpresa] Is admin?", isAdmin, "Role:", roleData?.role);

        if (isAdmin) {
          console.log("[useEmpresa] User is admin but has no specific empresa assigned");
          // FIX: Remover fallback que pegava a primeira empresa aleatoriamente
          // Admin deve selecionar uma empresa explicitamente ou ter uma vinculada
          setEmpresaId(null);
        } else {
          console.warn("[useEmpresa] User is not admin and has no empresa assigned");
        }
      }
    } catch (error) {
      console.error("[useEmpresa] Unexpected error loading empresa:", error);
    } finally {
      setLoading(false);
    }
  };

  return { empresaId, loading };
}
