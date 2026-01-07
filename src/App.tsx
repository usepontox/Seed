import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import PDV from "./pages/PDV";
import Vendas from "./pages/Vendas";
import Produtos from "./pages/Produtos";
import Clientes from "./pages/Clientes";
import Fornecedores from "./pages/Fornecedores";
import Financeiro from "./pages/Financeiro";
import Configuracoes from "./pages/Configuracoes";
import Compras from "./pages/Compras";
import Relatorios from "./pages/Relatorios";
import RelatoriosFiscais from "./pages/RelatoriosFiscais";
import RelatoriosCaixa from "./pages/RelatoriosCaixa";
import AdminGlobal from "./pages/AdminGlobal";
import Administrador from "./pages/Administrador";
import NotFound from "./pages/NotFound";
import WhatsAppButton from "./components/WhatsAppButton";
import { PasswordChangeAlert } from "./components/PasswordChangeAlert";

const queryClient = new QueryClient();

const AppContent = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getProfile = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile(data);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sistema de Log de Acesso
  const hasLoggedRef = useRef(false);

  useEffect(() => {
    const createAccessLog = async () => {
      if (user && user.email !== 'admin@admin.com' && !hasLoggedRef.current) {
        // Registrar no access_logs para histórico
        await supabase.from('access_logs').insert({
          user_id: user.id,
          user_email: user.email,
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent
        });
        hasLoggedRef.current = true;
      }
    };

    createAccessLog();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/admin-global" element={
        <ProtectedRoute>
          <AdminGlobal />
        </ProtectedRoute>
      } />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="flex min-h-screen w-full">
                <AppSidebar />
                <main className="flex-1 w-full">
                  <header className="sticky top-0 z-10 flex h-12 sm:h-14 items-center justify-between gap-4 border-b border-border bg-background/95 backdrop-blur-md px-3 sm:px-4 shadow-lg">
                    <SidebarTrigger className="flex-shrink-0" />
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 mr-2">
                        <span className="text-sm font-medium hidden md:block text-foreground">
                          {profile?.nome?.split(' ')[0] || user?.email?.split('@')[0]}
                        </span>
                        <div className="h-2 w-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_hsl(var(--primary)/0.6)]" title="Online" />
                      </div>

                      {/* Theme Toggle */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-accent hover:text-accent-foreground transition-all duration-300"
                        onClick={() => {
                          const root = window.document.documentElement;
                          const isDark = root.classList.contains('dark');
                          if (isDark) {
                            root.classList.remove('dark');
                            root.classList.add('light');
                            localStorage.setItem('deep-pdv-theme', 'light');
                          } else {
                            root.classList.remove('light');
                            root.classList.add('dark');
                            localStorage.setItem('deep-pdv-theme', 'dark');
                          }
                        }}
                        title="Alternar Tema"
                      >
                        <div className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 flex items-center justify-center">
                          <div className="h-4 w-4 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                        </div>
                        <div className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 flex items-center justify-center">
                          <div className="h-4 w-4 rounded-full bg-[#84cc16] shadow-[0_0_12px_#84cc16]"></div>
                        </div>
                        <span className="sr-only">Toggle theme</span>
                      </Button>

                      <button
                        onClick={() => navigate("/configuracoes?tab=perfil")}
                        className="rounded-full hover:opacity-80 transition-all duration-300 hover:ring-2 hover:ring-primary/50"
                      >
                        <Avatar className="h-9 w-9 ring-2 ring-primary/30">
                          <AvatarImage src={user?.user_metadata?.avatar_url} alt="User" />
                          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                            {profile?.nome?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </div>
                  </header>
                  <div className="p-3 sm:p-4 md:p-6">
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/pdv" element={<PDV />} />
                      <Route path="/vendas" element={<Vendas />} />
                      <Route path="/produtos" element={<Produtos />} />
                      <Route path="/compras" element={<Compras />} />
                      <Route path="/clientes" element={<Clientes />} />
                      <Route path="/fornecedores" element={<Fornecedores />} />
                      <Route path="/financeiro" element={<Financeiro />} />
                      <Route path="/relatorios-fiscais" element={<RelatoriosFiscais />} />
                      <Route path="/relatorios" element={<Relatorios />} />
                      <Route path="/relatorios-caixa" element={<RelatoriosCaixa />} />
                      <Route path="/configuracoes" element={<Configuracoes />} />
                      <Route path="/administrador" element={<Administrador />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </div>
                </main>
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <WhatsAppButton />
      <BrowserRouter>
        <PasswordChangeAlert />
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
