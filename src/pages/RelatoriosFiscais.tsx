import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Download, 
  Filter, 
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  FileDown
} from "lucide-react";
import { exportToExcel } from "@/lib/excelUtils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmpresa } from "@/hooks/use-empresa";

interface NotaFiscal {
  id: string;
  numero_venda: string;
  data_venda: string;
  total: number;
  nfce_status: string;
  nfce_chave?: string;
  nfce_protocolo?: string;
  nfce_data_emissao?: string;
  nfce_xml?: string;
  forma_pagamento: string;
  cliente?: {
    nome: string;
    cpf?: string;
    cnpj?: string;
  };
}

export default function RelatoriosFiscais() {
  const { toast } = useToast();
  const { empresaId } = useEmpresa();
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [buscaChave, setBuscaChave] = useState("");
  const [buscaNumero, setBuscaNumero] = useState("");

  useEffect(() => {
    loadNotas();
  }, [empresaId]);

  const loadNotas = async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("vendas")
        .select(`
          id,
          numero_venda,
          data_venda,
          total,
          nfce_status,
          nfce_chave,
          nfce_protocolo,
          nfce_data_emissao,
          forma_pagamento,
          clientes:cliente_id (
            nome,
            cpf,
            cnpj
          )
        `)
        .eq("empresa_id", empresaId)
        .neq("status", "cancelada")
        .order("data_venda", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      setNotas(data as any || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar notas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    loadNotas();
  };

  const limparFiltros = () => {
    setDataInicio("");
    setDataFim("");
    setStatusFiltro("todos");
    setBuscaChave("");
    setBuscaNumero("");
    loadNotas();
  };

  const downloadXmlsEmLote = async () => {
    const notasEmitidas = notasFiltradas.filter(n => n.nfce_status === "emitida" && n.nfce_xml);
    
    if (notasEmitidas.length === 0) {
      toast({
        title: "Nenhum XML disponível",
        description: "Não há notas emitidas no período selecionado",
        variant: "destructive",
      });
      return;
    }

    let sucessos = 0;
    for (const nota of notasEmitidas) {
      try {
        const blob = new Blob([nota.nfce_xml!], { type: "application/xml" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `NFCe_${nota.numero_venda}_${nota.nfce_chave || "sem_chave"}.xml`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        sucessos++;
        // Pequeno delay entre downloads
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error("Erro ao baixar XML:", error);
      }
    }

    toast({
      title: "Download em lote concluído",
      description: `${sucessos} de ${notasEmitidas.length} XMLs baixados com sucesso`,
    });
  };

  const exportarExcel = () => {
    const dadosExportacao = notasFiltradas.map((n) => ({
      "Data": formatDate(n.data_venda),
      "Nº Venda": n.numero_venda,
      "Cliente": n.cliente?.nome || "Anônimo",
      "CPF/CNPJ": n.cliente?.cpf || n.cliente?.cnpj || "-",
      "Valor Total": n.total,
      "Forma Pagamento": n.forma_pagamento,
      "Status NFC-e": n.nfce_status || "pendente",
      "Chave NFC-e": n.nfce_chave || "-",
    }));

    const periodo = dataInicio && dataFim 
      ? `_${dataInicio}_a_${dataFim}`
      : "";

    exportToExcel(dadosExportacao, {
      sheetName: "Relatório Fiscal",
      fileName: `relatorio_fiscal${periodo}.xlsx`,
    });

    toast({
      title: "Relatório exportado",
      description: `${dadosExportacao.length} registros exportados para Excel`,
    });
  };

  const downloadXml = async (notaId: string) => {
    try {
      const { data } = await supabase
        .from("vendas")
        .select("nfce_xml, numero_venda")
        .eq("id", notaId)
        .single();

      if (data?.nfce_xml) {
        const blob = new Blob([data.nfce_xml], { type: "text/xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `NFCe_${data.numero_venda}.xml`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        toast({
          title: "XML não disponível",
          description: "Esta nota ainda não possui XML gerado",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao baixar XML",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; icon: any; label: string }> = {
      pendente: { variant: "outline", icon: Clock, label: "Pendente" },
      processando: { variant: "secondary", icon: Clock, label: "Processando" },
      emitida: { variant: "default", icon: CheckCircle, label: "Emitida" },
      erro: { variant: "destructive", icon: AlertCircle, label: "Erro" },
      cancelada: { variant: "destructive", icon: X, label: "Cancelada" },
    };

    const config = statusMap[status] || statusMap.pendente;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const notasFiltradas = notas.filter((nota) => {
    if (statusFiltro !== "todos" && nota.nfce_status !== statusFiltro) return false;
    if (buscaChave && !nota.nfce_chave?.includes(buscaChave)) return false;
    if (buscaNumero && !nota.numero_venda.includes(buscaNumero)) return false;
    if (dataInicio && nota.data_venda < dataInicio) return false;
    if (dataFim && nota.data_venda > dataFim) return false;
    return true;
  });

  const totalEmitidas = notas.filter(n => n.nfce_status === "emitida").length;
  const totalPendentes = notas.filter(n => n.nfce_status === "pendente").length;
  const totalErro = notas.filter(n => n.nfce_status === "erro").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Análises e Relatórios Fiscais
          </h1>
          <p className="text-muted-foreground">Gestão de Notas Fiscais e Cupons Emitidos</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={exportarExcel}
            disabled={notasFiltradas.length === 0}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
          <Button 
            variant="outline" 
            onClick={downloadXmlsEmLote}
            disabled={notasFiltradas.filter(n => n.nfce_status === "emitida" && n.nfce_xml).length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Baixar XMLs em Lote
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">NFC-e Emitidas</CardTitle>
            <CheckCircle className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{totalEmitidas}</div>
            <p className="text-xs text-muted-foreground">Cupons fiscais autorizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">NFC-e Pendentes</CardTitle>
            <Clock className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{totalPendentes}</div>
            <p className="text-xs text-muted-foreground">Aguardando emissão</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Com Erro</CardTitle>
            <AlertCircle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{totalErro}</div>
            <p className="text-xs text-muted-foreground">Requer atenção</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Busca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="emitida">Emitida</SelectItem>
                  <SelectItem value="erro">Erro</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Número da Venda</Label>
              <Input
                placeholder="Buscar..."
                value={buscaNumero}
                onChange={(e) => setBuscaNumero(e.target.value)}
              />
            </div>
            <div>
              <Label>Chave NFC-e</Label>
              <Input
                placeholder="Buscar chave..."
                value={buscaChave}
                onChange={(e) => setBuscaChave(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={aplicarFiltros} size="sm">
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
            <Button onClick={limparFiltros} variant="outline" size="sm">
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Notas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Notas Fiscais</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando...</p>
          ) : notasFiltradas.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhuma nota encontrada com os filtros aplicados
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Venda</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Chave NFC-e</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notasFiltradas.map((nota) => (
                    <TableRow key={nota.id}>
                      <TableCell className="font-medium">{nota.numero_venda}</TableCell>
                      <TableCell className="text-sm">{formatDate(nota.data_venda)}</TableCell>
                      <TableCell>
                        {nota.cliente?.nome || "Anônimo"}
                        {nota.cliente?.cpf && (
                          <div className="text-xs text-muted-foreground">
                            CPF: {nota.cliente.cpf}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-success">
                        {formatCurrency(nota.total)}
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {nota.forma_pagamento.replace("_", " ")}
                      </TableCell>
                      <TableCell>{getStatusBadge(nota.nfce_status)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {nota.nfce_chave || "-"}
                      </TableCell>
                      <TableCell>
                        {nota.nfce_xml && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadXml(nota.id)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            XML
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
