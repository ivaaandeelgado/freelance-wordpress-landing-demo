<?php
/**
 * Plugin Name: Luma Enquiry Demo
 * Description: Elementor styling and a server-validated enquiry preview for a disposable local demo.
 * Version: 2.0.0
 * License: GPL-2.0-or-later
 */
namespace IvanDelgado\LumaDemo;

if (!defined('ABSPATH')) { exit; }

function enabled(): bool {
    return (bool) get_option('luma_demo_mode', false);
}

add_filter('elementor/frontend/print_google_fonts', '__return_false');
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('luma-demo', plugins_url('demo.css', __FILE__), [], '2.0.0');
    wp_enqueue_script('luma-demo', plugins_url('demo.js', __FILE__), [], '2.0.0', true);
    wp_add_inline_script('luma-demo', 'window.LumaDemo = ' . wp_json_encode([
        'endpoint' => rest_url('luma-demo/v1/enquiries'),
        'nonce' => wp_create_nonce('wp_rest'),
        'enabled' => enabled(),
    ]) . ';', 'before');
}, 100);

function length(string $value): int {
    return preg_match_all('/./us', $value);
}

function preview(\WP_REST_Request $request) {
    if (strlen($request->get_body()) > 4096) {
        return new \WP_Error('luma_too_large', 'The enquiry is too large.', ['status' => 413]);
    }
    $input = $request->get_json_params();
    if (!is_array($input)) {
        return new \WP_Error('luma_invalid_body', 'Send a JSON object.', ['status' => 400]);
    }
    $values = [];
    $errors = [];
    foreach (['name', 'email', 'service', 'message', 'website'] as $key) {
        $raw = $input[$key] ?? '';
        if (!is_string($raw)) {
            $errors[$key] = 'Use text for this field.';
            $raw = '';
        }
        $values[$key] = trim($raw);
    }
    if ($values['website'] !== '') {
        return new \WP_Error('luma_rejected', 'The preview could not be processed.', ['status' => 400]);
    }
    // Validate the same normalized plain text that will be returned to the browser.
    $values['name'] = sanitize_text_field($values['name']);
    $values['message'] = sanitize_textarea_field($values['message']);
    if (length($values['name']) < 2 || length($values['name']) > 80) {
        $errors['name'] = 'Enter a name between 2 and 80 characters.';
    }
    if (!is_email($values['email']) || length($values['email']) > 160) {
        $errors['email'] = 'Enter a valid email address.';
    }
    if (!in_array($values['service'], ['landing', 'mobile', 'updates'], true)) {
        $errors['service'] = 'Choose one of the listed services.';
    }
    if (length($values['message']) < 10 || length($values['message']) > 800) {
        $errors['message'] = 'Use 10 to 800 characters for the project details.';
    }
    if ($errors) {
        return new \WP_Error('luma_invalid_fields', 'Please check the highlighted fields.', ['status' => 422, 'fields' => $errors]);
    }
    // No email, database insertion, analytics, or third-party request takes place.
    $response = new \WP_REST_Response([
        'status' => 'validated',
        'enquiry' => [
            'name' => sanitize_text_field($values['name']),
            'email' => sanitize_email($values['email']),
            'service' => $values['service'],
            'message' => sanitize_textarea_field($values['message']),
        ],
        'delivery' => 'demo_no_email',
        'stored' => false,
    ], 200);
    $response->header('Cache-Control', 'no-store');
    return $response;
}

add_action('rest_api_init', function () {
    if (!enabled()) { return; }
    register_rest_route('luma-demo/v1', '/enquiries', [
        'methods' => 'POST',
        'callback' => __NAMESPACE__ . '\\preview',
        'permission_callback' => function (\WP_REST_Request $request) {
            if (!wp_verify_nonce($request->get_header('X-WP-Nonce'), 'wp_rest')) {
                return new \WP_Error('luma_invalid_nonce', 'Reload the page before trying again.', ['status' => 403]);
            }
            return true;
        },
    ]);
});
