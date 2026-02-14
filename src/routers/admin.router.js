import { Router } from "express";
import { createUser, updateUser, getAllUsers, deleteUser } from "../controllers/admin.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireAdmin } from "../middlewares/requireAdmin.js"

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

router.post("/create", createUser);
router.put("/:id", updateUser);
router.get("/", getAllUsers);
router.delete("/:id", deleteUser);

export default router;
