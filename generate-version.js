import fs from 'fs';
import path from 'path';

const version = new Date().toISOString();
const content = `Version: ${version}\nBuild Time: ${new Date().toLocaleString('pt-BR')}`;

// Garantir que a pasta public existe
const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

fs.writeFileSync(path.join(publicDir, 'version.txt'), content);
console.log(`Arquivo de versão gerado: ${version}`);
