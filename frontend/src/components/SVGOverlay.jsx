import './SVGOverlay.css';

function SVGOverlay({ currentStep, ramContainerRef, pageTableRef }) {

  if (!currentStep) return null;

  const pageTables = currentStep.pageTables || {};

  return (
    <div className="svg-overlay-container">
      <div className="page-tables-section">
        <h3>Page Tables</h3>
        <div className="page-tables-grid">
          {Object.entries(pageTables).map(([pidStr, pageTable]) => {
            const pid = parseInt(pidStr);
            return (
              <div key={pid} className="page-table-container">
                <div className="page-table-header">PID {pid}</div>
                <div className="page-table-entries">
                  {Object.entries(pageTable).length > 0 ? (
                    Object.entries(pageTable).map(([pageStr, frameValue]) => {
                      const page = parseInt(pageStr);
                      const frame = typeof frameValue === 'number' ? frameValue : parseInt(frameValue);
                      
                      return (
                        <div
                          key={page}
                          className={`page-table-entry ${frame >= 0 ? 'valid' : 'invalid'}`}
                        >
                          <span className="entry-page">Page {page}</span>
                          <span className="entry-frame">
                            {frame >= 0 ? `→ Frame ${frame}` : 'Invalid'}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="page-table-empty">No pages allocated</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SVGOverlay;

