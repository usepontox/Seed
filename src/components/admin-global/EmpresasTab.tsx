import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Building2, Search } from "lucide-react";
import InputMask from "react-input-mask";
import { Switch } from "@/components/ui/switch";

interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  ativo: boolean;
  created_at: string;
}

export function EmpresasTab() {
  const { toast } = useToast();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [empresaEdit, setEmpresaEdit] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    telefone: "",
    email: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    ativo: true,
  });

  useEffect(() => {
    loadEmpresas();
  }, []);

  const loadEmpresas = async () => {
    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .order("nome");

    if (error) {
      toast({
        title: "Erro ao carregar empresas",
        description: "Não foi possível carregar a lista de empresas",
        variant: "destructive",
      });
      return;
    }

    setEmpresas(data || []);
  };

  const handleOpenDialog = (empresa?: Empresa) => {
    if (empresa) {
      setEmpresaEdit(empresa);
      setFormData({
        nome: empresa.nome,
        cnpj: empresa.cnpj || "",
        telefone: empresa.telefone || "",
        email: empresa.email || "",
        endereco: empresa.endereco || "",
        cidade: empresa.cidade || "",
        estado: empresa.estado || "",
        cep: empresa.cep || "",
        ativo: empresa.ativo,
      });
    } else {
      setEmpresaEdit(null);
      setFormData({
        nome: "",
        cnpj: "",
        telefone: "",
        email: "",
        endereco: "",
        cidade: "",
        cep: "",
        estado: "",
        ativo: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome da empresa é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (empresaEdit) {
        // Atualizar
        const { error } = await supabase
          .from("empresas")
          .update(formData)
          .eq("id", empresaEdit.id);

        if (error) throw error;

        toast({
          title: "Empresa atualizada",
          description: "Os dados da empresa foram atualizados com sucesso",
        });
      } else {
        // Criar
        const { error } = await supabase
          .from("empresas")
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Empresa criada",
          description: "A empresa foi cadastrada com sucesso",
        });
      }

      setDialogOpen(false);
      loadEmpresas();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar empresa",
        description: "Não foi possível salvar os dados da empresa",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const empresasFiltradas = empresas.filter((empresa) =>
    empresa.nome.toLowerCase().includes(busca.toLowerCase()) ||
    empresa.cnpj?.includes(busca) ||
    empresa.cidade?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Empresas Cadastradas
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Empresa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {empresaEdit ? "Editar Empresa" : "Nova Empresa"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nome">Nome da Empresa *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Nome da empresa"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <InputMask
                      mask="99.999.999/9999-99"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    >
                      {(inputProps: any) => <Input {...inputProps} id="cnpj" placeholder="00.000.000/0000-00" />}
                    </InputMask>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <InputMask
                      mask="(99) 99999-9999"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    >
                      {(inputProps: any) => <Input {...inputProps} id="telefone" placeholder="(00) 00000-0000" />}
                    </InputMask>
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contato@empresa.com"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Rua, número"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      placeholder="Cidade"
                    />
                  </div>
                  <div>
                    <Label htmlFor="estado">Estado</Label>
                    <Input
                      id="estado"
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                      placeholder="UF"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <InputMask
                      mask="99999-999"
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    >
                      {(inputProps: any) => <Input {...inputProps} id="cep" placeholder="00000-000" />}
                    </InputMask>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                  <Label htmlFor="ativo">Empresa ativa</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? "Salvando..." : "Salvar"}
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
              placeholder="Buscar por nome, CNPJ ou cidade..."
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
                <TableHead>CNPJ</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma empresa encontrada
                  </TableCell>
                </TableRow>
              ) : (
                empresasFiltradas.map((empresa) => (
                  <TableRow key={empresa.id}>
                    <TableCell className="font-medium">{empresa.nome}</TableCell>
                    <TableCell>{empresa.cnpj || "-"}</TableCell>
                    <TableCell>
                      {empresa.cidade && empresa.estado
                        ? `${empresa.cidade}/${empresa.estado}`
                        : "-"}
                    </TableCell>
                    <TableCell>{empresa.telefone || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={empresa.ativo ? "default" : "secondary"}>
                        {empresa.ativo ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(empresa)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
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
