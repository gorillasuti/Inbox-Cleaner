import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            input: {
                content: resolve(__dirname, 'src/content.jsx'),
                background: resolve(__dirname, 'src/background.js'),
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: 'chunks/[name]-[hash].js',
                assetFileNames: '[name].[ext]',
                manualChunks: {
                    lottie: ['lottie-react'],
                    supabase: ['@supabase/supabase-js']
                }
            }
        },
        outDir: 'dist',
        emptyOutDir: true,
        chunkSizeWarningLimit: 1000,
    },
    define: {
        'process.env': {}
    }
})
