import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = 'postgresql://postgres:07192029Rajj@@@db.zwywggyytstatsfffbou.supabase.co:5432/postgres';

const client = new Client({
    connectionString,
    ssl: {
        rejectUnauthorized: false,
    },
});

async function runMigrations() {
    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected!');

        const files = [
            '../../supabase_setup.sql',
            '../../supabase/migrations/20251127130000_fix_fornecedores_constraints.sql',
            '../../supabase/migrations/20251127130100_fix_produtos_constraints.sql'
        ];

        for (const file of files) {
            const filePath = path.resolve(__dirname, file);
            console.log(`Reading file: ${filePath}`);

            if (fs.existsSync(filePath)) {
                const sql = fs.readFileSync(filePath, 'utf8');
                console.log(`Executing SQL from ${file}...`);
                await client.query(sql);
                console.log(`Success: ${file}`);
            } else {
                console.error(`File not found: ${filePath}`);
            }
        }

        console.log('All migrations executed successfully.');
    } catch (err) {
        console.error('Error executing migrations:', err);
    } finally {
        await client.end();
    }
}

runMigrations();
