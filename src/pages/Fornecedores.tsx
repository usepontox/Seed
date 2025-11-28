import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import InputMask from "react-input-mask";
import { masks } from "@/lib/masks";
import ImportExportButtons from "@/components/ImportExportButtons";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useEmpresa } from "@/hooks/use-empresa";
import { getErrorMessage } from "@/lib/errorUtils";

interface Fornecedor {
  id: string;
  nome: string;
  cpf?: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [busca, setBusca] = useState("");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [fornecedorEditando, setFornecedorEditando] = useState<Fornecedor | null>(null);
  const { toast } = useToast();
  const { empresaId } = useEmpresa();

  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    cnpj: "",
    email: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
  });

  useEffect(() => {
    carregarFornecedores();
  }, []);

  const carregarFornecedores = async () => {
    const { data, error } = await supabase
      .from("fornecedores")
      .select("*")
      .order("nome");

    if (error) {
      toast({ title: "Erro ao carregar fornecedores", description: error.message, variant: "destructive" });
    } else {
      setFornecedores(data || []);
    }
  };

  const fornecedoresFiltrados = fornecedores.filter(
    (f) =>
      f.nome.toLowerCase().includes(busca.toLowerCase()) ||
      f.cpf?.includes(busca) ||
      f.cnpj?.includes(busca) ||
      f.email?.toLowerCase().includes(busca.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!empresaId) {
      toast({ title: "Erro", description: "Empresa não identificada", variant: "destructive" });
      return;
    }

    if (fornecedorEditando) {
      const { error } = await supabase
        .from("fornecedores")
        .update(formData)
        .eq("id", fornecedorEditando.id);

      if (error) {
        toast({ title: "Erro ao atualizar fornecedor", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Fornecedor atualizado com sucesso!" });
        carregarFornecedores();
        fecharDialog();
      }
    } else {
      // Limpar campos vazios (exceto nome que é obrigatório)
      const { error } = await supabase.from("fornecedores").insert([{ 
        nome: formData.nome,
        cpf: formData.cpf?.trim() || null,
        cnpj: formData.cnpj?.trim() || null,
        email: formData.email?.trim() || null,
        telefone: formData.telefone?.trim() || null,
        endereco: formData.endereco?.trim() || null,
        cidade: formData.cidade?.trim() || null,
        estado: formData.estado?.trim() || null,
        cep: formData.cep?.trim() || null,
        empresa_id: empresaId 
      }]);

      if (error) {
        toast({ title: "Erro ao criar fornecedor", description: getErrorMessage(error), variant: "destructive" });
      } else {
        toast({ title: "Fornecedor criado com sucesso!" });
        carregarFornecedores();
        fecharDialog();
      }
    }
  };

  const handleEditar = (fornecedor: Fornecedor) => {
    setFornecedorEditando(fornecedor);
    setFormData({
      nome: fornecedor.nome,
      cpf: fornecedor.cpf || "",
      cnpj: fornecedor.cnpj || "",
      email: fornecedor.email || "",
      telefone: fornecedor.telefone || "",
      endereco: fornecedor.endereco || "",
      cidade: fornecedor.cidade || "",
      estado: fornecedor.estado || "",
      cep: fornecedor.cep || "",
    });
    setDialogAberto(true);
  };

  const handleDeletar = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este fornecedor?")) return;

    const { error } = await supabase.from("fornecedores").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao deletar fornecedor", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Fornecedor deletado com sucesso!" });
      carregarFornecedores();
    }
  };

  const fecharDialog = () => {
    setDialogAberto(false);
    setFornecedorEditando(null);
    setFormData({
      nome: "",
      cpf: "",
      cnpj: "",
      email: "",
      telefone: "",
      endereco: "",
      cidade: "",
      estado: "",
      cep: "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie seus fornecedores</p>
        </div>
        <div className="flex gap-2">
          <ImportExportButtons
            data={fornecedores}
            onImport={async (newItems) => {
              if (!empresaId) {
                toast({ title: "Erro", description: "Empresa não identificada", variant: "destructive" });
                return;
              }
              const itemsComEmpresa = newItems.map(item => ({ ...item, empresa_id: empresaId }));
              const { error } = await supabase.from("fornecedores").insert(itemsComEmpresa);
              if (error) throw error;
              await carregarFornecedores();
            }}
            requiredColumns={["nome"]}
            keyField="nome"
            entityName="Fornecedores"
            templateColumns={{
              nome: "Fornecedor ABC Ltda",
              cpf: "",
              cnpj: "00.000.000/0000-00",
              email: "contato@fornecedor.com",
              telefone: "(11) 3333-4444",
              endereco: "Av. Comercial, 456",
              cidade: "São Paulo",
              estado: "SP",
              cep: "00000-000"
            }}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setDialogAberto(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Novo Fornecedor
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cadastrar novo fornecedor</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{fornecedorEditando ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
            <DialogDescription>Preencha os dados do fornecedor</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <InputMask
                  mask={masks.cpf}
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                >
                  {(inputProps: any) => <Input {...inputProps} id="cpf" placeholder="000.000.000-00" />}
                </InputMask>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <InputMask
                  mask={masks.cnpj}
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                >
                  {(inputProps: any) => <Input {...inputProps} id="cnpj" placeholder="00.000.000/0000-00" />}
                </InputMask>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <InputMask
                  mask={masks.telefone}
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                >
                  {(inputProps: any) => <Input {...inputProps} id="telefone" placeholder="(00) 00000-0000" />}
                </InputMask>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <InputMask
                  mask={masks.cep}
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                >
                  {(inputProps: any) => <Input {...inputProps} id="cep" placeholder="00000-000" />}
                </InputMask>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={fecharDialog}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Fornecedores</CardTitle>
          <CardDescription>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF, CNPJ ou email..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fornecedoresFiltrados.map((fornecedor) => (
                <TableRow key={fornecedor.id}>
                  <TableCell className="font-medium">{fornecedor.nome}</TableCell>
                  <TableCell>{fornecedor.cpf || fornecedor.cnpj || "-"}</TableCell>
                  <TableCell>{fornecedor.email || "-"}</TableCell>
                  <TableCell>{fornecedor.telefone || "-"}</TableCell>
                  <TableCell>{fornecedor.cidade || "-"}</TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleEditar(fornecedor)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar fornecedor</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleDeletar(fornecedor.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir fornecedor</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
