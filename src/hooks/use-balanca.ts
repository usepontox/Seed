import { useState, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

interface UseBalancaReturn {
    conectar: () => Promise<void>;
    desconectar: () => Promise<void>;
    lerPeso: () => Promise<void>;
    peso: number;
    conectado: boolean;
    lendo: boolean;
    erro: string | null;
    portaSuportada: boolean;
}

export function useBalanca(): UseBalancaReturn {
    const [peso, setPeso] = useState<number>(0);
    const [conectado, setConectado] = useState<boolean>(false);
    const [lendo, setLendo] = useState<boolean>(false);
    const [erro, setErro] = useState<string | null>(null);
    const [port, setPort] = useState<SerialPort | null>(null);
    const { toast } = useToast();

    const portaSuportada = 'serial' in navigator;

    const conectar = useCallback(async () => {
        if (!portaSuportada) {
            setErro("Web Serial API não suportada neste navegador.");
            return;
        }

        try {
            const porta = await navigator.serial.requestPort();
            await porta.open({ baudRate: 9600 }); // Configuração padrão comum, pode precisar de ajuste
            setPort(porta);
            setConectado(true);
            setErro(null);
            toast({ title: "Balança conectada com sucesso!" });
        } catch (err: any) {
            console.error("Erro ao conectar balança:", err);
            setErro("Falha ao conectar: " + (err.message || "Erro desconhecido"));
            toast({ title: "Erro ao conectar balança", description: err.message, variant: "destructive" });
        }
    }, [portaSuportada, toast]);

    const desconectar = useCallback(async () => {
        if (port) {
            try {
                await port.close();
                setPort(null);
                setConectado(false);
                setPeso(0);
            } catch (err: any) {
                console.error("Erro ao desconectar:", err);
            }
        }
    }, [port]);

    const lerPeso = useCallback(async () => {
        if (!port || !port.readable) {
            setErro("Porta não conectada ou ilegível.");
            return;
        }

        setLendo(true);
        const reader = port.readable.getReader();

        try {
            // Lê dados por um curto período ou até encontrar um padrão de peso
            // Protocolos variam muito. Vamos tentar ler um chunk e extrair números.
            // Implementação simplificada para demonstração/teste inicial.

            const { value, done } = await reader.read();
            if (done) {
                reader.releaseLock();
                return;
            }

            if (value) {
                const texto = new TextDecoder().decode(value);
                console.log("Dados recebidos da balança:", texto);

                // Tenta extrair um número float do texto recebido
                // Exemplo de string Toledo: "     0.500kg"
                const match = texto.match(/(\d+\.\d+)/);
                if (match) {
                    const pesoLido = parseFloat(match[1]);
                    if (!isNaN(pesoLido)) {
                        setPeso(pesoLido);
                    }
                }
            }
        } catch (err: any) {
            console.error("Erro ao ler dados:", err);
            setErro("Erro na leitura: " + err.message);
        } finally {
            reader.releaseLock();
            setLendo(false);
        }
    }, [port]);

    return {
        conectar,
        desconectar,
        lerPeso,
        peso,
        conectado,
        lendo,
        erro,
        portaSuportada
    };
}
