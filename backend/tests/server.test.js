import { describe, expect, it, beforeAll, afterAll, beforeEach } from "bun:test";
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";

describe("Simplitics API", () => {
  let app;
  let events = [];
  let stats = {
    pageViews: 0,
    events: {},
    activeUsers: 0
  };

  beforeAll(() => {
    app = new Elysia()
      .use(cors())
      .get("/", () => "Simplitics API")
      .post("/events", ({ body }) => {
        if (!body || !body.type) {
          throw new Error("Event type is required");
        }

        // Store event
        events.push({
          ...body,
          timestamp: new Date().toISOString(),
          id: crypto.randomUUID()
        });

        // Update stats
        if (body.type === "pageview") {
          stats.pageViews++;
        }
        stats.events[body.type] = (stats.events[body.type] || 0) + 1;

        return { success: true, id: events[events.length - 1].id };
      })
      .get("/stats", () => stats)
      .get("/events", () => events)
      .delete("/events/:id", ({ params }) => {
        const index = events.findIndex(e => e.id === params.id);
        if (index === -1) {
          throw new Error("Event not found");
        }
        events.splice(index, 1);
        return { success: true };
      });
  });

  afterAll(() => {
    events = [];
    stats = {
      pageViews: 0,
      events: {},
      activeUsers: 0
    };
  });

  describe("Root Endpoint", () => {
    it("should return welcome message", async () => {
      const response = await app.handle(new Request("http://localhost/"));
      const text = await response.text();
      expect(text).toBe("Simplitics API");
    });
  });

  describe("Events Endpoint", () => {
    beforeEach(() => {
      events = [];
      stats = {
        pageViews: 0,
        events: {},
        activeUsers: 0
      };
    });
    it("should accept valid events", async () => {
      const event = {
        type: "pageview",
        url: "http://example.com",
        properties: { referrer: "http://google.com" }
      };

      const response = await app.handle(
        new Request("http://localhost/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event)
        })
      );

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.id).toBeDefined();
    });

    it("should reject events without type", async () => {
      const response = await app.handle(
        new Request("http://localhost/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: "http://example.com" })
        })
      );

      expect(response.status).toBe(500);
    });

    it("should list stored events", async () => {
      // Create an event first
      await app.handle(
        new Request("http://localhost/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "test", value: 123 })
        })
      );

      const response = await app.handle(new Request("http://localhost/events"));
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it("should delete events by id", async () => {
      // First create an event
      const createResponse = await app.handle(
        new Request("http://localhost/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "custom", name: "test" })
        })
      );
      const { id } = await createResponse.json();

      // Then delete it
      const deleteResponse = await app.handle(
        new Request(`http://localhost/events/${id}`, {
          method: "DELETE"
        })
      );
      const data = await deleteResponse.json();
      expect(data.success).toBe(true);

      // Verify it's gone
      const listResponse = await app.handle(new Request("http://localhost/events"));
      const events = await listResponse.json();
      expect(events.find(e => e.id === id)).toBeUndefined();
    });
  });

  describe("Stats Endpoint", () => {
    it("should track pageviews correctly", async () => {
      const initialStats = await (await app.handle(new Request("http://localhost/stats"))).json();
      const initialPageViews = initialStats.pageViews;

      await app.handle(
        new Request("http://localhost/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "pageview", url: "http://example.com" })
        })
      );

      const updatedStats = await (await app.handle(new Request("http://localhost/stats"))).json();
      expect(updatedStats.pageViews).toBe(initialPageViews + 1);
    });

    it("should aggregate events by type", async () => {
      const eventType = "custom_event";
      
      await app.handle(
        new Request("http://localhost/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: eventType, name: "test" })
        })
      );

      const stats = await (await app.handle(new Request("http://localhost/stats"))).json();
      expect(stats.events[eventType]).toBeGreaterThanOrEqual(1);
    });
  });
});
