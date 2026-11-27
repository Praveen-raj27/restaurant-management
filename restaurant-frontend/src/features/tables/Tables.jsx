
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  Armchair,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

import tableService from './tableService';
import TableForm from './TableForm';
import './Tables.css';

const STATUS_OPTIONS = [
  { label: 'Available', value: 'AVAILABLE' },
  { label: 'Occupied', value: 'OCCUPIED' },
];

function Tables() {
  const role = useSelector((state) => state.auth.membership?.role);

  const canManage = ['OWNER', 'MANAGER'].includes(role);
  const canUpdateStatus = ['OWNER', 'MANAGER', 'WAITER'].includes(role);

  const [tables, setTables] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const [qrResult, setQrResult] = useState(null);
  const [copyMessage, setCopyMessage] = useState('');

  const fetchTables = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await tableService.getTables({
        page,
        limit: 10,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        isActive: true,
      });

      setTables(response.data || []);

      setPagination(
        response.pagination || {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 1,
        }
      );
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to load tables.'
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const openCreateForm = () => {
    setEditingTable(null);
    setActionError('');
    setShowForm(true);
  };

  const openEditForm = (table) => {
    setEditingTable(table);
    setActionError('');
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingTable(null);
    setActionError('');
  };

  const handleSaveTable = async (payload) => {
    setSaving(true);
    setActionError('');

    try {
      if (editingTable) {
        await tableService.updateTable(editingTable.id, payload);
      } else {
        await tableService.createTable(payload);
      }

      setShowForm(false);
      setEditingTable(null);

      await fetchTables();
    } catch (err) {
      setActionError(
        err.response?.data?.message || 'Unable to save table.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (table, status) => {
    setProcessingId(table.id);
    setActionError('');

    try {
      await tableService.updateTableStatus(table.id, status);
      await fetchTables();
    } catch (err) {
      setActionError(
        err.response?.data?.message || 'Unable to update table status.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    setProcessingId(confirmDelete.id);
    setActionError('');

    try {
      await tableService.deleteTable(confirmDelete.id);

      setConfirmDelete(null);
      await fetchTables();
    } catch (err) {
      setActionError(
        err.response?.data?.message || 'Unable to deactivate table.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleRegenerateQr = async (table) => {
    const confirmed = window.confirm(
      `Regenerate QR code for ${table.name || `Table ${table.tableNumber}`}? The previous QR code will stop working.`
    );

    if (!confirmed) return;

    setProcessingId(table.id);
    setActionError('');
    setQrResult(null);
    setCopyMessage('');

    try {
      const response = await tableService.regenerateTableQr(table.id);

      setQrResult({
        tableName: table.name || `Table ${table.tableNumber}`,
        token: response.data?.qrToken,
      });
    } catch (err) {
      setActionError(
        err.response?.data?.message || 'Unable to regenerate QR code.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  // Copy QR token with clipboard fallback
  const handleCopyQrToken = async () => {
    if (!qrResult?.token) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(qrResult.token);
      } else {
        const textArea = document.createElement('textarea');

        textArea.value = qrResult.token;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const copied = document.execCommand('copy');

        document.body.removeChild(textArea);

        if (!copied) {
          throw new Error('Clipboard copy failed');
        }
      }

      setCopyMessage('QR token copied successfully!');
    } catch (err) {
      console.error('Clipboard error:', err);

      setCopyMessage(
        'Unable to copy. Please select and copy the token manually.'
      );
    }
  };

  return (
    <div className="tables-page">

      {/* Page Header */}
      <div className="tables-page-header">
        <div>
          <h1>Table Management</h1>
          <p>Manage restaurant tables and their availability.</p>
        </div>

        {canManage && (
          <button
            className="primary-button"
            onClick={openCreateForm}
          >
            <Plus size={18} />
            Add Table
          </button>
        )}
      </div>

      {/* Action Error */}
      {actionError && (
        <div className="tables-alert tables-alert-error">
          {actionError}

          <button
            onClick={() => setActionError('')}
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="tables-toolbar">
        <div className="tables-search">
          <Search size={18} />

          <input
            type="search"
            placeholder="Search table name or number..."
            value={search}
            onChange={(event) => handleSearch(event.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => handleStatusFilter(event.target.value)}
          aria-label="Filter by table status"
        >
          <option value="">All statuses</option>

          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          className="secondary-button"
          onClick={fetchTables}
          disabled={loading}
          title="Refresh tables"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="tables-summary">
        <span>{pagination.total} active tables</span>
      </div>

      {/* Table Listing */}
      {loading ? (
        <div className="tables-empty-state">
          Loading tables...
        </div>
      ) : error ? (
        <div className="tables-empty-state tables-error">
          <p>{error}</p>

          <button
            className="secondary-button"
            onClick={fetchTables}
          >
            Try again
          </button>
        </div>
      ) : tables.length === 0 ? (
        <div className="tables-empty-state">
          <Armchair size={34} />

          <h3>No tables found</h3>

          <p>
            {search || statusFilter
              ? 'Try changing your search or filters.'
              : 'Add your first restaurant table to get started.'}
          </p>

          {canManage && !search && !statusFilter && (
            <button
              className="primary-button"
              onClick={openCreateForm}
            >
              <Plus size={18} />
              Add Table
            </button>
          )}
        </div>
      ) : (
        <div className="tables-list-container">
          <table className="tables-list">
            <thead>
              <tr>
                <th>Table</th>
                <th>Capacity</th>
                <th>Status</th>

                {(canManage || canUpdateStatus) && (
                  <th>Actions</th>
                )}
              </tr>
            </thead>

            <tbody>
              {tables.map((table) => (
                <tr key={table.id}>
                  <td>
                    <div className="table-name-cell">
                      <div className="table-icon">
                        <Armchair size={18} />
                      </div>

                      <div>
                        <strong>
                          {table.name || `Table ${table.tableNumber}`}
                        </strong>

                        <span>
                          Table #{table.tableNumber}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td>{table.capacity} seats</td>

                  <td>
                    <span
                      className={`table-status-badge table-status-${table.status?.toLowerCase()}`}
                    >
                      {table.status}
                    </span>
                  </td>

                  {(canManage || canUpdateStatus) && (
                    <td>
                      <div className="table-actions">

                        {canUpdateStatus && (
                          <select
                            aria-label={`Change status for table ${table.tableNumber}`}
                            value={table.status}
                            disabled={processingId === table.id}
                            onChange={(event) =>
                              handleStatusChange(
                                table,
                                event.target.value
                              )
                            }
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}

                        {canManage && (
                          <>
                            <button
                              className="table-icon-button"
                              onClick={() => openEditForm(table)}
                              title="Edit table"
                              aria-label="Edit table"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              className="table-icon-button"
                              onClick={() => handleRegenerateQr(table)}
                              title="Regenerate QR code"
                              aria-label="Regenerate QR code"
                              disabled={processingId === table.id}
                            >
                              <RefreshCw size={16} />
                            </button>

                            <button
                              className="table-icon-button table-delete-button"
                              onClick={() => setConfirmDelete(table)}
                              title="Deactivate table"
                              aria-label="Deactivate table"
                              disabled={processingId === table.id}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}

                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && pagination.totalPages > 1 && (
        <div className="tables-pagination">
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <div>
            <button
              className="secondary-button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={17} />
            </button>

            <button
              className="secondary-button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <TableForm
          initialData={editingTable}
          isEditing={Boolean(editingTable)}
          onSubmit={handleSaveTable}
          onClose={closeForm}
          loading={saving}
          error={actionError}
        />
      )}

      {/* Deactivation Confirmation */}
      {confirmDelete && (
        <div className="table-modal-overlay">
          <div className="table-confirm-modal">
            <h3>Deactivate table?</h3>

            <p>
              Are you sure you want to deactivate{' '}
              <strong>
                {confirmDelete.name ||
                  `Table ${confirmDelete.tableNumber}`}
              </strong>
              ? It will no longer appear in the active table list.
            </p>

            <div className="table-form-actions">
              <button
                className="secondary-button"
                onClick={() => setConfirmDelete(null)}
                disabled={processingId === confirmDelete.id}
              >
                Cancel
              </button>

              <button
                className="danger-button"
                onClick={handleDelete}
                disabled={processingId === confirmDelete.id}
              >
                {processingId === confirmDelete.id
                  ? 'Deactivating...'
                  : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Token Popup */}
      {qrResult && (
        <div className="table-modal-overlay">
          <div className="table-confirm-modal">

            <div className="table-modal-header">
              <h3>QR code regenerated</h3>

              <button
                className="table-icon-button"
                onClick={() => {
                  setQrResult(null);
                  setCopyMessage('');
                }}
                aria-label="Close QR result"
              >
                <X size={18} />
              </button>
            </div>

            <p>
              The QR token for{' '}
              <strong>{qrResult.tableName}</strong> has been regenerated.
              The previous QR code is no longer valid.
            </p>

            {qrResult.token ? (
              <div className="table-qr-token">
                <code>{qrResult.token}</code>

                <button
                  className="secondary-button"
                  onClick={handleCopyQrToken}
                >
                  Copy token
                </button>

                {copyMessage && (
                  <div className="table-copy-message">
                    {copyMessage}
                  </div>
                )}
              </div>
            ) : (
              <p className="tables-error">
                The server did not return a QR token. Please check the API
                response.
              </p>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

export default Tables;
