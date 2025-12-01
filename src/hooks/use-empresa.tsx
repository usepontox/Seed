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
          // Pegar a primeira empresa disponível
          const { data: empresaData, error: empresaError } = await supabase
            .from("empresas")
            .select("id")
            .limit(1)
            .maybeSingle();

          if (empresaError) {
            console.error("[useEmpresa] Error fetching empresa for admin:", empresaError);
          }

          if (empresaData?.id) {
            console.log("[useEmpresa] Found empresa for admin:", empresaData.id);
            setEmpresaId(empresaData.id);
          } else {
            console.warn("[useEmpresa] No empresa found for admin user");
          }
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
