import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const { venda_id, tipo } = await req.json()

        // Cria o cliente Supabase
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Buscar dados da venda e itens
        const { data: venda, error: vendaError } = await supabaseClient
            .from('vendas')
            .select('*, itens_venda(*, produto:produtos(*))')
            .eq('id', venda_id)
            .single()

        if (vendaError) throw new Error(`Erro ao buscar venda: ${vendaError.message}`)

        // 2. Buscar configurações da empresa
        const { data: config, error: configError } = await supabaseClient
            .from('configuracoes_empresa')
            .select('*')
            .limit(1)
            .single()

        if (configError) throw new Error(`Erro ao buscar configurações: ${configError.message}`)

        if (!config.certificado_url || !config.senha_certificado) {
            throw new Error('Certificado digital não configurado.')
        }

        // 3. Simulação de Geração e Envio (MOCK)
        // Aqui entraria a lógica real de:
        // - Baixar o PFX do storage
        // - Gerar XML da NFe/NFCe
        // - Assinar XML
        // - Enviar para SEFAZ via SOAP
        // - Processar retorno

        console.log(`Simulando emissão de ${tipo} para venda ${venda_id}`)

        // Simular delay da SEFAZ
        await new Promise(resolve => setTimeout(resolve, 2000))

        const numeroNota = tipo === 'NFE' ? config.proximo_numero_nfe : config.proximo_numero_nfce
        const serie = tipo === 'NFE' ? config.serie_nfe : config.serie_nfce
        const chaveAcesso = `352311${config.cnpj}${String(serie).padStart(3, '0')}${String(numeroNota).padStart(9, '0')}1000000001` // Mock chave

        // 4. Salvar registro da nota
        const { data: nota, error: notaError } = await supabaseClient
            .from('notas_fiscais')
            .insert({
                venda_id: venda_id,
                tipo: tipo,
                chave_acesso: chaveAcesso,
                numero: numeroNota,
                serie: serie,
                status: 'autorizado', // Simulado sucesso
                mensagem_sefaz: 'Autorizado o uso da NF-e',
                protocolo: '135230000000001',
                xml_url: `xmls/${chaveAcesso}.xml`, // Mock URL
                pdf_url: `pdfs/${chaveAcesso}.pdf`   // Mock URL
            })
            .select()
            .single()

        if (notaError) throw new Error(`Erro ao salvar nota: ${notaError.message}`)

        // 5. Atualizar numeração
        const updateField = tipo === 'NFE' ? 'proximo_numero_nfe' : 'proximo_numero_nfce'
        await supabaseClient
            .from('configuracoes_empresa')
            .update({ [updateField]: numeroNota + 1 })
            .eq('id', config.id)

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Nota fiscal emitida com sucesso (Simulação)',
                nota: nota
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
