import { readFile, writeFile, mkdir } from 'node:fs/promises';

let sequence = 0;
const id = () => (++sequence).toString(16).padStart(8, '0');
const classes = value => ({ css_classes: value, _css_classes: value });
const widget = (type, settings = {}, className = '') => ({
  id: id(), elType: 'widget', widgetType: type, isInner: false,
  settings: { ...settings, ...classes(className) }, elements: [],
});
const heading = (text, tag = 'h2', cls = '') => widget('heading', { title: text, header_size: tag }, cls);
const paragraph = (text, cls = '') => widget('text-editor', { editor: `<p>${text}</p>` }, cls);
const button = (text, url, cls = '') => widget('button', { text, link: { url }, size: 'md' }, cls);
const container = (cls, elements, extra = {}) => ({
  id: id(), elType: 'container', isInner: false,
  settings: { content_width: 'full', flex_direction: 'column', ...classes(cls), ...extra }, elements,
});
const illustration = `<div class="studio-art" aria-hidden="true">
  <div class="art-orbit"></div><div class="art-spark">✳</div>
  <div class="art-browser"><div class="browser-bar"><i></i><i></i><i></i><span>A little clarity goes a long way.</span></div>
  <div class="browser-inner"><span class="art-pill">MADE TO FIT</span><div class="art-title">A fresh start<br>for your website.</div><div class="art-line"></div><div class="art-line short"></div><div class="art-button">LET'S MAKE IT SIMPLE ↗</div><div class="art-tiles"><b></b><b></b><b></b></div></div></div>
  <div class="art-note"><span>✓</span> Thoughtful on every screen</div></div>`;
const form = `<form class="demo-form" id="project-form" aria-describedby="demo-notice">
  <div class="field-row"><label>Your name<input name="name" required maxlength="80" autocomplete="off" placeholder="Alex Taylor"></label><label>Email address<input name="email" type="email" required maxlength="160" autocomplete="off" placeholder="alex@example.test"></label></div>
  <label>What would you like to improve?<select name="service" required><option value="">Choose a starting point</option><option value="landing">A simple landing page</option><option value="mobile">A mobile layout fix</option><option value="updates">Updates to an existing page</option></select></label>
  <label>A little about your project<textarea name="message" required minlength="10" maxlength="800" rows="4" placeholder="Tell us about the page and what needs to change."></textarea></label>
  <label class="demo-honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
  <p id="demo-notice" class="demo-notice">Personal demo: use fictional details. WordPress checks the form on this local server. No email is sent and nothing is saved.</p>
  <button type="submit">Preview enquiry <span aria-hidden="true">↗</span></button>
  <p id="form-result" role="status" aria-live="polite" tabindex="-1" hidden></p>
</form>`;
const service = (number, title, body, label) => container('service-card', [
  paragraph(number, 'card-number'), heading(title, 'h3'), paragraph(body), paragraph(label, 'card-label'),
]);
const steps = [
  ['01', 'Define the details', 'Start with the design, content and a clear list of what the page needs to do.'],
  ['02', 'Build with care', 'Keep content editable and check the layout as it moves from desktop to mobile.'],
  ['03', 'Review & hand over', 'Walk through the result, make the agreed adjustments and leave simple editing notes.'],
];

const content = [container('demo-root', [
  container('demo-disclosure', [paragraph('PERSONAL CONCEPT DEMO · WORDPRESS + ELEMENTOR')]),
  container('demo-nav demo-shell', [heading('luma<span class="brand-dot">.</span>', 'div', 'brand'), widget('html', { html: '<nav aria-label="Main navigation"><a href="#services">Services</a><a href="#process">Our approach</a><a href="#contact">Let’s talk <span aria-hidden="true">↗</span></a></nav>' })]),
  container('hero demo-shell', [
    container('hero-copy', [paragraph('SMALL CHANGES. A CLEARER PICTURE.', 'eyebrow'), heading('A website that<br>feels like <em>you.</em>', 'h1'), paragraph('A thoughtful landing page. A smoother mobile experience. A few details that finally feel right. Start small, with a clear plan.', 'hero-intro'), button('Find your starting point', '#services'), paragraph('Clear scope. Editable content. Careful handover.', 'quiet-note')]),
    container('hero-visual', [widget('html', { html: illustration })]),
  ]),
  container('service-section demo-shell', [
    container('section-heading', [paragraph('WHAT WE CAN WORK ON', 'eyebrow'), heading('A little focus.<br>A better first impression.'), paragraph('Useful improvements, one well-defined piece at a time.')]),
    container('service-grid', [service('01 /', 'A focused landing page', 'Turn a supplied design and content into a clear, responsive page with one purpose.', 'DESIGN TO WORDPRESS'), service('02 /', 'A layout that fits', 'Tidy up awkward spacing, overflowing sections and mobile layouts that get in the way.', 'RESPONSIVE REFINEMENTS'), service('03 /', 'Room for a refresh', 'Update existing sections and content while keeping the parts that already work.', 'ELEMENTOR PAGE UPDATES')]),
  ], { _element_id: 'services' }),
  container('process-section', [container('process-inner demo-shell', [
    container('process-title', [paragraph('A SIMPLE WAY FORWARD', 'eyebrow'), heading('Less guesswork.<br>More clarity.'), paragraph('A good small project starts with shared expectations.')]),
    container('process-steps', steps.map(([number, title, text]) => container('process-step', [paragraph(number, 'step-number'), container('step-copy', [heading(title, 'h3'), paragraph(text)])]))),
  ])], { _element_id: 'process' }),
  container('contact-section demo-shell', [
    container('contact-copy', [paragraph('LET’S START WITH ONE THING', 'eyebrow'), heading('What could work<br>a little <em>better?</em>'), paragraph('Describe the page you have in mind. The first step is a clear scope, before a build begins.'), widget('html', { html: '<div class="mini-faq"><details><summary>Can existing designs be used?</summary><p>Yes. This concept demonstrates how supplied content can become editable Elementor sections.</p></details><details><summary>Is this a real business enquiry form?</summary><p>No. This is a personal portfolio demonstration with fictional branding. WordPress checks a local preview. No email is sent and the enquiry is not saved.</p></details></div>' })]),
    container('contact-form-card', [widget('html', { html: form })]),
  ], { _element_id: 'contact' }),
  container('demo-footer demo-shell', [heading('luma<span class="brand-dot">.</span>', 'div', 'brand'), paragraph('A personal concept by Ivan Delgado · Created with AI assistance.<br>Fictional brand. No client work, reviews or commercial results claimed.')]),
])];

const template = { title: 'Luma — personal Elementor landing demo', type: 'page', version: '0.4', page_settings: { hide_title: 'yes', template: 'elementor_canvas' }, content };
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/elementor-template.json', JSON.stringify(template, null, 2));
const css = await readFile('demo.css', 'utf8');
const js = await readFile('demo.js', 'utf8');
const plugin = await readFile('luma-demo.php', 'utf8');
const php = `<?php
require_once '/wordpress/wp-load.php';
wp_set_current_user(1);
$data = json_decode(file_get_contents('/wordpress/wp-content/luma-template.json'), true, 512, JSON_THROW_ON_ERROR);
$page = wp_insert_post(['post_title' => 'Luma — Personal Demo', 'post_type' => 'page', 'post_status' => 'publish', 'post_name' => 'luma-demo']);
if (is_wp_error($page)) { throw new Exception($page->get_error_message()); }
update_post_meta($page, '_wp_page_template', 'elementor_canvas');
update_post_meta($page, '_elementor_edit_mode', 'builder');
update_post_meta($page, '_elementor_template_type', 'wp-page');
update_post_meta($page, '_elementor_version', ELEMENTOR_VERSION);
$document = \\Elementor\\Plugin::$instance->documents->get($page);
$document->save(['elements' => $data['content'], 'settings' => $data['page_settings']]);
update_option('show_on_front', 'page');
update_option('page_on_front', $page);
update_option('blog_public', 0);
update_option('luma_demo_mode', true);
update_option('elementor_google_font', 'no');
update_option('elementor_css_print_method', 'internal');
wp_update_user(['ID' => 1, 'user_email' => 'demo@example.test', 'display_name' => 'Personal Demo']);
wp_set_password('local-demo-only', 1);
\\Elementor\\Plugin::$instance->files_manager->clear_cache();
$uploads = wp_upload_dir();
wp_mkdir_p($uploads['basedir']);
file_put_contents($uploads['basedir'] . '/demo-verification.json', wp_json_encode(['wordpress' => get_bloginfo('version'), 'elementor' => ELEMENTOR_VERSION, 'page_id' => $page, 'elementor_edit_mode' => get_post_meta($page, '_elementor_edit_mode', true), 'element_count' => count($data['content'][0]['elements']), 'demo_only' => true]));
`;
await mkdir('artifacts/personal-landing-demo', { recursive: true });
for (const [name, data] of [['personal-landing-demo.php', plugin], ['demo.css', css], ['demo.js', js]]) {
  await writeFile(`artifacts/personal-landing-demo/${name}`, data);
}
const blueprint = {
  landingPage: '/', preferredVersions: { php: '8.3', wp: '7.1.4' },
  features: { networking: false },
  steps: [
    { step: 'setSiteOptions', options: { blogname: 'Luma — Personal Elementor Demo', blogdescription: 'Fictional portfolio demonstration', admin_email: 'demo@example.test' } },
    { step: 'installPlugin', pluginData: { resource: 'url', url: 'https://downloads.wordpress.org/plugin/elementor.4.3.6.zip' }, options: { activate: true } },
    { step: 'mkdir', path: '/wordpress/wp-content/plugins/personal-landing-demo' },
    ...[['personal-landing-demo.php', plugin], ['demo.css', css], ['demo.js', js]].map(([name, data]) => ({ step: 'writeFile', path: `/wordpress/wp-content/plugins/personal-landing-demo/${name}`, data })),
    { step: 'activatePlugin', pluginPath: 'personal-landing-demo/personal-landing-demo.php' },
    { step: 'writeFile', path: '/wordpress/wp-content/luma-template.json', data: JSON.stringify(template) },
    { step: 'runPHP', code: php },
  ],
};
await writeFile('blueprint.json', JSON.stringify(blueprint, null, 2));
console.log(`Created blueprint and editable Elementor template (${sequence} elements).`);
