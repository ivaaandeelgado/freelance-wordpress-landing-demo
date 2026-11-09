import './build-blueprint.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

// Reuse the reviewed application. WordPress and PHP run in the visitor's browser.
const blueprint = JSON.parse(await readFile('blueprint.json', 'utf8'));
const setup = blueprint.steps.find(step => step.step === 'runPHP');
if (!setup?.code.includes("update_option('luma_demo_mode', true)")) {
  throw new Error('Review the changed local setup before publishing a browser blueprint.');
}
blueprint.$schema = 'https://playground.wordpress.net/blueprint-schema.json';
setup.code += "\nupdate_user_meta(1, 'show_admin_bar_front', 'false');\nupdate_option('elementor_onboarded', true);\ndelete_transient('elementor_activation_redirect');\n";
blueprint.steps.push({ step: 'login', username: 'admin', password: 'local-demo-only' });
await mkdir('docs', { recursive: true });
await writeFile('docs/playground.json', JSON.stringify(blueprint, null, 2) + '\n');
console.log('Browser blueprint ready; no deployment account or production hosting required.');
