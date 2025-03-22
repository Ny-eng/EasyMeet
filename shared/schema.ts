import { pgTable, text, serial, integer, date, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  organizer: text("organizer").notNull(),
  slug: text("slug").notNull().unique(),
  dates: timestamp("dates").array().notNull(),
  time: text("time").notNull(), // timeフィールドを追加
  deadline: timestamp("deadline").notNull(),
});

export const responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  name: text("name").notNull(),
  availability: boolean("availability").array().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

const dateSchema = z.date().or(z.string().datetime());

export const insertEventSchema = createInsertSchema(events, {
  dates: z.array(dateSchema),
  deadline: dateSchema,
  time: z.string(),
}).pick({
  title: true,
  description: true,
  organizer: true,
  dates: true,
  time: true,
  deadline: true,
});

export const insertResponseSchema = createInsertSchema(responses).pick({
  eventId: true,
  name: true,
  availability: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type Response = typeof responses.$inferSelect;