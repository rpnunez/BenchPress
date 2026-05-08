/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Activity, Download, Gauge, Shield, Server, Zap } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-200">
      <div className="max-w-5xl mx-auto px-6 py-16 sm:py-24">
        {/* Header Section */}
        <div className="text-center space-y-6 mb-16 flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm mb-4">
            <Gauge className="w-8 h-8" />
          </div>
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-slate-900">
            Performance & Stress Labs
          </h1>
          <p className="text-lg sm:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Your customized WordPress plugin is ready. Download the zip file below, upload it to your WordPress site, and start stress testing your infrastructure immediately.
          </p>
          
          <div className="pt-6">
            <a 
              href="/wp-performance-benchmarker.zip" 
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-6 py-3 text-sm font-medium transition-colors shadow-sm focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-50"
              download
            >
              <Download className="w-4 h-4" />
              Download Plugin ZIP
            </a>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-lg flex items-center justify-center mb-4">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold mb-2 text-slate-900">DB & CPU Stress Tests</h3>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              Run iterative read/write/delete operations and SHA512 hashing loops to push your server hardware constraints.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-lg flex items-center justify-center mb-4">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold mb-2 text-slate-900">High Traffic Simulation</h3>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              Blast asynchronous concurrent requests to your homepage to simulate traffic spikes and measure max requests per second.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold mb-2 text-slate-900">Dynamic Plugin Isolation</h3>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              Toggle specific plugins (like page builders or security tools) OFF during tests to directly measure their performance overhead.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold mb-2 text-slate-900">Memory Leak Testing</h3>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              Sequentially allocate large PHP arrays inside the benchmark cycle to determine peak memory handling and leaks.
            </p>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm sm:col-span-2 lg:col-span-2 flex flex-col min-h-0">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-slate-900">
              ⚙️ Installation Instructions
            </h3>
            <ol className="list-decimal list-inside text-xs font-medium text-slate-500 space-y-2">
              <li>Download the zip file using the button above.</li>
              <li>Log in to your WordPress Admin dashboard.</li>
              <li>Navigate to <strong className="text-slate-700">Plugins &rarr; Add New &rarr; Upload Plugin</strong>.</li>
              <li>Select the downloaded zip file and click <strong className="text-slate-700">Install Now</strong>.</li>
              <li>Activate the plugin and look for "Benchmarks" in your sidebar.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
