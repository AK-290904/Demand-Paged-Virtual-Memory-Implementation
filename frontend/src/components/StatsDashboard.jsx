import { useEffect, useState } from 'react';
import './StatsDashboard.css';

function StatsDashboard({ currentStep, result, isPlaying }) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (currentStep?.thrashingDetected || result?.thrashingDetected) {
      setPulse(true);
      const interval = setInterval(() => {
        setPulse(p => !p);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setPulse(false);
    }
  }, [currentStep?.thrashingDetected, result?.thrashingDetected]);

  if (!currentStep && !result) {
    return (
      <div className="stats-dashboard">
        <h2>Statistics</h2>
        <p className="no-data">No simulation data available</p>
      </div>
    );
  }

  const step = currentStep || {};
  const stats = result || {};

  const isThrashing = step.thrashingDetected || stats.thrashingDetected;

  return (
    <div className="stats-dashboard">
      <h2>Statistics</h2>
      
      {isThrashing && (
        <div className={`thrashing-banner ${pulse ? 'pulse' : ''}`}>
          ⚠️ THRASHING DETECTED ⚠️
          <div className="thrashing-details">
            High page fault rate detected (>70% in last 20 events)
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className={`stat-card ${isThrashing ? 'thrashing-highlight' : ''}`}>
          <div className="stat-label">Page Faults</div>
          <div className="stat-value">{step.pageFaultCount ?? stats.totalPageFaults ?? 0}</div>
          {stats.pageFaultRate !== undefined && (
            <div className="stat-rate">
              {stats.pageFaultRate.toFixed(2)}%
              {isThrashing && <span className="thrashing-indicator"> ⚠️</span>}
            </div>
          )}
        </div>

        <div className="stat-card">
          <div className="stat-label">TLB Hits</div>
          <div className="stat-value">{step.tlbHitCount ?? stats.totalTlbHits ?? 0}</div>
          {stats.tlbHitRate !== undefined && (
            <div className="stat-rate">{stats.tlbHitRate.toFixed(2)}%</div>
          )}
        </div>

        <div className="stat-card">
          <div className="stat-label">Page Hits</div>
          <div className="stat-value">{step.pageHitCount ?? stats.totalPageHits ?? 0}</div>
          {stats.pageHitRate !== undefined && (
            <div className="stat-rate">{stats.pageHitRate.toFixed(2)}%</div>
          )}
        </div>

        <div className="stat-card">
          <div className="stat-label">Total References</div>
          <div className="stat-value">{stats.totalReferences ?? 0}</div>
        </div>

        {step.timestamp !== undefined && (
          <div className="stat-card">
            <div className="stat-label">Timestamp</div>
            <div className="stat-value">{step.timestamp}</div>
          </div>
        )}

        {step.processId !== undefined && (
          <div className="stat-card">
            <div className="stat-label">Current Process</div>
            <div className="stat-value">PID {step.processId}</div>
          </div>
        )}

        {step.event && (
          <div className="stat-card">
            <div className="stat-label">Event</div>
            <div className={`stat-value event-${step.event}`}>{step.event}</div>
          </div>
        )}

        {step.freeFrames && (
          <div className="stat-card">
            <div className="stat-label">Free Frames</div>
            <div className="stat-value">{step.freeFrames.length}</div>
          </div>
        )}
      </div>

      {step.message && (
        <div className="message-box">
          <strong>Message:</strong> {step.message}
        </div>
      )}
    </div>
  );
}

export default StatsDashboard;

