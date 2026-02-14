import mongoose from "mongoose";
import Domain from "../models/Domin.model.js"

// GET user dommains 
export const getMyDomains = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "invalid user id" });
    }

    const domains = await Domain.find({ userId })
      .sort({ createdAt: -1 })
      .select("-__v");

    return res.status(200).json({ success: true, data: domains });
  } catch (err) {
    console.error("Get my domains error:", err);
    return res.status(500).json({ success: false, message: "internal server error" });
  }
};

// POST add domains
export const addMyDomain = async (req, res) => {
  try {
    const userId = req.user.id;
    const { domainName } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "invalid user id" });
    }

    if (!domainName || typeof domainName !== "string") {
      return res.status(400).json({ success: false, message: "domainName is required" });
    }

    // Normalize: lowercase + trim + remove protocol + remove trailing slash
    let normalized = domainName.trim().toLowerCase();
    normalized = normalized.replace(/^https?:\/\//, "");
    normalized = normalized.replace(/\/+$/, "");

    // Simple domain format check (keeps it simple, not perfect)
    const domainRegex = /^(?!-)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i;
    if (!domainRegex.test(normalized)) {
      return res.status(400).json({
        success: false,
        message: "invalid domain format (example: example.com)",
      });
    }

    const created = await Domain.create({
      domainName: normalized,
      userId,
      status: "active",
    });

    return res.status(201).json({
      success: true,
      message: "domain added",
      data: created,
    });
  } catch (err) {
    // Duplicate domain per user (unique index userId+domainName)
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "domain already exists for this user",
      });
    }

    console.error("Add my domain error:", err);
    return res.status(500).json({ success: false, message: "internal server error" });
  }
};

// update the status 
export const updateMyDomainStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "invalid id" });
    }

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be active/inactive" });
    }

    const updated = await Domain.findOneAndUpdate(
      { _id: id, userId }, // ✅ ensures user can update only their domain
      { status },
      { new: true, runValidators: true }
    ).select("-__v");

    if (!updated) {
      return res.status(404).json({ success: false, message: "domain not found" });
    }

    return res.status(200).json({ success: true, message: "domain updated", data: updated });
  } catch (err) {
    console.error("Update my domain error:", err);
    return res.status(500).json({ success: false, message: "internal server error" });
  }
};
