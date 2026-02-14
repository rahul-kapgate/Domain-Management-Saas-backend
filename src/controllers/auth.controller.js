import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.model.js";

const signAccessToken = (user) =>
  jwt.sign(
    { role: user.role },
    process.env.JWT_ACCESS_SECRET,
    {
      subject: user._id.toString(),
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    }
  );

const signRefreshToken = (user) =>
  jwt.sign(
    { role: user.role },
    process.env.JWT_REFRESH_SECRET,
    {
      subject: user._id.toString(),
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    }
  );

// login api
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // If passwordHash has select:false -> use .select("+passwordHash")
    const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");
    if (!user) {
      return res.status(401).json({ success: false, message: "invalid credentials" });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: "invalid credentials" });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    return res.status(200).json({
      success: true,
      message: "login successful",
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "internal server error" });
  }
};

// ref token api
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: "refreshToken is required" });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: "invalid/expired refresh token" });
    }

    const userId = payload.sub;

    const user = await User.findById(userId).select("role name email");
    if (!user) {
      return res.status(401).json({ success: false, message: "user not found" });
    }

    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user); 

    return res.status(200).json({
      success: true,
      message: "token refreshed",
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(500).json({ success: false, message: "internal server error" });
  }
};
