import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './DiskView.css';

function DiskView({ currentStep, previousStep }) {
  const [evictedPages, setEvictedPages] = useState([]);

  useEffect(() => {
    if (!currentStep || !previousStep) return;

    // Detect page evictions by comparing physical memory
    const currentMemory = currentStep.physicalMemory || [];
    const previousMemory = previousStep.physicalMemory || [];
    const currentPageTables = currentStep.pageTables || {};
    const previousPageTables = previousStep.pageTables || {};

    // Find pages that were in memory before but not now
    const evicted = [];
    Object.entries(previousPageTables).forEach(([pidStr, pageTable]) => {
      const pid = parseInt(pidStr);
      Object.entries(pageTable).forEach(([pageStr, frameValue]) => {
        const page = parseInt(pageStr);
        const frame = typeof frameValue === 'number' ? frameValue : parseInt(frameValue);
        const frameStr = String(frame);
        
        // Check if this page is no longer in the current page table
        const currentFrame = currentPageTables[pidStr]?.[pageStr];
        const currentFrameStr = currentFrame !== undefined ? String(currentFrame) : undefined;
        if (currentFrame === undefined || currentFrameStr !== frameStr) {
          // Page was evicted
          evicted.push({
            id: `${pid}-${page}-${Date.now()}`,
            pid,
            page,
            frame,
            timestamp: currentStep.timestamp,
          });
        }
      });
    });

    if (evicted.length > 0) {
      setEvictedPages(prev => [...prev, ...evicted]);
      
      // Remove old evictions after animation
      setTimeout(() => {
        setEvictedPages(prev => prev.filter(e => e.timestamp !== currentStep.timestamp));
      }, 3000);
    }
  }, [currentStep, previousStep]);

  return (
    <div className="disk-view">
      <h2>Disk Storage</h2>
      <div className="disk-container">
        <div className="disk-icon">
          <svg width="80" height="80" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="#333" stroke="#555" strokeWidth="3" />
            <circle cx="50" cy="50" r="15" fill="#1a1a1a" />
            <path d="M 30 50 L 35 45 L 40 50 L 35 55 Z" fill="#646cff" />
            <path d="M 70 50 L 65 45 L 60 50 L 65 55 Z" fill="#646cff" />
          </svg>
        </div>
        <div className="disk-pages">
          <AnimatePresence>
            {evictedPages.map((evicted) => (
              <motion.div
                key={evicted.id}
                className="evicted-page"
                initial={{ 
                  x: -200, 
                  y: -100, 
                  opacity: 0,
                  scale: 0.5 
                }}
                animate={{ 
                  x: 0, 
                  y: 0, 
                  opacity: 1,
                  scale: 1 
                }}
                exit={{ 
                  opacity: 0,
                  scale: 0.8,
                  y: 20 
                }}
                transition={{ 
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                  duration: 0.6 
                }}
                style={{
                  '--process-color': `hsl(${(evicted.pid * 60) % 360}, 70%, 60%)`,
                }}
              >
                <div className="evicted-page-label">
                  P{evicted.pid}:{evicted.page}
                </div>
                <div className="evicted-page-frame">F{evicted.frame}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      <div className="disk-stats">
        <div className="disk-stat">
          <span className="stat-label">Pages on Disk:</span>
          <span className="stat-value">{evictedPages.length}</span>
        </div>
      </div>
    </div>
  );
}

export default DiskView;

