import { useEffect, useState } from 'react';
import './RamContainer.css';

// Color palette for different processes
const PROCESS_COLORS = [
  '#4dabf7', // Blue
  '#51cf66', // Green
  '#ffd43b', // Yellow
  '#ff6b6b', // Red
  '#ae3ec9', // Purple
  '#ff922b', // Orange
  '#20c997', // Teal
  '#fa5252', // Pink
];

function RamContainer({ currentStep, numFrames = 8, enableSharedMemory = false }) {
  const [flashStates, setFlashStates] = useState({});
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    if (!currentStep) return;

    const event = currentStep.event;
    const frameNum = currentStep.frameNumber;

    // Flash animation for page faults and hits
    if (event === 'page_fault' && frameNum >= 0) {
      setFlashStates(prev => ({ ...prev, [frameNum]: 'fault' }));
      setTimeout(() => {
        setFlashStates(prev => {
          const next = { ...prev };
          delete next[frameNum];
          return next;
        });
      }, 600);
    } else if (event === 'page_hit' && frameNum >= 0) {
      setFlashStates(prev => ({ ...prev, [frameNum]: 'hit' }));
      setTimeout(() => {
        setFlashStates(prev => {
          const next = { ...prev };
          delete next[frameNum];
          return next;
        });
      }, 600);
    }

    setLastEvent(event);
  }, [currentStep]);

  if (!currentStep) {
    return (
      <div className="ram-container">
        <h2>Physical Memory (RAM)</h2>
        <div className="ram-grid">
          {Array.from({ length: numFrames }).map((_, i) => (
            <div key={i} className="ram-frame empty">
              <div className="frame-number">Frame {i}</div>
              <div className="frame-content">Empty</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const physicalMemory = currentStep.physicalMemory || [];
  const sharedFrames = currentStep.sharedFrames || {};
  const pageTables = currentStep.pageTables || {};

  // Build frame data: frame index -> { pid, page, isShared }
  const frameData = {};
  Object.entries(pageTables).forEach(([pidStr, pageTable]) => {
    const pid = parseInt(pidStr);
    Object.entries(pageTable).forEach(([pageStr, frameValue]) => {
      const frame = typeof frameValue === 'number' ? frameValue : parseInt(frameValue);
      if (frame >= 0 && frame < numFrames) {
        if (!frameData[frame]) {
          frameData[frame] = { pid, page: parseInt(pageStr), isShared: false };
        } else {
          // Multiple processes share this frame
          frameData[frame].isShared = true;
        }
      }
    });
  });

  // Check shared frames from API (only if shared memory is enabled)
  if (enableSharedMemory) {
    Object.entries(sharedFrames).forEach(([frameStr, pids]) => {
      const frame = parseInt(frameStr);
      if (frameData[frame]) {
        frameData[frame].isShared = true;
        frameData[frame].pids = pids;
      }
    });
  }

  return (
    <div className="ram-container">
      <h2>Physical Memory (RAM)</h2>
      <div className="ram-grid">
        {Array.from({ length: numFrames }).map((_, frameIndex) => {
          const data = frameData[frameIndex];
          const pid = data?.pid ?? (physicalMemory[frameIndex] !== undefined ? physicalMemory[frameIndex] : -1);
          const page = data?.page ?? -1;
          const isShared = data?.isShared ?? false;
          const isFree = currentStep.freeFrames?.includes(frameIndex) ?? false;
          const flashType = flashStates[frameIndex];
          const isActive = currentStep.frameNumber === frameIndex;

          // Use distinct color for shared frames (orange/amber), otherwise use PID color
          // Only show shared color if shared memory is enabled
          const color = pid >= 0 
            ? (enableSharedMemory && isShared ? '#ff922b' : PROCESS_COLORS[pid % PROCESS_COLORS.length])
            : '#333';

          return (
            <div
              key={frameIndex}
              data-frame-index={frameIndex}
              className={`ram-frame ${isFree ? 'free' : ''} ${flashType ? `flash-${flashType}` : ''} ${isActive ? 'active' : ''} ${enableSharedMemory && isShared ? 'shared' : ''}`}
              style={{
                '--process-color': color,
                borderColor: isActive ? '#646cff' : (enableSharedMemory && isShared ? '#ff922b' : color),
              }}
            >
              <div className="frame-number">Frame {frameIndex}</div>
              <div className="frame-content">
                {isFree ? (
                  <div className="empty-frame">Free</div>
                ) : pid >= 0 ? (
                  <>
                    <div className="frame-pid" style={{ color }}>
                      PID {pid}
                    </div>
                    {page >= 0 && (
                      <div className="frame-page">Page {page}</div>
                    )}
                    {enableSharedMemory && isShared && (
                      <div className="shared-badge">Shared</div>
                    )}
                  </>
                ) : (
                  <div className="empty-frame">Empty</div>
                )}
              </div>
              {flashType && (
                <div className={`flash-overlay flash-${flashType}`}>
                  {flashType === 'fault' ? '⚠️ FAULT' : '✓ HIT'}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="ram-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#333' }}></div>
          <span>Empty/Free</span>
        </div>
        {Object.entries(pageTables).map(([pid]) => (
          <div key={pid} className="legend-item">
            <div
              className="legend-color"
              style={{ backgroundColor: PROCESS_COLORS[parseInt(pid) % PROCESS_COLORS.length] }}
            ></div>
            <span>PID {pid}</span>
          </div>
        ))}
        {enableSharedMemory && (
          <div className="legend-item">
            <div className="legend-color shared-color"></div>
            <span>Shared Frame</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default RamContainer;

