import net from 'node:net';
import { readFile } from 'node:fs/promises';

const originalListen = net.Server.prototype.listen;
net.Server.prototype.listen = function (...args) {
  if (typeof args[0] === 'number') args = [args[0], '127.0.0.1', ...args.slice(1).filter(x => typeof x !== 'string')];
  else if (args[0] && typeof args[0] === 'object') args = [{ ...args[0], host: '127.0.0.1' }];
  else throw new Error('Only loopback TCP listeners are allowed.');
  return originalListen.apply(this, args);
};
const { runCLI } = await import('@wp-playground/cli');
const blueprint = JSON.parse(await readFile(new URL('../../docs/native-playground.json', import.meta.url), 'utf8'));
const instance = await runCLI({ command: 'server', port: 9419, 'site-url': 'http://127.0.0.1:9419', php: '8.3', wp: '7.1.4', workers: 1, blueprint, verbosity: 'quiet' });
if (instance.server.address()?.address !== '127.0.0.1') throw new Error('Unexpected bind address.');
console.log('Native WordPress demo ready at http://127.0.0.1:9419');
let stopping = false;
async function stop() { if (stopping) return; stopping = true; await instance[Symbol.asyncDispose](); process.exit(0); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
