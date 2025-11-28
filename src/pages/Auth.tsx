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
        {/* Snowfall Effect */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="snowflake absolute text-slate-200"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}%`,
                animationDelay: `${Math.random() * 5}s`,
                fontSize: `${Math.random() * 14 + 10}px`,
                animationDuration: `${Math.random() * 5 + 10}s`,
                opacity: Math.random() * 0.5 + 0.3,
                filter: 'blur(0.5px)',
              }}
            >
              ❄
            </div>
          ))}
        </div>

        {/* Festive Decoration */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-red-50/30 to-transparent pointer-events-none z-0"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-green-50/20 to-transparent rounded-full blur-3xl pointer-events-none z-0"></div>

        {/* Aesthetic Christmas Tree */}
        <div className="absolute bottom-0 left-10 w-64 h-96 pointer-events-none z-0 opacity-80 hidden md:block">
          {/* Glow behind tree */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-48 h-64 bg-green-200/20 blur-[50px] rounded-full"></div>

          {/* Tree Structure - Modern/Abstract */}
          <div className="relative w-full h-full flex flex-col items-center justify-end pb-12">
            {/* Star */}
            <div className="relative z-20 mb-[-10px] animate-pulse">
              <div className="w-8 h-8 bg-yellow-100 rounded-full blur-[2px] shadow-[0_0_15px_rgba(253,224,71,0.6)]"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-yellow-300 rounded-full shadow-[0_0_10px_rgba(253,224,71,0.8)]"></div>
            </div>

            {/* Layers */}
            <div className="w-4 h-4 bg-emerald-800/80 rounded-full blur-[1px] mb-[-8px] z-10"></div>
            <div className="w-12 h-12 bg-emerald-700/80 rounded-t-3xl blur-[1px] mb-[-15px] z-09 shadow-lg"></div>
            <div className="w-20 h-20 bg-emerald-800/80 rounded-t-full blur-[1px] mb-[-25px] z-08 shadow-lg"></div>
            <div className="w-32 h-24 bg-emerald-900/80 rounded-t-full blur-[1px] mb-[-20px] z-07 shadow-lg"></div>
            <div className="w-44 h-32 bg-emerald-950/80 rounded-t-full blur-[1px] z-06 shadow-lg"></div>

            {/* Trunk */}
            <div className="w-8 h-12 bg-amber-950/80 rounded-b-lg -mt-2 blur-[0.5px]"></div>

            {/* Lights */}
            <div className="absolute inset-0">
              <div className="absolute top-[35%] left-[48%] w-2 h-2 bg-red-400 rounded-full blur-[1px] animate-blink-1 shadow-[0_0_8px_rgba(248,113,113,0.8)]"></div>
              <div className="absolute top-[45%] left-[42%] w-2 h-2 bg-yellow-400 rounded-full blur-[1px] animate-blink-2 shadow-[0_0_8px_rgba(250,204,21,0.8)]"></div>
              <div className="absolute top-[50%] left-[55%] w-2 h-2 bg-blue-400 rounded-full blur-[1px] animate-blink-3 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
              <div className="absolute top-[60%] left-[38%] w-2 h-2 bg-purple-400 rounded-full blur-[1px] animate-blink-1 shadow-[0_0_8px_rgba(192,132,252,0.8)]"></div>
              <div className="absolute top-[65%] left-[60%] w-2 h-2 bg-red-400 rounded-full blur-[1px] animate-blink-2 shadow-[0_0_8px_rgba(248,113,113,0.8)]"></div>
              <div className="absolute top-[75%] left-[45%] w-2 h-2 bg-yellow-400 rounded-full blur-[1px] animate-blink-3 shadow-[0_0_8px_rgba(250,204,21,0.8)]"></div>
              <div className="absolute top-[80%] left-[30%] w-2 h-2 bg-blue-400 rounded-full blur-[1px] animate-blink-1 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
              <div className="absolute top-[82%] left-[65%] w-2 h-2 bg-purple-400 rounded-full blur-[1px] animate-blink-2 shadow-[0_0_8px_rgba(192,132,252,0.8)]"></div>
            </div>
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
