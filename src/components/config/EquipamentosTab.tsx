import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, RefreshCw, Plus, Wifi, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface PrinterDevice {
    id: string;
    name: string;
    ip: string;
    type: "network" | "usb";
    status: "online" | "offline";
    isDefault: boolean;
}

export default function EquipamentosTab() {
    const { toast } = useToast();
    const [scanning, setScanning] = useState(false);

    // Inicializar com dados do localStorage se existirem
    const [printers, setPrinters] = useState<PrinterDevice[]>(() => {
        const saved = localStorage.getItem("pdv_printers");
        return saved ? JSON.parse(saved) : [];
    });

    const [manualIp, setManualIp] = useState("");
    const [manualName, setManualName] = useState("");
    const [addDialogOpen, setAddDialogOpen] = useState(false);

    // Salvar no localStorage sempre que a lista mudar
    useEffect(() => {
        localStorage.setItem("pdv_printers", JSON.stringify(printers));
    }, [printers]);

    // Função simulada de scan de rede
    const scanNetworkPrinters = async () => {
        setScanning(true);
        toast({ title: "Iniciando busca...", description: "Verificando dispositivos na rede local." });

        // Simulação de delay de rede
        await new Promise(resolve => setTimeout(resolve, 2000));

        const foundPrinters: PrinterDevice[] = [];

        // Adicionar uma impressora de exemplo se a lista estiver vazia para o usuário ver como funciona
        if (Math.random() > 0.5 || printers.length === 0) {
            foundPrinters.push({
                id: `printer-${Date.now()}`,
                name: "Impressora Térmica (Detectada)",
                ip: "192.168.0.100",
                type: "network",
                status: "online",
                isDefault: printers.length === 0 // Se for a primeira, já define como padrão
            });
        }

        setPrinters(prev => {
            // Evitar duplicatas
            const newPrinters = [...prev];
            let addedCount = 0;

            foundPrinters.forEach(fp => {
                if (!newPrinters.some(p => p.ip === fp.ip)) {
                    newPrinters.push(fp);
                    addedCount++;
                }
            });

            if (addedCount > 0) {
                toast({ title: "Impressoras encontradas!", description: `${addedCount} novo(s) dispositivo(s) detectado(s).` });
            } else if (prev.length > 0) {
                toast({ title: "Busca concluída", description: "Nenhuma nova impressora encontrada." });
            } else {
                toast({
                    title: "Nenhuma impressora encontrada",
                    description: "Tente adicionar manualmente pelo IP.",
                    variant: "destructive"
                });
            }

            return newPrinters;
        });

        setScanning(false);
    };

    const addManualPrinter = () => {
        if (!manualIp || !manualName) {
            toast({ title: "Preencha todos os campos", variant: "destructive" });
            return;
        }

        const newPrinter: PrinterDevice = {
            id: `manual-${Date.now()}`,
            name: manualName,
            ip: manualIp,
            type: "network",
            status: "online", // Assumimos online ao adicionar
            isDefault: printers.length === 0 // Primeira é padrão
        };

        setPrinters([...printers, newPrinter]);
        setManualIp("");
        setManualName("");
        setAddDialogOpen(false);
        toast({ title: "Impressora adicionada com sucesso!" });
    };

    const removePrinter = (id: string) => {
        setPrinters(printers.filter(p => p.id !== id));
        toast({ title: "Impressora removida" });
    };

    const setDefault = (id: string) => {
        setPrinters(printers.map(p => ({
            ...p,
            isDefault: p.id === id
        })));
        toast({ title: "Impressora padrão atualizada" });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Configuração de Impressoras</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={scanNetworkPrinters}
                        disabled={scanning}
                        className={scanning ? "animate-pulse" : ""}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
                        {scanning ? "Buscando..." : "Buscar Automaticamente"}
                    </Button>
                </CardTitle>
                <CardDescription>
                    Gerencie as impressoras de rede conectadas ao sistema
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Lista de Impressoras */}
                <div className="space-y-4">
                    {printers.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed rounded-xl">
                            <Printer className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-3" />
                            <p className="text-muted-foreground font-medium">Nenhuma impressora configurada</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Clique em "Buscar Automaticamente" ou adicione manualmente
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {printers.map(printer => (
                                <div key={printer.id} className="flex items-center justify-between p-4 border rounded-xl bg-card hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Printer className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold">{printer.name}</h4>
                                                {printer.isDefault && (
                                                    <Badge variant="secondary" className="text-[10px]">Padrão</Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Wifi className="h-3 w-3" /> {printer.ip}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    {printer.status === "online" ? (
                                                        <CheckCircle className="h-3 w-3 text-success" />
                                                    ) : (
                                                        <AlertCircle className="h-3 w-3 text-destructive" />
                                                    )}
                                                    {printer.status === "online" ? "Online" : "Offline"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!printer.isDefault && (
                                            <Button variant="ghost" size="sm" onClick={() => setDefault(printer.id)}>
                                                Definir Padrão
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removePrinter(printer.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Adicionar Manualmente */}
                <div className="flex justify-end">
                    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Adicionar Manualmente
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Adicionar Impressora</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Nome da Impressora</Label>
                                    <Input
                                        placeholder="Ex: Impressora Cozinha"
                                        value={manualName}
                                        onChange={(e) => setManualName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Endereço IP</Label>
                                    <Input
                                        placeholder="Ex: 192.168.0.100"
                                        value={manualIp}
                                        onChange={(e) => setManualIp(e.target.value)}
                                    />
                                </div>
                                <Button className="w-full" onClick={addManualPrinter}>
                                    Salvar Impressora
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg text-xs text-muted-foreground">
                    <p className="font-semibold mb-1">Nota sobre Impressão Web:</p>
                    <p>
                        Para que a busca automática funcione perfeitamente, as impressoras devem estar na mesma rede local.
                        Alguns navegadores podem bloquear o acesso direto a dispositivos locais por segurança.
                        Se a busca automática não encontrar sua impressora, utilize a opção "Adicionar Manualmente" com o IP da impressora.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
