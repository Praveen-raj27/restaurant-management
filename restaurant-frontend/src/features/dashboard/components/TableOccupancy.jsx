
import { Armchair, RefreshCw } from 'lucide-react';

const statusLabels = {
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  RESERVED: 'Reserved',
};

function TableOccupancy({
  tables = [],
  loading = false,
  error = '',
  onRetry,
}) {
  const availableCount = tables.filter(
    (table) => table.status === 'AVAILABLE'
  ).length;

  const occupiedCount = tables.filter(
    (table) => table.status === 'OCCUPIED'
  ).length;

  const reservedCount = tables.filter(
    (table) => table.status === 'RESERVED'
  ).length;

  if (loading && tables.length === 0) {
    return (
      <div className="table-occupancy-card">
        <div className="section-card-header">
          <div>
            <h3>Table Occupancy</h3>
            <p>Loading your restaurant tables...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && tables.length === 0) {
    return (
      <div className="table-occupancy-card">
        <div className="section-card-header">
          <div>
            <h3>Table Occupancy</h3>
            <p>{error}</p>
          </div>

          <button
            type="button"
            className="occupancy-refresh-button"
            onClick={onRetry}
          >
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="table-occupancy-card">
      <div className="section-card-header">
        <div>
          <h3>Table Occupancy</h3>
          <p>Current table availability</p>
        </div>

        <span className="occupancy-live-label">
          <span className="occupancy-live-dot" />
          Auto refresh: 15s
        </span>
      </div>

      <div className="occupancy-summary">
        <div>
          <strong>{tables.length}</strong>
          <span>Total Tables</span>
        </div>

        <div>
          <strong>{availableCount}</strong>
          <span>Available</span>
        </div>

        <div>
          <strong>{occupiedCount}</strong>
          <span>Occupied</span>
        </div>

        <div>
          <strong>{reservedCount}</strong>
          <span>Reserved</span>
        </div>
      </div>

      <div className="occupancy-legend">
        <span>
          <i className="legend-dot available" /> Available
        </span>
        <span>
          <i className="legend-dot occupied" /> Occupied
        </span>
        <span>
          <i className="legend-dot reserved" /> Reserved
        </span>
      </div>

      {tables.length === 0 ? (
        <div className="occupancy-empty">
          <Armchair size={30} />
          <strong>No active tables found</strong>
          <span>Add tables to see their occupancy here.</span>
        </div>
      ) : (
        <div className="table-grid">
          {tables.map((table) => (
            <div
              className={`table-tile ${table.status.toLowerCase()}`}
              key={table.id}
            >
              <Armchair size={19} />
              <strong>
                {String(table.tableNumber).padStart(2, '0')}
              </strong>
              <span>
                {statusLabels[table.status] || table.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {error && tables.length > 0 && (
        <p className="occupancy-refresh-error">
          Latest refresh failed: {error}
        </p>
      )}
    </div>
  );
}

export default TableOccupancy;
