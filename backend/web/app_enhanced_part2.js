// Part 2 of app_enhanced.js - Chart.js and remaining functions
// Append this to app_enhanced.js or include separately

// Chart initialization and updates
function initializeCharts() {
    // Page Faults Over Time Chart
    const faultsCtx = document.getElementById('faultsChart');
    if (faultsCtx) {
        faultsChart = new Chart(faultsCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Page Faults',
                    data: [],
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#e2e8f0' }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' }
                    },
                    y: {
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // TLB Hit vs Miss Chart
    const tlbCtx = document.getElementById('tlbChart');
    if (tlbCtx) {
        tlbChart = new Chart(tlbCtx, {
            type: 'doughnut',
            data: {
                labels: ['TLB Hits', 'TLB Misses'],
                datasets: [{
                    data: [implementationData.totalTlbHits, implementationData.totalTlbMisses || 0],
                    backgroundColor: [
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(239, 68, 68, 0.8)'
                    ],
                    borderColor: [
                        'rgb(16, 185, 129)',
                        'rgb(239, 68, 68)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#e2e8f0' }
                    }
                }
            }
        });
    }
}

function updateCharts(stepIndex) {
    if (!implementationData || !faultsChart) return;
    
    // Update faults chart with cumulative data up to current step
    const labels = [];
    const faultData = [];
    let cumulativeFaults = 0;
    
    for (let i = 0; i <= stepIndex && i < implementationData.steps.length; i++) {
        const step = implementationData.steps[i];
        if (step.event === 'page_fault') {
            cumulativeFaults++;
        }
        if (i % 10 === 0 || i === stepIndex) {  // Sample every 10 steps
            labels.push(i + 1);
            faultData.push(cumulativeFaults);
        }
    }
    
    faultsChart.data.labels = labels;
    faultsChart.data.datasets[0].data = faultData;
    faultsChart.update('none');  // Update without animation for smooth playback
}

function destroyCharts() {
    if (faultsChart) {
        faultsChart.destroy();
        faultsChart = null;
    }
    if (tlbChart) {
        tlbChart.destroy();
        tlbChart = null;
    }
}

// Event log functions
function buildEventLog() {
    if (!implementationData) return;
    
    const container = elements.logEntries;
    container.innerHTML = '';
    
    implementationData.steps.forEach((step, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.className = `log-entry p-4 rounded-lg border-l-4 cursor-pointer transition-all hover:bg-gray-800/50 event-${step.event}`;
        entryDiv.dataset.index = index;
        entryDiv.dataset.event = step.event;
        
        const eventIcon = {
            'page_fault': '',
            'tlb_hit': '',
            'page_hit': '',
            'process_complete': '',
            'page_fault_handled': '→'
        }[step.event] || '•';
        
        entryDiv.innerHTML = `
            <div class="flex items-start justify-between mb-2">
                <div class="flex items-center space-x-2">
                    <span class="text-2xl">${eventIcon}</span>
                    <span class="text-sm font-semibold text-gray-400">Step ${index + 1}</span>
                    <span class="text-xs text-gray-500">| Timestamp: ${step.timestamp}</span>
                </div>
                <span class="text-xs px-2 py-1 rounded ${getEventBadgeClass(step.event)}">${step.event.replace('_', ' ').toUpperCase()}</span>
            </div>
            <div class="text-sm text-gray-300">${step.message}</div>
        `;
        
        entryDiv.addEventListener('click', () => {
            currentStepIndex = index;
            displayStep(index);
        });
        
        container.appendChild(entryDiv);
    });
}

function getEventBadgeClass(event) {
    const classes = {
        'page_fault': 'bg-red-900/50 text-red-300',
        'tlb_hit': 'bg-green-900/50 text-green-300',
        'page_hit': 'bg-cyan-900/50 text-cyan-300',
        'process_complete': 'bg-yellow-900/50 text-yellow-300',
        'page_fault_handled': 'bg-indigo-900/50 text-indigo-300'
    };
    return classes[event] || 'bg-gray-900/50 text-gray-300';
}

function highlightLogEntry(index) {
    const entries = elements.logEntries.querySelectorAll('.log-entry');
    entries.forEach((entry, i) => {
        if (i === index) {
            entry.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-900/20');
            entry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            entry.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-900/20');
        }
    });
}

function filterLog() {
    const searchTerm = elements.logSearch.value.toLowerCase();
    const filterType = elements.logFilter.value;
    
    const entries = elements.logEntries.querySelectorAll('.log-entry');
    
    entries.forEach(entry => {
        const message = entry.textContent.toLowerCase();
        const eventType = entry.dataset.event;
        
        const matchesSearch = message.includes(searchTerm);
        const matchesFilter = filterType === 'all' || eventType === filterType;
        
        entry.style.display = matchesSearch && matchesFilter ? 'block' : 'none';
    });
}

// Export functionality
function exportResults() {
    if (!implementationData) {
        showToast('No implementation data to export', 'warning');
        return;
    }
    
    const exportData = {
        configuration: {
            numProcesses: parseInt(elements.numProcesses.value),
            maxPages: parseInt(elements.maxPages.value),
            numFrames: parseInt(elements.numFrames.value),
            tlbSize: parseInt(elements.tlbSize.value),
            algorithm: elements.algorithm.value
        },
        results: {
            totalReferences: implementationData.totalReferences,
            totalPageFaults: implementationData.totalPageFaults,
            pageFaultRate: implementationData.pageFaultRate,
            tlbHitRate: implementationData.tlbHitRate,
            executionTime: implementationData.executionTime
        },
        steps: implementationData.steps
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vm-implementation-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    showToast('Results exported successfully', 'success');
}

// Help modal
function showHelp() {
    const helpContent = `
        <div class="space-y-4">
            <h3 class="text-xl font-bold text-indigo-400">Keyboard Shortcuts</h3>
            <ul class="space-y-2 text-sm">
                <li><kbd class="px-2 py-1 bg-gray-700 rounded">←</kbd> Previous step</li>
                <li><kbd class="px-2 py-1 bg-gray-700 rounded">→</kbd> Next step</li>
                <li><kbd class="px-2 py-1 bg-gray-700 rounded">Space</kbd> Toggle auto-play</li>
                <li><kbd class="px-2 py-1 bg-gray-700 rounded">R</kbd> Reset implementation</li>
                <li><kbd class="px-2 py-1 bg-gray-700 rounded">F</kbd> Jump to next fault</li>
            </ul>
            
            <h3 class="text-xl font-bold text-cyan-400 mt-6">Color Legend</h3>
            <ul class="space-y-2 text-sm">
                <li><span class="inline-block w-4 h-4 bg-green-600 rounded mr-2"></span>Free frame / TLB hit</li>
                <li><span class="inline-block w-4 h-4 bg-indigo-600 rounded mr-2"></span>Occupied frame</li>
                <li><span class="inline-block w-4 h-4 bg-red-600 rounded mr-2"></span>Page fault</li>
                <li><span class="inline-block w-4 h-4 bg-yellow-600 rounded mr-2"></span>Dirty page</li>
            </ul>
            
            <h3 class="text-xl font-bold text-purple-400 mt-6">Algorithms</h3>
            <ul class="space-y-2 text-sm">
                <li><strong>LRU:</strong> Replaces least recently used page</li>
                <li><strong>FIFO:</strong> Replaces oldest page in memory</li>
                <li><strong>LFU:</strong> Replaces least frequently used page</li>
                <li><strong>CLOCK:</strong> Circular buffer with reference bit</li>
                <li><strong>OPTIMAL:</strong> Replaces page not used for longest time (requires trace)</li>
                <li><strong>AGING:</strong> Approximate LRU with aging counter</li>
            </ul>
        </div>
    `;
    
    showModal('Help & Guide', helpContent);
}

// Modal system
function showModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="glass-card rounded-xl p-8 max-w-2xl max-h-[80vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-2xl font-bold text-white">${title}</h2>
                <button class="close-modal text-gray-400 hover:text-white text-2xl">&times;</button>
            </div>
            <div class="text-gray-300">${content}</div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Utility functions
function showLoading(show) {
    elements.loadingIndicator.classList.toggle('hidden', !show);
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `glass-card rounded-lg p-4 shadow-2xl border-l-4 slide-in ${getToastClass(type)}`;
    toast.innerHTML = `
        <div class="flex items-center space-x-3">
            <span class="text-2xl">${getToastIcon(type)}</span>
            <span class="text-sm font-medium">${message}</span>
        </div>
    `;
    
    const container = document.getElementById('toastContainer');
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function getToastClass(type) {
    const classes = {
        'success': 'border-green-500 bg-green-900/20',
        'error': 'border-red-500 bg-red-900/20',
        'warning': 'border-yellow-500 bg-yellow-900/20',
        'info': 'border-indigo-500 bg-indigo-900/20'
    };
    return classes[type] || classes.info;
}

function getToastIcon(type) {
    const icons = {
        'success': '',
        'error': '',
        'warning': '',
        'info': 'ℹ'
    };
    return icons[type] || icons.info;
}

// Initialize
console.log('Virtual Memory Implementor - Professional Edition initialized');
console.log('API Base:', API_BASE);
console.log('Press H for help');

// Add H key for help
document.addEventListener('keydown', (e) => {
    if (e.key === 'h' || e.key === 'H') {
        if (e.target.tagName !== 'INPUT') {
            showHelp();
        }
    }
});
