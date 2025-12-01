import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scale, Usb } from "lucide-react";
import { useBalanca } from "@/hooks/use-balanca";
import { formatCurrency } from "@/lib/utils";

interface Produto {
    id: string;
    nome: string;
    preco_venda: number;
    unidade: string;
}

interface ModalPesagemProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    produto: Produto | null;
    onConfirmar: (peso: number) => void;
}

export default function ModalPesagem({ open, onOpenChange, produto, onConfirmar }: ModalPesagemProps) {
    const [pesoManual, setPesoManual] = useState<string>("");
    const { conectar, lerPeso, peso: pesoBalanca, conectado, lendo, portaSuportada } = useBalanca();

    useEffect(() => {
        if (open) {
            setPesoManual("");
            // Se já estiver conectado, tenta ler automaticamente ao abrir? 
            // Talvez melhor deixar manual para evitar leituras erradas.
        }
    }, [open]);

    useEffect(() => {
        if (pesoBalanca > 0) {
            setPesoManual(pesoBalanca.toString());
        }
    }, [pesoBalanca]);

    const handleConfirmar = () => {
        const peso = parseFloat(pesoManual);
        if (!isNaN(peso) && peso > 0) {
            onConfirmar(peso);
            onOpenChange(false);
        }
    };

    const total = produto ? (parseFloat(pesoManual) || 0) * produto.preco_venda : 0;

    if (!produto) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Scale className="h-5 w-5" />
                        Pesagem de Produto
                    </DialogTitle>
                    <DialogDescription>
                        Informe o peso para <strong>{produto.nome}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="flex items-end gap-4">
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="peso">Peso (kg)</Label>
                            <Input
                                id="peso"
                                type="number"
                                step="0.001"
                                placeholder="0.000"
                                value={pesoManual}
                                onChange={(e) => setPesoManual(e.target.value)}
                                className="text-2xl font-bold h-14"
                                autoFocus
                            />
                        </div>

                        {portaSuportada && (
                            <div className="flex flex-col gap-2">
                                {!conectado ? (
                                    <Button variant="outline" size="icon" className="h-14 w-14" onClick={conectar} title="Conectar Balança">
                                        <Usb className="h-6 w-6" />
                                    </Button>
                                ) : (
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="h-14 w-14 bg-green-100 hover:bg-green-200 text-green-700 border-green-200"
                                        onClick={lerPeso}
                                        disabled={lendo}
                                        title="Ler Peso"
                                    >
                                        <Scale className={`h-6 w-6 ${lendo ? 'animate-pulse' : ''}`} />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="bg-muted p-4 rounded-lg flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Preço / kg: {formatCurrency(produto.preco_venda)}</span>
                        <div className="text-right">
                            <span className="text-sm text-muted-foreground block">Total</span>
                            <span className="text-2xl font-bold text-primary">{formatCurrency(total)}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="sm:justify-between">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirmar} disabled={!pesoManual || parseFloat(pesoManual) <= 0} className="w-full sm:w-auto">
                        Confirmar Peso
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
