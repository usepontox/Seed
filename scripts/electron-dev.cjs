const { spawn } = require('child_process');
const waitOn = require('wait-on');

const VITE_DEV_SERVER_URL = 'http://localhost:8080';

async function startElectronDev() {
    console.log('🚀 Starting Vite dev server...');

    // Start Vite dev server
    const viteProcess = spawn('npm', ['run', 'dev'], {
        shell: true,
        stdio: 'inherit',
    });

    try {
        // Wait for Vite dev server to be ready
        console.log('⏳ Waiting for Vite dev server...');
        await waitOn({
            resources: [VITE_DEV_SERVER_URL],
            timeout: 30000,
        });

        console.log('✅ Vite dev server is ready!');
        console.log('🖥️  Starting Electron...');

        // Start Electron
        const electronProcess = spawn('electron', ['.'], {
            shell: true,
            stdio: 'inherit',
            env: {
                ...process.env,
                NODE_ENV: 'development',
            },
        });

        // Handle Electron exit
        electronProcess.on('close', () => {
            console.log('👋 Electron closed, stopping Vite...');
            viteProcess.kill();
            process.exit(0);
        });

        // Handle Vite exit
        viteProcess.on('close', () => {
            console.log('👋 Vite closed, stopping Electron...');
            electronProcess.kill();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Error starting dev server:', error);
        viteProcess.kill();
        process.exit(1);
    }
}

startElectronDev();
