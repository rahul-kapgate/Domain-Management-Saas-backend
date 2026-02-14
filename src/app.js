// app.js
import express from "express";
import AdminRoutes from "./routers/admin.router.js";
import UserRouters from './routers/user.router.js'
import authRouters from "./routers/auth.router.js"

const app = express();

// Middlewares
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ message: "API is running ✅" });
});

app.use("/api/v1/admin", AdminRoutes);
app.use("/api/v1/user", UserRouters);
app.use("/api/v1/auth", authRouters);

export default app;
