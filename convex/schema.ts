import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    expirationTime: v.number(),
  }),
  numbers: defineTable({
    sessionId: v.id("sessions"),
    value: v.number(),
  }).index("sessionId", ["sessionId"]),
});
