
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  UtensilsCrossed,
  Clock,
  Leaf,
  AlertCircle,
  RefreshCw,
  ShoppingCart,
  Plus,
  Minus,
  X,
  Trash2,
  Search,
  List,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

import guestService from "./guestService";
import "./GuestMenu.css";

const generateIdempotencyKey = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (character) => {
      const random = Math.floor(Math.random() * 16);

      const value =
        character === "x"
          ? random
          : (random & 0x3) | 0x8;

      return value.toString(16);
    }
  );
};

function GuestMenu() {
  const [searchParams] = useSearchParams();
  const qrToken = searchParams.get("token");

  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState([]);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [placedOrder, setPlacedOrder] = useState(null);

  const categoryRefs = useRef({});
  const orderSubmissionRef = useRef(false);
  const idempotencyKeyRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMenu = async () => {
      if (!qrToken) {
        setError("Invalid QR code. Please scan the table QR code again.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await guestService.getMenu(qrToken);

        if (isMounted) {
          setMenu(response.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              "Unable to load the menu. Please try again."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMenu();

    return () => {
      isMounted = false;
    };
  }, [qrToken]);

  const addToCart = (item, variant = null) => {
    if (!menu?.table?.hasOpenSession || isPlacingOrder) return;

    const price = Number(variant ? variant.price : item.price);

    if (!Number.isFinite(price) || price < 0) return;

    const cartKey = `${item.id}-${variant?.id || "default"}`;

    setCart((currentCart) => {
      const existing = currentCart.find(
        (entry) => entry.key === cartKey
      );

      if (existing) {
        return currentCart.map((entry) =>
          entry.key === cartKey
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        );
      }

      return [
        ...currentCart,
        {
          key: cartKey,
          itemId: item.id,
          variantId: variant?.id || null,
          name: item.name,
          variantName: variant?.name || null,
          foodType: item.foodType,
          price,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (key, change) => {
    if (isPlacingOrder) return;

    setCart((currentCart) =>
      currentCart
        .map((entry) =>
          entry.key === key
            ? { ...entry, quantity: entry.quantity + change }
            : entry
        )
        .filter((entry) => entry.quantity > 0)
    );
  };

  const removeFromCart = (key) => {
    if (isPlacingOrder) return;

    setCart((currentCart) =>
      currentCart.filter((entry) => entry.key !== key)
    );
  };

  const getCartQuantity = (itemId, variantId = null) => {
    const entry = cart.find(
      (item) =>
        item.itemId === itemId &&
        item.variantId === variantId
    );

    return entry?.quantity || 0;
  };

  const cartCount = cart.reduce(
    (total, entry) => total + entry.quantity,
    0
  );

  const cartTotal = cart.reduce(
    (total, entry) => total + entry.price * entry.quantity,
    0
  );

  const formatPrice = (price) =>
    `${menu?.restaurant?.currency || ""} ${Number(price).toFixed(2)}`;

  const handlePlaceOrder = async () => {
    if (
      orderSubmissionRef.current ||
      !qrToken ||
      !table.hasOpenSession ||
      cart.length === 0
    ) {
      return;
    }

    orderSubmissionRef.current = true;
    setIsPlacingOrder(true);
    setOrderError("");

    try {
      const payload = {
        qrToken,
        items: cart.map((entry) => ({
          menuItemId: entry.itemId,
          variantId: entry.variantId,
          quantity: entry.quantity,
        })),
      };

      // Generate a key once per checkout attempt.
      // Keep it when a request fails so a retry cannot create a duplicate.
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = generateIdempotencyKey();
      }

      const response = await guestService.placeOrder(
        payload,
        idempotencyKeyRef.current
      );

      const order = response.data;

      setPlacedOrder(order);
      setCart([]);
      setIsCartOpen(false);

      // Clear only after successful confirmation.
      idempotencyKeyRef.current = null;
    } catch (err) {
      console.error("Guest order placement failed:", err);

      if (!err.response) {
        setOrderError(
          "We couldn't confirm your order because the connection was interrupted. Please try again. Your previous request will be checked to prevent duplicate orders."
        );
      } else {
        setOrderError(
          err.response.data?.message ||
            "We couldn't place your order. Please try again."
        );
      }
    } finally {
      orderSubmissionRef.current = false;
      setIsPlacingOrder(false);
    }
  };

  const filteredCategories = menu?.categories
    ?.map((category) => ({
      ...category,
      menuItems: category.menuItems.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
      ),
    }))
    .filter((category) => category.menuItems.length > 0);

  const scrollToCategory = (categoryId) => {
    const element = categoryRefs.current[categoryId];

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      setIsCategoryOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="guest-state">
        <div className="guest-loader" />
        <p>Preparing your menu...</p>
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div className="guest-state">
        <AlertCircle size={40} />
        <h2>Menu unavailable</h2>
        <p>{error || "Unable to load the restaurant menu."}</p>

        <button
          className="guest-retry-button"
          onClick={() => window.location.reload()}
        >
          <RefreshCw size={16} />
          Try again
        </button>
      </div>
    );
  }

  const { restaurant, table, categories } = menu;

  return (
    <div className="guest-page">
      <header className="guest-header">
        <div className="guest-header-brand">
          <div className="guest-brand-icon">
            <UtensilsCrossed size={24} />
          </div>

          <div>
            <h1>{restaurant.name}</h1>
            <p>Welcome! Explore our menu.</p>
          </div>
        </div>

        {categories.length > 0 && (
          <div className="guest-header-search">
            <div className="guest-search-wrapper">
              <Search size={19} />

              <input
                type="text"
                className="guest-search-input"
                placeholder="Search dishes..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />

              {searchTerm && (
                <button
                  className="guest-search-clear"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <section className="guest-table-info">
        <div>
          <span>Your table</span>
          <strong>
            {table.name || `Table ${table.tableNumber}`}
          </strong>
        </div>

        <span
          className={`guest-session-status ${
            table.hasOpenSession ? "active" : "inactive"
          }`}
        >
          {table.hasOpenSession ? "Ready to order" : "Waiting for staff"}
        </span>
      </section>

      {!table.hasOpenSession && (
        <div className="guest-notice">
          A staff member needs to open your table session before you can
          place an order.
        </div>
      )}

      <main className="guest-menu-content">
        <div className="guest-menu-heading">
          <span>OUR MENU</span>
          <h2>Discover something delicious</h2>
        </div>

        {categories.length === 0 ? (
          <div className="guest-empty-menu">
            No menu items are currently available.
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="guest-search-empty">
            <Search size={30} />
            <h3>No dishes found</h3>
            <p>Try searching with a different dish name.</p>

            <button onClick={() => setSearchTerm("")}>
              Clear search
            </button>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <section
              className="guest-category"
              key={category.id}
              ref={(element) => {
                categoryRefs.current[category.id] = element;
              }}
              id={`guest-category-${category.id}`}
            >
              <div className="guest-category-heading">
                <h3>{category.name}</h3>

                {category.description && (
                  <p>{category.description}</p>
                )}
              </div>

              <div className="guest-items-grid">
                {category.menuItems.map((item) => {
                  const selectedVariantId =
                    selectedVariants[item.id] || "";

                  const selectedVariantQuantity = selectedVariantId
                    ? getCartQuantity(item.id, selectedVariantId)
                    : 0;

                  const itemQuantity = getCartQuantity(item.id);

                  return (
                    <article className="guest-menu-item" key={item.id}>
                      {item.imageUrl ? (
                        <img
                          className="guest-item-image"
                          src={item.imageUrl}
                          alt={item.name}
                        />
                      ) : (
                        <div className="guest-item-placeholder">
                          <UtensilsCrossed size={28} />
                        </div>
                      )}

                      <div className="guest-item-details">
                        <div className="guest-item-title-row">
                          <h4>{item.name}</h4>

                          <span
                            className={`guest-food-indicator ${
                              item.foodType === "NON_VEG"
                                ? "non-veg"
                                : "veg"
                            }`}
                            title={item.foodType.replace("_", " ")}
                            role="img"
                            aria-label={item.foodType.replace("_", " ")}
                          >
                            <span />
                          </span>
                        </div>

                        {item.description && (
                          <p className="guest-item-description">
                            {item.description}
                          </p>
                        )}

                        {item.preparationTime && (
                          <span className="guest-preparation-time">
                            <Clock size={13} />
                            {item.preparationTime} min
                          </span>
                        )}

                        {item.variants.length > 0 ? (
                          <div className="guest-cart-item-actions">
                            <select
                              className="guest-variant-select"
                              value={selectedVariantId}
                              onChange={(event) =>
                                setSelectedVariants((current) => ({
                                  ...current,
                                  [item.id]: event.target.value,
                                }))
                              }
                              disabled={!table.hasOpenSession || isPlacingOrder}
                            >
                              <option value="">Choose an option</option>

                              {item.variants.map((variant) => (
                                <option
                                  key={variant.id}
                                  value={variant.id}
                                >
                                  {variant.name} - {formatPrice(variant.price)}
                                </option>
                              ))}
                            </select>

                            {selectedVariantQuantity > 0 ? (
                              <div className="guest-inline-quantity">
                                <button
                                  disabled={isPlacingOrder}
                                  onClick={() =>
                                    updateQuantity(
                                      `${item.id}-${selectedVariantId}`,
                                      -1
                                    )
                                  }
                                  aria-label="Decrease quantity"
                                >
                                  <Minus size={15} />
                                </button>

                                <strong>
                                  {selectedVariantQuantity}
                                </strong>

                                <button
                                  disabled={isPlacingOrder}
                                  onClick={() => {
                                    const variant = item.variants.find(
                                      (entry) =>
                                        entry.id === selectedVariantId
                                    );

                                    if (variant) addToCart(item, variant);
                                  }}
                                  aria-label="Increase quantity"
                                >
                                  <Plus size={15} />
                                </button>
                              </div>
                            ) : (
                              <button
                                className="guest-add-button"
                                disabled={
                                  !table.hasOpenSession ||
                                  !selectedVariantId ||
                                  isPlacingOrder
                                }
                                onClick={() => {
                                  const variant = item.variants.find(
                                    (entry) =>
                                      entry.id === selectedVariantId
                                  );

                                  if (variant) addToCart(item, variant);
                                }}
                              >
                                <Plus size={16} />
                                Add
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="guest-cart-item-actions">
                            <div className="guest-item-price">
                              {formatPrice(item.price)}
                            </div>

                            {itemQuantity > 0 ? (
                              <div className="guest-inline-quantity">
                                <button
                                  disabled={isPlacingOrder}
                                  onClick={() =>
                                    updateQuantity(
                                      `${item.id}-default`,
                                      -1
                                    )
                                  }
                                  aria-label="Decrease quantity"
                                >
                                  <Minus size={15} />
                                </button>

                                <strong>{itemQuantity}</strong>

                                <button
                                  disabled={isPlacingOrder}
                                  onClick={() => addToCart(item)}
                                  aria-label="Increase quantity"
                                >
                                  <Plus size={15} />
                                </button>
                              </div>
                            ) : (
                              <button
                                className="guest-add-button"
                                disabled={
                                  !table.hasOpenSession || isPlacingOrder
                                }
                                onClick={() => addToCart(item)}
                              >
                                <Plus size={16} />
                                Add
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {categories.length > 0 && !searchTerm.trim() && (
        <div className="guest-category-navigation">
          {isCategoryOpen && (
            <div className="guest-category-popup">
              <div className="guest-category-popup-header">
                <strong>Browse Categories</strong>

                <button
                  onClick={() => setIsCategoryOpen(false)}
                  aria-label="Close categories"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="guest-category-popup-list">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => scrollToCategory(category.id)}
                  >
                    <span>{category.name}</span>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            className="guest-category-float-button"
            onClick={() => setIsCategoryOpen((current) => !current)}
            aria-label={
              isCategoryOpen ? "Close categories" : "Browse menu categories"
            }
            aria-expanded={isCategoryOpen}
            title="Browse menu categories"
          >
            {isCategoryOpen ? <X size={21} /> : <List size={21} />}
          </button>
        </div>
      )}

      {cartCount > 0 && table.hasOpenSession && (
        <button
          className="guest-cart-bar"
          onClick={() => setIsCartOpen(true)}
        >
          <span className="guest-cart-bar-count">
            <ShoppingCart size={19} />
            {cartCount} {cartCount === 1 ? "item" : "items"}
          </span>

          <strong>View Cart · {formatPrice(cartTotal)}</strong>
        </button>
      )}

      {isCartOpen && (
        <div
          className="guest-cart-overlay"
          onClick={() => {
            if (!isPlacingOrder) setIsCartOpen(false);
          }}
        >
          <section
            className="guest-cart-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="guest-cart-header">
              <div>
                <h2>Your Cart</h2>
                <p>{cartCount} items</p>
              </div>

              <button
                className="guest-cart-close"
                onClick={() => setIsCartOpen(false)}
                disabled={isPlacingOrder}
                aria-label="Close cart"
              >
                <X size={22} />
              </button>
            </div>

            <div className="guest-cart-items">
              {cart.map((entry) => (
                <div className="guest-cart-line" key={entry.key}>
                  <div className="guest-cart-line-info">
                    <strong>{entry.name}</strong>

                    {entry.variantName && (
                      <span>{entry.variantName}</span>
                    )}

                    <small>{formatPrice(entry.price)}</small>
                  </div>

                  <div className="guest-cart-line-actions">
                    <div className="guest-quantity-control">
                      <button
                        onClick={() => updateQuantity(entry.key, -1)}
                        disabled={isPlacingOrder}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>

                      <strong>{entry.quantity}</strong>

                      <button
                        onClick={() => updateQuantity(entry.key, 1)}
                        disabled={isPlacingOrder}
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      className="guest-remove-item"
                      onClick={() => removeFromCart(entry.key)}
                      disabled={isPlacingOrder}
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <strong className="guest-cart-line-total">
                    {formatPrice(entry.price * entry.quantity)}
                  </strong>
                </div>
              ))}
            </div>

            <div className="guest-cart-summary">
              <div>
                <span>Subtotal</span>
                <strong>{formatPrice(cartTotal)}</strong>
              </div>

              <p>
                Taxes and additional charges, if applicable, will be
                calculated at checkout.
              </p>

              {orderError && (
                <div className="guest-order-error">
                  <AlertCircle size={16} />
                  <span>{orderError}</span>
                </div>
              )}

              <button
                className="guest-checkout-button"
                disabled={isPlacingOrder || cart.length === 0}
                onClick={handlePlaceOrder}
              >
                {isPlacingOrder
                  ? "Placing Order..."
                  : `Place Order · ${formatPrice(cartTotal)}`}
              </button>
            </div>
          </section>
        </div>
      )}

      {placedOrder && (
        <div className="guest-order-success-overlay">
          <div className="guest-order-success">
            <CheckCircle2 size={54} />

            <h2>Order Placed Successfully!</h2>

            <p>Your order has been sent to the kitchen.</p>

            <div className="guest-order-success-details">
              <div>
                <span>Order ID</span>
                <strong>
                  {placedOrder.id?.slice(0, 8).toUpperCase()}
                </strong>
              </div>

              <div>
                <span>Table</span>
                <strong>
                  {placedOrder.table?.tableNumber ?? table.tableNumber}
                </strong>
              </div>

              <div>
                <span>Status</span>
                <strong>{placedOrder.status}</strong>
              </div>

              <div>
                <span>Total</span>
                <strong>{formatPrice(placedOrder.totalAmount)}</strong>
              </div>
            </div>

            <button
              className="guest-checkout-button"
              onClick={() => setPlacedOrder(null)}
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}

      <footer className="guest-footer">
        <Leaf size={15} />
        <span>Thank you for dining with us.</span>
      </footer>
    </div>
  );
}

export default GuestMenu;
