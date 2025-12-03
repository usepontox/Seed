import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { importFromExcel, exportToExcel, ImportResult } from "@/lib/excelUtils";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface ImportExportButtonsProps<T extends Record<string, any>> {
  data: T[];
  onImport: (newItems: T[]) => Promise<void>;
  requiredColumns: string[];
  keyField: string;
  entityName: string;
  exportFileName?: string;
  templateColumns?: { [key: string]: any };
}

export default function ImportExportButtons<T extends Record<string, any>>({
  data,
  onImport,
  requiredColumns,
  keyField,
  entityName,
  exportFileName,
  templateColumns
}: ImportExportButtonsProps<T>) {
  const { toast } = useToast();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult<T> | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const handleImportClick = () => {
    setTemplateDialogOpen(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importFromExcel<T>(file, requiredColumns, keyField, data);
      setImportResult(result);
      setImportDialogOpen(true);
      setTemplateDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao importar arquivo",
        description: error.message,
        variant: "destructive"
      });
    }

    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!importResult) return;

    try {
      await onImport(importResult.newItems);
      toast({
        title: `${importResult.newItems.length} ${entityName}(s) importado(s)!`,
        description: importResult.duplicates.length > 0
          ? `${importResult.duplicates.length} registro(s) já existente(s) foram ignorados.`
          : undefined
      });
      setImportDialogOpen(false);
      setImportResult(null);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar dados",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleExport = () => {
    if (data.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        variant: "destructive"
      });
      return;
    }

    exportToExcel(data, {
      fileName: exportFileName || `${entityName.toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: entityName
    });

    toast({
      title: "Exportação concluída!",
      description: `${data.length} registro(s) exportado(s).`
    });
  };

  return (
    <>
      <div className="flex gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleImportClick}>
                <Upload className="h-4 w-4 mr-2" />
                Importar Excel
              </Button>
            </TooltipTrigger>
            <TooltipContent>Importar dados de planilha Excel</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Info className="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <div className="space-y-2">
                <p className="font-semibold">Como importar {entityName.toLowerCase()}:</p>
                <div>
                  <p className="text-xs font-medium">Colunas obrigatórias:</p>
                  <p className="text-xs">• {requiredColumns.join(', ')}</p>
                </div>
                <p className="text-xs text-muted-foreground">Os nomes das colunas não diferenciam maiúsculas/minúsculas</p>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </TooltipTrigger>
            <TooltipContent>Exportar todos os dados para Excel</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Dialog Template */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Modelo de Importação - {entityName}
            </DialogTitle>
            <DialogDescription>
              Prepare sua planilha Excel com as seguintes colunas obrigatórias:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="font-semibold mb-2">Colunas Obrigatórias:</h4>
              <div className="flex flex-wrap gap-2">
                {requiredColumns.map((col) => (
                  <Badge key={col} variant="default">{col}</Badge>
                ))}
              </div>
            </div>

            {templateColumns && (
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Exemplo de Linha:</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(templateColumns).map((key) => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      {Object.values(templateColumns).map((value, idx) => (
                        <TableCell key={idx} className="text-xs">
                          {value}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm">
                <strong>Dica:</strong> Durante a importação, registros já existentes serão destacados
                em <Badge variant="outline" className="bg-green-100">verde</Badge> e novos registros em <Badge variant="outline" className="bg-yellow-100">amarelo</Badge>.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => document.getElementById('import-file-input')?.click()}>
              Selecionar Arquivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Preview Import */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pré-visualização da Importação</DialogTitle>
            <DialogDescription>
              {importResult && (
                <>
                  Total: {importResult.data.length} registros |
                  <span className="text-success ml-2">Novos: {importResult.newItems.length}</span> |
                  <span className="text-warning ml-2">Existentes: {importResult.duplicates.length}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {importResult && (
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    {requiredColumns.map((col) => (
                      <TableHead key={col}>{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importResult.data.slice(0, 50).map((item, idx) => {
                    const isDuplicate = importResult.duplicates.some(
                      d => d[keyField] === item[keyField]
                    );
                    return (
                      <TableRow key={idx} className={isDuplicate ? "bg-green-50 dark:bg-green-950" : "bg-yellow-50 dark:bg-yellow-950"}>
                        <TableCell>
                          <Badge variant={isDuplicate ? "outline" : "default"}>
                            {isDuplicate ? "Existente" : "Novo"}
                          </Badge>
                        </TableCell>
                        {requiredColumns.map((col) => (
                          <TableCell key={col} className="text-xs">
                            {String(item[col] || "-")}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {importResult.data.length > 50 && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  ... e mais {importResult.data.length - 50} registro(s)
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmImport}>
              Importar {importResult?.newItems.length || 0} Novos Registros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <input
        id="import-file-input"
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />
    </>
  );
}
