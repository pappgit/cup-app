import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Set base to your GitHub repo name when deploying, e.g. '/cup-app/'
const base = process.env.GITHUB_PAGES === 'true' ? '/cup-app/' : '/';

export default defineConfig({
  plugins: [react()],
  base,
});
