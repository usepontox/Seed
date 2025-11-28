import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCreateEmpresa() {
    console.log('Testando createEmpresa na Edge Function...');

    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'admin@admin.com',
        password: '123456'
    });

    if (loginError) {
        console.error('Erro ao logar como admin:', loginError);
        return;
    }

    console.log('Logado como admin.');

    const payload = {
        action: 'createEmpresa',
        payload: {
            empresa: {
                nome: 'Empresa Teste Script',
                cnpj: '99.999.999/0001-99'
            }
        }
    };

    const { data, error } = await supabase.functions.invoke('admin-users', {
        body: payload
    });

    if (error) {
        console.error('Erro na Edge Function:');
        console.error(error);
        if (error instanceof Error && 'context' in error) {
            try {
                // @ts-ignore
                const context = error.context;
                if (context && typeof context.json === 'function') {
                    const json = await context.json();
                    console.log('Response body:', json);
                }
            } catch (e) {
                console.log('Could not read response body');
            }
        }
    } else {
        console.log('Sucesso:', data);
    }
}

testCreateEmpresa();
