import { Router } from "express";
import {
  getMyDomains,
  addMyDomain,
  updateMyDomainStatus,
} from "../controllers/user.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();
router.use(requireAuth);

router.get("/domains", getMyDomains);
router.post("/domains", addMyDomain);

router.patch("/domains/:id", updateMyDomainStatus);

export default router;
