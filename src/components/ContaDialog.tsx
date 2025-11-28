import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmpresa } from "@/hooks/use-empresa";
import { getErrorMessage } from "@/lib/errorUtils";

interface ContaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tipo: "receber" | "pagar";
  conta?: any;
}

export default function ContaDialog({ open, onOpenChange, onSuccess, tipo, conta }: ContaDialogProps) {
  const { toast } = useToast();
  const { empresaId } = useEmpresa();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    descricao: "",
    valor: "",
    data_vencimento: "",
    categoria: "",
    observacoes: "",
    status: "pendente",
  });

  useEffect(() => {
    if (conta) {
      setFormData({
        descricao: conta.descricao || "",
        valor: conta.valor?.toString() || "",
        data_vencimento: conta.data_vencimento || "",
        categoria: conta.categoria || "",
        observacoes: conta.observacoes || "",
        status: conta.status || "pendente",
      });
    } else {
      setFormData({
        descricao: "",
        valor: "",
        data_vencimento: "",
        categoria: "",
        observacoes: "",
        status: "pendente",
      });
    }
  }, [conta, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tabela = tipo === "receber" ? "contas_receber" : "contas_pagar";
      if (!empresaId) {
        toast({ title: "Erro", description: "Empresa não identificada", variant: "destructive" });
        return;
      }

      const dados: any = {
        descricao: formData.descricao,
        valor: parseFloat(formData.valor),
        data_vencimento: formData.data_vencimento,
        observacoes: formData.observacoes || null,
        status: formData.status,
        empresa_id: empresaId,
      };

      // categoria só existe em contas_pagar
      if (tipo === "pagar") {
        dados.categoria = formData.categoria || null;
      }

      if (conta) {
        const { error } = await supabase.from(tabela).update(dados).eq("id", conta.id);
        if (error) throw error;
        toast({ title: "Conta atualizada com sucesso!" });
      } else {
        const { error } = await supabase.from(tabela).insert([dados]);
        if (error) throw error;
        toast({ title: "Conta criada com sucesso!" });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar conta",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {conta ? "Editar" : "Nova"} Conta a {tipo === "receber" ? "Receber" : "Pagar"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Input
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_vencimento">Vencimento *</Label>
              <Input
                id="data_vencimento"
                type="date"
                value={formData.data_vencimento}
                onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria</Label>
            <Input
              id="categoria"
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              placeholder="Ex: Aluguel, Fornecedor, Cliente..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
