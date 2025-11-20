# Real-Time OS Process Monitoring with psutil

## Overview
This guide shows you how to monitor real-time OS processes using `psutil`, track memory metrics (RSS, VMS, page faults), and integrate with your Flask application to display live data in your simulator UI.

---

## Step 1: Installation

```bash
pip install psutil
```

---

## Step 2: Create Process Monitor Module

Create a new file: `process_monitor.py`

```python
import psutil
import time
import platform
from datetime import datetime
from threading import Thread, Lock

class ProcessMonitor:
    """Real-time OS process monitoring using psutil"""
    
    def __init__(self):
        self.monitored_processes = {}  # {pid: process_data}
        self.lock = Lock()
        self.is_running = False
        self.monitor_thread = None
        
    def add_process(self, pid):
        """Add a process to monitor by PID"""
        try:
            p = psutil.Process(pid)
            with self.lock:
                self.monitored_processes[pid] = {
                    'process': p,
                    'name': p.name(),
                    'history': [],  # Store historical data
                    'last_page_faults': 0
                }
            return True
        except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
            print(f"Error adding process {pid}: {e}")
            return False
    
    def remove_process(self, pid):
        """Remove a process from monitoring"""
        with self.lock:
            if pid in self.monitored_processes:
                del self.monitored_processes[pid]
                return True
        return False
    
    def get_process_metrics(self, pid):
        """Get current metrics for a specific process"""
        try:
            with self.lock:
                if pid not in self.monitored_processes:
                    return None
                
                p = self.monitored_processes[pid]['process']
                
                # Basic info
                mem_info = p.memory_info()
                cpu_percent = p.cpu_percent(interval=0.1)
                
                # Memory metrics
                metrics = {
                    'pid': pid,
                    'name': p.name(),
                    'status': p.status(),
                    'cpu_percent': cpu_percent,
                    'rss': mem_info.rss,  # Resident Set Size (bytes)
                    'vms': mem_info.vms,  # Virtual Memory Size (bytes)
                    'rss_mb': round(mem_info.rss / (1024 * 1024), 2),
                    'vms_mb': round(mem_info.vms / (1024 * 1024), 2),
                    'timestamp': datetime.now().isoformat()
                }
                
                # Platform-specific metrics
                if platform.system() == 'Windows':
                    # Page faults (cumulative)
                    page_faults = p.num_page_faults()
                    
                    # Calculate page faults per second
                    last_faults = self.monitored_processes[pid]['last_page_faults']
                    if last_faults > 0:
                        metrics['page_faults_delta'] = page_faults - last_faults
                    else:
                        metrics['page_faults_delta'] = 0
                    
                    metrics['page_faults_total'] = page_faults
                    self.monitored_processes[pid]['last_page_faults'] = page_faults
                    
                    # Pagefile usage
                    metrics['pagefile'] = mem_info.pagefile
                    metrics['pagefile_mb'] = round(mem_info.pagefile / (1024 * 1024), 2)
                
                elif platform.system() == 'Linux':
                    # Linux-specific metrics
                    metrics['shared'] = mem_info.shared
                    metrics['shared_mb'] = round(mem_info.shared / (1024 * 1024), 2)
                
                # Memory percentage
                metrics['memory_percent'] = p.memory_percent()
                
                # Number of threads
                metrics['num_threads'] = p.num_threads()
                
                return metrics
                
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess) as e:
            print(f"Error getting metrics for PID {pid}: {e}")
            # Remove dead process
            self.remove_process(pid)
            return None
    
    def get_all_metrics(self):
        """Get metrics for all monitored processes"""
        metrics = {}
        with self.lock:
            pids = list(self.monitored_processes.keys())
        
        for pid in pids:
            metric = self.get_process_metrics(pid)
            if metric:
                metrics[pid] = metric
        
        return metrics
    
    def list_all_processes(self):
        """List all running processes (for selection)"""
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'status', 'memory_percent']):
            try:
                processes.append({
                    'pid': proc.info['pid'],
                    'name': proc.info['name'],
                    'status': proc.info['status'],
                    'memory_percent': round(proc.info['memory_percent'], 2)
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # Sort by memory usage
        processes.sort(key=lambda x: x['memory_percent'], reverse=True)
        return processes
    
    def find_process_by_name(self, name):
        """Find processes by name"""
        matching = []
        for proc in psutil.process_iter(['pid', 'name']):
            try:
                if name.lower() in proc.info['name'].lower():
                    matching.append({
                        'pid': proc.info['pid'],
                        'name': proc.info['name']
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        return matching
    
    def start_monitoring(self, interval=1.0):
        """Start background monitoring thread"""
        if self.is_running:
            return
        
        self.is_running = True
        self.monitor_thread = Thread(target=self._monitor_loop, args=(interval,))
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
    
    def stop_monitoring(self):
        """Stop background monitoring"""
        self.is_running = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=2)
    
    def _monitor_loop(self, interval):
        """Background monitoring loop"""
        while self.is_running:
            self.get_all_metrics()  # Updates internal state
            time.sleep(interval)
    
    def get_system_memory(self):
        """Get overall system memory statistics"""
        mem = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        return {
            'total': mem.total,
            'available': mem.available,
            'used': mem.used,
            'free': mem.free,
            'percent': mem.percent,
            'total_gb': round(mem.total / (1024**3), 2),
            'available_gb': round(mem.available / (1024**3), 2),
            'used_gb': round(mem.used / (1024**3), 2),
            'swap_total': swap.total,
            'swap_used': swap.used,
            'swap_percent': swap.percent,
            'swap_total_gb': round(swap.total / (1024**3), 2),
            'swap_used_gb': round(swap.used / (1024**3), 2)
        }


# Global instance
monitor = ProcessMonitor()
```

---

## Step 3: Integrate with Flask Backend

Add these routes to your Flask app (e.g., `app.py`):

```python
from flask import Flask, jsonify, request
from process_monitor import monitor

app = Flask(__name__)

# Start monitoring on app startup
@app.before_first_request
def start_monitor():
    monitor.start_monitoring(interval=1.0)  # Poll every 1 second

# API Endpoints

@app.route('/api/processes/list', methods=['GET'])
def list_processes():
    """Get all running processes"""
    processes = monitor.list_all_processes()
    return jsonify({
        'success': True,
        'processes': processes[:50]  # Return top 50 by memory
    })

@app.route('/api/processes/search', methods=['GET'])
def search_processes():
    """Search processes by name"""
    name = request.args.get('name', '')
    if not name:
        return jsonify({'success': False, 'error': 'Name parameter required'}), 400
    
    processes = monitor.find_process_by_name(name)
    return jsonify({
        'success': True,
        'processes': processes
    })

@app.route('/api/processes/monitor/add', methods=['POST'])
def add_process_monitor():
    """Add a process to monitor"""
    data = request.get_json()
    pid = data.get('pid')
    
    if not pid:
        return jsonify({'success': False, 'error': 'PID required'}), 400
    
    success = monitor.add_process(int(pid))
    return jsonify({
        'success': success,
        'message': f'Process {pid} added' if success else 'Failed to add process'
    })

@app.route('/api/processes/monitor/remove', methods=['POST'])
def remove_process_monitor():
    """Remove a process from monitoring"""
    data = request.get_json()
    pid = data.get('pid')
    
    if not pid:
        return jsonify({'success': False, 'error': 'PID required'}), 400
    
    success = monitor.remove_process(int(pid))
    return jsonify({
        'success': success,
        'message': f'Process {pid} removed' if success else 'Process not found'
    })

@app.route('/api/processes/metrics', methods=['GET'])
def get_metrics():
    """Get real-time metrics for all monitored processes"""
    metrics = monitor.get_all_metrics()
    system = monitor.get_system_memory()
    
    return jsonify({
        'success': True,
        'system_memory': system,
        'processes': metrics,
        'count': len(metrics)
    })

@app.route('/api/processes/metrics/<int:pid>', methods=['GET'])
def get_process_metric(pid):
    """Get metrics for a specific process"""
    metric = monitor.get_process_metrics(pid)
    
    if metric:
        return jsonify({
            'success': True,
            'process': metric
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Process not found or inaccessible'
        }), 404

@app.route('/api/system/memory', methods=['GET'])
def get_system_memory():
    """Get system-wide memory statistics"""
    memory = monitor.get_system_memory()
    return jsonify({
        'success': True,
        'memory': memory
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

---

## Step 4: Frontend Integration (JavaScript)

Add this JavaScript to your frontend to fetch and display real-time data:

```javascript
// Fetch and display process list
async function loadProcessList() {
    const response = await fetch('/api/processes/list');
    const data = await response.json();
    
    if (data.success) {
        displayProcessList(data.processes);
    }
}

// Add process to monitoring
async function addProcessMonitor(pid) {
    const response = await fetch('/api/processes/monitor/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid: pid })
    });
    
    const data = await response.json();
    console.log(data.message);
}

// Poll for real-time metrics (every 1 second)
function startRealTimeMonitoring() {
    setInterval(async () => {
        const response = await fetch('/api/processes/metrics');
        const data = await response.json();
        
        if (data.success) {
            updateUI(data.processes, data.system_memory);
        }
    }, 1000);  // Update every 1 second
}

// Update UI with metrics
function updateUI(processes, systemMemory) {
    // Update system memory display
    document.getElementById('system-memory-used').textContent = 
        `${systemMemory.used_gb} GB / ${systemMemory.total_gb} GB (${systemMemory.percent}%)`;
    
    // Update each monitored process
    for (const [pid, metrics] of Object.entries(processes)) {
        updateProcessCard(pid, metrics);
    }
}

// Update individual process card
function updateProcessCard(pid, metrics) {
    const card = document.getElementById(`process-${pid}`);
    if (!card) return;
    
    card.querySelector('.rss').textContent = `RSS: ${metrics.rss_mb} MB`;
    card.querySelector('.vms').textContent = `VMS: ${metrics.vms_mb} MB`;
    card.querySelector('.cpu').textContent = `CPU: ${metrics.cpu_percent}%`;
    
    if (metrics.page_faults_delta !== undefined) {
        card.querySelector('.page-faults').textContent = 
            `Page Faults/sec: ${metrics.page_faults_delta}`;
    }
}

// Start monitoring on page load
document.addEventListener('DOMContentLoaded', () => {
    loadProcessList();
    startRealTimeMonitoring();
});
```

---

## Step 5: Test the Integration

### Quick Test Script (`test_monitor.py`):

```python
from process_monitor import ProcessMonitor
import time
import os

# Create monitor
monitor = ProcessMonitor()

# Monitor current Python process
current_pid = os.getpid()
print(f"Monitoring current process: PID {current_pid}")

monitor.add_process(current_pid)

# Get metrics for 10 seconds
for i in range(10):
    print(f"\n--- Sample {i+1} ---")
    metrics = monitor.get_process_metrics(current_pid)
    
    if metrics:
        print(f"Name: {metrics['name']}")
        print(f"RSS: {metrics['rss_mb']} MB")
        print(f"VMS: {metrics['vms_mb']} MB")
        print(f"CPU: {metrics['cpu_percent']}%")
        
        if 'page_faults_delta' in metrics:
            print(f"Page Faults/sec: {metrics['page_faults_delta']}")
    
    time.sleep(1)

# System memory
print("\n--- System Memory ---")
sys_mem = monitor.get_system_memory()
print(f"Total: {sys_mem['total_gb']} GB")
print(f"Used: {sys_mem['used_gb']} GB ({sys_mem['percent']}%)")
print(f"Available: {sys_mem['available_gb']} GB")
```

**Run:** `python test_monitor.py`

---

## Step 6: Key Features & Usage

### Monitor Specific Processes:
```python
# By PID
monitor.add_process(1234)

# By name (search first)
chrome_procs = monitor.find_process_by_name('chrome')
for proc in chrome_procs:
    monitor.add_process(proc['pid'])
```

### Get Real-Time Metrics:
```python
# All monitored processes
all_metrics = monitor.get_all_metrics()

# Specific process
metrics = monitor.get_process_metrics(1234)
print(f"RSS: {metrics['rss_mb']} MB")
print(f"Page Faults: {metrics.get('page_faults_delta', 0)}/sec")
```

### System-Wide Memory:
```python
system = monitor.get_system_memory()
print(f"Memory Usage: {system['percent']}%")
print(f"Swap Usage: {system['swap_percent']}%")
```

---

## Step 7: Platform-Specific Notes

### Windows:
- Gets `page_faults_total`, `page_faults_delta` (per second)
- Gets `pagefile` usage
- Needs admin rights to monitor some system processes

### Linux:
- Gets shared memory metrics
- Can monitor all user processes without root
- Page faults available via `/proc` (psutil handles it)

### macOS:
- Basic memory metrics work
- Some advanced metrics may differ

---

## Step 8: Error Handling

The monitor handles:
- ✅ Process termination (auto-removes dead processes)
- ✅ Access denied errors (skips inaccessible processes)
- ✅ Thread-safe operations (uses locks)
- ✅ Graceful shutdown

---

## API Reference

### Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/processes/list` | GET | Get all running processes |
| `/api/processes/search?name=<name>` | GET | Search processes by name |
| `/api/processes/monitor/add` | POST | Add process to monitoring |
| `/api/processes/monitor/remove` | POST | Remove process from monitoring |
| `/api/processes/metrics` | GET | Get metrics for all monitored processes |
| `/api/processes/metrics/<pid>` | GET | Get metrics for specific process |
| `/api/system/memory` | GET | Get system-wide memory stats |

---

## Metrics Available

### Per-Process Metrics:
- **pid**: Process ID
- **name**: Process name
- **status**: Process status (running, sleeping, etc.)
- **cpu_percent**: CPU usage percentage
- **rss**: Resident Set Size in bytes
- **rss_mb**: RSS in megabytes
- **vms**: Virtual Memory Size in bytes
- **vms_mb**: VMS in megabytes
- **memory_percent**: Memory usage as % of total RAM
- **num_threads**: Number of threads

### Windows-Specific:
- **page_faults_total**: Cumulative page faults
- **page_faults_delta**: Page faults per second
- **pagefile**: Pagefile usage in bytes
- **pagefile_mb**: Pagefile usage in MB

### Linux-Specific:
- **shared**: Shared memory in bytes
- **shared_mb**: Shared memory in MB

### System-Wide Metrics:
- **total**: Total physical memory
- **available**: Available memory
- **used**: Used memory
- **free**: Free memory
- **percent**: Memory usage percentage
- **swap_total**: Total swap space
- **swap_used**: Used swap space
- **swap_percent**: Swap usage percentage

---

## Complete Integration Flow

1. **Install**: `pip install psutil`
2. **Add**: `process_monitor.py` to your project
3. **Import**: Add Flask routes from Step 3
4. **Frontend**: Poll `/api/processes/metrics` every 1 second
5. **Display**: Show RSS, VMS, CPU%, Page Faults in UI cards
6. **Test**: Run `test_monitor.py` to verify

---

## Troubleshooting

### Permission Issues
- **Windows**: Run as Administrator to monitor system processes
- **Linux**: Use `sudo` for system-wide monitoring
- **macOS**: Grant terminal permissions in System Preferences

### High CPU Usage
- Increase polling interval (e.g., 2-5 seconds instead of 1)
- Reduce number of monitored processes
- Use `/api/processes/metrics/<pid>` for specific processes

### Process Not Found
- Process may have terminated - monitor auto-removes it
- Check PID is correct
- Verify access permissions

---

## Production Considerations

1. **Rate Limiting**: Add rate limiting to API endpoints
2. **Authentication**: Secure endpoints if deployed publicly
3. **Caching**: Cache process lists for better performance
4. **Cleanup**: Stop monitoring thread on app shutdown
5. **Logging**: Add proper logging for production debugging
6. **WebSockets**: Consider WebSockets instead of polling for better performance

---

## Next Steps

- Add charts/graphs for historical data visualization
- Implement process filtering and sorting in UI
- Add alerts for high memory/CPU usage
- Store historical metrics in database
- Add process comparison features

---

**You now have cross-platform, real-time OS process monitoring!** 🚀