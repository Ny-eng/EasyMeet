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
      const { slug } = req.params;
      console.log(`スラグ '${slug}' のイベントに対するレスポンス作成リクエスト:`, req.body);
      
      const event = await storage.getEventBySlug(slug);
      if (!event) {
        console.error(`スラグ '${slug}' に対応するイベントが見つかりません`);
        res.status(404).json({ message: "Event not found" });
        return;
      }

      console.log(`スラグ '${slug}' のイベントが見つかりました:`, { id: event.id, title: event.title });

      // Check if past deadline
      if (new Date() > new Date(event.deadline)) {
        console.log(`イベント '${event.title}' は期限切れです`);
        res.status(400).json({ message: "Response deadline has passed" });
        return;
      }

      console.log("送信されたデータ:", req.body);
      console.log("イベントID:", event.id);

      // バリデーション用のデータ準備
      let validationData;
      
      // 既にevent_idが設定されている場合は、それをeventIdとして使用
      if (req.body.event_id) {
        console.log("リクエストに event_id が含まれています:", req.body.event_id);
        validationData = {
          ...req.body,
          eventId: req.body.event_id // eventIdとしてevent_idを設定
        };
        // event_idプロパティを削除（重複を避ける）
        delete validationData.event_id;
      } 
      // event_idがなくてもeventIdがある場合は、それを使用
      else if (req.body.eventId) {
        console.log("リクエストに eventId が含まれています:", req.body.eventId);
        validationData = req.body;
      }
      // どちらもない場合は取得したイベントIDを使用
      else {
        console.log("リクエストにイベントIDが含まれていないため、取得したイベントIDを使用します:", event.id);
        validationData = {
          ...req.body,
          eventId: event.id,
        };
      }
      
      console.log("バリデーション対象データ:", validationData);
      
      try {
        const responseData = insertResponseSchema.parse(validationData);
        console.log('バリデーション後の回答データ:', responseData);
      
        try {
          const response = await storage.createResponse(responseData);
          console.log('回答が正常に作成されました:', response);
          res.json(response);
        } catch (storageError) {
          console.error('ストレージでの回答作成エラー:', storageError);
          // 詳細なエラー情報を追加
          const errorMessage = storageError instanceof Error ? storageError.message : String(storageError);
          console.error('詳細エラー情報:', errorMessage);
          res.status(500).json({ 
            message: "Failed to store response in database", 
            error: errorMessage,
            details: req.body
          });
        }
      } catch (validationError) {
        console.error('バリデーションエラー:', validationError);
        if (validationError instanceof ZodError) {
          res.status(400).json({ 
            message: "Validation failed", 
            errors: validationError.errors,
            receivedData: validationData
          });
        } else {
          res.status(400).json({ 
            message: "Invalid response data", 
            error: String(validationError) 
          });
        }
      }
    } catch (error) {
      console.error('回答作成中にエラーが発生しました:', error);
      if (error instanceof ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ 
          message: "Failed to create response", 
          error: String(error),
          slug: req.params.slug,
          requestBody: req.body
        });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}