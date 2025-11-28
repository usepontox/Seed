import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, Save, Building, Printer, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InputMask from "react-input-mask";
import { masks } from "@/lib/masks";
import EquipamentosTab from "@/components/config/EquipamentosTab";
import FiscalTab from "@/components/config/FiscalTab";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Configuracoes() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("perfil");
  const [profile, setProfile] = useState({
    nome: "",
    email: "",
    avatar_url: "",
  });
  const [senhas, setSenhas] = useState({
    atual: "",
    nova: "",
    confirmar: "",
  });
  const [empresa, setEmpresa] = useState({
    nome_empresa: "",
    cnpj: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    telefone: "",
    email: "",
  });

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
    loadProfile();
    loadEmpresa();
  }, [searchParams]);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile({
        nome: data.nome || "",
        email: data.email || "",
        avatar_url: user.user_metadata?.avatar_url || "",
      });
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("Você deve selecionar uma imagem para enviar.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      if (updateError) {
        throw updateError;
      }

      setProfile({ ...profile, avatar_url: publicUrl });
      toast({ title: "Avatar atualizado com sucesso!" });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar avatar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const loadEmpresa = async () => {
    const { data } = await supabase
      .from("configuracoes_empresa")
      .select("*")
      .limit(1)
      .single();

    if (data) {
      setEmpresa(data);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("profiles")
        .update({ nome: profile.nome })
        .eq("id", user.id);

      if (error) throw error;

      toast({ title: "Perfil atualizado com sucesso!" });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (senhas.nova !== senhas.confirmar) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    if (senhas.nova.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter no mínimo 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: senhas.nova,
      });

      if (error) throw error;

      toast({ title: "Senha alterada com sucesso!" });
      setSenhas({ atual: "", nova: "", confirmar: "" });
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: existing } = await supabase
        .from("configuracoes_empresa")
        .select("id")
        .limit(1)
        .single();

      let error;
      if (existing) {
        const result = await supabase
          .from("configuracoes_empresa")
          .update(empresa)
          .eq("id", existing.id);
        error = result.error;
      } else {
        const result = await supabase
          .from("configuracoes_empresa")
          .insert([empresa]);
        error = result.error;
      }

      if (error) throw error;

      toast({ title: "Dados da empresa salvos com sucesso!" });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar dados da empresa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas preferências e dados do sistema</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="perfil">
            <User className="h-4 w-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="seguranca">
            <Lock className="h-4 w-4 mr-2" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="empresa">
            <Building className="h-4 w-4 mr-2" />
            Empresa
          </TabsTrigger>

          <TabsTrigger value="equipamentos">
            <Printer className="h-4 w-4 mr-2" />
            Equipamentos
          </TabsTrigger>
          <TabsTrigger value="fiscal">
            <FileText className="h-4 w-4 mr-2" />
            Fiscal (NF-e)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Perfil</CardTitle>
              <CardDescription>
                Atualize suas informações pessoais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="flex flex-col items-center space-y-4 mb-4">
                  <div className="relative h-24 w-24">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profile.avatar_url} alt="Avatar" />
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                        {profile.nome?.charAt(0).toUpperCase() || profile.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      className="w-full max-w-xs"
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                    />
                    {uploading && <span className="text-sm text-muted-foreground">Enviando...</span>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input
                    id="nome"
                    value={profile.nome}
                    onChange={(e) => setProfile({ ...profile, nome: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado
                  </p>
                </div>

                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguranca">
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>
                Mantenha sua conta segura com uma senha forte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="senha-atual">Senha Atual</Label>
                  <Input
                    id="senha-atual"
                    type="password"
                    value={senhas.atual}
                    onChange={(e) => setSenhas({ ...senhas, atual: e.target.value })}
                    placeholder="Digite sua senha atual"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senha-nova">Nova Senha</Label>
                  <Input
                    id="senha-nova"
                    type="password"
                    value={senhas.nova}
                    onChange={(e) => setSenhas({ ...senhas, nova: e.target.value })}
                    placeholder="Digite a nova senha"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo de 6 caracteres
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senha-confirmar">Confirmar Nova Senha</Label>
                  <Input
                    id="senha-confirmar"
                    type="password"
                    value={senhas.confirmar}
                    onChange={(e) => setSenhas({ ...senhas, confirmar: e.target.value })}
                    placeholder="Confirme a nova senha"
                    required
                  />
                </div>

                <Button type="submit" disabled={loading}>
                  <Lock className="h-4 w-4 mr-2" />
                  {loading ? "Alterando..." : "Alterar Senha"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Empresa</CardTitle>
              <CardDescription>
                Configure as informações da sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveEmpresa} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="nome_empresa">Nome da Empresa *</Label>
                    <Input
                      id="nome_empresa"
                      value={empresa.nome_empresa}
                      onChange={(e) => setEmpresa({ ...empresa, nome_empresa: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <InputMask
                      mask={masks.cnpj}
                      value={empresa.cnpj}
                      onChange={(e) => setEmpresa({ ...empresa, cnpj: e.target.value })}
                    >
                      {(inputProps: any) => <Input {...inputProps} id="cnpj" />}
                    </InputMask>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone_empresa">Telefone</Label>
                    <InputMask
                      mask={masks.telefone}
                      value={empresa.telefone}
                      onChange={(e) => setEmpresa({ ...empresa, telefone: e.target.value })}
                    >
                      {(inputProps: any) => <Input {...inputProps} id="telefone_empresa" />}
                    </InputMask>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="email_empresa">E-mail</Label>
                    <Input
                      id="email_empresa"
                      type="email"
                      value={empresa.email}
                      onChange={(e) => setEmpresa({ ...empresa, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="endereco_empresa">Endereço</Label>
                    <Input
                      id="endereco_empresa"
                      value={empresa.endereco}
                      onChange={(e) => setEmpresa({ ...empresa, endereco: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cidade_empresa">Cidade</Label>
                    <Input
                      id="cidade_empresa"
                      value={empresa.cidade}
                      onChange={(e) => setEmpresa({ ...empresa, cidade: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estado_empresa">Estado</Label>
                    <Input
                      id="estado_empresa"
                      value={empresa.estado}
                      onChange={(e) => setEmpresa({ ...empresa, estado: e.target.value })}
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cep_empresa">CEP</Label>
                    <InputMask
                      mask={masks.cep}
                      value={empresa.cep}
                      onChange={(e) => setEmpresa({ ...empresa, cep: e.target.value })}
                    >
                      {(inputProps: any) => <Input {...inputProps} id="cep_empresa" />}
                    </InputMask>
                  </div>
                </div>
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Salvando..." : "Salvar Dados da Empresa"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="equipamentos">
          <EquipamentosTab />
        </TabsContent>

        <TabsContent value="fiscal">
          <FiscalTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
