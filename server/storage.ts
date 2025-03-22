import { nanoid } from "nanoid";
import { Event, InsertEvent, Response, InsertResponse } from "@shared/schema";

export interface IStorage {
  createEvent(event: InsertEvent): Promise<Event>;
  getEventBySlug(slug: string): Promise<Event | undefined>;
  updateEvent(id: number, update: Partial<Event>): Promise<Event>;
  createResponse(response: InsertResponse): Promise<Response>;
  getResponsesByEventId(eventId: number): Promise<Response[]>;
  cleanupExpiredEvents(): Promise<void>;
}

export class MemStorage implements IStorage {
  private events: Map<number, Event>;
  private responses: Map<number, Response>;
  private currentEventId: number;
  private currentResponseId: number;

  constructor() {
    this.events = new Map();
    this.responses = new Map();
    this.currentEventId = 1;
    this.currentResponseId = 1;
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = this.currentEventId++;
    const slug = nanoid(10);
    const event: Event = {
      ...insertEvent,
      id,
      slug,
      description: insertEvent.description || null,
    };
    this.events.set(id, event);
    return event;
  }

  async getEventBySlug(slug: string): Promise<Event | undefined> {
    return Array.from(this.events.values()).find(
      (event) => event.slug === slug
    );
  }

  async updateEvent(id: number, update: Partial<Event>): Promise<Event> {
    const event = this.events.get(id);
    if (!event) {
      throw new Error("Event not found");
    }

    const updatedEvent = {
      ...event,
      ...update,
    };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async createResponse(insertResponse: InsertResponse): Promise<Response> {
    const id = this.currentResponseId++;
    const response: Response = {
      ...insertResponse,
      id,
      createdAt: new Date(),
    };
    this.responses.set(id, response);
    return response;
  }

  async getResponsesByEventId(eventId: number): Promise<Response[]> {
    return Array.from(this.responses.values()).filter(
      (response) => response.eventId === eventId
    );
  }

  async cleanupExpiredEvents(): Promise<void> {
    const now = new Date();
    const expiredEventIds: number[] = [];

    // Find expired events
    for (const [id, event] of this.events.entries()) {
      // Get the latest date from event.dates
      const latestDate = new Date(Math.max(...event.dates.map(d => new Date(d).getTime())));
      // Add 7 days to the latest date
      const deletionDate = new Date(latestDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (deletionDate < now) {
        expiredEventIds.push(id);
      }
    }

    // Delete expired events and their responses
    for (const eventId of expiredEventIds) {
      // Delete event
      this.events.delete(eventId);

      // Delete associated responses
      for (const [responseId, response] of this.responses.entries()) {
        if (response.eventId === eventId) {
          this.responses.delete(responseId);
        }
      }
    }
  }
}

export const storage = new MemStorage();