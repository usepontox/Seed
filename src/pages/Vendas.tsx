import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Receipt, X, Filter, Plus, FileDown, FileText } from "lucide-react";
import { exportToExcel } from "@/lib/excelUtils";
import CupomFiscal from "@/components/CupomFiscal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import InputMask from "react-input-mask";
import { masks } from "@/lib/masks";

interface Venda {
  id: string;
  numero_venda: string;
  data_venda: string;
  total: number;
  forma_pagamento: string;
  status: string;
  clientes?: { nome: string; cpf?: string; cnpj?: string } | null;
}

export default function Vendas() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [busca, setBusca] = useState("");
  const [cupomVendaId, setCupomVendaId] = useState<string | null>(null);
  const [cupomOpen, setCupomOpen] = useState(false);
  const [vendaCancelarId, setVendaCancelarId] = useState<string | null>(null);
  const [emitindoNFe, setEmitindoNFe] = useState<string | null>(null);

  // Filtros avançados
  const [filtros, setFiltros] = useState({
    nomeCliente: "",
    dataInicio: "",
    dataFim: "",
    cpfCnpj: ""
  });

  useEffect(() => {
    loadVendas();
  }, []);

  const loadVendas = async () => {
    const { data, error } = await supabase
      .from("vendas")
      .select(`
        *,
        clientes:cliente_id (nome, cpf, cnpj)
      `)
      .order("data_venda", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar vendas",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setVendas(data as any || []);
    }
  };

  const cancelarVenda = async () => {
    if (!vendaCancelarId) return;

    const { error } = await supabase
      .from("vendas")
      .update({ status: "cancelada" })
      .eq("id", vendaCancelarId);

    if (error) {
      toast({
        title: "Erro ao cancelar venda",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Venda cancelada! O estoque foi automaticamente restaurado." });
      loadVendas();
    }

    setVendaCancelarId(null);
  };

  const visualizarCupom = (vendaId: string) => {
    setCupomVendaId(vendaId);
    setCupomOpen(true);
  };

  const handleEmitirNFe = async (vendaId: string) => {
    setEmitindoNFe(vendaId);
    try {
      const { data, error } = await supabase.functions.invoke('emitir-docfiscal', {
        body: { venda_id: vendaId, tipo: 'NFE' }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "NF-e Emitida com Sucesso!",
          description: "A nota foi autorizada pela SEFAZ (Simulação).",
        });
      } else {
        throw new Error(data.error || "Erro desconhecido");
      }
    } catch (error: any) {
      toast({
        title: "Erro ao emitir NF-e",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEmitindoNFe(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const limparFiltros = () => {
    setFiltros({
      nomeCliente: "",
      dataInicio: "",
      dataFim: "",
      cpfCnpj: ""
    });
    setBusca("");
  };

  const vendasFiltradas = vendas.filter((v) => {
    // Filtro de busca rápida
    const matchBuscaRapida = busca === "" ||
      v.numero_venda.toLowerCase().includes(busca.toLowerCase()) ||
      v.clientes?.nome?.toLowerCase().includes(busca.toLowerCase());

    // Filtro por nome do cliente
    const matchNomeCliente = filtros.nomeCliente === "" ||
      v.clientes?.nome?.toLowerCase().includes(filtros.nomeCliente.toLowerCase());

    // Filtro por CPF/CNPJ
    const matchCpfCnpj = filtros.cpfCnpj === "" ||
      v.clientes?.cpf?.includes(filtros.cpfCnpj) ||
      v.clientes?.cnpj?.includes(filtros.cpfCnpj);

    // Filtro por período
    const dataVenda = new Date(v.data_venda);
    const matchDataInicio = filtros.dataInicio === "" ||
      dataVenda >= new Date(filtros.dataInicio + "T00:00:00");
    const matchDataFim = filtros.dataFim === "" ||
      dataVenda <= new Date(filtros.dataFim + "T23:59:59");

    return matchBuscaRapida && matchNomeCliente && matchCpfCnpj && matchDataInicio && matchDataFim;
  });

  const handleExportExcel = () => {
    const dadosExportacao = vendasFiltradas.map((v) => ({
      "Nº Venda": v.numero_venda,
      "Cliente": v.clientes?.nome || "Anônimo",
      "CPF/CNPJ": v.clientes?.cpf || v.clientes?.cnpj || "-",
      "Data/Hora": formatDate(v.data_venda),
      "Total": v.total,
      "Forma Pagamento": v.forma_pagamento.toUpperCase(),
      "Status": v.status,
    }));

    const periodo = filtros.dataInicio && filtros.dataFim
      ? `_${filtros.dataInicio}_a_${filtros.dataFim}`
      : "";

    exportToExcel(dadosExportacao, {
      sheetName: "Vendas",
      fileName: `relatorio_vendas${periodo}.xlsx`,
    });

    toast({
      title: "Relatório exportado",
      description: `${dadosExportacao.length} vendas exportadas para Excel`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho com botão Nova Venda */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendas</h1>
          <p className="text-muted-foreground">Histórico completo de vendas</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={vendasFiltradas.length === 0}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
          <Button onClick={() => navigate("/pdv")}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Venda
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lista de Vendas</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros Avançados
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nomeCliente" className="text-sm font-medium">
                      Nome do Cliente
                    </Label>
                    <Input
                      id="nomeCliente"
                      value={filtros.nomeCliente}
                      onChange={(e) => setFiltros({ ...filtros, nomeCliente: e.target.value })}
                      placeholder="Digite o nome..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cpfCnpj" className="text-sm font-medium">
                      CPF ou CNPJ
                    </Label>
                    <Input
                      id="cpfCnpj"
                      value={filtros.cpfCnpj}
                      onChange={(e) => setFiltros({ ...filtros, cpfCnpj: e.target.value })}
                      placeholder="Digite CPF ou CNPJ..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dataInicio" className="text-sm font-medium">
                      Data Início
                    </Label>
                    <Input
                      id="dataInicio"
                      type="date"
                      value={filtros.dataInicio}
                      onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dataFim" className="text-sm font-medium">
                      Data Fim
                    </Label>
                    <Input
                      id="dataFim"
                      type="date"
                      value={filtros.dataFim}
                      onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={limparFiltros}
                    className="w-full"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Busca rápida por número da venda ou cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            Mostrando {vendasFiltradas.length} de {vendas.length} vendas
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Venda</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendasFiltradas.map((venda) => (
                <TableRow key={venda.id}>
                  <TableCell className="font-medium">{venda.numero_venda}</TableCell>
                  <TableCell>{venda.clientes?.nome || "Anônimo"}</TableCell>
                  <TableCell className="text-sm">
                    {venda.clientes?.cpf || venda.clientes?.cnpj || "-"}
                  </TableCell>
                  <TableCell>{formatDate(venda.data_venda)}</TableCell>
                  <TableCell className="font-bold text-success">
                    {formatCurrency(venda.total)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{venda.forma_pagamento.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        venda.status === "finalizada"
                          ? "default"
                          : venda.status === "cancelada"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {venda.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => visualizarCupom(venda.id)}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        NFC-e
                      </Button>
                      {venda.status === "finalizada" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEmitirNFe(venda.id)}
                            disabled={emitindoNFe === venda.id}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            {emitindoNFe === venda.id ? (
                              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2" />
                            ) : (
                              <FileText className="h-4 w-4 mr-2" />
                            )}
                            NF-e
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setVendaCancelarId(venda.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CupomFiscal
        vendaId={cupomVendaId}
        open={cupomOpen}
        onOpenChange={setCupomOpen}
      />

      <AlertDialog open={!!vendaCancelarId} onOpenChange={() => setVendaCancelarId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Venda e Devolver ao Estoque</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar esta venda?
              <br /><br />
              <strong className="text-success">✓ O estoque será automaticamente restaurado</strong>
              <br />
              <strong className="text-warning">⚠ Esta ação não pode ser desfeita</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={cancelarVenda} className="bg-destructive hover:bg-destructive/90">
              Sim, Cancelar Venda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
