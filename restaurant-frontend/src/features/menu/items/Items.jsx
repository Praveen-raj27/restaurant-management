
import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Utensils,
  Pencil,
  Trash2,
  X,
  PlusCircle,
  MinusCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import itemService from "./itemService";
import categoryService from "../categories/categoryService";
import "./Items.css";

const initialFormData = {
  name: "",
  description: "",
  categoryId: "",
  foodType: "VEG",
  preparationTime: "",
  imageUrl: "",
  pricingMode: "simple",
  price: "",
  variants: [],
};

function Items() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [foodTypeFilter, setFoodTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [confirmingItem, setConfirmingItem] = useState(null);

  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await itemService.getItems({
        page,
        limit: 10,
        search: search.trim() || undefined,
        categoryId: categoryFilter || undefined,
        foodType: foodTypeFilter || undefined,
        isActive: statusFilter || undefined,
      });

      setItems(response.data || []);
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
        err.response?.data?.message || "Unable to retrieve menu items."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadItems = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await itemService.getItems({
          page,
          limit: 10,
          search: search.trim() || undefined,
          categoryId: categoryFilter || undefined,
          foodType: foodTypeFilter || undefined,
          isActive: statusFilter || undefined,
        });

        if (!cancelled) {
          setItems(response.data || []);
          setPagination(
            response.pagination || {
              total: 0,
              page: 1,
              limit: 10,
              totalPages: 1,
            }
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to retrieve menu items."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadItems();

    return () => {
      cancelled = true;
    };
  }, [page, search, categoryFilter, foodTypeFilter, statusFilter]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await categoryService.getCategories({
          isActive: true,
        });

        setCategories(response.data?.categories || []);
      } catch {
        setCategories([]);
      }
    };

    loadCategories();
  }, []);

  const updateFormField = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openCreateForm = () => {
    setSelectedItem(null);
    setFormData({
      ...initialFormData,
      variants: [
        {
          name: "",
          price: "",
          displayOrder: 0,
        },
      ],
    });
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = async (item) => {
    try {
      setFormError("");
      setError("");

      const response = await itemService.getItem(item.id);
      const fullItem = response.data;

      const activeVariants = (fullItem.variants || [])
        .filter((variant) => variant.isActive)
        .map((variant) => ({
          id: variant.id,
          name: variant.name,
          price: String(variant.price),
          displayOrder: variant.displayOrder,
        }));

      setSelectedItem(fullItem);

      setFormData({
        name: fullItem.name || "",
        description: fullItem.description || "",
        categoryId: fullItem.category?.id || "",
        foodType: fullItem.foodType || "VEG",
        preparationTime: fullItem.preparationTime ?? "",
        imageUrl: fullItem.imageUrl || "",
        pricingMode: activeVariants.length > 0 ? "variants" : "simple",
        price: fullItem.price == null ? "" : String(fullItem.price),
        variants:
          activeVariants.length > 0
            ? activeVariants
            : [{ name: "", price: "", displayOrder: 0 }],
      });

      setShowForm(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to retrieve menu item details."
      );
    }
  };

  const handleVariantChange = (index, field, value) => {
    setFormData((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index
          ? { ...variant, [field]: value }
          : variant
      ),
    }));
  };

  const addVariant = () => {
    setFormData((current) => ({
      ...current,
      variants: [
        ...current.variants,
        {
          name: "",
          price: "",
          displayOrder: current.variants.length + 1,
        },
      ],
    }));
  };

  const removeVariant = (index) => {
    setFormData((current) => ({
      ...current,
      variants: current.variants.filter(
        (_, variantIndex) => variantIndex !== index
      ),
    }));
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setFormError("");

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        categoryId: formData.categoryId,
        foodType: formData.foodType,
        imageUrl: formData.imageUrl.trim() || null,
        preparationTime:
          formData.preparationTime === ""
            ? null
            : Number(formData.preparationTime),
      };

      if (formData.pricingMode === "simple") {
        payload.price = formData.price;
      } else {
        payload.variants = formData.variants.map((variant, index) => ({
          ...(variant.id ? { id: variant.id } : {}),
          name: variant.name.trim(),
          price: variant.price,
          displayOrder: index + 1,
        }));
      }

      if (selectedItem) {
        await itemService.updateItem(selectedItem.id, payload);
      } else {
        await itemService.createItem(payload);
      }

      setShowForm(false);
      setSelectedItem(null);
      setPage(1);

      if (page === 1) {
        await fetchItems();
      }
    } catch (err) {
      setFormError(
        err.response?.data?.message || "Unable to save menu item."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Active items are deactivated.
  // Inactive items are permanently deleted.
  const handleItemStatusChange = async () => {
    if (!confirmingItem) return;

    try {
      setSubmitting(true);
      setError("");

      if (confirmingItem.isActive) {
        await itemService.updateItem(confirmingItem.id, {
          isActive: false,
        });
      } else {
        await itemService.deleteItem(confirmingItem.id);
      }

      setConfirmingItem(null);
      await fetchItems();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to complete the menu item action."
      );
      setConfirmingItem(null);
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined) return "—";

    return `₹${Number(price).toFixed(2)}`;
  };

  const getItemPrice = (item) => {
    const activeVariants = (item.variants || []).filter(
      (variant) => variant.isActive
    );

    if (activeVariants.length > 0) {
      const prices = activeVariants.map((variant) =>
        Number(variant.price)
      );
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      return minPrice === maxPrice
        ? formatPrice(minPrice)
        : `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`;
    }

    return formatPrice(item.price);
  };

  return (
    <div className="items-page">
      <div className="items-header">
        <div>
          <h1>Menu Items</h1>
          <p>Manage your restaurant dishes, prices and availability.</p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openCreateForm}
        >
          <Plus size={17} />
          Add Menu Item
        </button>
      </div>

      <div className="items-toolbar">
        <div className="item-search">
          <Search size={17} />

          <input
            type="search"
            placeholder="Search menu items..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(event) => {
            setCategoryFilter(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={foodTypeFilter}
          onChange={(event) => {
            setFoodTypeFilter(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by food type"
        >
          <option value="">All Food Types</option>
          <option value="VEG">Vegetarian</option>
          <option value="NON_VEG">Non-Vegetarian</option>
          <option value="VEGAN">Vegan</option>
        </select>

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
        >
          <option value="">All Items</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div className="items-card">
        <div className="items-card-header">
          <div>
            <h3>Menu Items</h3>
            <span>{pagination.total} items</span>
          </div>
        </div>

        {loading ? (
          <div className="items-message">Loading menu items...</div>
        ) : error ? (
          <div className="items-message error-message">
            {error}
            <button
              type="button"
              className="secondary-button"
              onClick={fetchItems}
            >
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="items-empty">
            <Utensils size={34} />
            <h3>No menu items found</h3>
            <p>Add a menu item or change your search and filters.</p>
          </div>
        ) : (
          <>
            <div className="items-table-wrapper">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Menu Item</th>
                    <th>Category</th>
                    <th>Food Type</th>
                    <th>Price</th>
                    <th>Availability</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="item-name-cell">
                          <div className="item-icon">
                            <Utensils size={17} />
                          </div>
                          <div>
                            <strong>{item.name}</strong>
                            {item.description && (
                              <span>{item.description}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>{item.category?.name || "—"}</td>

                      <td>
                        <span
                          className={`food-type-badge ${item.foodType?.toLowerCase()}`}
                        >
                          {item.foodType === "NON_VEG"
                            ? "Non-Veg"
                            : item.foodType === "VEGAN"
                              ? "Vegan"
                              : "Veg"}
                        </span>
                      </td>

                      <td>
                        <strong className="item-price">
                          {getItemPrice(item)}
                        </strong>

                        {item.variants?.some(
                          (variant) => variant.isActive
                        ) && (
                          <span className="item-variant-label">
                            {
                              item.variants.filter(
                                (variant) => variant.isActive
                              ).length
                            }{" "}
                            variants
                          </span>
                        )}
                      </td>

                      <td>
                        <span
                          className={`item-availability ${
                            item.isAvailable ? "available" : "unavailable"
                          }`}
                        >
                          {item.isAvailable ? "Available" : "Unavailable"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`item-status ${
                            item.isActive ? "active" : "inactive"
                          }`}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td>
                        <div className="item-actions">
                          <button
                            type="button"
                            className="item-action-button"
                            title="Edit menu item"
                            aria-label={`Edit ${item.name}`}
                            onClick={() => openEditForm(item)}
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            className="item-action-button delete"
                            title={
                              item.isActive
                                ? "Deactivate menu item"
                                : "Permanently delete menu item"
                            }
                            aria-label={
                              item.isActive
                                ? `Deactivate ${item.name}`
                                : `Permanently delete ${item.name}`
                            }
                            onClick={() => setConfirmingItem(item)}
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

            <div className="items-pagination">
              <span>
                Showing {items.length} of {pagination.total} items
              </span>

              <div>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={17} />
                </button>

                <span>
                  Page {pagination.page || page} of{" "}
                  {Math.max(1, pagination.totalPages || 1)}
                </span>

                <button
                  type="button"
                  disabled={page >= (pagination.totalPages || 1)}
                  onClick={() => setPage((current) => current + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showForm && (
        <div
          className="item-modal-overlay"
          onClick={() => {
            if (!submitting) setShowForm(false);
          }}
        >
          <div
            className="item-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="item-modal-header">
              <div>
                <h2>
                  {selectedItem ? "Edit Menu Item" : "Add Menu Item"}
                </h2>
                <p>
                  {selectedItem
                    ? "Update the menu item details and pricing."
                    : "Add a new dish to your restaurant menu."}
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
              <div className="item-form-grid">
                <div className="item-form-field full-width">
                  <label htmlFor="item-name">Item Name *</label>
                  <input
                    id="item-name"
                    type="text"
                    minLength={2}
                    maxLength={100}
                    required
                    value={formData.name}
                    onChange={(event) =>
                      updateFormField("name", event.target.value)
                    }
                    placeholder="e.g. Chicken Biryani"
                  />
                </div>

                <div className="item-form-field full-width">
                  <label htmlFor="item-description">Description</label>
                  <textarea
                    id="item-description"
                    rows={3}
                    maxLength={500}
                    value={formData.description}
                    onChange={(event) =>
                      updateFormField("description", event.target.value)
                    }
                    placeholder="Describe the dish..."
                  />
                </div>

                <div className="item-form-field">
                  <label htmlFor="item-category">Category *</label>
                  <select
                    id="item-category"
                    required
                    value={formData.categoryId}
                    onChange={(event) =>
                      updateFormField("categoryId", event.target.value)
                    }
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="item-form-field">
                  <label htmlFor="item-food-type">Food Type *</label>
                  <select
                    id="item-food-type"
                    required
                    value={formData.foodType}
                    onChange={(event) =>
                      updateFormField("foodType", event.target.value)
                    }
                  >
                    <option value="VEG">Vegetarian</option>
                    <option value="NON_VEG">Non-Vegetarian</option>
                    <option value="VEGAN">Vegan</option>
                  </select>
                </div>

                <div className="item-form-field">
                  <label htmlFor="item-preparation-time">
                    Preparation Time (minutes)
                  </label>
                  <input
                    id="item-preparation-time"
                    type="number"
                    min="1"
                    max="1440"
                    step="1"
                    value={formData.preparationTime}
                    onChange={(event) =>
                      updateFormField("preparationTime", event.target.value)
                    }
                    placeholder="e.g. 20"
                  />
                </div>

                <div className="item-form-field">
                  <label htmlFor="item-image-url">Image URL</label>
                  <input
                    id="item-image-url"
                    type="url"
                    value={formData.imageUrl}
                    onChange={(event) =>
                      updateFormField("imageUrl", event.target.value)
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="item-pricing-section">
                <div className="item-section-heading">
                  <div>
                    <h3>Pricing</h3>
                    <p>Choose how customers will select this item.</p>
                  </div>
                </div>

                <div className="item-pricing-options">
                  <label
                    className={`item-pricing-option ${
                      formData.pricingMode === "simple" ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="pricingMode"
                      value="simple"
                      checked={formData.pricingMode === "simple"}
                      disabled={
                        Boolean(selectedItem) &&
                        selectedItem.variants?.some(
                          (variant) => variant.isActive
                        )
                      }
                      onChange={() =>
                        updateFormField("pricingMode", "simple")
                      }
                    />

                    <span>
                      <strong>Single Price</strong>
                      <small>One price for this item</small>
                    </span>
                  </label>

                  <label
                    className={`item-pricing-option ${
                      formData.pricingMode === "variants" ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="pricingMode"
                      value="variants"
                      checked={formData.pricingMode === "variants"}
                      onChange={() =>
                        updateFormField("pricingMode", "variants")
                      }
                    />

                    <span>
                      <strong>Variants</strong>
                      <small>Different sizes or options</small>
                    </span>
                  </label>
                </div>

                {formData.pricingMode === "simple" ? (
                  <div className="item-form-field item-base-price">
                    <label htmlFor="item-price">Price (₹) *</label>
                    <input
                      id="item-price"
                      type="number"
                      min="0.01"
                      max="999999.99"
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={(event) =>
                        updateFormField("price", event.target.value)
                      }
                      placeholder="e.g. 250"
                    />
                  </div>
                ) : (
                  <div className="item-variants-editor">
                    {formData.variants.map((variant, index) => (
                      <div
                        className="item-variant-row"
                        key={variant.id || index}
                      >
                        <div className="item-form-field">
                          <label>Variant Name *</label>
                          <input
                            type="text"
                            maxLength={50}
                            required
                            value={variant.name}
                            onChange={(event) =>
                              handleVariantChange(
                                index,
                                "name",
                                event.target.value
                              )
                            }
                            placeholder="e.g. Regular"
                          />
                        </div>

                        <div className="item-form-field">
                          <label>Price (₹) *</label>
                          <input
                            type="number"
                            min="0.01"
                            max="999999.99"
                            step="0.01"
                            required
                            value={variant.price}
                            onChange={(event) =>
                              handleVariantChange(
                                index,
                                "price",
                                event.target.value
                              )
                            }
                            placeholder="e.g. 180"
                          />
                        </div>

                        <button
                          type="button"
                          className="remove-variant-button"
                          disabled={formData.variants.length === 1}
                          onClick={() => removeVariant(index)}
                          title="Remove variant"
                          aria-label={`Remove variant ${index + 1}`}
                        >
                          <MinusCircle size={18} />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="add-variant-button"
                      onClick={addVariant}
                    >
                      <PlusCircle size={16} />
                      Add Variant
                    </button>
                  </div>
                )}
              </div>

              {formError && (
                <p className="item-form-error">{formError}</p>
              )}

              <div className="item-form-actions">
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
                    : selectedItem
                      ? "Save Changes"
                      : "Create Menu Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmingItem && (
        <div
          className="item-modal-overlay"
          onClick={() => {
            if (!submitting) setConfirmingItem(null);
          }}
        >
          <div
            className="item-modal item-confirm-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="item-modal-header">
              <div>
                <h2>
                  {confirmingItem.isActive
                    ? "Deactivate Menu Item?"
                    : "Permanently Delete Menu Item?"}
                </h2>

                <p>
                  {confirmingItem.isActive ? (
                    <>
                      Are you sure you want to deactivate{" "}
                      <strong>{confirmingItem.name}</strong>?
                      You can activate it again later.
                    </>
                  ) : (
                    <>
                      Are you sure you want to permanently delete{" "}
                      <strong>{confirmingItem.name}</strong>?
                      This action cannot be undone, and its variants will
                      also be deleted.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="item-form-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={submitting}
                onClick={() => setConfirmingItem(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-confirm-button"
                disabled={submitting}
                onClick={handleItemStatusChange}
              >
                {submitting
                  ? "Please wait..."
                  : confirmingItem.isActive
                    ? "Deactivate"
                    : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Items;
