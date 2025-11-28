import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmpresa } from "@/hooks/use-empresa";
import { getErrorMessage } from "@/lib/errorUtils";

interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  sku?: string;
  codigo_barras?: string;
  unidade: string;
  custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  ativo: boolean;
}

interface ProdutoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  produtoEditando?: Produto | null;
}

export default function ProdutoForm({ open, onOpenChange, onSuccess, produtoEditando }: ProdutoFormProps) {
  const { toast } = useToast();
  const { empresaId } = useEmpresa();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: produtoEditando?.nome || "",
    descricao: produtoEditando?.descricao || "",
    sku: produtoEditando?.sku || "",
    codigo_barras: produtoEditando?.codigo_barras || "",
    ncm: (produtoEditando as any)?.ncm || "",
    unidade: produtoEditando?.unidade || "UN",
    custo: produtoEditando?.custo?.toString() || "",
    preco_venda: produtoEditando?.preco_venda?.toString() || "",
    estoque_atual: produtoEditando?.estoque_atual?.toString() || "0",
    estoque_minimo: produtoEditando?.estoque_minimo?.toString() || "0",
    ativo: produtoEditando?.ativo ?? true
  });

  // Atualizar form quando produtoEditando mudar
  useEffect(() => {
    if (produtoEditando) {
      setFormData({
        nome: produtoEditando.nome,
        descricao: produtoEditando.descricao || "",
        sku: produtoEditando.sku || "",
        codigo_barras: produtoEditando.codigo_barras || "",
        ncm: (produtoEditando as any).ncm || "",
        unidade: produtoEditando.unidade,
        custo: produtoEditando.custo.toString(),
        preco_venda: produtoEditando.preco_venda.toString(),
        estoque_atual: produtoEditando.estoque_atual.toString(),
        estoque_minimo: produtoEditando.estoque_minimo.toString(),
        ativo: produtoEditando.ativo
      });
    } else {
      setFormData({
        nome: "",
        descricao: "",
        sku: "",
        codigo_barras: "",
        ncm: "",
        unidade: "UN",
        custo: "",
        preco_venda: "",
        estoque_atual: "0",
        estoque_minimo: "0",
        ativo: true
      });
    }
  }, [produtoEditando]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!empresaId) {
        toast({ title: "Erro", description: "Empresa não identificada", variant: "destructive" });
        return;
      }

      const dados = {
        nome: formData.nome,
        descricao: formData.descricao || null,
        sku: formData.sku || null,
        codigo_barras: formData.codigo_barras || null,
        ncm: formData.ncm || null,
        unidade: formData.unidade,
        custo: parseFloat(formData.custo) || 0,
        preco_venda: parseFloat(formData.preco_venda) || 0,
        estoque_atual: parseInt(formData.estoque_atual) || 0,
        estoque_minimo: parseInt(formData.estoque_minimo) || 0,
        ativo: formData.ativo,
        empresa_id: empresaId,
      };

      let error;
      
      if (produtoEditando) {
        const result = await supabase
          .from("produtos")
          .update(dados)
          .eq("id", produtoEditando.id);
        error = result.error;
      } else {
        const result = await supabase
          .from("produtos")
          .insert([dados]);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: produtoEditando ? "Produto atualizado" : "Produto cadastrado",
        description: produtoEditando 
          ? "O produto foi atualizado com sucesso." 
          : "O produto foi cadastrado com sucesso."
      });

      setFormData({
        nome: "",
        descricao: "",
        sku: "",
        codigo_barras: "",
        ncm: "",
        unidade: "UN",
        custo: "",
        preco_venda: "",
        estoque_atual: "0",
        estoque_minimo: "0",
        ativo: true
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar produto",
        description: getErrorMessage(error),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{produtoEditando ? "Editar Produto" : "Novo Produto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="codigo_barras">Código de Barras</Label>
              <Input
                id="codigo_barras"
                value={formData.codigo_barras}
                onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="ncm">NCM (8 dígitos)</Label>
              <Input
                id="ncm"
                value={formData.ncm}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                  setFormData({ ...formData, ncm: value });
                }}
                placeholder="00000000"
                maxLength={8}
              />
            </div>

            <div>
              <Label htmlFor="unidade">Unidade *</Label>
              <Input
                id="unidade"
                value={formData.unidade}
                onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="custo">Custo (R$) *</Label>
              <Input
                id="custo"
                type="number"
                step="0.01"
                min="0"
                value={formData.custo}
                onChange={(e) => setFormData({ ...formData, custo: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="preco_venda">Preço de Venda (R$) *</Label>
              <Input
                id="preco_venda"
                type="number"
                step="0.01"
                min="0"
                value={formData.preco_venda}
                onChange={(e) => setFormData({ ...formData, preco_venda: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="estoque_atual">Estoque Atual</Label>
              <Input
                id="estoque_atual"
                type="number"
                min="0"
                value={formData.estoque_atual}
                onChange={(e) => setFormData({ ...formData, estoque_atual: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
              <Input
                id="estoque_minimo"
                type="number"
                min="0"
                value={formData.estoque_minimo}
                onChange={(e) => setFormData({ ...formData, estoque_minimo: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
              <Label htmlFor="ativo">Produto Ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
