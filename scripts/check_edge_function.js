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

async function checkEdgeFunctionHealth() {
    const adminEmail = 'admin@admin.com';
    const adminPassword = '07192029Rajj@@';

    console.log('🔍 Verificando configuração da Edge Function...\n');

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

    console.log('✅ Login bem-sucedido\n');

    // 2. Testar health check
    console.log('2. Testando health check da Edge Function...');
    const { data: healthData, error: healthError } = await supabase.functions.invoke('admin-users', {
        body: { action: 'health' }
    });

    if (healthError) {
        console.error('❌ Erro no health check:', healthError);
        return;
    }

    console.log('✅ Health check:', JSON.stringify(healthData, null, 2));

    if (!healthData.serviceRoleKeyPresent) {
        console.error('\n❌ PROBLEMA ENCONTRADO: SUPABASE_SERVICE_ROLE_KEY não está configurada!');
        console.log('\n📝 Para corrigir:');
        console.log('1. Vá em: Supabase Dashboard → Project Settings → API');
        console.log('2. Copie a "service_role" key (secret)');
        console.log('3. Vá em: Edge Functions → Secrets');
        console.log('4. Adicione: SUPABASE_SERVICE_ROLE_KEY = <sua_service_role_key>');
        return;
    }

    console.log('✅ Service Role Key está configurada\n');

    // 3. Testar listUsers
    console.log('3. Testando listUsers...');
    const { data: users, error: usersError } = await supabase.functions.invoke('admin-users', {
        body: { action: 'listUsers' }
    });

    if (usersError) {
        console.error('❌ Erro ao listar usuários:', usersError);
        return;
    }

    console.log(`✅ ${users.length} usuários encontrados\n`);

    // 4. Testar criação de usuário
    const testEmail = `test_${Date.now()}@example.com`;
    console.log(`4. Tentando criar usuário de teste: ${testEmail}...`);

    const { data: createData, error: createError } = await supabase.functions.invoke('admin-users', {
        body: {
            action: 'createUser',
            payload: {
                email: testEmail,
                password: 'Test@123456',
                nome: 'Usuario Teste',
                role: 'user'
            }
        }
    });

    if (createError) {
        console.error('❌ Erro ao criar usuário:', createError.message);

        // Tentar pegar detalhes do erro
        if (createError.context) {
            try {
                const response = createError.context;
                const text = await response.text();
                console.error('📋 Resposta completa do servidor:', text);

                try {
                    const json = JSON.parse(text);
                    console.error('📋 Erro em JSON:', JSON.stringify(json, null, 2));
                } catch (e) {
                    // Não é JSON
                }
            } catch (e) {
                console.error('Não foi possível extrair detalhes do erro');
            }
        }

        return;
    }

    console.log('✅ Usuário criado com sucesso!');
    console.log('📋 Dados:', JSON.stringify(createData, null, 2));
}

checkEdgeFunctionHealth().catch(console.error);
