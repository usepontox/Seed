import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    try {
        const payload = await req.json()

        console.log('Webhook recebido:', payload)

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Mercado Pago envia notificações de pagamento
        if (payload.type === 'payment') {
            const paymentId = payload.data.id

            // Buscar transação
            const { data: transacao, error: transacaoError } = await supabaseAdmin
                .from('transacoes_pix')
                .select('*, vendas(*)')
                .eq('payment_id', paymentId.toString())
                .single()

            if (transacaoError || !transacao) {
                console.log('Transação não encontrada:', paymentId)
                return new Response('Transação não encontrada', { status: 404 })
            }

            // Buscar config para pegar token
            const { data: config } = await supabaseAdmin
                .from('configuracoes_pix')
                .select('access_token_encrypted')
                .eq('empresa_id', transacao.empresa_id)
                .single()

            if (!config) {
                return new Response('Configuração não encontrada', { status: 404 })
            }

            // Consultar status no Mercado Pago
            const mpResponse = await fetch(
                `https://api.mercadopago.com/v1/payments/${paymentId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${config.access_token_encrypted}`
                    }
                }
            )

            const payment = await mpResponse.json()

            console.log('Status do pagamento:', payment.status)

            // Atualizar transação
            await supabaseAdmin
                .from('transacoes_pix')
                .update({
                    status: payment.status,
                    paid_at: payment.status === 'approved' ? new Date().toISOString() : null,
                    metadata: payment
                })
                .eq('id', transacao.id)

            // Se aprovado, finalizar venda
            if (payment.status === 'approved') {
                await supabaseAdmin
                    .from('vendas')
                    .update({
                        status: 'finalizada'
                    })
                    .eq('id', transacao.venda_id)

                console.log('Venda finalizada:', transacao.venda_id)
            }

            return new Response('OK', { status: 200 })
        }

        return new Response('OK', { status: 200 })
    } catch (error) {
        console.error('Erro no webhook:', error)
        return new Response(error.message, { status: 500 })
    }
})
