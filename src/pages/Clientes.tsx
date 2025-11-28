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

interface Cliente {
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
  limite_credito?: number;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
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
    limite_credito: 0,
  });

  useEffect(() => {
    carregarClientes();
  }, []);

  const carregarClientes = async () => {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("nome");

    if (error) {
      toast({ title: "Erro ao carregar clientes", description: error.message, variant: "destructive" });
    } else {
      setClientes(data || []);
    }
  };

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.cpf?.includes(busca) ||
      c.cnpj?.includes(busca) ||
      c.email?.toLowerCase().includes(busca.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!empresaId) {
      toast({ title: "Erro", description: "Empresa não identificada", variant: "destructive" });
      return;
    }

    if (clienteEditando) {
      const { error } = await supabase
        .from("clientes")
        .update(formData)
        .eq("id", clienteEditando.id);

      if (error) {
        toast({ title: "Erro ao atualizar cliente", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Cliente atualizado com sucesso!" });
        carregarClientes();
        fecharDialog();
      }
    } else {
      const { error } = await supabase.from("clientes").insert([{ ...formData, empresa_id: empresaId }]);

      if (error) {
        toast({ title: "Erro ao criar cliente", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Cliente criado com sucesso!" });
        carregarClientes();
        fecharDialog();
      }
    }
  };

  const handleEditar = (cliente: Cliente) => {
    setClienteEditando(cliente);
    setFormData({
      nome: cliente.nome,
      cpf: cliente.cpf || "",
      cnpj: cliente.cnpj || "",
      email: cliente.email || "",
      telefone: cliente.telefone || "",
      endereco: cliente.endereco || "",
      cidade: cliente.cidade || "",
      estado: cliente.estado || "",
      cep: cliente.cep || "",
      limite_credito: cliente.limite_credito || 0,
    });
    setDialogAberto(true);
  };

  const handleDeletar = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este cliente?")) return;

    const { error } = await supabase.from("clientes").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao deletar cliente", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cliente deletado com sucesso!" });
      carregarClientes();
    }
  };

  const fecharDialog = () => {
    setDialogAberto(false);
    setClienteEditando(null);
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
      limite_credito: 0,
    });
  };

  const formatCurrency = (value?: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes</p>
        </div>
        <div className="flex gap-2">
          <ImportExportButtons
            data={clientes}
            onImport={async (newItems) => {
              if (!empresaId) {
                toast({ title: "Erro", description: "Empresa não identificada", variant: "destructive" });
                return;
              }
              const itemsComEmpresa = newItems.map(item => ({ ...item, empresa_id: empresaId }));
              const { error } = await supabase.from("clientes").insert(itemsComEmpresa);
              if (error) throw error;
              await carregarClientes();
            }}
            requiredColumns={["nome"]}
            keyField="nome"
            entityName="Clientes"
            templateColumns={{
              nome: "João Silva",
              cpf: "000.000.000-00",
              cnpj: "",
              email: "joao@email.com",
              telefone: "(11) 99999-9999",
              endereco: "Rua ABC, 123",
              cidade: "São Paulo",
              estado: "SP",
              cep: "00000-000",
              limite_credito: "1000.00"
            }}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setDialogAberto(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Novo Cliente
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cadastrar novo cliente</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{clienteEditando ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            <DialogDescription>Preencha os dados do cliente</DialogDescription>
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
              <div className="space-y-2">
                <Label htmlFor="limite_credito">Limite de Crédito</Label>
                <Input
                  id="limite_credito"
                  type="number"
                  step="0.01"
                  value={formData.limite_credito}
                  onChange={(e) => setFormData({ ...formData, limite_credito: parseFloat(e.target.value) || 0 })}
                />
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
          <CardTitle>Lista de Clientes</CardTitle>
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
                <TableHead>Limite Crédito</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientesFiltrados.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-medium">{cliente.nome}</TableCell>
                  <TableCell>{cliente.cpf || cliente.cnpj || "-"}</TableCell>
                  <TableCell>{cliente.email || "-"}</TableCell>
                  <TableCell>{cliente.telefone || "-"}</TableCell>
                  <TableCell>{cliente.cidade || "-"}</TableCell>
                  <TableCell>{formatCurrency(cliente.limite_credito)}</TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleEditar(cliente)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar cliente</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleDeletar(cliente.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir cliente</TooltipContent>
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
