# Virtual Memory Implementor - Python Edition

A sophisticated demand-paged virtual memory simulation with a modern, interactive web interface. This is a complete Python reimplementation of the original C++ version, designed for cross-platform compatibility and web server integration.

##  Features

### Why Python?

This project has been migrated from C++ to Python for several key reasons:

1. **Web Server Compatibility**: Python's Flask framework provides seamless web server integration
2. **Cross-Platform Support**: Works on Windows, Linux, and macOS without modification
3. **No Fork Dependency**: Eliminates the need for Unix-specific `fork()` system calls
4. **Easier Deployment**: Simple to deploy on cloud platforms and web servers
5. **Better Visualization**: Rich ecosystem for data visualization and web development

### Core Features

- **Demand-Paged Virtual Memory Simulation**: Complete implementation of virtual memory management
- **Multiple Page Replacement Algorithms**: LRU, FIFO, and LFU
- **Translation Lookaside Buffer (TLB)**: Fast address translation with configurable TLB size
- **Real-time Visualization**: Interactive web interface with step-by-step execution
- **Comprehensive Statistics**: Detailed metrics including page fault rates and TLB hit rates
- **RESTful API**: Clean REST endpoints for programmatic access

##  Quick Start

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Modern web browser

### Installation

1. **Navigate to the Python directory**:
```bash
cd python
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

### Running the Application

1. **Start the Flask server**:
```bash
python -m api.server
```

Or alternatively:
```bash
python api/server.py
```

2. **Access the web interface**:
   - Open your browser and navigate to: `http://localhost:8080`
   - The interactive dashboard will load automatically

3. **Configure and run simulation**:
   - Set your desired parameters in the control panel
   - Click "Start Simulation" to begin
   - Use navigation controls to step through the simulation
   - Monitor real-time statistics and event logs

##  How to Use

### Configuration Options

- **Number of Processes (k)**: 1-10 concurrent processes
- **Max Pages per Process (m)**: 1-20 pages per process
- **Physical Frames (f)**: 1-30 frames in physical memory
- **TLB Size (s)**: 1-10 entries in Translation Lookaside Buffer
- **Page Replacement Algorithm**: Choose from LRU, FIFO, or LFU

### Navigation Controls

- **Previous/Next**: Step through simulation manually
- **Auto Play**: Automatically advance through steps (1 second interval)
- **Reset**: Clear current simulation and start fresh
- **Pause**: Pause auto-play mode

### Keyboard Shortcuts

- `←/→`: Previous/Next step
- `Space`: Toggle auto-play
- `R`: Reset simulation

### Visualization Features

- **Physical Memory**: Real-time visualization of frame allocation
- **TLB State**: Current Translation Lookaside Buffer contents
- **Page Tables**: Individual page table states for each process
- **Free Frames**: Available frames in the system
- **Event Log**: Detailed chronological log with filtering

##  Architecture

### System Components

```
    HTTP/REST        
   Web Browser        Flask API          Simulation Core 
   (Frontend)                         (Server)             (Python)      
                     
```

### Project Structure

```
python/
 core/                       # Core simulation modules
    __init__.py
    data_structures.py     # Data classes and enums
    mmu.py                 # Memory Management Unit
    scheduler.py           # Round-robin scheduler
    process_manager.py     # Process creation and management
    implementor.py           # Main simulation orchestrator
 api/                       # REST API
    __init__.py
    server.py              # Flask server
 web/                       # Frontend
    index.html             # Main web interface
    styles.css             # Modern CSS styling
    app.js                 # Interactive JavaScript
 requirements.txt           # Python dependencies
 README.md                  # This file
```

##  API Endpoints

The REST API provides the following endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/simulate` | Start new simulation |
| `GET` | `/api/status` | Get simulation status |
| `GET` | `/api/steps` | Get all simulation steps |
| `GET` | `/api/steps/{n}` | Get specific step |
| `GET` | `/api/result` | Get complete result |
| `POST` | `/api/reset` | Reset simulation |
| `GET` | `/api/algorithms` | Get available algorithms |

### Example API Usage

```bash
# Start simulation
curl -X POST http://localhost:8080/api/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "numProcesses": 4,
    "maxPagesPerProcess": 5,
    "numFrames": 8,
    "tlbSize": 4,
    "algorithm": "LRU",
    "autoGenerate": true
  }'

# Get simulation status
curl http://localhost:8080/api/status

# Get specific step
curl http://localhost:8080/api/steps/5

# Get complete result
curl http://localhost:8080/api/result
```

##  UI Features

### Modern Design

- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Dark Theme**: Professional dark mode interface
- **Smooth Animations**: Professional transitions and micro-interactions
- **Accessibility**: Keyboard navigation support

### Interactive Elements

- **Real-time Updates**: Live visualization of memory state changes
- **Toast Notifications**: User feedback for all actions
- **Progress Indicators**: Visual feedback for operations
- **Clickable Log Entries**: Jump to any simulation step

### Professional Features

- **Statistics Dashboard**: Comprehensive performance metrics
- **Event Logging**: Detailed chronological event tracking with filtering
- **Search Functionality**: Search through event logs
- **Filter Options**: Filter events by type

##  Educational Value

This implementor demonstrates key computer science concepts:

### Virtual Memory Concepts

- **Page Faults**: When requested pages are not in physical memory
- **TLB (Translation Lookaside Buffer)**: Cache for page table entries
- **Page Replacement Algorithms**: LRU, FIFO, LFU strategies
- **Memory Management**: Dynamic allocation and deallocation

### Algorithms Implemented

1. **LRU (Least Recently Used)**: Evicts the page that hasn't been used for the longest time
2. **FIFO (First In First Out)**: Evicts the oldest page in memory
3. **LFU (Least Frequently Used)**: Evicts the page with the lowest access frequency

##  Technical Details

### Performance Characteristics

- **Simulation Speed**: Processes thousands of memory operations instantly
- **Memory Efficiency**: Optimized Python data structures
- **Network Latency**: Minimal overhead for real-time updates
- **Browser Compatibility**: Works on all modern browsers

### Key Improvements over C++ Version

1. **No IPC Complexity**: Eliminates message queues and shared memory
2. **Simplified Architecture**: Direct function calls instead of process communication
3. **Better Error Handling**: Python's exception handling
4. **Easier Testing**: Unit testable components
5. **Cross-Platform**: No Unix-specific dependencies

##  Development

### Running in Development Mode

```bash
# Install dependencies
pip install -r requirements.txt

# Run with debug mode
python api/server.py
```

### Testing the Core Modules

```python
from core import VirtualMemoryImplementor, SimulationConfig, PageReplacementAlgorithm

# Create configuration
config = SimulationConfig(
    num_processes=4,
    max_pages_per_process=5,
    num_frames=8,
    tlb_size=4,
    algorithm=PageReplacementAlgorithm.LRU
)

# Run simulation
implementor = VirtualMemoryImplementor()
implementor.configure(config)
result = implementor.run_simulation()

# Access results
print(f"Total Page Faults: {result.total_page_faults}")
print(f"Page Fault Rate: {result.page_fault_rate:.2f}%")
```

### Customization

The simulation can be extended with:

- **New Page Replacement Algorithms**: Add to `mmu.py`
- **Additional Statistics**: Extend the `SimulationResult` class
- **Custom Visualizations**: Modify the frontend components
- **API Endpoints**: Add new routes in `server.py`

##  Performance Metrics

The implementor tracks comprehensive performance metrics:

- **Page Fault Rate**: Percentage of memory accesses causing page faults
- **TLB Hit Rate**: Percentage of accesses found in TLB
- **Page Hit Rate**: Percentage of accesses found in page table
- **Memory Utilization**: Percentage of physical frames in use
- **Execution Time**: Total simulation runtime

##  Comparison with C++ Version

| Feature | C++ Version | Python Version |
|---------|-------------|----------------|
| Platform | Unix/Linux only | Cross-platform |
| IPC | Message queues, shared memory | Direct function calls |
| Web Server | Crow C++ framework | Flask (Python) |
| Process Model | Multi-process (fork) | Single-process |
| Deployment | Complex compilation | Simple pip install |
| Debugging | GDB, complex | Python debugger, simple |
| Testing | Difficult | Easy unit testing |

##  Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

##  License

This project is open source. See the license file for details.

##  Acknowledgments

- Original C++ implementation for the core concepts
- Flask framework for the web server
- Modern web standards for the responsive frontend
- Educational computer science community for virtual memory concepts

---

**Ready to explore virtual memory management? Start the server and open your browser to `http://localhost:8080`!** 

##  Troubleshooting

### Common Issues

1. **Port 8080 already in use**:
   ```bash
   # Change port in server.py or kill the process using port 8080
   ```

2. **Module not found errors**:
   ```bash
   # Make sure you're in the python directory
   cd python
   pip install -r requirements.txt
   ```

3. **Browser can't connect**:
   - Ensure the server is running
   - Check firewall settings
   - Try accessing via `127.0.0.1:8080` instead of `localhost:8080`

### Getting Help

If you encounter issues:
1. Check the console output for error messages
2. Verify all dependencies are installed
3. Ensure Python 3.8+ is being used
4. Check the browser console for JavaScript errors
