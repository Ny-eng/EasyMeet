import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";

// 型定義
interface Event {
  id: number;
  title: string;
  description: string | null;
  organizer: string;
  slug: string;
  dates: string[];
  time: string;
  deadline: string;
  createdAt: Date | null;
}

interface Response {
  id: number;
  name: string;
  eventId: number;
  availability: boolean[];
  createdAt: Date | null;
}

// エラーハンドリング用ヘルパー関数
const handleError = (error: any, res: any, message: string) => {
  console.error(`Error: ${message}`, error);
  return res.status(500).json({ error: message });
};

// スラッグを生成するヘルパー関数
const generateSlug = (length = 10) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < length; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
};


admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// イベントを作成するエンドポイント
app.post("/api/events", async (req, res) => {
  try {
    const eventData = req.body;
    
    // 必須フィールドの検証
    if (!eventData.title || !eventData.organizer || !eventData.dates || !eventData.deadline) {
      return res.status(400).json({ 
        error: "Missing required fields",
        requiredFields: ["title", "organizer", "dates", "deadline"]
      });
    }
    
    // ランダムなスラッグがなければ生成
    if (!eventData.slug) {
      eventData.slug = generateSlug();
    }
    
    // IDがなければ自動生成
    if (!eventData.id) {
      // ユニークなIDを生成 (タイムスタンプベース)
      eventData.id = Date.now();
    }
    
    const eventRef = db.collection("events").doc(eventData.slug);
    
    // スラッグが既に存在するかチェック
    const doc = await eventRef.get();
    if (doc.exists) {
      // 既存のスラッグと衝突した場合、新しいスラッグを生成して再試行
      eventData.slug = generateSlug(12); // より長いスラッグを生成
      const newEventRef = db.collection("events").doc(eventData.slug);
      
      await newEventRef.set({
        ...eventData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      const createdEvent = await newEventRef.get();
      return res.status(201).json(createdEvent.data());
    }
    
    // 新しいイベントを作成
    await eventRef.set({
      ...eventData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    const createdEvent = await eventRef.get();
    return res.status(201).json(createdEvent.data());
  } catch (error) {
    return handleError(error, res, "Failed to create event");
  }
});

// スラッグでイベントとそれに関連する回答を取得するエンドポイント
app.get("/api/events/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).json({ error: "Slug parameter is required" });
    }
    
    const eventRef = db.collection("events").doc(slug);
    const eventDoc = await eventRef.get();
    
    if (!eventDoc.exists) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    const event = eventDoc.data() as Event;
    
    // イベントに関連する回答を取得
    const responsesSnapshot = await db.collection("responses")
      .where("eventId", "==", event.id)
      .get();
      
    const responses: Response[] = [];
    responsesSnapshot.forEach(doc => {
      const responseData = doc.data();
      responses.push({
        id: Number(doc.id) || 0,
        name: responseData.name || '',
        eventId: responseData.eventId || 0,
        availability: responseData.availability || [],
        createdAt: responseData.createdAt ? new Date(responseData.createdAt) : null,
        ...responseData
      } as Response);
    });
    
    // イベントと回答を一緒に返す
    return res.status(200).json({
      event,
      responses
    });
  } catch (error) {
    return handleError(error, res, "Failed to fetch event");
  }
});

// イベントを更新するエンドポイント (ID使用)
app.patch("/api/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const eventRef = db.collection("events").doc(id);
    await eventRef.update(updateData);
    
    const updatedEvent = await eventRef.get();
    return res.status(200).json(updatedEvent.data());
  } catch (error) {
    console.error("Error updating event:", error);
    return res.status(500).json({ error: "Failed to update event" });
  }
});

// イベントを更新するエンドポイント (スラッグ使用)
app.patch("/api/events/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const updateData = req.body;
    
    const eventRef = db.collection("events").doc(slug);
    const eventDoc = await eventRef.get();
    
    if (!eventDoc.exists) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    await eventRef.update(updateData);
    
    const updatedEvent = await eventRef.get();
    return res.status(200).json(updatedEvent.data());
  } catch (error) {
    console.error("Error updating event:", error);
    return res.status(500).json({ error: "Failed to update event" });
  }
});

// 回答を作成するエンドポイント (古いパス - 後方互換性のため)
app.post("/api/responses", async (req, res) => {
  try {
    const responseData = req.body;
    const responseRef = await db.collection("responses").add({
      ...responseData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    const createdResponse = await responseRef.get();
    return res.status(201).json({ id: responseRef.id, ...createdResponse.data() });
  } catch (error) {
    console.error("Error creating response:", error);
    return res.status(500).json({ error: "Failed to create response" });
  }
});

// イベントスラッグを使用して回答を作成するエンドポイント (新しいパス)
app.post("/api/events/:slug/responses", async (req, res) => {
  try {
    const { slug } = req.params;
    const responseData = req.body;
    
    // まずイベントを取得してイベントIDを確認
    const eventRef = db.collection("events").doc(slug);
    const eventDoc = await eventRef.get();
    
    if (!eventDoc.exists) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    const event = eventDoc.data() as Event;
    
    // 回答データにイベントIDを追加
    const fullResponseData = {
      ...responseData,
      eventId: event.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    // 回答をFirestoreに保存
    const responseRef = await db.collection("responses").add(fullResponseData);
    const createdResponse = await responseRef.get();
    
    return res.status(201).json({ id: responseRef.id, ...createdResponse.data() });
  } catch (error) {
    console.error("Error creating response:", error);
    return res.status(500).json({ error: "Failed to create response" });
  }
});

// イベントIDで回答を取得するエンドポイント
app.get("/api/events/:eventId/responses", async (req, res) => {
  try {
    const { eventId } = req.params;
    const responsesSnapshot = await db.collection("responses")
      .where("eventId", "==", parseInt(eventId))
      .get();
      
    if (responsesSnapshot.empty) {
      return res.status(200).json([]);
    }
    
    const responses: Response[] = [];
    responsesSnapshot.forEach(doc => {
      const responseData = doc.data();
      responses.push({
        id: Number(doc.id) || 0,
        name: responseData.name || '',
        eventId: responseData.eventId || 0,
        availability: responseData.availability || [],
        createdAt: responseData.createdAt ? new Date(responseData.createdAt) : null,
        ...responseData
      } as Response);
    });
    
    return res.status(200).json(responses);
  } catch (error) {
    console.error("Error fetching responses:", error);
    return res.status(500).json({ error: "Failed to fetch responses" });
  }
});

// 期限切れのイベントをクリーンアップする関数 (HTTP経由で実行可能)
export const cleanupExpiredEvents = functions.https.onRequest(async (req, res) => {
    try {
      const now = new Date();
      const eventsRef = db.collection("events");
      const snapshot = await eventsRef.get();
      
      const batch = db.batch();
      let count = 0;
      
      snapshot.forEach(doc => {
        const event = doc.data() as Event;
        const lastDate = new Date(event.dates[event.dates.length - 1]);
        const expiryDate = new Date(lastDate);
        expiryDate.setDate(expiryDate.getDate() + 14); // 最後の日付から14日後に削除
        
        if (now > expiryDate) {
          batch.delete(doc.ref);
          count++;
        }
      });
      
      if (count > 0) {
        await batch.commit();
        console.log(`Cleaned up ${count} expired events`);
      }
      
      res.status(200).json({ message: `Cleaned up ${count} expired events` });
    } catch (error) {
      console.error("Error cleaning up expired events:", error);
      res.status(500).json({ error: "Failed to clean up expired events" });
    }
  });

export const api = functions.https.onRequest(app);