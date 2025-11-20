import { useState, useEffect, useRef } from 'react';
import StatsDashboard from './components/StatsDashboard';
import RamContainer from './components/RamContainer';
import DiskView from './components/DiskView';
import SVGOverlay from './components/SVGOverlay';
import './App.css';

// Use relative path for Vite proxy, or full URL if needed
const API_BASE = import.meta.env.MODE === 'development' ? '/api' : 'http://localhost:5000/api';

function App() {
  const [simulationData, setSimulationData] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000); // milliseconds per step
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState({
    numProcesses: 5,
    maxPagesPerProcess: 5,
    numFrames: 5,
    tlbSize: 5,
    algorithm: 'LRU',
    autoGenerate: true,
    enableSharedMemory: false, // Basic paging mode by default
  });
  
  // Track temporary input values for better UX
  const [tempValues, setTempValues] = useState({
    numProcesses: null,
    maxPagesPerProcess: null,
    numFrames: null,
    tlbSize: null,
  });

  const intervalRef = useRef(null);

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && simulationData?.steps) {
      intervalRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev < simulationData.steps.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, speed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, speed, simulationData]);

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (data.success) {
        setSimulationData(data);
        setCurrentStepIndex(0);
        setIsPlaying(false);
      } else {
        setError(data.error || data.errorMessage || 'Simulation failed');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (!simulationData?.steps) return;
    setIsPlaying(!isPlaying);
  };

  const handleStep = (direction) => {
    if (!simulationData?.steps) return;
    if (direction === 'next') {
      setCurrentStepIndex((prev) => Math.min(prev + 1, simulationData.steps.length - 1));
    } else {
      setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
    }
    setIsPlaying(false);
  };

  const handleReset = async () => {
    try {
      await fetch(`${API_BASE}/reset`, { method: 'POST' });
      setSimulationData(null);
      setCurrentStepIndex(0);
      setIsPlaying(false);
      setError(null);
    } catch (err) {
      setError(`Error resetting: ${err.message}`);
    }
  };

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
  };

  const currentStep = simulationData?.steps?.[currentStepIndex] || null;
  const previousStep = currentStepIndex > 0 ? simulationData?.steps?.[currentStepIndex - 1] : null;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Demand-Paged Virtual Memory Simulator</h1>
        <p className="subtitle">Interactive visualization of page replacement algorithms</p>
      </header>

      <div className="app-container">
        {/* Configuration Panel */}
        <div className="config-panel">
          <h2>Configuration</h2>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          <div className="config-grid">
            <div className="config-item">
              <label>Number of Processes</label>
              <input
                type="number"
                min="1"
                max="20"
                value={tempValues.numProcesses !== null ? tempValues.numProcesses : config.numProcesses}
                onFocus={(e) => {
                  e.target.select();
                  setTempValues({ ...tempValues, numProcesses: config.numProcesses });
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  setTempValues({ ...tempValues, numProcesses: value });
                  const num = parseInt(value);
                  if (!isNaN(num) && num >= 1 && num <= 20) {
                    setConfig({ ...config, numProcesses: num });
                  }
                }}
                onBlur={(e) => {
                  const value = parseInt(e.target.value);
                  if (isNaN(value) || value < 1 || value > 20) {
                    setConfig({ ...config, numProcesses: 5 });
                  }
                  setTempValues({ ...tempValues, numProcesses: null });
                }}
                disabled={loading}
              />
            </div>
            <div className="config-item">
              <label>Max Pages per Process</label>
              <input
                type="number"
                min="1"
                max="100"
                value={tempValues.maxPagesPerProcess !== null ? tempValues.maxPagesPerProcess : config.maxPagesPerProcess}
                onFocus={(e) => {
                  e.target.select();
                  setTempValues({ ...tempValues, maxPagesPerProcess: config.maxPagesPerProcess });
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  setTempValues({ ...tempValues, maxPagesPerProcess: value });
                  const num = parseInt(value);
                  if (!isNaN(num) && num >= 1 && num <= 100) {
                    setConfig({ ...config, maxPagesPerProcess: num });
                  }
                }}
                onBlur={(e) => {
                  const value = parseInt(e.target.value);
                  if (isNaN(value) || value < 1 || value > 100) {
                    setConfig({ ...config, maxPagesPerProcess: 5 });
                  }
                  setTempValues({ ...tempValues, maxPagesPerProcess: null });
                }}
                disabled={loading}
              />
            </div>
            <div className="config-item">
              <label>Number of Frames</label>
              <input
                type="number"
                min={config.numProcesses}
                max="100"
                value={tempValues.numFrames !== null ? tempValues.numFrames : config.numFrames}
                onFocus={(e) => {
                  e.target.select();
                  setTempValues({ ...tempValues, numFrames: config.numFrames });
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  setTempValues({ ...tempValues, numFrames: value });
                  const num = parseInt(value);
                  if (!isNaN(num) && num >= config.numProcesses && num <= 100) {
                    setConfig({ ...config, numFrames: num });
                  }
                }}
                onBlur={(e) => {
                  const value = parseInt(e.target.value);
                  if (isNaN(value) || value < config.numProcesses || value > 100) {
                    setConfig({ ...config, numFrames: Math.max(5, config.numProcesses) });
                  }
                  setTempValues({ ...tempValues, numFrames: null });
                }}
                disabled={loading}
              />
            </div>
            <div className="config-item">
              <label>TLB Size</label>
              <input
                type="number"
                min="1"
                max="64"
                value={tempValues.tlbSize !== null ? tempValues.tlbSize : config.tlbSize}
                onFocus={(e) => {
                  e.target.select();
                  setTempValues({ ...tempValues, tlbSize: config.tlbSize });
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  setTempValues({ ...tempValues, tlbSize: value });
                  const num = parseInt(value);
                  if (!isNaN(num) && num >= 1 && num <= 64) {
                    setConfig({ ...config, tlbSize: num });
                  }
                }}
                onBlur={(e) => {
                  const value = parseInt(e.target.value);
                  if (isNaN(value) || value < 1 || value > 64) {
                    setConfig({ ...config, tlbSize: 5 });
                  }
                  setTempValues({ ...tempValues, tlbSize: null });
                }}
                disabled={loading}
              />
            </div>
            <div className="config-item">
              <label>Algorithm</label>
              <select
                value={config.algorithm}
                onChange={(e) => setConfig({ ...config, algorithm: e.target.value })}
                disabled={loading}
              >
                <option value="LRU">LRU (Least Recently Used)</option>
                <option value="MRU">MRU (Most Recently Used)</option>
                <option value="FIFO">FIFO (First In First Out)</option>
                <option value="LFU">LFU (Least Frequently Used)</option>
              </select>
            </div>
          </div>
          <div className="config-advanced">
            <div className="config-item config-toggle">
              <label htmlFor="shared-memory-toggle">
                <input
                  id="shared-memory-toggle"
                  type="checkbox"
                  checked={config.enableSharedMemory}
                  onChange={(e) => setConfig({ ...config, enableSharedMemory: e.target.checked })}
                  disabled={loading}
                />
                <span>Enable Shared Memory (Advanced)</span>
              </label>
              <div className="config-hint">
                When OFF: Pure basic paging mode - no frames are shared between processes.
                When ON: Allows multiple processes to share the same physical frame.
              </div>
            </div>
          </div>
          <div className="config-actions">
            <button
              onClick={handleSimulate}
              disabled={loading || config.numFrames < config.numProcesses}
              className="btn-primary"
            >
              {loading ? 'Running Simulation...' : 'Start Simulation'}
            </button>
            <button
              onClick={handleReset}
              disabled={loading || !simulationData}
              className="btn-secondary"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Controls Panel */}
        {simulationData && (
          <div className="controls-panel">
            <div className="controls-row">
              <button
                onClick={() => handleStep('prev')}
                disabled={currentStepIndex === 0}
                className="btn-control"
              >
                ⏮ Previous
              </button>
              <button
                onClick={handlePlayPause}
                disabled={!simulationData.steps.length}
                className="btn-control btn-play"
              >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
              <button
                onClick={() => handleStep('next')}
                disabled={currentStepIndex >= simulationData.steps.length - 1}
                className="btn-control"
              >
                Next ⏭
              </button>
            </div>
            <div className="controls-row">
              <label>Speed:</label>
              <select
                value={speed}
                onChange={(e) => handleSpeedChange(parseInt(e.target.value))}
                className="speed-select"
              >
                <option value="500">Fast (0.5s)</option>
                <option value="1000">Normal (1s)</option>
                <option value="2000">Slow (2s)</option>
                <option value="3000">Very Slow (3s)</option>
              </select>
            </div>
            <div className="step-info">
              Step {currentStepIndex + 1} of {simulationData.steps.length}
            </div>
          </div>
        )}

        {/* Main Visualization Area */}
        {simulationData && (
          <>
            <StatsDashboard
              currentStep={currentStep}
              result={simulationData}
              isPlaying={isPlaying}
            />
            <div className="visualization-grid">
              <RamContainer
                currentStep={currentStep}
                numFrames={config.numFrames}
                enableSharedMemory={config.enableSharedMemory}
              />
              <DiskView
                currentStep={currentStep}
                previousStep={previousStep}
              />
            </div>
            <SVGOverlay
              currentStep={currentStep}
            />
          </>
        )}

        {!simulationData && (
          <div className="welcome-message">
            <h2>Welcome to the Virtual Memory Simulator</h2>
            <p>Configure the simulation parameters above and click "Start Simulation" to begin.</p>
            <p>You can visualize:</p>
            <ul>
              <li>Physical memory (RAM) with frame allocations</li>
              <li>Page tables and their mappings</li>
              <li>Page faults and hits with visual feedback</li>
              <li>Disk storage for evicted pages</li>
              <li>Real-time statistics and thrashing detection</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
