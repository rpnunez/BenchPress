<?php
/**
 * Plugin Name: WP Performance Benchmarker
 * Description: Run benchmarks, stress tests, and simulate high traffic. Toggle plugins dynamically to compare performance differences.
 * Version: 1.0.0
 * Author: AI Studio
 */

if (!defined('ABSPATH')) exit;

define('WPB_VERSION', '1.0.0');
define('WPB_URL', plugin_dir_url(__FILE__));
define('WPB_DIR', plugin_dir_path(__FILE__));

// Register Benchmark Custom Post Type
add_action('init', 'wpb_register_cpt');
function wpb_register_cpt() {
    register_post_type('wpb_benchmark', [
        'labels' => [
            'name' => 'Benchmarks',
            'singular_name' => 'Benchmark',
            'menu_name' => 'Benchmarker'
        ],
        'public' => false,
        'show_ui' => true,
        'capability_type' => 'post',
        'supports' => ['title'],
        'menu_icon' => 'dashicons-chart-area',
    ]);
}

// Add Submenu Page for Running the App
add_action('admin_menu', 'wpb_admin_menu');
function wpb_admin_menu() {
    add_submenu_page(
        'edit.php?post_type=wpb_benchmark',
        'Run Benchmark',
        'Run Benchmark',
        'manage_options',
        'wpb-run-benchmark',
        'wpb_admin_page'
    );
}

function wpb_admin_page() {
    include WPB_DIR . 'admin.php';
}

// Enqueue plugin scripts & styles
add_action('admin_enqueue_scripts', 'wpb_admin_scripts');
function wpb_admin_scripts($hook) {
    if (strpos($hook, 'wpb-run-benchmark') !== false) {
        wp_enqueue_script('chartjs', 'https://cdn.jsdelivr.net/npm/chart.js', [], null, true);
        wp_enqueue_script('wpb-admin-js', WPB_URL . 'assets/admin.js', ['jquery'], WPB_VERSION, true);
        wp_enqueue_style('wpb-admin-css', WPB_URL . 'assets/admin.css', [], WPB_VERSION);
        
        wp_localize_script('wpb-admin-js', 'wpb_data', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('wpb_benchmark_nonce'),
            'home_url' => home_url()
        ]);
    }
}

// Handle dynamic plugin deactivation via loopback tests
add_filter('option_active_plugins', 'wpb_disable_plugins_for_test', 1);
function wpb_disable_plugins_for_test($plugins) {
    if (isset($_SERVER['HTTP_X_WPB_DEACTIVATE']) && isset($_SERVER['HTTP_X_WPB_NONCE'])) {
        $expected_nonce = get_option('wpb_header_nonce');
        // Simple token matching to ensure only our automated tests can override active plugins
        if ($_SERVER['HTTP_X_WPB_NONCE'] === $expected_nonce) {
            $deactivate = explode(',', $_SERVER['HTTP_X_WPB_DEACTIVATE']);
            foreach ($plugins as $key => $plugin) {
                if (in_array($plugin, $deactivate)) {
                    unset($plugins[$key]);
                }
            }
            return array_values($plugins);
        }
    }
    return $plugins;
}

// Get temporary security token
add_action('wp_ajax_wpb_get_token', 'wpb_get_token_handler');
function wpb_get_token_handler() {
    check_ajax_referer('wpb_benchmark_nonce', 'nonce');
    if (!current_user_can('manage_options')) wp_die();
    $token = wp_generate_password(24, false);
    update_option('wpb_header_nonce', $token);
    wp_send_json_success(['token' => $token]);
}

// Main test execution logic
add_action('wp_ajax_wpb_run_test', 'wpb_run_test_handler');
function wpb_run_test_handler() {
    if (!current_user_can('manage_options')) wp_die();
    // Allow tests without standard nonce check if sent with HTTP header token
    $is_header_authed = false;
    if (isset($_SERVER['HTTP_X_WPB_NONCE']) && $_SERVER['HTTP_X_WPB_NONCE'] === get_option('wpb_header_nonce')) {
        $is_header_authed = true; 
    } else {
        check_ajax_referer('wpb_benchmark_nonce', 'nonce');
    }

    $test_type = sanitize_text_field($_POST['test_type']);
    $result = [];

    switch ($test_type) {
        case 'db_stress':
            $iterations = isset($_POST['db_iterations']) ? intval($_POST['db_iterations']) : 500;
            global $wpdb;
            $start = microtime(true);
            $queries_logged = [];
            
            for ($i = 0; $i < $iterations; $i++) {
                $key = 'wpb_test_' . rand(1, 99999);
                $val = "stress_data_" . rand(1, 99999);
                
                $q_start = microtime(true);
                $wpdb->insert($wpdb->options, ['option_name' => $key, 'option_value' => $val, 'autoload' => 'no']);
                $q_time = microtime(true) - $q_start;
                if ($i < 10) $queries_logged[] = ["action" => "INSERT", "time_ms" => round($q_time * 1000, 2), "query" => "INSERT INTO options ($key)"];

                $q_start = microtime(true);
                $wpdb->get_var($wpdb->prepare("SELECT option_value FROM $wpdb->options WHERE option_name = %s", $key));
                $q_time = microtime(true) - $q_start;
                if ($i < 10) $queries_logged[] = ["action" => "SELECT", "time_ms" => round($q_time * 1000, 2), "query" => "SELECT FROM options WHERE name=$key"];

                $q_start = microtime(true);
                $wpdb->delete($wpdb->options, ['option_name' => $key]);
                $q_time = microtime(true) - $q_start;
                if ($i < 10) $queries_logged[] = ["action" => "DELETE", "time_ms" => round($q_time * 1000, 2), "query" => "DELETE FROM options WHERE name=$key"];
            }
            
            $result['time_sec'] = round(microtime(true) - $start, 4);
            $result['total_queries'] = $iterations * 3;
            $result['sample_queries'] = $queries_logged; // Returns 30 sample statements
            break;

        case 'cpu_stress':
            $iterations = isset($_POST['cpu_iterations']) ? intval($_POST['cpu_iterations']) : 10000;
            $start = microtime(true);
            // Tax CPU with hashing
            for ($i = 0; $i < $iterations; $i++) {
                hash('sha512', random_bytes(100));
            }
            $result['time_sec'] = round(microtime(true) - $start, 4);
            $result['hashes_processed'] = $iterations;
            break;

        case 'memory_leak':
            $allocations = isset($_POST['mem_allocations']) ? intval($_POST['mem_allocations']) : 50000;
            $start_mem = memory_get_usage();
            $dummy_array = [];
            for ($i = 0; $i < $allocations; $i++) {
                $dummy_array[] = str_repeat('A', 1024); // 1KB per index
            }
            $peak_mem = memory_get_peak_usage();
            unset($dummy_array);
            $end_mem = memory_get_usage();
            
            $result['start_mem_mb'] = round($start_mem / 1024 / 1024, 2);
            $result['peak_mem_mb'] = round($peak_mem / 1024 / 1024, 2);
            $result['end_mem_mb'] = round($end_mem / 1024 / 1024, 2);
            $result['simulated_leak_mb'] = round(($peak_mem - $start_mem) / 1024 / 1024, 2);
            break;

        case 'save_results':
            $data = json_decode(stripslashes($_POST['results']), true);
            $post_id = wp_insert_post([
                'post_title' => 'Benchmark Run - ' . current_time('mysql'),
                'post_type' => 'wpb_benchmark',
                'post_status' => 'publish'
            ]);
            update_post_meta($post_id, 'wpb_results', $data);
            update_post_meta($post_id, 'wpb_date', current_time('timestamp'));
            $result['post_id'] = $post_id;
            break;

        case 'get_history':
            $args = [
                'post_type' => 'wpb_benchmark',
                'posts_per_page' => 50,
                'orderby' => 'date',
                'order' => 'ASC'
            ];
            $posts = get_posts($args);
            $history = [];
            foreach ($posts as $p) {
                $meta = get_post_meta($p->ID, 'wpb_results', true);
                if ($meta) {
                    $meta['title'] = $p->post_title;
                    $meta['date'] = date('Y-m-d H:i', get_post_meta($p->ID, 'wpb_date', true));
                    $history[] = $meta;
                }
            }
            $result['history'] = $history;
            break;
    }

    wp_send_json_success($result);
}
