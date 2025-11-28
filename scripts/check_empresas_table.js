import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    console.error('URL:', supabaseUrl);
    console.error('Key:', supabaseKey ? 'Present' : 'Missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmpresasTable() {
    console.log('Verificando estrutura da tabela empresas...\n');

    // Tentar buscar uma empresa para ver as colunas
    const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Erro:', error);
    } else {
        console.log('Estrutura da tabela empresas:');
        if (data && data.length > 0) {
            console.log('Colunas:', Object.keys(data[0]));
        } else {
            console.log('Tabela vazia, tentando inserir teste...');
            const { data: testData, error: testError } = await supabase
                .from('empresas')
                .insert({ nome: 'Teste', cnpj: '00000000000000' })
                .select()
                .single();

            if (testError) {
                console.error('Erro ao inserir teste:', testError);
            } else {
                console.log('Colunas:', Object.keys(testData));
                // Deletar o teste
                await supabase.from('empresas').delete().eq('id', testData.id);
            }
        }
    }
}

checkEmpresasTable();
