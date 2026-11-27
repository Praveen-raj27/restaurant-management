
import { useState } from 'react';
import { X } from 'lucide-react';

function TableForm({
  onClose,
  onSubmit,
  loading,
  error,
  initialData,
  isEditing = false,
}) {
  const [formData, setFormData] = useState({
    tableNumber: initialData?.tableNumber ?? '',
    name: initialData?.name || '',
    capacity: initialData?.capacity ?? 2,
  });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = {
      tableNumber: Number(formData.tableNumber),
      capacity: Number(formData.capacity),
    };

    if (isEditing) {
      payload.name = formData.name.trim() || null;
    } else if (formData.name.trim()) {
      payload.name = formData.name.trim();
    }

    onSubmit(payload);
  };

  return (
    <div
      className="table-modal-overlay"
      onClick={() => !loading && onClose()}
    >
      <div
        className="table-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="table-modal-header">
          <div>
            <h2>
              {isEditing ? 'Edit Table' : 'Add Table'}
            </h2>

            <p>
              {isEditing
                ? 'Update your table details.'
                : 'Add a new table to your restaurant.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="table-form-field">
            <label htmlFor="table-number">
              Table Number
            </label>

            <input
              id="table-number"
              name="tableNumber"
              type="number"
              min="1"
              step="1"
              value={formData.tableNumber}
              onChange={handleChange}
              placeholder="Enter table number"
              required
            />
          </div>

          <div className="table-form-field">
            <label htmlFor="table-name">
              Table Name
            </label>

            <input
              id="table-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Example: Premium Window Table"
              maxLength={50}
            />
          </div>

          <div className="table-form-field">
            <label htmlFor="table-capacity">
              Seating Capacity
            </label>

            <input
              id="table-capacity"
              name="capacity"
              type="number"
              min="1"
              max="50"
              step="1"
              value={formData.capacity}
              onChange={handleChange}
              required
            />
          </div>

          {error && (
            <p className="table-form-error">{error}</p>
          )}

          <div className="table-form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading
                ? 'Saving...'
                : isEditing
                  ? 'Save Changes'
                  : 'Add Table'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TableForm;
