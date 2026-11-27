
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  FileText,
  FileImage,
  RefreshCw,
  Eye,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  X,
} from "lucide-react";

import menuImportService from "./menuImportService";
import "./MenuImport.css";

const PAGE_LIMIT = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const statusConfig = {
  UPLOADED: { label: "Uploaded", className: "uploaded" },
  PROCESSING: { label: "Processing", className: "processing" },
  REVIEW_REQUIRED: { label: "Review Required", className: "review" },
  APPROVED: { label: "Approved", className: "approved" },
  FAILED: { label: "Failed", className: "failed" },
};

const emptyPagination = {
  page: 1,
  limit: PAGE_LIMIT,
  total: 0,
  totalPages: 1,
};

function MenuImport() {
  const fileInputRef = useRef(null);
  const pollingRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(emptyPagination);

  const [retryingId, setRetryingId] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);

  // Review editor state
  const [selectedImport, setSelectedImport] = useState(null);
  const [reviewPages, setReviewPages] = useState([]);
  const [savingReview, setSavingReview] = useState(false);
  const [approvingImport, setApprovingImport] = useState(false);

  // --------------------------------------------------
  // FETCH IMPORT HISTORY
  // --------------------------------------------------

  const fetchImports = useCallback(async () => {
    try {
      const response = await menuImportService.getImports({
        page,
        limit: PAGE_LIMIT,
        ...(statusFilter ? { status: statusFilter } : {}),
      });

      const result = response.data;

      setImports(result.imports || []);
      setPagination(result.pagination || emptyPagination);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to fetch menu imports."
      );
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchImports();
  }, [fetchImports]);

  // --------------------------------------------------
  // POLL WHILE OCR IS PROCESSING
  // --------------------------------------------------

  useEffect(() => {
    const hasProcessingImport = imports.some((item) =>
      ["UPLOADED", "PROCESSING"].includes(item.status)
    );

    if (hasProcessingImport) {
      pollingRef.current = setInterval(() => {
        fetchImports();
      }, 2500);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [imports, fetchImports]);

  // --------------------------------------------------
  // FILE VALIDATION
  // --------------------------------------------------

  const validateFile = (selectedFile) => {
    if (!selectedFile) {
      return "Please select a file.";
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      return "Only PDF, JPG and PNG files are supported.";
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      return "File size must not exceed 10 MB.";
    }

    if (selectedFile.size === 0) {
      return "The selected file is empty.";
    }

    return "";
  };

  const handleFileSelection = (selectedFile) => {
    setError("");
    setSuccess("");

    const validationError = validateFile(selectedFile);

    if (validationError) {
      setFile(null);
      setError(validationError);
      return;
    }

    setFile(selectedFile);
  };

  // --------------------------------------------------
  // UPLOAD MENU
  // --------------------------------------------------

  const handleUpload = async () => {
    if (!file || uploading) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      await menuImportService.uploadMenu(file);

      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setPage(1);
      setStatusFilter("");

      setSuccess(
        "Menu uploaded successfully. OCR processing has started."
      );

      const response = await menuImportService.getImports({
        page: 1,
        limit: PAGE_LIMIT,
      });

      setImports(response.data.imports || []);
      setPagination(response.data.pagination || emptyPagination);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Menu upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  // --------------------------------------------------
  // OPEN MENU REVIEW EDITOR
  // --------------------------------------------------

  const handleReview = async (importId) => {
    setReviewingId(importId);
    setError("");
    setSuccess("");

    try {
      const response = await menuImportService.getImport(importId);

      // API response:
      // response.data = { success, message, data: importRecord }

      const importRecord = response.data;

      if (!importRecord) {
        throw new Error("Unable to load extracted menu data.");
      }

      const pages = (importRecord.extractedData?.pages || []).map(
        (page) => ({
          page: page.page,
          categories: (page.categories || []).map((category) => ({
            id: category.id,
            name: category.name || "",
            items: (category.items || []).map((item) => ({
              id: item.id,
              name: item.name || "",
              description: item.description || "",
              price: item.price ?? "",
              currency: item.currency || "₹",
              foodType: item.foodType || "VEG",
            })),
          })),
        })
      );

      setSelectedImport(importRecord);
      setReviewPages(pages);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to fetch menu import details."
      );
    } finally {
      setReviewingId(null);
    }
  };

  // --------------------------------------------------
  // UPDATE CATEGORY NAME
  // --------------------------------------------------

  const updateCategoryName = (
    pageIndex,
    categoryIndex,
    value
  ) => {
    setReviewPages((current) =>
      current.map((page, pIndex) =>
        pIndex !== pageIndex
          ? page
          : {
              ...page,
              categories: page.categories.map(
                (category, cIndex) =>
                  cIndex !== categoryIndex
                    ? category
                    : { ...category, name: value }
              ),
            }
      )
    );
  };

  // --------------------------------------------------
  // UPDATE MENU ITEM FIELD
  // --------------------------------------------------

  const updateItemField = (
    pageIndex,
    categoryIndex,
    itemIndex,
    field,
    value
  ) => {
    setReviewPages((current) =>
      current.map((page, pIndex) =>
        pIndex !== pageIndex
          ? page
          : {
              ...page,
              categories: page.categories.map(
                (category, cIndex) =>
                  cIndex !== categoryIndex
                    ? category
                    : {
                        ...category,
                        items: category.items.map(
                          (item, iIndex) =>
                            iIndex !== itemIndex
                              ? item
                              : {
                                  ...item,
                                  [field]: value,
                                }
                        ),
                      }
              ),
            }
      )
    );
  };

  // --------------------------------------------------
  // CLOSE REVIEW EDITOR
  // --------------------------------------------------

  const closeReviewEditor = () => {
    if (savingReview || approvingImport) return;

    setSelectedImport(null);
    setReviewPages([]);
    setError("");
  };

  // --------------------------------------------------
  // SAVE MENU REVIEW
  // --------------------------------------------------

  const handleSaveReview = async () => {
    if (!selectedImport || savingReview) return;

    setSavingReview(true);
    setError("");
    setSuccess("");

    try {
      await menuImportService.reviewImport(
        selectedImport.id,
        reviewPages
      );

      setSuccess("Menu review saved successfully.");

      await fetchImports();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save menu review."
      );
    } finally {
      setSavingReview(false);
    }
  };

  // --------------------------------------------------
  // APPROVE MENU
  // --------------------------------------------------

  const handleApproveImport = async () => {
    if (!selectedImport || approvingImport) return;

    const allCategories = reviewPages.flatMap(
      (page) => page.categories
    );

    const allItems = allCategories.flatMap(
      (category) => category.items
    );

    const hasInvalidCategory = allCategories.some(
      (category) => !category.name.trim()
    );

    if (hasInvalidCategory) {
      setError("Please provide a name for every category.");
      return;
    }

    if (allItems.length === 0) {
      setError("There are no menu items to approve.");
      return;
    }

    const hasInvalidItem = allItems.some(
      (item) =>
        !item.name.trim() ||
        !Number.isFinite(Number(item.price)) ||
        Number(item.price) <= 0 ||
        !["VEG", "NON_VEG"].includes(item.foodType) ||
        item.currency !== "₹"
    );

    if (hasInvalidItem) {
      setError(
        "Please check all item names, positive prices, food types, and currencies. Approval currently requires INR (₹)."
      );
      return;
    }

    setApprovingImport(true);
    setError("");
    setSuccess("");

    try {
      // Save latest edits before approval.
      await menuImportService.reviewImport(
        selectedImport.id,
        reviewPages
      );

      await menuImportService.approveImport(selectedImport.id);

      setSelectedImport(null);
      setReviewPages([]);

      setSuccess(
        "Menu approved and items added successfully."
      );

      await fetchImports();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to approve the menu."
      );
    } finally {
      setApprovingImport(false);
    }
  };

  // --------------------------------------------------
  // RETRY OCR
  // --------------------------------------------------

  const handleRetry = async (importId) => {
    setRetryingId(importId);
    setError("");
    setSuccess("");

    try {
      await menuImportService.retryImport(importId);

      setSuccess("Menu processing retry has started.");

      await fetchImports();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to retry menu processing."
      );
    } finally {
      setRetryingId(null);
    }
  };

  // --------------------------------------------------
  // FILTER
  // --------------------------------------------------

  const handleStatusChange = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  // --------------------------------------------------
  // FORMATTERS
  // --------------------------------------------------

  const formatDate = (value) => {
    if (!value) return "—";

    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "—";

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith("image/")) {
      return <FileImage size={19} />;
    }

    return <FileText size={19} />;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle2 size={13} />;

      case "FAILED":
        return <AlertCircle size={13} />;

      case "PROCESSING":
      case "UPLOADED":
        return <LoaderCircle size={13} />;

      case "REVIEW_REQUIRED":
        return <Eye size={13} />;

      default:
        return <Clock size={13} />;
    }
  };

  const getStatusBadge = (status) => {
    const config = statusConfig[status] || {
      label: status,
      className: "uploaded",
    };

    return (
      <span className={`import-status-badge ${config.className}`}>
        {getStatusIcon(status)}
        {config.label}
      </span>
    );
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="menu-import-page">
      {/* PAGE HEADER */}

      <div className="menu-import-header">
        <div>
          <h1>Menu Import</h1>
          <p>
            Upload your restaurant menu and let OCR extract
            categories and menu items.
          </p>
        </div>
      </div>

      {/* ALERTS */}

      {error && (
        <div className="import-alert error">
          <AlertCircle size={17} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="import-alert success">
          <CheckCircle2 size={17} />
          <span>{success}</span>
        </div>
      )}

      {/* UPLOAD SECTION */}

      <div className="import-upload-card">
        <div className="import-section-heading">
          <div>
            <h3>Upload Menu</h3>
            <p>
              Upload a digital menu or a scanned menu image.
            </p>
          </div>
        </div>

        <div
          className={`import-dropzone ${
            dragging ? "dragging" : ""
          } ${file ? "has-file" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);

            const droppedFile = event.dataTransfer.files?.[0];

            if (droppedFile) {
              handleFileSelection(droppedFile);
            }
          }}
          onClick={() => {
            if (!uploading) {
              fileInputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (
              (event.key === "Enter" || event.key === " ") &&
              !uploading
            ) {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            hidden
            onChange={(event) => {
              handleFileSelection(event.target.files?.[0]);
            }}
          />

          {file ? (
            <>
              <div className="import-upload-icon selected">
                {getFileIcon(file.type)}
              </div>

              <h3>{file.name}</h3>

              <p>
                {formatFileSize(file.size)} · Ready to upload
              </p>
            </>
          ) : (
            <>
              <div className="import-upload-icon">
                <Upload size={23} />
              </div>

              <h3>Drag and drop your menu here</h3>

              <p>
                or <span>browse files</span> from your device
              </p>

              <small>
                PDF, JPG or PNG · Maximum file size 10 MB
              </small>
            </>
          )}
        </div>

        <div className="import-upload-actions">
          {file && (
            <button
              type="button"
              className="secondary-button"
              disabled={uploading}
              onClick={() => {
                setFile(null);

                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
            >
              Remove file
            </button>
          )}

          <button
            type="button"
            className="primary-button"
            disabled={!file || uploading}
            onClick={handleUpload}
          >
            {uploading ? (
              <>
                <LoaderCircle
                  size={15}
                  className="import-spin"
                />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={15} />
                Upload Menu
              </>
            )}
          </button>
        </div>
      </div>

      {/* IMPORT HISTORY */}

      <div className="import-history-card">
        <div className="import-history-header">
          <div>
            <h3>Import History</h3>

            <span>
              Track uploaded menus and their processing status.
            </span>
          </div>

          <div className="import-history-actions">
            <select
              value={statusFilter}
              onChange={(event) =>
                handleStatusChange(event.target.value)
              }
              aria-label="Filter imports by status"
            >
              <option value="">All Statuses</option>
              <option value="UPLOADED">Uploaded</option>
              <option value="PROCESSING">Processing</option>
              <option value="REVIEW_REQUIRED">
                Review Required
              </option>
              <option value="APPROVED">Approved</option>
              <option value="FAILED">Failed</option>
            </select>

            <button
              type="button"
              className="import-refresh-button"
              onClick={fetchImports}
              title="Refresh import history"
              aria-label="Refresh import history"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="import-message">
            <LoaderCircle
              size={20}
              className="import-spin"
            />
            Loading imports...
          </div>
        ) : imports.length === 0 ? (
          <div className="import-empty">
            <div>
              <FileText size={24} />
            </div>

            <h3>No menu imports found</h3>

            <p>
              Upload your first menu to get started.
            </p>
          </div>
        ) : (
          <div className="import-table-wrapper">
            <table className="import-table">
              <thead>
                <tr>
                  <th>MENU FILE</th>
                  <th>UPLOADED ON</th>
                  <th>FILE SIZE</th>
                  <th>ITEMS</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>

              <tbody>
                {imports.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="import-file-cell">
                        <div className="import-file-icon">
                          {getFileIcon(item.mimeType)}
                        </div>

                        <div>
                          <strong>
                            {item.originalFileName}
                          </strong>

                          <span>
                            {item.mimeType
                              ?.split("/")[1]
                              ?.toUpperCase() || "FILE"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>{formatDate(item.createdAt)}</td>

                    <td>{formatFileSize(item.fileSize)}</td>

                    <td>{item.itemCount ?? "—"}</td>

                    <td>{getStatusBadge(item.status)}</td>

                    <td>
                      <div className="import-row-actions">
                        {item.status === "REVIEW_REQUIRED" && (
                          <button
                            type="button"
                            className="import-action-button review"
                            title="Review extracted menu"
                            disabled={reviewingId === item.id}
                            onClick={() => handleReview(item.id)}
                          >
                            {reviewingId === item.id ? (
                              <LoaderCircle
                                size={14}
                                className="import-spin"
                              />
                            ) : (
                              <Eye size={15} />
                            )}

                            Review
                          </button>
                        )}

                        {item.status === "FAILED" && (
                          <button
                            type="button"
                            className="import-action-button"
                            disabled={retryingId === item.id}
                            onClick={() => handleRetry(item.id)}
                            title="Retry OCR processing"
                          >
                            {retryingId === item.id ? (
                              <LoaderCircle
                                size={14}
                                className="import-spin"
                              />
                            ) : (
                              <RotateCcw size={14} />
                            )}

                            Retry
                          </button>
                        )}

                        {item.status === "APPROVED" && (
                          <span className="import-completed-label">
                            <CheckCircle2 size={14} />
                            Completed
                          </span>
                        )}

                        {item.status === "PROCESSING" && (
                          <span className="import-processing-label">
                            Processing...
                          </span>
                        )}

                        {item.status === "UPLOADED" && (
                          <span className="import-processing-label">
                            Queued...
                          </span>
                        )}
                      </div>

                      {item.errorMessage && (
                        <span
                          className="import-row-error"
                          title={item.errorMessage}
                        >
                          {item.errorMessage}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && pagination.totalPages > 1 && (
          <div className="import-pagination">
            <span>
              Page {pagination.page} of {pagination.totalPages}
              {" · "}
              {pagination.total} imports
            </span>

            <div>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() =>
                  setPage((current) => current - 1)
                }
              >
                Previous
              </button>

              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() =>
                  setPage((current) => current + 1)
                }
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MENU REVIEW EDITOR */}

      {selectedImport && (
        <div
          className="menu-review-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeReviewEditor();
            }
          }}
        >
          <div
            className="menu-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-review-title"
          >
            {/* REVIEW HEADER */}

            <div className="menu-review-header">
              <div>
                <h2 id="menu-review-title">
                  Review Extracted Menu
                </h2>

                <p>
                  {selectedImport.originalFileName}
                </p>
              </div>

              <button
                type="button"
                className="menu-review-close"
                onClick={closeReviewEditor}
                disabled={savingReview || approvingImport}
                aria-label="Close review editor"
              >
                <X size={21} />
              </button>
            </div>

            {/* REVIEW CONTENT */}

            <div className="menu-review-content">
              <div className="menu-review-notice">
                <AlertCircle size={17} />

                <span>
                  Please verify the extracted categories, item
                  names, descriptions and prices before approving.
                  OCR results should always be checked against
                  your original menu.
                </span>
              </div>

              {reviewPages.length === 0 ? (
                <div className="import-empty">
                  <h3>No menu items extracted</h3>

                  <p>
                    There are no extracted items available to review.
                  </p>
                </div>
              ) : (
                reviewPages.map((page, pageIndex) => (
                  <div
                    key={page.page ?? pageIndex}
                    className="menu-review-page"
                  >
                    {page.categories.map(
                      (category, categoryIndex) => (
                        <section
                          className="menu-review-category"
                          key={category.id}
                        >
                          <div className="menu-review-category-heading">
                            <label>Category name</label>

                            <input
                              type="text"
                              value={category.name}
                              onChange={(event) =>
                                updateCategoryName(
                                  pageIndex,
                                  categoryIndex,
                                  event.target.value
                                )
                              }
                              placeholder="Category name"
                            />
                          </div>

                          {category.items.map(
                            (item, itemIndex) => (
                              <div
                                className="menu-review-item"
                                key={item.id}
                              >
                                <div className="menu-review-item-heading">
                                  <strong>
                                    Item {itemIndex + 1}
                                  </strong>

                                  {item.matchingConfidence && (
                                    <span>
                                      Match:{" "}
                                      {item.matchingConfidence}
                                    </span>
                                  )}
                                </div>

                                <div className="menu-review-grid">
                                  <div className="menu-review-field">
                                    <label>Item name</label>

                                    <input
                                      type="text"
                                      value={item.name}
                                      onChange={(event) =>
                                        updateItemField(
                                          pageIndex,
                                          categoryIndex,
                                          itemIndex,
                                          "name",
                                          event.target.value
                                        )
                                      }
                                      placeholder="Item name"
                                    />
                                  </div>

                                  <div className="menu-review-field">
                                    <label>Price</label>

                                    <input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={item.price}
                                      onChange={(event) =>
                                        updateItemField(
                                          pageIndex,
                                          categoryIndex,
                                          itemIndex,
                                          "price",
                                          event.target.value
                                        )
                                      }
                                      placeholder="Price"
                                    />
                                  </div>

                                  <div className="menu-review-field">
                                    <label>Currency</label>

                                    <select
                                      value={item.currency}
                                      onChange={(event) =>
                                        updateItemField(
                                          pageIndex,
                                          categoryIndex,
                                          itemIndex,
                                          "currency",
                                          event.target.value
                                        )
                                      }
                                    >
                                      <option value="₹">
                                        INR (₹)
                                      </option>

                                      <option value="$">
                                        USD ($)
                                      </option>

                                      <option value="€">
                                        EUR (€)
                                      </option>

                                      <option value="£">
                                        GBP (£)
                                      </option>
                                    </select>
                                  </div>

                                  <div className="menu-review-field">
                                    <label>Food type</label>

                                    <select
                                      value={item.foodType}
                                      onChange={(event) =>
                                        updateItemField(
                                          pageIndex,
                                          categoryIndex,
                                          itemIndex,
                                          "foodType",
                                          event.target.value
                                        )
                                      }
                                    >
                                      <option value="VEG">
                                        Vegetarian
                                      </option>

                                      <option value="NON_VEG">
                                        Non-vegetarian
                                      </option>
                                    </select>
                                  </div>
                                </div>

                                <div className="menu-review-field">
                                  <label>Description</label>

                                  <textarea
                                    rows={2}
                                    value={item.description}
                                    onChange={(event) =>
                                      updateItemField(
                                        pageIndex,
                                        categoryIndex,
                                        itemIndex,
                                        "description",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Item description"
                                  />
                                </div>
                              </div>
                            )
                          )}

                          {category.items.length === 0 && (
                            <p className="menu-review-empty-items">
                              No items detected in this category.
                            </p>
                          )}
                        </section>
                      )
                    )}
                  </div>
                ))
              )}
            </div>

            {/* REVIEW FOOTER */}

            <div className="menu-review-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={closeReviewEditor}
                disabled={savingReview || approvingImport}
              >
                Cancel
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={handleSaveReview}
                disabled={
                  savingReview ||
                  approvingImport ||
                  reviewPages.length === 0
                }
              >
                {savingReview ? (
                  <>
                    <LoaderCircle
                      size={14}
                      className="import-spin"
                    />
                    Saving...
                  </>
                ) : (
                  "Save Review"
                )}
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={handleApproveImport}
                disabled={
                  savingReview ||
                  approvingImport ||
                  reviewPages.length === 0
                }
              >
                {approvingImport ? (
                  <>
                    <LoaderCircle
                      size={14}
                      className="import-spin"
                    />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    Approve Menu
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MenuImport;
