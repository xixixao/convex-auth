import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
  }).index("email", ["email"]),
  verificationCodes: defineTable({
    userId: v.id("users"),
    code: v.string(),
    expirationTime: v.number(),
  })
    .index("userId", ["userId"])
    .index("code", ["code"]),
  sessions: defineTable({
    userId: v.id("users"),
    expirationTime: v.number(),
  }).index("userId", ["userId"]),
  numbers: defineTable({
    userId: v.id("users"),
    value: v.number(),
  }).index("userId", ["userId"]),
});
