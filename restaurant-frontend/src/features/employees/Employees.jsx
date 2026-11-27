
import { useEffect, useState } from 'react';

import {
  Search,
  Plus,
  Users,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
} from 'lucide-react';

import employeeService from './employeeService';
import EmployeeForm from './EmployeeForm';

import './Employees.css';

const roles = [
  { value: '', label: 'All Roles' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'KITCHEN_STAFF', label: 'Kitchen Staff' },
  { value: 'WAITER', label: 'Waiter' },
  { value: 'CASHIER', label: 'Cashier' },
];

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    limit: 10,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [deletingEmployee, setDeletingEmployee] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [editError, setEditError] = useState('');

  // Fetch employees
  useEffect(() => {
    let cancelled = false;

    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await employeeService.getEmployees({
          page,
          limit: 10,
          search: search.trim() || undefined,
          role: role || undefined,
        });

        if (cancelled) return;

        setEmployees(response.data || []);
        setPagination(response.pagination);
      } catch (err) {
        if (cancelled) return;

        setError(
          err.response?.data?.message ||
          'Unable to retrieve employees.'
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchEmployees();

    return () => {
      cancelled = true;
    };
  }, [page, search, role]);

  // Friendly role label
  const getRoleLabel = (roleName) => {
    return (
      roles.find((item) => item.value === roleName)?.label ||
      roleName
    );
  };

  // Create employee
  const handleCreateEmployee = async (employeeData) => {
    try {
      setSubmitting(true);
      setFormError('');

      await employeeService.createEmployee(employeeData);

      setShowForm(false);
      setPage(1);

      const response = await employeeService.getEmployees({
        page: 1,
        limit: 10,
        search: search.trim() || undefined,
        role: role || undefined,
      });

      setEmployees(response.data || []);
      setPagination(response.pagination);
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
        'Unable to create employee.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Update employee
  const handleUpdateEmployee = async (employeeData) => {
    try {
      setSubmitting(true);
      setEditError('');

      await employeeService.updateEmployee(
        selectedEmployee.id,
        employeeData
      );

      setSelectedEmployee(null);

      const response = await employeeService.getEmployees({
        page,
        limit: 10,
        search: search.trim() || undefined,
        role: role || undefined,
      });

      setEmployees(response.data || []);
      setPagination(response.pagination);
    } catch (err) {
      setEditError(
        err.response?.data?.message ||
        'Unable to update employee.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete employee (soft delete)
  const handleDeleteEmployee = async () => {
    if (!deletingEmployee) return;

    try {
      setSubmitting(true);
      setError('');

      await employeeService.deleteEmployee(
        deletingEmployee.id
      );

      setDeletingEmployee(null);

      // If the deleted employee was the only record
      // on this page, move to the previous page.
      if (employees.length === 1 && page > 1) {
        setPage((current) => current - 1);
        return;
      }

      const response = await employeeService.getEmployees({
        page,
        limit: 10,
        search: search.trim() || undefined,
        role: role || undefined,
      });

      setEmployees(response.data || []);
      setPagination(response.pagination);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to remove employee.'
      );

      setDeletingEmployee(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="employees-page">

      {/* Page Header */}
      <div className="employees-header">
        <div>
          <h1>Employees</h1>
          <p>Manage your restaurant team and their roles.</p>
        </div>

        <button
          className="primary-button"
          type="button"
          onClick={() => {
            setFormError('');
            setShowForm(true);
          }}
        >
          <Plus size={17} />
          Add Employee
        </button>
      </div>

      {/* Search and Filters */}
      <div className="employees-toolbar">
        <div className="employee-search">
          <Search size={17} />

          <input
            type="search"
            placeholder="Search by name or email..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          value={role}
          onChange={(event) => {
            setRole(event.target.value);
            setPage(1);
          }}
          aria-label="Filter employees by role"
        >
          {roles.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {/* Employee Table */}
      <div className="employees-card">
        <div className="employees-card-header">
          <div>
            <h3>Team Members</h3>
            <span>{pagination.total} employees</span>
          </div>
        </div>

        {loading ? (
          <div className="employees-message">
            Loading employees...
          </div>
        ) : error ? (
          <div className="employees-message error-message">
            {error}
          </div>
        ) : employees.length === 0 ? (
          <div className="employees-empty">
            <Users size={32} />
            <h3>No employees found</h3>
            <p>Try changing your search or role filter.</p>
          </div>
        ) : (
          <div className="employees-table-wrapper">
            <table className="employees-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <div className="employee-name-cell">
                        <div className="employee-avatar">
                          {employee.user.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>{employee.user.name}</strong>
                          <span>{employee.user.email}</span>
                        </div>
                      </div>
                    </td>

                    <td>{employee.user.phone || '—'}</td>

                    <td>
                      {getRoleLabel(employee.role.name)}
                    </td>

                    <td>
                      <span
                        className={`employee-status ${employee.status.toLowerCase()}`}
                      >
                        {employee.status === 'ACTIVE'
                          ? 'Active'
                          : 'Suspended'}
                      </span>
                    </td>

                    <td>
                      <div className="employee-actions">
                        <button
                          type="button"
                          className="employee-action-button"
                          title="Edit employee"
                          aria-label={`Edit ${employee.user.name}`}
                          onClick={() => {
                            setEditError('');
                            setSelectedEmployee(employee);
                          }}
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          className="employee-action-button delete"
                          title="Remove employee"
                          aria-label={`Remove ${employee.user.name}`}
                          onClick={() => {
                            setDeletingEmployee(employee);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && pagination.total > 0 && (
          <div className="employees-pagination">
            <span>
              Page {page} of {pagination.totalPages}
            </span>

            <div>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() =>
                  setPage((current) => current - 1)
                }
                aria-label="Previous page"
              >
                <ChevronLeft size={17} />
              </button>

              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() =>
                  setPage((current) => current + 1)
                }
                aria-label="Next page"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showForm && (
        <EmployeeForm
          onClose={() => setShowForm(false)}
          onSubmit={handleCreateEmployee}
          loading={submitting}
          error={formError}
        />
      )}

      {/* Edit Employee Modal */}
      {selectedEmployee && (
        <EmployeeForm
          initialData={selectedEmployee}
          isEditing
          onClose={() => setSelectedEmployee(null)}
          onSubmit={handleUpdateEmployee}
          loading={submitting}
          error={editError}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingEmployee && (
        <div
          className="employee-modal-overlay"
          onClick={() => {
            if (!submitting) {
              setDeletingEmployee(null);
            }
          }}
        >
          <div
            className="employee-modal delete-confirmation"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="employee-modal-header">
              <div>
                <h2>Remove Employee?</h2>

                <p>
                  Are you sure you want to remove{' '}
                  <strong>
                    {deletingEmployee.user.name}
                  </strong>{' '}
                  from your restaurant team?
                </p>
              </div>
            </div>

            <div className="employee-form-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={submitting}
                onClick={() => setDeletingEmployee(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-confirm-button"
                disabled={submitting}
                onClick={handleDeleteEmployee}
              >
                {submitting
                  ? 'Removing...'
                  : 'Remove Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Employees;
