# Virtual Memory Simulator - React Frontend

This is the React frontend for the Demand-Paged Virtual Memory Implementation project.

## Features

- **Interactive Visualization**: Real-time visualization of physical memory (RAM), page tables, and disk storage
- **Animated Components**:
  - RAM Container with color-coded frames per process and flash animations for hits/faults
  - Disk View with Framer Motion animations showing evicted pages
  - SVG Overlay with Bézier curves connecting page table entries to frames
  - Stats Dashboard with real-time statistics and thrashing detection banner
- **Simulation Controls**: Play/Pause, Step forward/backward, adjustable speed
- **Modern UI**: Dark theme with smooth animations and responsive design

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend server running on `http://localhost:5000`

## Installation

```bash
npm install
```

## Development

1. Start the backend server first (from the project root):
   ```bash
   cd Demand-Paged-Virtual-Memory-Implementation
   python api/server.py
   ```

2. In a separate terminal, start the React development server:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:5173` (or the port shown in the terminal)

The Vite dev server is configured with a proxy to forward `/api` requests to `http://localhost:5000`.

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── App.jsx              # Main application component with simulation controls
├── components/
│   ├── StatsDashboard.jsx    # Real-time statistics and thrashing detection
│   ├── RamContainer.jsx      # Animated RAM grid visualization
│   ├── DiskView.jsx          # Disk storage with page eviction animations
│   └── SVGOverlay.jsx        # Page table visualization with SVG connections
└── ...
```

## API Integration

The frontend communicates with the backend API at `/api/simulate` endpoint. The main data flow:

1. User configures simulation parameters
2. Frontend sends POST request to `/api/simulate` with configuration
3. Backend returns complete simulation result with all steps
4. Frontend displays steps with play/pause/step controls
5. Components visualize each step's state (RAM, page tables, statistics)

## Components

### App.jsx
- Manages simulation state and configuration
- Handles API communication
- Controls play/pause/step functionality
- Passes data to child components

### StatsDashboard
- Displays real-time statistics (page faults, TLB hits, etc.)
- Shows pulsing "THRASHING DETECTED" banner when thrashing is detected
- Displays current step information

### RamContainer
- Visualizes physical memory frames
- Color-coded by process ID
- Flash animations for page faults (red) and hits (green)
- Highlights active frame and shared frames

### DiskView
- Shows evicted pages with Framer Motion animations
- Displays pages that have been moved to disk storage
- Animated transitions when pages are evicted

### SVGOverlay
- Displays page tables for all processes
- Shows Bézier curve connections when hovering over page table entries
- Visual mapping from virtual pages to physical frames
