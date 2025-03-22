// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { nanoid } from "nanoid";
var MemStorage = class {
  events;
  responses;
  currentEventId;
  currentResponseId;
  constructor() {
    this.events = /* @__PURE__ */ new Map();
    this.responses = /* @__PURE__ */ new Map();
    this.currentEventId = 1;
    this.currentResponseId = 1;
  }
  async createEvent(insertEvent) {
    const id = this.currentEventId++;
    const slug = nanoid(10);
    const event = {
      ...insertEvent,
      id,
      slug,
      description: insertEvent.description || null
    };
    this.events.set(id, event);
    return event;
  }
  async getEventBySlug(slug) {
    return Array.from(this.events.values()).find(
      (event) => event.slug === slug
    );
  }
  async updateEvent(id, update) {
    const event = this.events.get(id);
    if (!event) {
      throw new Error("Event not found");
    }
    const updatedEvent = {
      ...event,
      ...update
    };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }
  async createResponse(insertResponse) {
    const id = this.currentResponseId++;
    const response = {
      ...insertResponse,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.responses.set(id, response);
    return response;
  }
  async getResponsesByEventId(eventId) {
    return Array.from(this.responses.values()).filter(
      (response) => response.eventId === eventId
    );
  }
  async cleanupExpiredEvents() {
    const now = /* @__PURE__ */ new Date();
    const expiredEventIds = [];
    for (const [id, event] of this.events.entries()) {
      const latestDate = new Date(Math.max(...event.dates.map((d) => new Date(d).getTime())));
      const deletionDate = new Date(latestDate.getTime() + 7 * 24 * 60 * 60 * 1e3);
      if (deletionDate < now) {
        expiredEventIds.push(id);
      }
    }
    for (const eventId of expiredEventIds) {
      this.events.delete(eventId);
      for (const [responseId, response] of this.responses.entries()) {
        if (response.eventId === eventId) {
          this.responses.delete(responseId);
        }
      }
    }
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  organizer: text("organizer").notNull(),
  slug: text("slug").notNull().unique(),
  dates: timestamp("dates").array().notNull(),
  deadline: timestamp("deadline").notNull()
});
var responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  name: text("name").notNull(),
  availability: boolean("availability").array().notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var dateSchema = z.date().or(z.string().datetime());
var insertEventSchema = createInsertSchema(events, {
  dates: z.array(dateSchema),
  deadline: dateSchema
}).pick({
  title: true,
  description: true,
  organizer: true,
  dates: true,
  deadline: true
});
var insertResponseSchema = createInsertSchema(responses).pick({
  eventId: true,
  name: true,
  availability: true
});

// server/routes.ts
import { ZodError } from "zod";
import { z as z2 } from "zod";
var updateEventSchema = z2.object({
  title: z2.string().min(1),
  description: z2.string().nullable()
});
var CLEANUP_INTERVAL = 60 * 60 * 1e3;
async function registerRoutes(app2) {
  setInterval(async () => {
    try {
      await storage.cleanupExpiredEvents();
      console.log("[Cleanup] Expired events and responses have been removed");
    } catch (error) {
      console.error("[Cleanup] Error during cleanup:", error);
    }
  }, CLEANUP_INTERVAL);
  app2.post("/api/events", async (req, res) => {
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
  app2.patch("/api/events/:slug", async (req, res) => {
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
  app2.get("/api/events/:slug", async (req, res) => {
    const event = await storage.getEventBySlug(req.params.slug);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }
    const responses2 = await storage.getResponsesByEventId(event.id);
    res.json({ event, responses: responses2 });
  });
  app2.post("/api/events/:slug/responses", async (req, res) => {
    try {
      const event = await storage.getEventBySlug(req.params.slug);
      if (!event) {
        res.status(404).json({ message: "Event not found" });
        return;
      }
      if (/* @__PURE__ */ new Date() > new Date(event.deadline)) {
        res.status(400).json({ message: "Response deadline has passed" });
        return;
      }
      const responseData = insertResponseSchema.parse({
        ...req.body,
        eventId: event.id
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
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid as nanoid2 } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
