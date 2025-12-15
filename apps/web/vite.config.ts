import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import path from 'path';

export default defineConfig({
    plugins: [preact()],

    build: {
        target: 'es2022',
        minify: 'esbuild',
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: {
                    // Split vendor chunk
                    vendor: ['preact', '@preact/signals'],
                },
            },
        },
    },

    server: {
        port: 5173,
        host: true,
        allowedHosts: true,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },

    resolve: {
        alias: {
            react: 'preact/compat',
            'react-dom': 'preact/compat',
            '@tma-romance/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
        },
    },
});
