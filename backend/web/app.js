// Virtual Memory Implementor - JavaScript Application

const API_BASE = 'http://localhost:5000/api';

// State management
let simulationData = null;
let currentStepIndex = 0;
let autoPlayInterval = null;
let isAutoPlaying = false;

// DOM Elements
const elements = {
    // Controls
    startBtn: document.getElementById('startBtn'),
    resetBtn: document.getElementById('resetBtn'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    autoPlayBtn: document.getElementById('autoPlayBtn'),
    
    // Config inputs
    numProcesses: document.getElementById('numProcesses'),
    maxPages: document.getElementById('maxPages'),
    numFrames: document.getElementById('numFrames'),
    tlbSize: document.getElementById('tlbSize'),
    algorithm: document.getElementById('algorithm'),
    
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
    pageHits: document.getElementById('pageHits'),
    
    // Step info
    currentStep: document.getElementById('currentStep'),
    totalSteps: document.getElementById('totalSteps'),
    
    // Visualization
    currentEvent: document.getElementById('currentEvent'),
    physicalMemory: document.getElementById('physicalMemory'),
    tlbDisplay: document.getElementById('tlbDisplay'),
    pageTables: document.getElementById('pageTables'),
    freeFrames: document.getElementById('freeFrames'),
    
    // Log
    logEntries: document.getElementById('logEntries'),
    logSearch: document.getElementById('logSearch'),
    logFilter: document.getElementById('logFilter')
};

// Event Listeners
elements.startBtn.addEventListener('click', startSimulation);
elements.resetBtn.addEventListener('click', resetSimulation);
elements.prevBtn.addEventListener('click', previousStep);
elements.nextBtn.addEventListener('click', nextStep);
elements.autoPlayBtn.addEventListener('click', toggleAutoPlay);
elements.logSearch.addEventListener('input', filterLog);
elements.logFilter.addEventListener('change', filterLog);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') previousStep();
    if (e.key === 'ArrowRight') nextStep();
    if (e.key === ' ') {
        e.preventDefault();
        toggleAutoPlay();
    }
    if (e.key === 'r' || e.key === 'R') resetSimulation();
});

// API Functions
async function startSimulation() {
    const config = {
        numProcesses: parseInt(elements.numProcesses.value),
        maxPagesPerProcess: parseInt(elements.maxPages.value),
        numFrames: parseInt(elements.numFrames.value),
        tlbSize: parseInt(elements.tlbSize.value),
        algorithm: elements.algorithm.value,
        autoGenerate: true
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
            simulationData = data;
            currentStepIndex = 0;
            showToast('Simulation completed successfully!', 'success');
            initializeVisualization();
            displayStep(0);
        } else {
            showToast(`Simulation failed: ${data.error || data.errorMessage}`, 'error');
        }
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

async function resetSimulation() {
    try {
        await fetch(`${API_BASE}/reset`, { method: 'POST' });
        simulationData = null;
        currentStepIndex = 0;
        hideVisualization();
        showToast('Simulation reset', 'success');
        
        if (isAutoPlaying) {
            toggleAutoPlay();
        }
    } catch (error) {
        showToast(`Error resetting: ${error.message}`, 'error');
    }
}

// Navigation Functions
function previousStep() {
    if (!simulationData || currentStepIndex <= 0) return;
    currentStepIndex--;
    displayStep(currentStepIndex);
}

function nextStep() {
    if (!simulationData || currentStepIndex >= simulationData.steps.length - 1) return;
    currentStepIndex++;
    displayStep(currentStepIndex);
}

function toggleAutoPlay() {
    if (isAutoPlaying) {
        clearInterval(autoPlayInterval);
        isAutoPlaying = false;
        elements.autoPlayBtn.textContent = ' Auto Play';
        elements.autoPlayBtn.style.background = '#22c55e';
    } else {
        isAutoPlaying = true;
        elements.autoPlayBtn.textContent = '⏸ Pause';
        elements.autoPlayBtn.style.background = '#f59e0b';
        autoPlayInterval = setInterval(() => {
            if (currentStepIndex < simulationData.steps.length - 1) {
                nextStep();
            } else {
                toggleAutoPlay();
            }
        }, 1000);
    }
}

// Visualization Functions
function initializeVisualization() {
    elements.statsDashboard.style.display = 'block';
    elements.navigation.style.display = 'flex';
    elements.visualization.style.display = 'block';
    elements.eventLog.style.display = 'block';
    
    updateStatistics();
    buildEventLog();
}

function hideVisualization() {
    elements.statsDashboard.style.display = 'none';
    elements.navigation.style.display = 'none';
    elements.visualization.style.display = 'none';
    elements.eventLog.style.display = 'none';
}

function displayStep(index) {
    if (!simulationData || index < 0 || index >= simulationData.steps.length) return;
    
    const step = simulationData.steps[index];
    
    // Update step counter
    elements.currentStep.textContent = index + 1;
    elements.totalSteps.textContent = simulationData.steps.length;
    
    // Update navigation buttons
    elements.prevBtn.disabled = index === 0;
    elements.nextBtn.disabled = index === simulationData.steps.length - 1;
    
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
    
    // Highlight log entry
    highlightLogEntry(index);
}

function displayCurrentEvent(step) {
    const eventDiv = elements.currentEvent;
    eventDiv.textContent = step.message;
    
    // Remove previous classes
    eventDiv.classList.remove('fault', 'hit');
    
    // Add appropriate class
    if (step.event === 'page_fault') {
        eventDiv.classList.add('fault');
    } else if (step.event === 'tlb_hit' || step.event === 'page_hit') {
        eventDiv.classList.add('hit');
    }
}

function displayPhysicalMemory(step) {
    const container = elements.physicalMemory;
    container.innerHTML = '';
    
    step.physicalMemory.forEach((processId, frameNum) => {
        const frameDiv = document.createElement('div');
        frameDiv.className = `frame ${processId >= 0 ? 'occupied' : 'free'}`;
        
        const frameNumber = document.createElement('div');
        frameNumber.className = 'frame-number';
        frameNumber.textContent = `Frame ${frameNum}`;
        
        const frameContent = document.createElement('div');
        frameContent.className = 'frame-content';
        frameContent.textContent = processId >= 0 ? `P${processId}` : 'Free';
        
        frameDiv.appendChild(frameNumber);
        frameDiv.appendChild(frameContent);
        container.appendChild(frameDiv);
    });
}

function displayTLB(step) {
    const container = elements.tlbDisplay;
    container.innerHTML = '';
    
    const tlbSize = parseInt(elements.tlbSize.value);
    
    for (let i = 0; i < tlbSize; i++) {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'tlb-entry';
        
        const header = document.createElement('div');
        header.className = 'tlb-entry-header';
        header.textContent = `TLB Entry ${i}`;
        
        const content = document.createElement('div');
        content.className = 'tlb-entry-content';
        
        if (i < step.tlbState.length) {
            const tlbEntry = step.tlbState[i];
            entryDiv.classList.add('valid');
            content.innerHTML = `
                <div>PID: ${tlbEntry.pid}</div>
                <div>Page: ${tlbEntry.page}</div>
                <div>Frame: ${tlbEntry.frame}</div>
            `;
        } else {
            content.textContent = 'Empty';
        }
        
        entryDiv.appendChild(header);
        entryDiv.appendChild(content);
        container.appendChild(entryDiv);
    }
}

function displayPageTables(step) {
    const container = elements.pageTables;
    container.innerHTML = '';
    
    const numProcesses = parseInt(elements.numProcesses.value);
    
    for (let pid = 0; pid < numProcesses; pid++) {
        const tableDiv = document.createElement('div');
        tableDiv.className = 'page-table';
        
        const header = document.createElement('div');
        header.className = 'page-table-header';
        header.textContent = `Process ${pid} Page Table`;
        
        const entriesDiv = document.createElement('div');
        entriesDiv.className = 'page-table-entries';
        
        const pageTable = step.pageTables[pid] || {};
        const maxPages = parseInt(elements.maxPages.value);
        
        for (let page = 0; page < maxPages; page++) {
            if (pageTable.hasOwnProperty(page)) {
                const entryDiv = document.createElement('div');
                entryDiv.className = 'page-entry valid';
                entryDiv.innerHTML = `
                    <span>Page ${page}</span>
                    <span>→ Frame ${pageTable[page]}</span>
                `;
                entriesDiv.appendChild(entryDiv);
            }
        }
        
        if (entriesDiv.children.length === 0) {
            entriesDiv.innerHTML = '<div style="color: #94a3b8;">No valid pages</div>';
        }
        
        tableDiv.appendChild(header);
        tableDiv.appendChild(entriesDiv);
        container.appendChild(tableDiv);
    }
}

function displayFreeFrames(step) {
    const container = elements.freeFrames;
    
    if (step.freeFrames.length === 0) {
        container.innerHTML = '<div style="color: #94a3b8; text-align: center;">No free frames available</div>';
    } else {
        const listDiv = document.createElement('div');
        listDiv.className = 'free-frames-list';
        
        step.freeFrames.forEach(frame => {
            const badge = document.createElement('span');
            badge.className = 'free-frame-badge';
            badge.textContent = `Frame ${frame}`;
            listDiv.appendChild(badge);
        });
        
        container.innerHTML = '';
        container.appendChild(listDiv);
    }
}

function updateStatistics() {
    if (!simulationData) return;
    
    elements.totalRefs.textContent = simulationData.totalReferences;
    elements.pageFaults.textContent = simulationData.totalPageFaults;
    elements.faultRate.textContent = simulationData.pageFaultRate.toFixed(2) + '%';
    elements.tlbHits.textContent = simulationData.totalTlbHits;
    elements.tlbHitRate.textContent = simulationData.tlbHitRate.toFixed(2) + '%';
    elements.pageHits.textContent = simulationData.totalPageHits;
}

function buildEventLog() {
    if (!simulationData) return;
    
    const container = elements.logEntries;
    container.innerHTML = '';
    
    simulationData.steps.forEach((step, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.className = `log-entry ${step.event}`;
        entryDiv.dataset.index = index;
        entryDiv.dataset.event = step.event;
        
        const timestamp = document.createElement('div');
        timestamp.className = 'log-timestamp';
        timestamp.textContent = `Step ${index + 1} | Timestamp ${step.timestamp}`;
        
        const message = document.createElement('div');
        message.className = 'log-message';
        message.textContent = step.message;
        
        entryDiv.appendChild(timestamp);
        entryDiv.appendChild(message);
        
        entryDiv.addEventListener('click', () => {
            currentStepIndex = index;
            displayStep(index);
        });
        
        container.appendChild(entryDiv);
    });
}

function highlightLogEntry(index) {
    const entries = elements.logEntries.querySelectorAll('.log-entry');
    entries.forEach((entry, i) => {
        if (i === index) {
            entry.style.background = 'rgba(79, 70, 229, 0.3)';
            entry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            entry.style.background = '';
        }
    });
}

function filterLog() {
    const searchTerm = elements.logSearch.value.toLowerCase();
    const filterType = elements.logFilter.value;
    
    const entries = elements.logEntries.querySelectorAll('.log-entry');
    
    entries.forEach(entry => {
        const message = entry.querySelector('.log-message').textContent.toLowerCase();
        const eventType = entry.dataset.event;
        
        const matchesSearch = message.includes(searchTerm);
        const matchesFilter = filterType === 'all' || eventType === filterType;
        
        entry.style.display = matchesSearch && matchesFilter ? 'block' : 'none';
    });
}

// Utility Functions
function showLoading(show) {
    elements.loadingIndicator.style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    const container = document.getElementById('toastContainer');
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initialize
console.log('Virtual Memory Implementor initialized');
console.log('API Base:', API_BASE);
