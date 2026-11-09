import { readFile, writeFile, mkdir } from 'node:fs/promises';

const content = await readFile(new URL('./content.html', import.meta.url), 'utf8');
const setup = `<?php
require_once '/wordpress/wp-load.php';
wp_set_current_user(1);
$page = wp_insert_post(['post_title' => 'Luma — Native WordPress Demo', 'post_type' => 'page', 'post_status' => 'publish', 'post_content' => file_get_contents('/wordpress/wp-content/luma-native.html')]);
if (is_wp_error($page)) { throw new Exception($page->get_error_message()); }
update_option('show_on_front', 'page');
update_option('page_on_front', $page);
update_option('blog_public', 0);
$sample = get_page_by_path('sample-page');
if ($sample) { wp_update_post(['ID' => $sample->ID, 'post_status' => 'draft']); }
update_user_meta(1, 'show_admin_bar_front', 'false');
wp_update_user(['ID' => 1, 'user_email' => 'demo@example.test', 'display_name' => 'Personal Demo']);
wp_set_password('local-demo-only', 1);
file_put_contents('/wordpress/wp-content/native-demo.json', wp_json_encode(['page_id' => $page, 'editor' => 'WordPress core block editor', 'theme' => wp_get_theme()->get('Name'), 'theme_version' => wp_get_theme()->get('Version')]));
`;
const blueprint = {
  $schema: 'https://playground.wordpress.net/blueprint-schema.json',
  landingPage: '/', preferredVersions: { php: '8.3', wp: '7.1.4' }, features: { networking: false },
  steps: [
    { step: 'setSiteOptions', options: { blogname: 'Luma — Native Blocks', blogdescription: 'Personal editing-workflow demonstration', admin_email: 'demo@example.test' } },
    { step: 'installTheme', themeData: { resource: 'url', url: 'https://downloads.wordpress.org/theme/kadence.1.6.0.zip' }, options: { activate: true } },
    { step: 'writeFile', path: '/wordpress/wp-content/luma-native.html', data: content },
    { step: 'runPHP', code: setup },
    { step: 'login', username: 'admin', password: 'local-demo-only' },
  ],
};
await mkdir(new URL('../../docs/', import.meta.url), { recursive: true });
await writeFile(new URL('../../docs/native-playground.json', import.meta.url), JSON.stringify(blueprint, null, 2) + '\n');
console.log('Native WordPress blueprint ready (core blocks, Kadence theme).');
