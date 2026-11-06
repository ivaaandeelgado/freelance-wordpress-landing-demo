import net from 'node:net';
import { readFile } from 'node:fs/promises';

// Playground's CLI defaults to an unspecified bind address. Constrain every
// listener in this dedicated demo process to loopback, including its port probe.
const listen = net.Server.prototype.listen;
net.Server.prototype.listen = function (...args) {
  if (typeof args[0] === 'number') {
    args = [args[0], '127.0.0.1', ...args.slice(1).filter(x => typeof x !== 'string')];
  } else if (args[0] && typeof args[0] === 'object') {
    args[0] = { ...args[0], host: '127.0.0.1' };
  } else {
    throw new Error('The demo permits TCP loopback listeners only.');
  }
  return listen.apply(this, args);
};
const { runCLI } = await import('@wp-playground/cli');
const blueprint = JSON.parse(await readFile(new URL('./blueprint.json', import.meta.url), 'utf8'));
const instance = await runCLI({ command: 'server', port: 9417, 'site-url': 'http://127.0.0.1:9417', php: '8.3', wp: '7.1.4', workers: 1, blueprint, verbosity: 'quiet' });
if (instance.server.address()?.address !== '127.0.0.1') throw new Error('Unexpected bind address');
console.log('Personal Elementor demo ready: http://127.0.0.1:9417 (loopback only)');
let stopping = false;
async function stop() { if (stopping) return; stopping = true; await instance[Symbol.asyncDispose](); process.exit(0); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
