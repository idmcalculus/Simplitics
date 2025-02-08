import { describe, expect, it, beforeAll, afterAll, beforeEach } from "bun:test";
import { PrismaClient } from '@prisma/client';
import { app } from '../src/server';

describe("Simplitics API Endpoints", () => {
  let prisma;
  let testSite;
  let apiKey;

  beforeAll(async () => {
    prisma = new PrismaClient();

    // Create a test site
    testSite = await prisma.site.create({
      data: {
        siteId: 'api-test-site',
        name: 'API Test Site',
        domain: 'apitest.com',
        settings: JSON.stringify({ trackIP: true }),
        apiKey: 'test-api-key',
        retentionDays: 30
      }
    });

    apiKey = testSite.apiKey;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.event.deleteMany({ where: { siteId: 'api-test-site' } });
    await prisma.site.deleteMany({ where: { siteId: 'api-test-site' } });
    await prisma.$disconnect();
  });

  describe("Site Management API", () => {
    it("should create a new site", async () => {
      const response = await app.handle(
        new Request("http://localhost/sites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteId: 'new-api-site',
            name: 'New API Site',
            domain: 'newapisite.com'
          })
        })
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.site.siteId).toBe('new-api-site');

      // Clean up
      await prisma.site.delete({ where: { siteId: 'new-api-site' } });
    });

    it("should get site settings", async () => {
      const response = await app.handle(
        new Request(`http://localhost/sites/${testSite.siteId}`, {
          headers: { "X-API-Key": apiKey }
        })
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.siteId).toBe(testSite.siteId);
      expect(data.name).toBe(testSite.name);
    });

    it("should update site settings", async () => {
      const response = await app.handle(
        new Request(`http://localhost/sites/${testSite.siteId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey
          },
          body: JSON.stringify({
            name: 'Updated API Test Site',
            retentionDays: 60
          })
        })
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.site.name).toBe('Updated API Test Site');
      expect(data.site.retentionDays).toBe(60);
    });
  });

  describe("Event Tracking API", () => {
    beforeEach(async () => {
      await prisma.event.deleteMany({ where: { siteId: testSite.siteId } });
    });

    it("should track events with proper headers", async () => {
      const response = await app.handle(
        new Request("http://localhost/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Site-ID": testSite.siteId,
            "X-API-Key": apiKey,
            "User-Agent": "Test Browser",
            "X-Forwarded-For": "192.168.1.1"
          },
          body: JSON.stringify({
            type: "pageview",
            properties: { url: "https://apitest.com/page" }
          })
        })
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.event.type).toBe("pageview");
    });

    it("should reject events without required headers", async () => {
      const response = await app.handle(
        new Request("http://localhost/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "pageview",
            properties: { url: "https://apitest.com/page" }
          })
        })
      );

      expect(response.status).toBe(400);
    });

    it("should handle events with PII data", async () => {
      const response = await app.handle(
        new Request("http://localhost/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Site-ID": testSite.siteId,
            "X-API-Key": apiKey
          },
          body: JSON.stringify({
            type: "signup",
            properties: {
              email: "test@example.com",
              name: "Test User",
              userId: "12345"
            }
          })
        })
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify PII was removed
      const event = await prisma.event.findUnique({
        where: { id: data.event.id }
      });
      const properties = JSON.parse(event.properties);
      expect(properties.email).toBeUndefined();
      expect(properties.name).toBeUndefined();
      expect(properties.userId).toBeDefined();
    });
  });

  describe("Analytics API", () => {
    beforeEach(async () => {
      await prisma.event.deleteMany({ where: { siteId: testSite.siteId } });

      // Create test events
      const events = [
        {
          type: "pageview",
          properties: { url: "/home" },
          timestamp: new Date("2025-02-08T00:00:00Z")
        },
        {
          type: "pageview",
          properties: { url: "/about" },
          timestamp: new Date("2025-02-08T01:00:00Z")
        },
        {
          type: "click",
          properties: { buttonId: "signup" },
          timestamp: new Date("2025-02-08T02:00:00Z")
        }
      ];

      for (const event of events) {
        await prisma.event.create({
          data: {
            ...event,
            siteId: testSite.siteId,
            properties: JSON.stringify(event.properties)
          }
        });
      }
    });

    it("should get insights with date filtering", async () => {
      const response = await app.handle(
        new Request(
          `http://localhost/insights/${testSite.siteId}?startDate=2025-02-08T00:00:00Z&endDate=2025-02-08T03:00:00Z`,
          {
            headers: { "X-API-Key": apiKey }
          }
        )
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.pageViews).toBe(2);
      expect(data.totalEvents).toBe(3);
    });

    it("should filter insights by event type", async () => {
      const response = await app.handle(
        new Request(
          `http://localhost/insights/${testSite.siteId}?eventTypes=pageview`,
          {
            headers: { "X-API-Key": apiKey }
          }
        )
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.events.length).toBe(1);
      expect(data.events[0].type).toBe("pageview");
      expect(data.events[0].count).toBe(2);
    });
  });

  describe("GDPR Compliance API", () => {
    it("should delete user data on request", async () => {
      // First create some events
      await app.handle(
        new Request("http://localhost/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Site-ID": testSite.siteId,
            "X-API-Key": apiKey
          },
          body: JSON.stringify({
            type: "login",
            properties: { userId: "user-to-delete" }
          })
        })
      );

      // Request data deletion
      const response = await app.handle(
        new Request(
          `http://localhost/events/${testSite.siteId}?userId=user-to-delete`,
          {
            method: "DELETE",
            headers: { "X-API-Key": apiKey }
          }
        )
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify deletion
      const events = await prisma.event.findMany({
        where: {
          siteId: testSite.siteId,
          properties: { contains: "user-to-delete" }
        }
      });
      expect(events.length).toBe(0);
    });
  });
});
