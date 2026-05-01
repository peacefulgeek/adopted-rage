#!/usr/bin/env node
// Per master-scope §8B — production runner. Cron lives inside the
// server process (registerCrons() runs at startup), so this just
// boots the compiled server. Exists for app.yaml compatibility.
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const server = spawn('node', ['dist/index.js'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: { ...process.env },
});

server.on('exit', (code) => {
  console.log(`[start-with-cron] server exited with code ${code}`);
  process.exit(code ?? 0);
});

const shutdown = (sig) => {
  console.log(`[start-with-cron] ${sig} received, shutting down`);
  server.kill(sig);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
