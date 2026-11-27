
import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Tags,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import categoryService from "./categoryService";
import "./Categories.css";

function Categories() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    displayOrder: 0,
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await categoryService.getCategories({
        search: search.trim() || undefined,
        isActive: status === "" ? undefined : status === "true",
      });

      setCategories(response.data?.categories || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to retrieve menu categories."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await categoryService.getCategories({
          search: search.trim() || undefined,
          isActive: status === "" ? undefined : status === "true",
        });

        if (!cancelled) {
          setCategories(response.data?.categories || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to retrieve menu categories."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, [search, status]);

  const openCreateForm = () => {
    setSelectedCategory(null);
    setFormData({
      name: "",
      description: "",
      displayOrder: 0,
    });
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      displayOrder: category.displayOrder,
    });
    setFormError("");
    setShowForm(true);
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setFormError("");

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        displayOrder: Number(formData.displayOrder),
      };

      if (selectedCategory) {
        await categoryService.updateCategory(
          selectedCategory.id,
          payload
        );
      } else {
        await categoryService.createCategory(payload);
      }

      setShowForm(false);
      setSelectedCategory(null);

      await fetchCategories();
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
          "Unable to save menu category."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCategoryAction = async () => {
    if (!deletingCategory) return;

    const permanentlyDeleting = !deletingCategory.isActive;

    try {
      setSubmitting(true);
      setError("");

      await categoryService.deleteCategory(deletingCategory.id);

      setDeletingCategory(null);
      await fetchCategories();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (permanentlyDeleting
            ? "Unable to permanently delete menu category."
            : "Unable to deactivate menu category.")
      );

      setDeletingCategory(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="categories-page">
      <div className="categories-header">
        <div>
          <h1>Menu Categories</h1>
          <p>Organize your restaurant menu into categories.</p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openCreateForm}
        >
          <Plus size={17} />
          Add Category
        </button>
      </div>

      <div className="categories-toolbar">
        <div className="category-search">
          <Search size={17} />

          <input
            type="search"
            placeholder="Search categories..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter categories by status"
        >
          <option value="">All Categories</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div className="categories-card">
        <div className="categories-card-header">
          <div>
            <h3>Categories</h3>
            <span>{categories.length} categories</span>
          </div>
        </div>

        {loading ? (
          <div className="categories-message">
            Loading categories...
          </div>
        ) : error ? (
          <div className="categories-message error-message">
            {error}
            <button
              type="button"
              className="secondary-button"
              onClick={fetchCategories}
            >
              Retry
            </button>
          </div>
        ) : categories.length === 0 ? (
          <div className="categories-empty">
            <Tags size={34} />
            <h3>No categories found</h3>
            <p>
              Add a category or change your search and filters.
            </p>
          </div>
        ) : (
          <div className="categories-table-wrapper">
            <table className="categories-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Display Order</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <div className="category-name-cell">
                        <div className="category-icon">
                          <Tags size={17} />
                        </div>
                        <strong>{category.name}</strong>
                      </div>
                    </td>

                    <td>{category.description || "—"}</td>

                    <td>{category.displayOrder}</td>

                    <td>
                      <span
                        className={`category-status ${
                          category.isActive ? "active" : "inactive"
                        }`}
                      >
                        {category.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <div className="category-actions">
                        <button
                          type="button"
                          className="category-action-button"
                          title="Edit category"
                          aria-label={`Edit ${category.name}`}
                          onClick={() => openEditForm(category)}
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          className="category-action-button delete"
                          title={
                            category.isActive
                              ? "Deactivate category"
                              : "Permanently delete category"
                          }
                          aria-label={
                            category.isActive
                              ? `Deactivate ${category.name}`
                              : `Permanently delete ${category.name}`
                          }
                          onClick={() => setDeletingCategory(category)}
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
      </div>

      {showForm && (
        <div
          className="category-modal-overlay"
          onClick={() => {
            if (!submitting) setShowForm(false);
          }}
        >
          <div
            className="category-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="category-modal-header">
              <div>
                <h2>
                  {selectedCategory ? "Edit Category" : "Add Category"}
                </h2>
                <p>
                  {selectedCategory
                    ? "Update your menu category details."
                    : "Create a new menu category."}
                </p>
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowForm(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="category-form-field">
                <label htmlFor="category-name">Category Name *</label>
                <input
                  id="category-name"
                  type="text"
                  minLength={2}
                  maxLength={60}
                  required
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      name: event.target.value,
                    })
                  }
                  placeholder="e.g. Main Course"
                />
              </div>

              <div className="category-form-field">
                <label htmlFor="category-description">
                  Description
                </label>
                <textarea
                  id="category-description"
                  maxLength={250}
                  rows={3}
                  value={formData.description}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      description: event.target.value,
                    })
                  }
                  placeholder="Brief description of this category"
                />
              </div>

              <div className="category-form-field">
                <label htmlFor="category-order">Display Order</label>
                <input
                  id="category-order"
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={formData.displayOrder}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      displayOrder: event.target.value,
                    })
                  }
                />
              </div>

              {formError && (
                <p className="category-form-error">{formError}</p>
              )}

              <div className="category-form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={submitting}
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={submitting}
                >
                  {submitting
                    ? "Saving..."
                    : selectedCategory
                      ? "Save Changes"
                      : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingCategory && (
        <div
          className="category-modal-overlay"
          onClick={() => {
            if (!submitting) setDeletingCategory(null);
          }}
        >
          <div
            className="category-modal category-delete-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="category-modal-header">
              <div>
                <h2>
                  {deletingCategory.isActive
                    ? "Deactivate Category?"
                    : "Delete Category Permanently?"}
                </h2>

                <p>
                  {deletingCategory.isActive ? (
                    <>
                      Are you sure you want to deactivate{" "}
                      <strong>{deletingCategory.name}</strong>?
                    </>
                  ) : (
                    <>
                      Are you sure you want to permanently delete{" "}
                      <strong>{deletingCategory.name}</strong>?
                      This action cannot be undone.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="category-form-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={submitting}
                onClick={() => setDeletingCategory(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-confirm-button"
                disabled={submitting}
                onClick={handleCategoryAction}
              >
                {submitting
                  ? "Please wait..."
                  : deletingCategory.isActive
                    ? "Deactivate"
                    : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Categories;
