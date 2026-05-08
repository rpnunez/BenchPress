<div class="wrap wpb-wrap">
    <h1>WP Performance Benchmarker</h1>
    <p class="description" style="font-size: 14px;">Diagnose bottlenecks and run stress tests to evaluate your server's hardware limits. Dynamically toggle plugins off during the test to measure specific plugin impact.</p>

    <div class="wpb-dashboard">
        <!-- Configuration Panel -->
        <div class="wpb-panel wpb-config-panel">
            <h2><span class="dashicons dashicons-forms"></span> Configure New Benchmark</h2>
            <form id="wpb-benchmark-form">
                
                <table class="form-table wpb-tests-table">
                    <tr>
                        <th><label><input type="checkbox" name="tests[]" value="db_stress" checked> <strong>Database Stress Test</strong></label></th>
                        <td><input type="number" name="db_iterations" value="500" min="1" max="5000"> <em>iterations (Insert/Select/Delete)</em></td>
                    </tr>
                    <tr>
                        <th><label><input type="checkbox" name="tests[]" value="cpu_stress" checked> <strong>CPU Math Stress Test</strong></label></th>
                        <td><input type="number" name="cpu_iterations" value="20000" min="1000"> <em>SHA512 hashes</em></td>
                    </tr>
                    <tr>
                        <th><label><input type="checkbox" name="tests[]" value="memory_leak" checked> <strong>Memory Leak Test</strong></label></th>
                        <td><input type="number" name="mem_allocations" value="50000" min="1000"> <em>array allocations (1KB each)</em></td>
                    </tr>
                    <tr>
                        <th><label><input type="checkbox" name="tests[]" value="high_traffic" checked> <strong>High Traffic Sim</strong></label></th>
                        <td><input type="number" name="traffic_requests" value="30" min="1" max="100"> <em>concurrent async loopback requests</em></td>
                    </tr>
                    <tr>
                        <th><label><input type="checkbox" name="tests[]" value="network_latency" checked> <strong>Network Latency</strong></label></th>
                        <td><em>Measures local TTFB (Time to First Byte)</em></td>
                    </tr>
                </table>

                <hr style="margin: 20px 0; border: 0; border-top: 1px solid #ddd;">

                <h3>Isolate Plugins <em>(Simulate Deactivation)</em></h3>
                <p class="description">Select plugins to <strong>deactivate</strong> during this run to test performance without them active. This only affects the benchmark run and will NOT impact live site visitors.</p>
                
                <div class="wpb-plugin-list">
                    <?php
                    $active_plugins = (array) get_option('active_plugins', []);
                    $network_active = is_multisite() ? (array) get_site_option('active_sitewide_plugins', []) : [];
                    
                    foreach ($active_plugins as $plugin) {
                        if (strpos($plugin, 'wp-performance-benchmarker.php') !== false) continue;
                        $plugin_data = get_plugin_data(WP_PLUGIN_DIR . '/' . $plugin);
                        echo '<label><input type="checkbox" name="deactivate_plugins[]" value="'.esc_attr($plugin).'"> <strong>'.esc_html($plugin_data['Name']).'</strong></label>';
                    }
                    ?>
                </div>

                <div class="wpb-actions">
                    <button type="submit" class="button button-primary button-hero" id="wpb-run-btn">Run Benchmark Now</button>
                    <span id="wpb-status" class="wpb-status"></span>
                </div>
            </form>
        </div>

        <!-- Real-Time Output & Charts -->
        <div class="wpb-panel">
            <h2><span class="dashicons dashicons-chart-line"></span> Performance Trends</h2>
            <div class="wpb-chart-container">
                <canvas id="historicalChart"></canvas>
            </div>
            
            <div id="wpb-results-area" style="display:none; margin-top: 30px;">
                <h3>Latest Run Results</h3>
                <div id="wpb-results-table"></div>
                
                <h4 style="margin-top: 20px;">Sample Executed Queries (From DB Test)</h4>
                <div class="wpb-logs-viewer" id="wpb-logs-output"></div>
            </div>
        </div>
    </div>
</div>
