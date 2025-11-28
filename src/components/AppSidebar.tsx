import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  DollarSign,
  LogOut,
  Settings,
  Receipt,
  FileText,
  ShoppingBag,
  FileBarChart,
  Shield
} from "lucide-react";

import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, tooltip: "Painel principal com visão geral" },
  { title: "PDV / Caixa", url: "/pdv", icon: ShoppingCart, tooltip: "Ponto de venda e registrar vendas" },
  { title: "Vendas", url: "/vendas", icon: Receipt, tooltip: "Histórico completo de vendas" },
  { title: "Estoque", url: "/produtos", icon: Package, tooltip: "Gerenciar produtos e estoque" },
  { title: "Compras", url: "/compras", icon: ShoppingBag, tooltip: "Registrar compras e entradas de produtos" },
  { title: "Clientes", url: "/clientes", icon: Users, tooltip: "Cadastro de clientes" },
  { title: "Fornecedores", url: "/fornecedores", icon: Truck, tooltip: "Cadastro de fornecedores" },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign, tooltip: "Contas a pagar e receber" },
  { title: "Relatórios Fiscais", url: "/relatorios-fiscais", icon: FileBarChart, tooltip: "Análises e relatórios fiscais de NFC-e" },
  { title: "Configurações", url: "/configuracoes", icon: Settings, tooltip: "Configurações do sistema" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Verificar email do usuário
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
    };
    getUser();
  }, []);

  const collapsed = state === "collapsed";

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <div className={`flex justify-center items-center bg-white ${collapsed ? "p-2" : "p-4 pb-3"}`}>
        {!collapsed ? (
          <h1 className="text-4xl font-bold text-primary whitespace-nowrap">deep.</h1>
        ) : (
          <h1 className="text-4xl font-bold text-primary">dp.</h1>
        )}
      </div>

      <Separator />

      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              <TooltipProvider>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          asChild
                          className={isActive(item.url) ? "bg-primary text-primary-foreground hover:bg-primary-hover" : ""}
                        >
                          <NavLink to={item.url} end>
                            <item.icon className={collapsed ? "" : "mr-2"} />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      {collapsed && <TooltipContent side="right">{item.tooltip}</TooltipContent>}
                    </Tooltip>
                  </SidebarMenuItem>
                ))}
                {/* Item Administrador - apenas para admin@admin.com */}
                {userEmail === "admin@admin.com" && (
                  <SidebarMenuItem>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          asChild
                          className={isActive("/administrador") ? "bg-primary text-primary-foreground hover:bg-primary-hover" : ""}
                        >
                          <NavLink to="/administrador" end>
                            <Shield className={collapsed ? "" : "mr-2"} />
                            {!collapsed && <span>Administrador</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      {collapsed && <TooltipContent side="right">Gerenciar usuários do sistema</TooltipContent>}
                    </Tooltip>
                  </SidebarMenuItem>
                )}
              </TooltipProvider>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Separator className="mb-2" />
        <div className="p-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={collapsed ? "icon" : "default"}
                  onClick={handleLogout}
                  className="w-full"
                >
                  <LogOut className={collapsed ? "" : "mr-2"} size={20} />
                  {!collapsed && "Sair"}
                </Button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">Sair do sistema</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
