
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Utensils,
} from "lucide-react";

import authService from "./authService";
import { setCredentials } from "./authSlice";

import "./Login.css";
import "./Register.css";

function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    restaurantName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await authService.register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        restaurantName: formData.restaurantName.trim(),
      });

      dispatch(setCredentials(response.data));

      navigate("/dashboard", { replace: true });
    } catch (error) {
      const validationErrors = error.response?.data?.errors;

      setError(
        validationErrors?.[0]?.message ||
        error.response?.data?.message ||
        "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page register-page">
      {/* Brand Panel */}
      <div className="login-brand-panel">
        <div className="login-brand">
          <div className="login-brand-icon">
            <Utensils size={26} />
          </div>

          <span>Restora</span>
        </div>

        <div className="login-brand-content">
          <span className="login-eyebrow">
            RESTAURANT MANAGEMENT SUITE
          </span>

          <h1>
            Build your restaurant.
            <br />
            Simplify your operations.
            <br />
            <span>Grow with Restora.</span>
          </h1>

          <p>
            Bring your restaurant operations,
            employees, tables and menu together
            in one powerful platform.
          </p>
        </div>

        <div className="login-brand-footer">
          © 2026 Restora. All rights reserved.
        </div>
      </div>

      {/* Registration Form */}
      <div className="login-form-panel">
        <div className="login-form-container register-form-container">
          <div className="login-mobile-brand">
            <Utensils size={24} />
            <span>Restora</span>
          </div>

          <span className="login-welcome">
            GET STARTED
          </span>

          <h2>Create your account</h2>

          <p className="login-subtitle">
            Register your restaurant and start managing
            your operations with Restora.
          </p>

          <form
            className="login-form register-form"
            onSubmit={handleRegister}
          >
            <div className="form-group">
              <label htmlFor="name">
                Owner name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                autoComplete="name"
                minLength={2}
                maxLength={100}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="restaurantName">
                Restaurant name
              </label>

              <input
                id="restaurantName"
                name="restaurantName"
                type="text"
                placeholder="Enter your restaurant name"
                value={formData.restaurantName}
                onChange={handleChange}
                minLength={2}
                maxLength={150}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@restaurant.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                maxLength={255}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Password
              </label>

              <div className="password-input-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>

              <span className="register-field-hint">
                Minimum 8 characters.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                Confirm password
              </label>

              <div className="password-input-wrapper">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={
                    showConfirmPassword ? "text" : "password"
                  }
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirmPassword((previous) => !previous)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading
                ? "Creating account..."
                : "Create restaurant account"}
            </button>
          </form>

          <p className="login-register">
            Already have an account?
            <Link to="/login"> Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
