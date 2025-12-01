import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { email, password, nome, empresaNome } = await req.json()

        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY not configured')
        }

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
        }
        .content {
            background: #f9fafb;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .credentials {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #667eea;
        }
        .credential-item {
            margin: 10px 0;
        }
        .credential-label {
            font-weight: bold;
            color: #667eea;
        }
        .credential-value {
            font-family: 'Courier New', monospace;
            background: #f3f4f6;
            padding: 8px 12px;
            border-radius: 4px;
            display: inline-block;
            margin-top: 5px;
        }
        .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #6b7280;
            font-size: 14px;
        }
        .warning {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Bem-vindo ao Sistema PDV!</h1>
        <p>Seu acesso foi criado com sucesso</p>
    </div>
    
    <div class="content">
        <p>Olá, <strong>${nome}</strong>!</p>
        
        <p>Seu acesso ao Sistema PDV da empresa <strong>${empresaNome || 'sua empresa'}</strong> foi criado com sucesso.</p>
        
        <div class="credentials">
            <h3 style="margin-top: 0; color: #667eea;">🔐 Suas Credenciais de Acesso</h3>
            
            <div class="credential-item">
                <div class="credential-label">E-mail:</div>
                <div class="credential-value">${email}</div>
            </div>
            
            <div class="credential-item">
                <div class="credential-label">Senha Temporária:</div>
                <div class="credential-value">${password}</div>
            </div>
        </div>
        
        <div class="warning">
            <strong>⚠️ Importante:</strong> Por segurança, altere sua senha no primeiro acesso ao sistema.
        </div>
        
        <div style="text-align: center;">
            <a href="${Deno.env.get('SITE_URL') || 'https://seusite.com'}/auth" class="button">
                Acessar Sistema Agora →
            </a>
        </div>
        
        <div class="footer">
            <p>Este é um e-mail automático. Por favor, não responda.</p>
            <p>Se você não solicitou este acesso, entre em contato com o administrador.</p>
        </div>
    </div>
</body>
</html>
        `

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'Sistema PDV <onboarding@resend.dev>', // Mude para seu domínio verificado
                to: [email],
                subject: `🎉 Bem-vindo ao Sistema PDV - Suas Credenciais de Acesso`,
                html: emailHtml
            })
        })

        const data = await res.json()

        if (!res.ok) {
            throw new Error(`Resend API error: ${JSON.stringify(data)}`)
        }

        return new Response(
            JSON.stringify({ success: true, messageId: data.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error sending email:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            }
        )
    }
})
