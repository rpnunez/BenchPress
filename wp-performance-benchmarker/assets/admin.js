document.addEventListener('DOMContentLoaded', () => {
    let historicalChartInstance = null;

    const form = document.getElementById('wpb-benchmark-form');
    const statusMsg = document.getElementById('wpb-status');
    const runBtn = document.getElementById('wpb-run-btn');
    const resultsArea = document.getElementById('wpb-results-area');
    const resultsTable = document.getElementById('wpb-results-table');
    const logsOutput = document.getElementById('wpb-logs-output');

    fetchHistoryAndRenderChart();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        runBtn.disabled = true;
        statusMsg.style.color = '#2271b1';
        
        try {
            const formData = new FormData(form);
            const tests = formData.getAll('tests[]');
            const deactivations = formData.getAll('deactivate_plugins[]');
            
            if(tests.length === 0) {
                alert("Please select at least one test.");
                return;
            }

            statusMsg.textContent = "Initializing secure token...";
            const tokenRes = await fetch(`${wpb_data.ajax_url}?action=wpb_get_token&nonce=${wpb_data.nonce}`);
            const tokenData = await tokenRes.json();
            const securityToken = tokenData.data.token;

            const baseHeaders = {
                'X-WPB-Deactivate': deactivations.join(','),
                'X-WPB-Nonce': securityToken
            };

            const runResults = {
                tests: {},
                plugins_deactivated: deactivations.length
            };

            let sampleQueries = [];

            for (const test of ['db_stress', 'cpu_stress', 'memory_leak']) {
                if (tests.includes(test)) {
                    statusMsg.textContent = `Running ${test.replace('_', ' ')}...`;
                    
                    const fd = new FormData();
                    fd.append('action', 'wpb_run_test');
                    fd.append('nonce', wpb_data.nonce);
                    fd.append('test_type', test);
                    if(test === 'db_stress') fd.append('db_iterations', formData.get('db_iterations'));
                    if(test === 'cpu_stress') fd.append('cpu_iterations', formData.get('cpu_iterations'));
                    if(test === 'memory_leak') fd.append('mem_allocations', formData.get('mem_allocations'));

                    const res = await fetch(wpb_data.ajax_url, { 
                        method: 'POST', body: fd, headers: baseHeaders 
                    });
                    const json = await res.json();
                    
                    if (json.success) {
                        runResults.tests[test] = json.data;
                        if (test === 'db_stress' && json.data.sample_queries) {
                            sampleQueries = json.data.sample_queries;
                        }
                    }
                }
            }

            if (tests.includes('network_latency')) {
                statusMsg.textContent = "Measuring local network TTFB latency...";
                const start = performance.now();
                await fetch(`${wpb_data.home_url}?wpb_cache_bust=${Date.now()}`, { headers: baseHeaders });
                const timeStr = performance.now() - start;
                runResults.tests['network_latency'] = { time_ms: Math.round(timeStr) };
            }

            if (tests.includes('high_traffic')) {
                statusMsg.textContent = "Simulating concurrent high traffic...";
                const concurrent = parseInt(formData.get('traffic_requests')) || 30;
                const reqPromises = [];
                
                const start = performance.now();
                for (let i = 0; i < concurrent; i++) {
                    reqPromises.push(
                        fetch(`${wpb_data.home_url}?wpb_cache_bust=${Date.now()}_${i}`, { headers: baseHeaders })
                    );
                }
                await Promise.all(reqPromises);
                const elapsedSec = (performance.now() - start) / 1000;
                
                runResults.tests['high_traffic'] = { 
                    total_time_sec: Math.round(elapsedSec * 100) / 100,
                    requests: concurrent,
                    req_per_sec: Math.round(concurrent / elapsedSec)
                };
            }

            statusMsg.textContent = "Saving benchmark results...";
            const fdSave = new FormData();
            fdSave.append('action', 'wpb_run_test');
            fdSave.append('nonce', wpb_data.nonce);
            fdSave.append('test_type', 'save_results');
            fdSave.append('results', JSON.stringify(runResults));
            await fetch(wpb_data.ajax_url, { method: 'POST', body: fdSave });

            statusMsg.style.color = 'green';
            statusMsg.textContent = "Benchmark complete! Updating charts...";
            
            displayLatestResults(runResults, sampleQueries);
            await fetchHistoryAndRenderChart();

        } catch (err) {
            console.error(err);
            statusMsg.style.color = 'red';
            statusMsg.textContent = "Error: " + err.message;
        } finally {
            runBtn.disabled = false;
        }
    });

    function displayLatestResults(data, sampleQueries) {
        resultsArea.style.display = 'block';
        
        let tableHtml = `<table class="wp-list-table widefat fixed striped">
            <thead><tr><th>Test Type</th><th>Performance Metric</th></tr></thead><tbody>`;
        
        if (data.tests.db_stress) {
            tableHtml += `<tr><td><strong>Database Stress</strong><br>(${data.tests.db_stress.total_queries} queries)</td>
                          <td>Took ${data.tests.db_stress.time_sec} sec</td></tr>`;
        }
        if (data.tests.cpu_stress) {
            tableHtml += `<tr><td><strong>CPU Math Stress</strong><br>(${data.tests.cpu_stress.hashes_processed} hashes)</td>
                          <td>Took ${data.tests.cpu_stress.time_sec} sec</td></tr>`;
        }
        if (data.tests.memory_leak) {
            tableHtml += `<tr><td><strong>Memory Check</strong></td>
                          <td>Peak Allocation: ${data.tests.memory_leak.simulated_leak_mb} MB</td></tr>`;
        }
        if (data.tests.network_latency) {
            tableHtml += `<tr><td><strong>Network TTFB</strong></td>
                          <td>${data.tests.network_latency.time_ms} ms</td></tr>`;
        }
        if (data.tests.high_traffic) {
            tableHtml += `<tr><td><strong>High Traffic</strong><br>(${data.tests.high_traffic.requests} concurrent requests)</td>
                          <td>Avg RPS: <strong>${data.tests.high_traffic.req_per_sec}</strong> (Total time: ${data.tests.high_traffic.total_time_sec}s)</td></tr>`;
        }
        
        tableHtml += `</tbody></table>`;
        resultsTable.innerHTML = tableHtml;

        if (sampleQueries && sampleQueries.length > 0) {
            let logs = '';
            sampleQueries.forEach(q => {
                logs += `<span class="log-time">[${q.time_ms}ms]</span> <span class="log-${q.action.toLowerCase()}">${q.action}</span>: <code>${q.query}</code>\n`;
            });
            logsOutput.innerHTML = logs;
        } else {
            logsOutput.innerHTML = "<em>No queries logged or DB test skipped.</em>";
        }
    }

    async function fetchHistoryAndRenderChart() {
        const fd = new FormData();
        fd.append('action', 'wpb_run_test');
        fd.append('nonce', wpb_data.nonce);
        fd.append('test_type', 'get_history');
        
        const res = await fetch(wpb_data.ajax_url, { method: 'POST', body: fd});
        const json = await res.json();
        
        if (json.success && json.data.history.length > 0) {
            renderChart(json.data.history);
        }
    }

    function renderChart(history) {
        const labels = history.map(h => h.date);
        
        const dbData = history.map(h => h.tests?.db_stress?.time_sec || null);
        const cpuData = history.map(h => h.tests?.cpu_stress?.time_sec || null);
        const trafficRps = history.map(h => h.tests?.high_traffic?.req_per_sec || null);

        const ctx = document.getElementById('historicalChart').getContext('2d');
        if (historicalChartInstance) historicalChartInstance.destroy();

        historicalChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'DB Stress Time (s)',
                        data: dbData,
                        borderColor: '#2271b1',
                        backgroundColor: 'rgba(34, 113, 177, 0.1)',
                        yAxisID: 'y'
                    },
                    {
                        label: 'CPU Time (s)',
                        data: cpuData,
                        borderColor: '#d63638',
                        backgroundColor: 'rgba(214, 54, 56, 0.1)',
                        yAxisID: 'y'
                    },
                    {
                        label: 'High Traffic RPS',
                        data: trafficRps,
                        borderColor: '#00a32a',
                        backgroundColor: 'rgba(0, 163, 42, 0.1)',
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { type: 'linear', position: 'left', title: { display: true, text: 'Seconds' } },
                    y1: { type: 'linear', position: 'right', title: { display: true, text: 'Req / Sec' }, grid: { drawOnChartArea: false } }
                }
            }
        });
    }
});
