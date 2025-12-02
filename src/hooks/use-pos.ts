import { useState, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

export type PosMode = 'serial' | 'api';

interface UsePosReturn {
    conectar: (modo: PosMode) => Promise<void>;
    desconectar: () => Promise<void>;
    lerCPF: () => Promise<string | null>;
    cancelar: () => Promise<void>;
    cpf: string | null;
    conectado: boolean;
    lendo: boolean;
    erro: string | null;
    modo: PosMode | null;
    portaSuportada: boolean;
}

export function usePos(): UsePosReturn {
    const [cpf, setCpf] = useState<string | null>(null);
    const [conectado, setConectado] = useState<boolean>(false);
    const [lendo, setLendo] = useState<boolean>(false);
    const [erro, setErro] = useState<string | null>(null);
    const [modo, setModo] = useState<PosMode | null>(null);
    const [port, setPort] = useState<SerialPort | null>(null);
    const { toast } = useToast();

    const portaSuportada = 'serial' in navigator;

    const conectar = useCallback(async (novoModo: PosMode) => {
        setErro(null);

        if (novoModo === 'serial') {
            if (!portaSuportada) {
                setErro("Web Serial API não suportada neste navegador.");
                return;
            }

            try {
                const porta = await navigator.serial.requestPort();
                await porta.open({ baudRate: 9600 });
                setPort(porta);
                setConectado(true);
                setModo('serial');
                toast({ title: "POS conectado via USB!" });
            } catch (err: any) {
                console.error("Erro ao conectar POS Serial:", err);
                setErro("Falha ao conectar: " + (err.message || "Erro desconhecido"));
                toast({ title: "Erro ao conectar POS", description: err.message, variant: "destructive" });
            }
        } else if (novoModo === 'api') {
            // Simulação de conexão com API local
            // No futuro, aqui verificaria se o serviço local está rodando (health check)
            try {
                // Exemplo: await fetch('http://localhost:8080/health');
                setConectado(true);
                setModo('api');
                toast({ title: "Conectado à API do POS!" });
            } catch (err: any) {
                setErro("API Local não encontrada.");
                toast({ title: "Erro ao conectar API", variant: "destructive" });
            }
        }
    }, [portaSuportada, toast]);

    const desconectar = useCallback(async () => {
        if (modo === 'serial' && port) {
            try {
                await port.close();
            } catch (err) {
                console.error("Erro ao fechar porta serial:", err);
            }
        }
        setPort(null);
        setConectado(false);
        setModo(null);
        setCpf(null);
    }, [modo, port]);

    const lerCPF = useCallback(async (): Promise<string | null> => {
        setLendo(true);
        setErro(null);
        setCpf(null);

        try {
            if (modo === 'serial' && port && port.readable) {
                const reader = port.readable.getReader();
                try {
                    // Loop de leitura simples
                    // Na prática, precisaria de um protocolo específico do Pinpad
                    // Aqui vamos assumir que ele manda os dígitos conforme são digitados
                    let buffer = "";
                    const timeout = setTimeout(() => {
                        reader.cancel();
                        setErro("Tempo limite excedido");
                    }, 30000); // 30 segundos para digitar

                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;
                        if (value) {
                            const texto = new TextDecoder().decode(value);
                            buffer += texto;

                            // Tenta encontrar um CPF no buffer (apenas números, 11 dígitos)
                            const numeros = buffer.replace(/\D/g, '');
                            if (numeros.length >= 11) {
                                const cpfEncontrado = numeros.slice(-11); // Pega os últimos 11
                                setCpf(cpfEncontrado);
                                clearTimeout(timeout);
                                return cpfEncontrado;
                            }
                        }
                    }
                } finally {
                    reader.releaseLock();
                }
            } else if (modo === 'api') {
                // Simulação de chamada API
                // await fetch('http://localhost:8080/input?type=cpf');
                // Polling ou WebSocket para receber o resultado

                // Mock para teste:
                return new Promise((resolve) => {
                    setTimeout(() => {
                        const cpfMock = "12345678900";
                        setCpf(cpfMock);
                        resolve(cpfMock);
                    }, 2000);
                });
            } else {
                setErro("Dispositivo não conectado.");
            }
        } catch (err: any) {
            setErro(err.message);
            console.error("Erro na leitura:", err);
        } finally {
            setLendo(false);
        }
        return null;
    }, [modo, port]);

    const cancelar = useCallback(async () => {
        // Implementar lógica de cancelamento
        setLendo(false);
    }, []);

    return {
        conectar,
        desconectar,
        lerCPF,
        cancelar,
        cpf,
        conectado,
        lendo,
        erro,
        modo,
        portaSuportada
    };
}
