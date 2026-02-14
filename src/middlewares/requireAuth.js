import jwt from "jsonwebtoken";

export const requireAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: "missing access token" });
    }

    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // token payload: { sub: userId, role: "admin/user", iat, exp }
    req.user = {
      id: payload.sub,
      role: payload.role,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "invalid or expired access token" });
  }
};
