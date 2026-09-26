import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base relativa: funciona no GitHub Pages independente do nome do repositório
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
