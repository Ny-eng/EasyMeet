import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEventSchema, insertResponseSchema } from "@shared/schema";
import { ZodError } from "zod";
import { z } from "zod";

const updateEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
});

// Run cleanup every hour
const CLEANUP_INTERVAL = 60 * 60 * 1000;

export async function registerRoutes(app: Express): Promise<Server> {
  // Start periodic cleanup
  setInterval(async () => {
    try {
      await storage.cleanupExpiredEvents();
      console.log("[Cleanup] Expired events and responses have been removed");
    } catch (error) {
      console.error("[Cleanup] Error during cleanup:", error);
    }
  }, CLEANUP_INTERVAL);

  app.post("/api/events", async (req, res) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData);
      res.json(event);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create event" });
      }
    }
  });

  app.patch("/api/events/:slug", async (req, res) => {
    try {
      const event = await storage.getEventBySlug(req.params.slug);
      if (!event) {
        res.status(404).json({ message: "Event not found" });
        return;
      }

      const updateData = updateEventSchema.parse(req.body);
      const updatedEvent = await storage.updateEvent(event.id, updateData);
      res.json(updatedEvent);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update event" });
      }
    }
  });

  app.get("/api/events/:slug", async (req, res) => {
    const event = await storage.getEventBySlug(req.params.slug);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }
    const responses = await storage.getResponsesByEventId(event.id);
    res.json({ event, responses });
  });

  app.post("/api/events/:slug/responses", async (req, res) => {
    try {
      const event = await storage.getEventBySlug(req.params.slug);
      if (!event) {
        res.status(404).json({ message: "Event not found" });
        return;
      }

      // Check if past deadline
      if (new Date() > new Date(event.deadline)) {
        res.status(400).json({ message: "Response deadline has passed" });
        return;
      }

      const responseData = insertResponseSchema.parse({
        ...req.body,
        eventId: event.id,
      });

      const response = await storage.createResponse(responseData);
      res.json(response);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create response" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}