import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, Copy } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface ModalPagamentoPixProps {
    open: boolean
    onClose: () => void
    vendaId: string
    valor: number
    empresaId: string
    onSuccess: () => void
}

export function ModalPagamentoPix({
    open,
    onClose,
    vendaId,
    valor,
    empresaId,
    onSuccess
}: ModalPagamentoPixProps) {
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending')
    const [paymentId, setPaymentId] = useState<string | null>(null)
    const { toast } = useToast()

    useEffect(() => {
        if (open && !qrCode) {
            gerarPix()
        }
    }, [open])

    useEffect(() => {
        let interval: NodeJS.Timeout

        if (paymentId && status === 'pending') {
            interval = setInterval(async () => {
                const { data } = await supabase
                    .from('transacoes_pix')
                    .select('status')
                    .eq('payment_id', paymentId)
                    .single()

                if (data?.status === 'approved') {
                    setStatus('approved')
                    toast({ title: 'Pagamento aprovado!' })
                    setTimeout(() => {
                        onSuccess()
                        onClose()
                    }, 2000)
                } else if (data?.status === 'rejected') {
                    setStatus('rejected')
                    toast({
                        title: 'Pagamento rejeitado',
                        variant: 'destructive'
                    })
                }
            }, 1000) // Verificar a cada 1 segundo
        }

        return () => {
            if (interval) clearInterval(interval)
        }
    }, [paymentId, status])

    const gerarPix = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase.functions.invoke('create-pix-payment', {
                body: { vendaId, valor, empresaId }
            })

            if (error) throw error

            setQrCode(data.qrCode)
            setQrCodeUrl(data.qrCodeUrl)
            setPaymentId(data.paymentId)
        } catch (error: any) {
            toast({
                title: 'Erro ao gerar PIX',
                description: error.message,
                variant: 'destructive'
            })
            onClose()
        } finally {
            setLoading(false)
        }
    }

    const verificarPagamento = async () => {
        if (!paymentId) return

        setLoading(true)
        try {
            const { data } = await supabase
                .from('transacoes_pix' as any)
                .select('status')
                .eq('payment_id', paymentId)
                .single()

            if (data?.status === 'approved') {
                setStatus('approved')
                toast({ title: 'Pagamento aprovado!' })
                setTimeout(() => {
                    onSuccess()
                    onClose()
                }, 2000)
            } else if (data?.status === 'rejected') {
                setStatus('rejected')
                toast({
                    title: 'Pagamento rejeitado',
                    variant: 'destructive'
                })
            } else {
                toast({
                    title: 'Pagamento ainda pendente',
                    description: 'Aguarde a confirmação'
                })
            }
        } catch (error: any) {
            toast({
                title: 'Erro ao verificar pagamento',
                description: error.message,
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    const copiarCodigoPix = () => {
        if (qrCodeUrl) {
            navigator.clipboard.writeText(qrCodeUrl)
            toast({ title: 'Código PIX copiado!' })
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Pagamento PIX</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 py-4">
                    {loading && (
                        <>
                            <Loader2 className="w-12 h-12 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
                        </>
                    )}

                    {qrCode && status === 'pending' && (
                        <>
                            <img
                                src={`data:image/png;base64,${qrCode}`}
                                alt="QR Code PIX"
                                className="w-64 h-64 border-4 border-primary rounded-lg"
                            />
                            <p className="text-center text-sm text-muted-foreground">
                                Escaneie o QR Code com o app do seu banco
                            </p>
                            <p className="text-3xl font-bold text-primary">
                                R$ {valor.toFixed(2)}
                            </p>
                            <Button variant="outline" onClick={copiarCodigoPix} className="w-full">
                                <Copy className="w-4 h-4 mr-2" />
                                Copiar código PIX
                            </Button>
                            <Button
                                variant="default"
                                onClick={verificarPagamento}
                                className="w-full bg-green-600 hover:bg-green-700"
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                )}
                                Verificar Pagamento
                            </Button>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Aguardando pagamento...
                            </div>
                        </>
                    )}

                    {status === 'approved' && (
                        <div className="flex flex-col items-center gap-4">
                            <CheckCircle2 className="w-20 h-20 text-green-500" />
                            <p className="text-2xl font-bold">Pagamento Aprovado!</p>
                            <p className="text-sm text-muted-foreground">Venda finalizada com sucesso</p>
                        </div>
                    )}

                    {status === 'rejected' && (
                        <div className="flex flex-col items-center gap-4">
                            <XCircle className="w-20 h-20 text-red-500" />
                            <p className="text-2xl font-bold">Pagamento Rejeitado</p>
                            <Button onClick={onClose}>Fechar</Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
