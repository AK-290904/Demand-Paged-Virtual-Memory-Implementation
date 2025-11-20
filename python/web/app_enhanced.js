// Virtual Memory Implementor - Enhanced Professional Edition
// Vanilla JavaScript with Chart.js integration

const API_BASE = 'http://localhost:5000/api';

// State management
let implementationData = null;
let currentStepIndex = 0;
let autoPlayInterval = null;
let isAutoPlaying = false;
let playSpeed = 1000; // milliseconds

// No charts needed - using progress bars instead

// DOM Elements
const elements = {
    // Controls
    startBtn: document.getElementById('startBtn'),
    resetBtn: document.getElementById('resetBtn'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    autoPlayBtn: document.getElementById('autoPlayBtn'),
    speedSlider: document.getElementById('speedSlider'),
    speedLabel: document.getElementById('speedLabel'),
    jumpToFaultBtn: document.getElementById('jumpToFaultBtn'),
    exportBtn: document.getElementById('exportBtn'),
    helpBtn: document.getElementById('helpBtn'),
    
    // Config inputs
    numProcesses: document.getElementById('numProcesses'),
    maxPages: document.getElementById('maxPages'),
    numFrames: document.getElementById('numFrames'),
    tlbSize: document.getElementById('tlbSize'),
    algorithm: document.getElementById('algorithm'),
    enableDirtyBits: document.getElementById('enableDirtyBits'),
    enablePrefetch: document.getElementById('enablePrefetch'),
    enableWorkingSet: document.getElementById('enableWorkingSet'),
    explainMode: document.getElementById('explainMode'),
    
    // Display sections
    statsDashboard: document.getElementById('statsDashboard'),
    navigation: document.getElementById('navigation'),
    visualization: document.getElementById('visualization'),
    eventLog: document.getElementById('eventLog'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    
    // Stats
    totalRefs: document.getElementById('totalRefs'),
    pageFaults: document.getElementById('pageFaults'),
    faultRate: document.getElementById('faultRate'),
    tlbHits: document.getElementById('tlbHits'),
    tlbHitRate: document.getElementById('tlbHitRate'),
    diskIO: document.getElementById('diskIO'),
    
    // Step info
    currentStep: document.getElementById('currentStep'),
    totalSteps: document.getElementById('totalSteps'),
    
    // Visualization
    currentEvent: document.getElementById('currentEvent'),
    explanation: document.getElementById('explanation'),
    physicalMemory: document.getElementById('physicalMemory'),
    tlbDisplay: document.getElementById('tlbDisplay'),
    pageTables: document.getElementById('pageTables'),
    freeFrames: document.getElementById('freeFrames'),
    tlbHitCount: document.getElementById('tlbHitCount'),
    tlbMissCount: document.getElementById('tlbMissCount'),
    
    // Log
    logEntries: document.getElementById('logEntries'),
    logSearch: document.getElementById('logSearch'),
    logFilter: document.getElementById('logFilter')
};

// Event Listeners
elements.startBtn.addEventListener('click', startImplementation);
elements.resetBtn.addEventListener('click', resetImplementation);
elements.prevBtn.addEventListener('click', previousStep);
elements.nextBtn.addEventListener('click', nextStep);
elements.autoPlayBtn.addEventListener('click', toggleAutoPlay);
elements.speedSlider.addEventListener('input', updateSpeed);
elements.jumpToFaultBtn.addEventListener('click', jumpToNextFault);
elements.exportBtn.addEventListener('click', exportResults);
elements.helpBtn.addEventListener('click', showHelp);
elements.logSearch.addEventListener('input', filterLog);
elements.logFilter.addEventListener('change', filterLog);

// Preset buttons
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => loadPreset(btn.dataset.preset));
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    
    switch(e.key) {
        case 'ArrowLeft':
            previousStep();
            break;
        case 'ArrowRight':
            nextStep();
            break;
        case ' ':
            e.preventDefault();
            toggleAutoPlay();
            break;
        case 'r':
        case 'R':
            resetImplementation();
            break;
        case 'f':
        case 'F':
            jumpToNextFault();
            break;
    }
});

// Preset configurations
const PRESETS = {
    simple: {
        numProcesses: 2,
        maxPages: 3,
        numFrames: 4,
        tlbSize: 2,
        algorithm: 'LRU'
    },
    thrashing: {
        numProcesses: 4,
        maxPages: 8,
        numFrames: 6,
        tlbSize: 3,
        algorithm: 'FIFO'
    },
    prefetch: {
        numProcesses: 2,
        maxPages: 10,
        numFrames: 8,
        tlbSize: 4,
        algorithm: 'LRU',
        enablePrefetch: true
    },
    looping: {
        numProcesses: 3,
        maxPages: 6,
        numFrames: 8,
        tlbSize: 4,
        algorithm: 'LRU'
    }
};

// Load preset configuration
function loadPreset(presetName) {
    const preset = PRESETS[presetName];
    if (!preset) return;
    
    elements.numProcesses.value = preset.numProcesses;
    elements.maxPages.value = preset.maxPages;
    elements.numFrames.value = preset.numFrames;
    elements.tlbSize.value = preset.tlbSize;
    elements.algorithm.value = preset.algorithm;
    
    if (preset.enablePrefetch) {
        elements.enablePrefetch.checked = true;
    }
    
    showToast(`Loaded preset: ${presetName}`, 'success');
}

// Start implementation
async function startImplementation() {
    const config = {
        numProcesses: parseInt(elements.numProcesses.value),
        maxPagesPerProcess: parseInt(elements.maxPages.value),
        numFrames: parseInt(elements.numFrames.value),
        tlbSize: parseInt(elements.tlbSize.value),
        algorithm: elements.algorithm.value,
        autoGenerate: true,
        enableDirtyBits: elements.enableDirtyBits.checked,
        enablePrefetch: elements.enablePrefetch.checked,
        enableWorkingSet: elements.enableWorkingSet.checked
    };
    
    // Validation
    if (config.numFrames < config.numProcesses) {
        showToast('Number of frames must be >= number of processes', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        
        const data = await response.json();
        
        if (data.success) {
            implementationData = data;
            currentStepIndex = 0;
            showToast('Implementation completed successfully!', 'success');
            initializeVisualization();
            displayStep(0);
        } else {
            showToast(`Implementation failed: ${data.error || data.errorMessage}`, 'error');
        }
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Reset implementation
async function resetImplementation() {
    try {
        await fetch(`${API_BASE}/reset`, { method: 'POST' });
        implementationData = null;
        currentStepIndex = 0;
        hideVisualization();
        showToast('Implementation reset', 'success');
        
        if (isAutoPlaying) {
            toggleAutoPlay();
        }
    } catch (error) {
        showToast(`Error resetting: ${error.message}`, 'error');
    }
}

// Navigation functions
function previousStep() {
    if (!implementationData || currentStepIndex <= 0) return;
    currentStepIndex--;
    displayStep(currentStepIndex);
}

function nextStep() {
    if (!implementationData || currentStepIndex >= implementationData.steps.length - 1) return;
    currentStepIndex++;
    displayStep(currentStepIndex);
}

function toggleAutoPlay() {
    if (isAutoPlaying) {
        clearInterval(autoPlayInterval);
        isAutoPlaying = false;
        elements.autoPlayBtn.textContent = 'Auto Play';
        elements.autoPlayBtn.classList.remove('bg-yellow-600');
        elements.autoPlayBtn.classList.add('bg-green-600');
    } else {
        isAutoPlaying = true;
        elements.autoPlayBtn.textContent = 'Pause';
        elements.autoPlayBtn.classList.remove('bg-green-600');
        elements.autoPlayBtn.classList.add('bg-yellow-600');
        autoPlayInterval = setInterval(() => {
            if (currentStepIndex < implementationData.steps.length - 1) {
                nextStep();
            } else {
                toggleAutoPlay();
            }
        }, playSpeed);
    }
}

function updateSpeed() {
    playSpeed = parseInt(elements.speedSlider.value);
    const speedMultiplier = 2000 / playSpeed;
    elements.speedLabel.textContent = `${speedMultiplier.toFixed(2)}x`;
    
    if (isAutoPlaying) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = setInterval(() => {
            if (currentStepIndex < implementationData.steps.length - 1) {
                nextStep();
            } else {
                toggleAutoPlay();
            }
        }, playSpeed);
    }
}

function jumpToNextFault() {
    if (!implementationData) return;
    
    for (let i = currentStepIndex + 1; i < implementationData.steps.length; i++) {
        if (implementationData.steps[i].event === 'page_fault') {
            currentStepIndex = i;
            displayStep(i);
            return;
        }
    }
    
    showToast('No more page faults found', 'info');
}

// Visualization functions
function initializeVisualization() {
    elements.statsDashboard.classList.remove('hidden');
    elements.navigation.classList.remove('hidden');
    elements.visualization.classList.remove('hidden');
    elements.eventLog.classList.remove('hidden');
    
    updateStatistics();
    updateProgressBars();
    buildEventLog();
}

function hideVisualization() {
    elements.statsDashboard.classList.add('hidden');
    elements.navigation.classList.add('hidden');
    elements.visualization.classList.add('hidden');
    elements.eventLog.classList.add('hidden');
}

function displayStep(index) {
    if (!implementationData || index < 0 || index >= implementationData.steps.length) return;
    
    const step = implementationData.steps[index];
    
    // Update step counter
    elements.currentStep.textContent = index + 1;
    elements.totalSteps.textContent = implementationData.steps.length;
    
    // Update navigation buttons
    elements.prevBtn.disabled = index === 0;
    elements.nextBtn.disabled = index === implementationData.steps.length - 1;
    
    // Display current event
    displayCurrentEvent(step);
    
    // Display physical memory
    displayPhysicalMemory(step);
    
    // Display TLB
    displayTLB(step);
    
    // Display page tables
    displayPageTables(step);
    
    // Display free frames
    displayFreeFrames(step);
    
    // Update TLB counters
    elements.tlbHitCount.textContent = step.tlbHitCount;
    elements.tlbMissCount.textContent = step.tlbMissCount;
    
    // Auto-scroll to visualization section during autoplay
    if (isAutoPlaying) {
        const visualizationSection = document.getElementById('visualization');
        if (visualizationSection) {
            visualizationSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    }
    
    // Highlight log entry
    highlightLogEntry(index);
}

function displayCurrentEvent(step) {
    const eventDiv = elements.currentEvent;
    eventDiv.textContent = step.message;
    
    // Remove previous classes
    eventDiv.className = 'text-xl font-medium text-white p-4 bg-gray-800/50 rounded-lg border-l-4';
    
    // Add appropriate class and animation
    if (step.event === 'page_fault') {
        eventDiv.classList.add('border-red-500', 'glow-effect');
    } else if (step.event === 'tlb_hit') {
        eventDiv.classList.add('border-green-500');
    } else if (step.event === 'page_hit') {
        eventDiv.classList.add('border-cyan-500');
    } else {
        eventDiv.classList.add('border-indigo-500');
    }
    
    // Show explanation if explain mode is enabled
    if (elements.explainMode.checked && step.explanation) {
        elements.explanation.textContent = step.explanation;
        elements.explanation.classList.remove('hidden');
    } else {
        elements.explanation.classList.add('hidden');
    }
}

function displayPhysicalMemory(step) {
    const container = elements.physicalMemory;
    container.innerHTML = '';
    
    step.physicalMemory.forEach((processId, frameNum) => {
        const frameDiv = document.createElement('div');
        frameDiv.className = 'p-4 rounded-lg border-2 transition-all duration-300';
        
        // Determine frame state
        if (processId >= 0) {
            if (step.event === 'page_fault' && step.frameNumber === frameNum) {
                frameDiv.classList.add('frame-fault', 'glow-effect');
            } else if ((step.event === 'tlb_hit' || step.event === 'page_hit') && step.frameNumber === frameNum) {
                frameDiv.classList.add('frame-hit');
            } else {
                frameDiv.classList.add('frame-occupied');
            }
        } else {
            frameDiv.classList.add('frame-free');
        }
        
        frameDiv.innerHTML = `
            <div class="text-xs text-gray-400 mb-1">Frame ${frameNum}</div>
            <div class="text-lg font-bold">${processId >= 0 ? `P${processId}` : 'Free'}</div>
            ${processId >= 0 && step.dirtyBits && step.dirtyBits[processId] ? 
                '<div class="text-xs text-yellow-400 mt-1">Dirty</div>' : ''}
        `;
        
        container.appendChild(frameDiv);
    });
}

function displayTLB(step) {
    const container = elements.tlbDisplay;
    container.innerHTML = '';
    
    const tlbSize = parseInt(elements.tlbSize.value);
    
    for (let i = 0; i < tlbSize; i++) {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'p-4 rounded-lg border-l-4 transition-all duration-300';
        
        if (i < step.tlbState.length) {
            const tlbEntry = step.tlbState[i];
            
            if (step.event === 'tlb_hit' && step.processId === tlbEntry.pid && step.pageNumber === tlbEntry.page) {
                entryDiv.classList.add('tlb-hit', 'glow-effect');
            } else {
                entryDiv.classList.add('bg-gray-800', 'border-cyan-500');
            }
            
            entryDiv.innerHTML = `
                <div class="text-sm text-gray-400 mb-2">TLB[${i}]</div>
                <div class="space-y-1">
                    <div class="text-sm">PID: <span class="font-semibold text-cyan-400">${tlbEntry.pid}</span></div>
                    <div class="text-sm">Page: <span class="font-semibold text-cyan-400">${tlbEntry.page}</span></div>
                    <div class="text-sm">Frame: <span class="font-semibold text-cyan-400">${tlbEntry.frame}</span></div>
                </div>
            `;
        } else {
            entryDiv.classList.add('bg-gray-800/30', 'border-gray-700');
            entryDiv.innerHTML = `
                <div class="text-sm text-gray-400 mb-2">TLB[${i}]</div>
                <div class="text-sm text-gray-500">Empty</div>
            `;
        }
        
        container.appendChild(entryDiv);
    }
}

function displayPageTables(step) {
    const container = elements.pageTables;
    container.innerHTML = '';
    
    const numProcesses = parseInt(elements.numProcesses.value);
    
    for (let pid = 0; pid < numProcesses; pid++) {
        const tableDiv = document.createElement('div');
        tableDiv.className = 'bg-gray-800/50 p-4 rounded-lg border border-gray-700';
        
        const header = document.createElement('div');
        header.className = 'text-lg font-semibold text-purple-400 mb-3';
        header.textContent = `Process ${pid} Page Table`;
        
        const tableContent = document.createElement('div');
        tableContent.className = 'space-y-2';
        
        const pageTable = step.pageTables[pid] || {};
        const maxPages = parseInt(elements.maxPages.value);
        
        let hasValidPages = false;
        for (let page = 0; page < maxPages; page++) {
            if (pageTable.hasOwnProperty(page)) {
                hasValidPages = true;
                const entryDiv = document.createElement('div');
                entryDiv.className = 'flex justify-between items-center p-2 bg-gray-700/50 rounded border border-green-700/50';
                
                const isDirty = step.dirtyBits && step.dirtyBits[pid] && step.dirtyBits[pid][page];
                
                entryDiv.innerHTML = `
                    <span class="text-sm">Page ${page}</span>
                    <span class="text-sm font-semibold text-green-400">Frame ${pageTable[page]}</span>
                    ${isDirty ? '<span class="text-xs text-yellow-400">D</span>' : ''}
                `;
                tableContent.appendChild(entryDiv);
            }
        }
        
        if (!hasValidPages) {
            tableContent.innerHTML = '<div class="text-sm text-gray-500 text-center py-2">No valid pages</div>';
        }
        
        tableDiv.appendChild(header);
        tableDiv.appendChild(tableContent);
        container.appendChild(tableDiv);
    }
}

function displayFreeFrames(step) {
    const container = elements.freeFrames;
    container.innerHTML = '';
    
    if (step.freeFrames.length === 0) {
        container.innerHTML = '<div class="text-gray-500">No free frames available</div>';
    } else {
        step.freeFrames.forEach(frame => {
            const badge = document.createElement('span');
            badge.className = 'px-3 py-1 bg-green-600 text-white rounded-full text-sm font-semibold';
            badge.textContent = `Frame ${frame}`;
            container.appendChild(badge);
        });
    }
}

function updateStatistics() {
    if (!implementationData) return;
    
    elements.totalRefs.textContent = implementationData.totalReferences;
    elements.pageFaults.textContent = implementationData.totalPageFaults;
    elements.faultRate.textContent = implementationData.pageFaultRate.toFixed(2) + '%';
    elements.tlbHits.textContent = implementationData.totalTlbHits;
    elements.tlbHitRate.textContent = implementationData.tlbHitRate.toFixed(2) + '%';
    elements.diskIO.textContent = (implementationData.totalDiskReads || 0) + (implementationData.totalDiskWrites || 0);
}

// Progress bar updates (lightweight alternative to charts)
function updateProgressBars() {
    if (!implementationData) return;
    
    const totalRefs = implementationData.totalReferences;
    const pageFaults = implementationData.totalPageFaults;
    const pageHits = implementationData.totalPageHits;
    const tlbHits = implementationData.totalTlbHits;
    const tlbMisses = totalRefs - tlbHits;
    
    // Update text values
    document.getElementById('chartPageFaults').textContent = pageFaults;
    document.getElementById('chartTotalRefs').textContent = totalRefs;
    document.getElementById('chartPageHits').textContent = pageHits;
    document.getElementById('chartTlbHits').textContent = tlbHits;
    document.getElementById('chartTlbMisses').textContent = tlbMisses;
    
    // Update progress bars
    const faultPercent = totalRefs > 0 ? (pageFaults / totalRefs) * 100 : 0;
    const hitPercent = totalRefs > 0 ? (pageHits / totalRefs) * 100 : 0;
    const tlbHitPercent = totalRefs > 0 ? (tlbHits / totalRefs) * 100 : 0;
    const tlbMissPercent = totalRefs > 0 ? (tlbMisses / totalRefs) * 100 : 0;
    
    document.getElementById('faultProgressBar').style.width = faultPercent + '%';
    document.getElementById('hitProgressBar').style.width = hitPercent + '%';
    document.getElementById('tlbHitProgressBar').style.width = tlbHitPercent + '%';
    document.getElementById('tlbMissProgressBar').style.width = tlbMissPercent + '%';
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
                <li><strong>LRU:</strong> Replaces least recently used page - Best for programs with temporal locality</li>
                <li><strong>FIFO:</strong> Replaces oldest page in memory - Simple but can suffer from Belady's anomaly</li>
                <li><strong>LFU:</strong> Replaces least frequently used page - Good for programs with frequency patterns</li>
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
