import jwt from "jsonwebtoken";
import crypto from "node:crypto";

export const generateAccessToken = ({ userId, restaurantId, membershipId }) => {
    if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error("JWT_ACCESS_SECRET is not configured");
}
    return jwt.sign(
        {
            restaurantId,
            membershipId
        },
        process.env.JWT_ACCESS_SECRET,
        {
            subject: userId,
            expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m"
        }
    );
};

export const generateRefreshToken = () => {
    return crypto.randomBytes(64).toString("hex");
};

export const hashRefreshToken = (token) => {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
};