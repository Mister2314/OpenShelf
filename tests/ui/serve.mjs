import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
const server = await createServer({configFile:false,envDir:false,plugins:[react(),tailwindcss()],resolve:{alias:[{find:/.*\/lib\/supabase$/,replacement:resolve('tests/ui/database.js')},{find:/.*\/lib\/reading$/,replacement:resolve('tests/ui/database.js')},{find:/.*\/context\/ReadingContext$/,replacement:resolve('tests/ui/reading-context.ts')}]},server:{host:'127.0.0.1',port:5175,strictPort:true}});
await server.listen();console.log('Isolated UI fixture: http://127.0.0.1:5175/tests/ui/index.html');
