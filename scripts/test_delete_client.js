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

async function testDeleteClient() {
    const email = 'admin@admin.com';
    const password = '07192029Rajj@@';

    await supabase.auth.signInWithPassword({ email, password });

    // 1. Criar Cliente
    const { data: cliente, error: clientError } = await supabase
        .from('clientes')
        .insert({ nome: 'Cliente Teste Delete', email: 'delete@teste.com' })
        .select()
        .single();

    if (clientError) {
        console.error('Erro ao criar cliente:', clientError);
        return;
    }
    console.log('Cliente criado:', cliente.id);

    // 2. Criar Venda vinculada
    const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .insert({
            cliente_id: cliente.id,
            total: 100,
            status: 'finalizada',
            forma_pagamento: 'dinheiro'
        })
        .select()
        .single();

    if (vendaError) {
        console.error('Erro ao criar venda:', vendaError);
        return;
    }
    console.log('Venda criada:', venda.id);

    // 3. Tentar Deletar Cliente
    const { error: deleteError } = await supabase
        .from('clientes')
        .delete()
        .eq('id', cliente.id);

    if (deleteError) {
        console.error('❌ Erro ao deletar cliente:', deleteError);
    } else {
        console.log('✅ Cliente deletado com sucesso!');

        // Verificar se a venda ainda existe e se cliente_id é null
        const { data: vendaCheck } = await supabase
            .from('vendas')
            .select('*')
            .eq('id', venda.id)
            .single();

        console.log('Venda após delete:', vendaCheck);
        if (vendaCheck.cliente_id === null) {
            console.log('✅ Constraint ON DELETE SET NULL funcionou!');
        } else {
            console.error('❌ Constraint falhou, cliente_id não é null:', vendaCheck.cliente_id);
        }
    }
}

testDeleteClient();
