import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Session, User } from "@supabase/supabase-js";
import { Lock, Mail } from "lucide-react";
import logo from "@/assets/logo.png";


export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");


  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session) {
          checkUserRoleAndRedirect(session.user.id);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        checkUserRoleAndRedirect(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUserRoleAndRedirect = async (userId: string) => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .maybeSingle();

    if (roles) {
      navigate("/admin-global");
    } else {
      navigate("/dashboard");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Erro ao fazer login",
        description: error.message,
        variant: "destructive",
      });
    }

    setLoading(false);
  };



  return (
    <div className="flex w-full" style={{ height: '100vh' }}>
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-8 relative overflow-hidden" style={{ height: '100vh' }}>
        {/* Christmas Tree Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none bg-gradient-to-b from-slate-50 to-slate-100">
          <div className="christmas-scene absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-full flex items-end justify-center pb-10">
            <div className="tree relative w-64 h-96">
              {/* Star */}
              <div className="star absolute -top-8 left-1/2 transform -translate-x-1/2 w-12 h-12 z-20 animate-pulse text-yellow-400">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>

              {/* Tree Layers */}
              <div className="layers flex flex-col items-center">
                <div className="layer-top w-0 h-0 border-l-[40px] border-r-[40px] border-b-[60px] border-l-transparent border-r-transparent border-b-green-700 relative z-10 -mb-8 filter drop-shadow-lg"></div>
                <div className="layer-middle w-0 h-0 border-l-[60px] border-r-[60px] border-b-[80px] border-l-transparent border-r-transparent border-b-green-800 relative z-0 -mb-8 filter drop-shadow-lg"></div>
                <div className="layer-bottom w-0 h-0 border-l-[80px] border-r-[80px] border-b-[100px] border-l-transparent border-r-transparent border-b-green-900 relative z-0 filter drop-shadow-lg"></div>
              </div>

              {/* Trunk */}
              <div className="trunk w-12 h-16 bg-amber-900 mx-auto -mt-2 rounded-b-lg"></div>

              {/* Lights */}
              <div className="lights absolute inset-0 pointer-events-none">
                <div className="light absolute top-[20%] left-[45%] w-3 h-3 rounded-full bg-red-500 animate-blink-1 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                <div className="light absolute top-[35%] left-[55%] w-3 h-3 rounded-full bg-blue-500 animate-blink-2 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                <div className="light absolute top-[45%] left-[40%] w-3 h-3 rounded-full bg-yellow-500 animate-blink-3 shadow-[0_0_8px_rgba(234,179,8,0.8)]"></div>
                <div className="light absolute top-[55%] left-[60%] w-3 h-3 rounded-full bg-purple-500 animate-blink-1 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                <div className="light absolute top-[65%] left-[35%] w-3 h-3 rounded-full bg-green-400 animate-blink-2 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
                <div className="light absolute top-[70%] left-[50%] w-3 h-3 rounded-full bg-red-500 animate-blink-3 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                <div className="light absolute top-[75%] left-[65%] w-3 h-3 rounded-full bg-blue-500 animate-blink-1 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
              </div>
            </div>

            {/* Snow/Ground */}
            <div className="absolute bottom-0 w-full h-4 bg-slate-200 rounded-full blur-xl opacity-50"></div>
          </div>
        </div>
        <Card className="w-full max-w-md border-none shadow-none relative z-10 bg-transparent">
          <CardHeader className="text-center space-y-2 pb-8">
            <div className="mx-auto flex items-center justify-center mb-4">
              <h1 className="text-6xl font-bold text-primary tracking-tighter">deep.</h1>
            </div>
            <CardDescription className="text-lg">
              Entre com suas credenciais para acessar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 text-base">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2 text-base">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 text-base"
                />
              </div>
              <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
                {loading ? "Entrando..." : "Entrar no Sistema"}
              </Button>
              <p className="text-center text-sm text-muted-foreground pt-2">
                Não tem acesso? Entre em contato com o administrador
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right Side - Blue Background */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12" style={{ height: '100vh' }}>
        <div className="text-center text-white max-w-md">
          <h2 className="text-5xl font-bold mb-6">Gestão Inteligente</h2>
          <p className="text-xl text-primary-foreground/90">
            Controle total do seu negócio com simplicidade e eficiência.
          </p>
        </div>
      </div>
    </div>
  );
}
