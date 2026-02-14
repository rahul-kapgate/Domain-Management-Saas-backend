export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "unauthorized" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "admin access required" });
  }

  return next();
};
