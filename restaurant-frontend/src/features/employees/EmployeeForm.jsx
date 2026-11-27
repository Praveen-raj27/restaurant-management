
import { useState } from 'react';
import { X } from 'lucide-react';

function EmployeeForm({
  onClose,
  onSubmit,
  loading,
  error,
  initialData,
  isEditing = false,
}) {
  const [formData, setFormData] = useState({
    name: initialData?.user?.name || '',
    email: initialData?.user?.email || '',
    phone: initialData?.user?.phone || '',
    password: '',
    roleName: initialData?.role?.name || 'WAITER',
    status: initialData?.status || 'ACTIVE',
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

    const { password, ...employeeData } = formData;

    const payload = {
      ...(isEditing ? employeeData : formData),
      phone: formData.phone.trim() || null,
    };

    onSubmit(payload);
  };

  return (
    <div
      className="employee-modal-overlay"
      onClick={onClose}
    >
      <div
        className="employee-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="employee-modal-header">
          <div>
            <h2>
              {isEditing ? 'Edit Employee' : 'Add Employee'}
            </h2>

            <p>
              {isEditing
                ? 'Update employee details and access.'
                : 'Add a new member to your restaurant team.'}
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
          <div className="employee-form-field">
            <label htmlFor="employee-name">Full Name</label>

            <input
              id="employee-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter employee name"
              minLength={2}
              maxLength={100}
              required
            />
          </div>

          <div className="employee-form-field">
            <label htmlFor="employee-email">
              Email Address
            </label>

            <input
              id="employee-email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email address"
              maxLength={255}
              required
            />
          </div>

          <div className="employee-form-field">
            <label htmlFor="employee-phone">
              Phone Number
            </label>

            <input
              id="employee-phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
              minLength={7}
              maxLength={20}
            />
          </div>

          {!isEditing && (
            <div className="employee-form-field">
              <label htmlFor="employee-password">
                Temporary Password
              </label>

              <input
                id="employee-password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
                minLength={8}
                maxLength={72}
                required
              />
            </div>
          )}

          <div className="employee-form-field">
            <label htmlFor="employee-role">Role</label>

            <select
              id="employee-role"
              name="roleName"
              value={formData.roleName}
              onChange={handleChange}
              required
            >
              <option value="MANAGER">Manager</option>
              <option value="KITCHEN_STAFF">
                Kitchen Staff
              </option>
              <option value="WAITER">Waiter</option>
              <option value="CASHIER">Cashier</option>
            </select>
          </div>

          {isEditing && (
            <div className="employee-form-field">
              <label htmlFor="employee-status">Status</label>

              <select
                id="employee-status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          )}

          {error && (
            <p className="employee-form-error">
              {error}
            </p>
          )}

          <div className="employee-form-actions">
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
                  : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EmployeeForm;
