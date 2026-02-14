import mongoose from "mongoose";

const domainSchema = new mongoose.Schema(
  {
    domainName: { type: String, required: true, trim: true, lowercase: true },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// Prevent same domain duplicate for the same user
domainSchema.index({ userId: 1, domainName: 1 }, { unique: true });

export default mongoose.model("Domain", domainSchema);
