
import { registerOwner, loginUser,logoutUser, refreshUserSession } from "./auth.service.js";

const setRefreshTokenCookie = (res, refreshToken) => {
  const refreshTokenDays = Number(
    process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7
  );

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: refreshTokenDays * 24 * 60 * 60 * 1000,
  });
};

export const register = async (req, res, next) => {
  try {
    const result = await registerOwner(req.body);

    // Set refresh token in an HttpOnly cookie
    setRefreshTokenCookie(res, result.refreshToken);

    return res.status(201).json({
      success: true,
      message: "Restaurant registered successfully",
      data: {
        user: result.user,
        restaurant: result.restaurant,
        membership: result.membership,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    // Handle duplicate email
    if (
      error.code === "P2002" &&
      error.meta?.target?.includes("email")
    ) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    next(error);
  }
};



export const login = async (req, res, next) => {
  try {
    const result = await loginUser(req.body);

    setRefreshTokenCookie(res, result.refreshToken);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: result.user,
        restaurant: result.restaurant,
        membership: result.membership,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    if (
      error.message === "INVALID_CREDENTIALS" ||
      error.message === "NO_ACTIVE_MEMBERSHIP"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    next(error);
  }
};


export const refresh = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;

    const result = await refreshUserSession(rawRefreshToken);

    setRefreshTokenCookie(res, result.refreshToken);

    return res.status(200).json({
      success: true,
      message: "Session refreshed successfully",
      data: {
        user: result.user,
        restaurant: result.restaurant,
        membership: result.membership,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    if (
      error.message === "INVALID_REFRESH_TOKEN" ||
      error.message === "REFRESH_TOKEN_REUSE"
    ) {
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/v1/auth",
      });

      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token. Please log in again.",
      });
    }

    next(error);
  }
};


export const logout = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;

    await logoutUser(rawRefreshToken);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/v1/auth",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};
