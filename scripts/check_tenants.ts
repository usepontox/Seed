
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY; // Using anon key, might not be enough for listing all users if RLS prevents it.
// Actually, to list all users/profiles, I might need service role key. 
// But I don't have it. I only have what's in .env.
// Let's try to query 'profiles' and 'usuarios_empresas' with the anon key. 
// If RLS is set up correctly, I might only see my own user.
// But the user (usepontox) is likely a super_admin. If I can login as them?
// I can't login as them without password.
// Wait, the user provided the password "123456" for new accesses. Maybe I can try to login?
// But I don't want to risk locking accounts.

// Let's just try to query 'profiles' table. If it's public read (or accessible to anon), I might see something.
// If not, I can't verify the tenants.

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTenants() {
    console.log('Checking profiles...');
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

    if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
    } else {
        console.log('Profiles found:', profiles?.length);
        profiles?.forEach(p => console.log(`- ${p.email} (${p.id})`));
    }

    console.log('\nChecking usuarios_empresas...');
    const { data: userEmpresas, error: ueError } = await supabase
        .from('usuarios_empresas')
        .select('*, empresas(nome)');

    if (ueError) {
        console.error('Error fetching usuarios_empresas:', ueError);
    } else {
        console.log('User-Company links found:', userEmpresas?.length);
        userEmpresas?.forEach(ue => {
            // @ts-ignore
            console.log(`- User ${ue.user_id} -> Company ${ue.empresa_id} (${ue.empresas?.nome})`);
        });
    }
}

checkTenants();
