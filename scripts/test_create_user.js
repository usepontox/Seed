import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCreateUser() {
    const adminEmail = 'admin@admin.com';
    const adminPassword = '07192029Rajj@@';

    // 1. Login como admin
    console.log('1. Fazendo login como admin...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword
    });

    if (authError) {
        console.error('❌ Erro ao logar:', authError.message);
        return;
    }

    console.log('✅ Logado como admin\n');

    // 2. Testar criação de usuário
    const testEmail = `teste${Date.now()}@example.com`;
    const testPassword = 'Teste@123';
    const testNome = 'Usuario Teste';

    console.log('2. Tentando criar usuário via Edge Function...');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Senha: ${testPassword}`);
    console.log(`   Nome: ${testNome}\n`);

    const { data: userData, error: userError } = await supabase.functions.invoke('admin-users', {
        body: {
            action: 'createUser',
            payload: {
                email: testEmail,
                password: testPassword,
                nome: testNome,
                role: 'user',
                empresaNome: 'Empresa Teste'
            }
        }
    });

    if (userError) {
        console.error('❌ Erro ao criar usuário:', userError);

        // Tentar extrair detalhes do erro
        if (userError.context && userError.context.json) {
            try {
                const errorBody = await userError.context.json();
                console.error('📋 Detalhes do erro:', JSON.stringify(errorBody, null, 2));
            } catch (e) {
                console.error('Não foi possível extrair detalhes do erro');
            }
        }

        if (userError.context && userError.context.text) {
            try {
                const errorText = await userError.context.text();
                console.error('📋 Resposta do servidor:', errorText);
            } catch (e) {
                console.error('Não foi possível extrair texto do erro');
            }
        }

        return;
    }

    console.log('✅ Usuário criado com sucesso!');
    console.log('📋 Dados retornados:', JSON.stringify(userData, null, 2));

    // Verificar status do email
    if (userData.emailSent === false) {
        console.warn('\n⚠️  Email não foi enviado!');
        console.warn('📋 Erro do email:', userData.emailError);
    } else if (userData.emailSent === true) {
        console.log('\n✅ Email enviado com sucesso!');
    } else {
        console.log('\n⚠️  Status do email desconhecido');
    }
}

testCreateUser().catch(console.error);
