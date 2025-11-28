import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Users, Search, Building2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Usuario {
  id: string;
  email: string;
  profiles: {
    nome: string;
  } | null;
  user_roles: Array<{
    role: string;
  }>;
  usuarios_empresas: Array<{
    empresa_id: string;
    empresas: {
      nome: string;
    };
  }>;
}

interface Empresa {
  id: string;
  nome: string;
}

export function UsuariosTab() {
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    senha: "",
    nome: "",
    role: "caixa",
    empresas_selecionadas: [] as string[],
  });

  useEffect(() => {
    loadUsuarios();
    loadEmpresas();
  }, []);

  const loadUsuarios = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        email,
        nome,
        user_roles(role),
        usuarios_empresas(
          empresa_id,
          empresas(nome)
        )
      `);

    if (error) {
      console.error("Erro ao carregar usuários:", error);
      return;
    }

    setUsuarios(data as any || []);
  };

  const loadEmpresas = async () => {
    const { data } = await supabase
      .from("empresas")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome");

    setEmpresas(data || []);
  };

  const handleOpenDialog = () => {
    setFormData({
      email: "",
      senha: "",
      nome: "",
      role: "caixa",
      empresas_selecionadas: [],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.email || !formData.senha || !formData.nome) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (formData.empresas_selecionadas.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos uma empresa",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
        options: {
          data: {
            nome: formData.nome,
            role: formData.role,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Associar usuário às empresas selecionadas
        const empresasInsert = formData.empresas_selecionadas.map((empresa_id) => ({
          user_id: authData.user.id,
          empresa_id,
        }));

        const { error: empresasError } = await supabase
          .from("usuarios_empresas")
          .insert(empresasInsert);

        if (empresasError) throw empresasError;
      }

      toast({
        title: "Usuário criado",
        description: "O usuário foi criado e vinculado às empresas selecionadas",
      });

      setDialogOpen(false);
      loadUsuarios();
    } catch (error: any) {
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Não foi possível criar o usuário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleEmpresa = (empresaId: string) => {
    setFormData((prev) => ({
      ...prev,
      empresas_selecionadas: prev.empresas_selecionadas.includes(empresaId)
        ? prev.empresas_selecionadas.filter((id) => id !== empresaId)
        : [...prev.empresas_selecionadas, empresaId],
    }));
  };

  const usuariosFiltrados = usuarios.filter(
    (usuario) =>
      usuario.profiles?.nome.toLowerCase().includes(busca.toLowerCase()) ||
      usuario.email.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários do Sistema
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Nome do usuário"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="usuario@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="senha">Senha *</Label>
                    <Input
                      id="senha"
                      type="password"
                      value={formData.senha}
                      onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                      placeholder="Mínimo 8 caracteres"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Função *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="caixa">Caixa</SelectItem>
                        <SelectItem value="estoquista">Estoquista</SelectItem>
                        <SelectItem value="financeiro">Financeiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="mb-3 block">Empresas *</Label>
                  <div className="border rounded-md p-4 space-y-2 max-h-[200px] overflow-y-auto">
                    {empresas.map((empresa) => (
                      <div key={empresa.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={empresa.id}
                          checked={formData.empresas_selecionadas.includes(empresa.id)}
                          onCheckedChange={() => toggleEmpresa(empresa.id)}
                        />
                        <Label htmlFor={empresa.id} className="cursor-pointer flex-1">
                          {empresa.nome}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? "Criando..." : "Criar Usuário"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Empresas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuariosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                usuariosFiltrados.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium">
                      {usuario.profiles?.nome || "-"}
                    </TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>
                      {usuario.user_roles.map((r) => (
                        <Badge key={r.role} variant="outline" className="mr-1">
                          {r.role}
                        </Badge>
                      ))}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {usuario.usuarios_empresas.map((ue) => (
                          <Badge key={ue.empresa_id} variant="secondary" className="text-xs">
                            <Building2 className="mr-1 h-3 w-3" />
                            {ue.empresas.nome}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
