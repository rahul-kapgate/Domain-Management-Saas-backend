 import bcrypt from "bcrypt";
import User from "../models/User.model.js";
import mongoose from "mongoose";

// create user
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1) Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "name, email and password are required",
      });
    }

    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "password must be at least 6 characters",
      });
    }

    // 2) Normalize
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedName = String(name).trim();

    // 3) Check duplicate user
    const exists = await User.findOne({ email: normalizedEmail }).select("_id");
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "email already registered",
      });
    }

    // 4) Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 5) Create user (do NOT accept random role from public request unless you want it)
    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      passwordHash,
      role: role === "admin" ? "admin" : "user", // safer default
    });

    // 6) Response (avoid sending passwordHash)
    return res.status(201).json({
      success: true,
      message: "user created",
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    // Handle MongoDB duplicate key error (race condition safety)
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "email already registered",
      });
    }

    console.error("Create user error:", err);
    return res.status(500).json({
      success: false,
      message: "internal server error",
    });
  }
};

//update user

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // 1) Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "invalid user id",
      });
    }

    // 2) Allow only safe fields
    const allowed = ["name", "email", "role", "password", "status"];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    // Block direct passwordHash update
    if (req.body.passwordHash !== undefined) {
      return res.status(400).json({
        success: false,
        message: "passwordHash cannot be updated directly",
      });
    }

    // 3) Normalize inputs
    if (updates.name) updates.name = String(updates.name).trim();

    if (updates.email) updates.email = String(updates.email).trim().toLowerCase();

    // 4) If email changes, ensure it's not used by another user
    if (updates.email) {
      const existing = await User.findOne({
        email: updates.email,
        _id: { $ne: id },
      }).select("_id");

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "email already in use",
        });
      }
    }

    // 5) Password update (hash it)
    if (updates.password) {
      const password = String(updates.password);
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "password must be at least 6 characters",
        });
      }

      const saltRounds = 12;
      updates.passwordHash = await bcrypt.hash(password, saltRounds);
      delete updates.password; // never store plain password
    }

    // 6) Role safety (optional): only allow admin/user
    if (updates.role) {
      updates.role = updates.role === "admin" ? "admin" : "user";
    }

    // 7) Update
    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).select("-passwordHash -__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "user not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "user updated",
      data: user,
    });
  } catch (err) {
    // Duplicate key safety
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "email already in use",
      });
    }

    console.error("Update user error:", err);
    return res.status(500).json({
      success: false,
      message: "internal server error",
    });
  }
};

//get all user
export const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
    const search = (req.query.search || "").toString().trim();
    const role = (req.query.role || "").toString().trim(); // optional filter

    const filter = {};

    // Search by name or email
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Role filter (optional)
    if (role && ["admin", "user"].includes(role)) {
      filter.role = role;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-passwordHash -__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    console.error("Get all users error:", err);
    return res.status(500).json({
      success: false,
      message: "internal server error",
    });
  }
};

// DELETE USER
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "invalid user id",
      });
    }

    const deleted = await User.findByIdAndDelete(id).select("-passwordHash -__v");

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "user not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "user deleted",
      data: deleted,
    });
  } catch (err) {
    console.error("Delete user error:", err);
    return res.status(500).json({
      success: false,
      message: "internal server error",
    });
  }
};
