import { describe, expect, it, beforeAll, afterAll, beforeEach } from "bun:test";
import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../src/services/database';
import { hash } from '../src/utils/encryption';

describe("Simplitics Integration Tests", () => {
  let db;
  let prisma;
  let testSite;

  beforeAll(async () => {
    prisma = new PrismaClient();
    db = new DatabaseService();

    // Create a test site
    testSite = await db.registerSite({
      siteId: 'test-site',
      name: 'Test Site',
      domain: 'test.com',
      settings: { trackIP: true }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.event.deleteMany({ where: { siteId: 'test-site' } });
    await prisma.site.deleteMany({ where: { siteId: 'test-site' } });
    await prisma.$disconnect();
  });

  describe("Site Management", () => {
    it("should create a new site with valid data", async () => {
      const site = await db.registerSite({
        siteId: 'new-test-site',
        name: 'New Test Site',
        domain: 'newtest.com'
      });

      expect(site.siteId).toBe('new-test-site');
      expect(site.name).toBe('New Test Site');
      expect(site.apiKey).toBeDefined();

      // Clean up
      await prisma.site.delete({ where: { siteId: 'new-test-site' } });
    });

    it("should update site settings", async () => {
      const updatedSite = await prisma.site.update({
        where: { siteId: testSite.siteId },
        data: {
          settings: JSON.stringify({ trackIP: false, customSetting: 'test' }),
          retentionDays: 60
        }
      });

      expect(JSON.parse(updatedSite.settings)).toEqual({
        trackIP: false,
        customSetting: 'test'
      });
      expect(updatedSite.retentionDays).toBe(60);
    });

    it("should enforce unique site IDs", async () => {
      await expect(db.registerSite({
        siteId: testSite.siteId,
        name: 'Duplicate Site'
      })).rejects.toThrow();
    });
  });

  describe("Event Tracking", () => {
    beforeEach(async () => {
      await prisma.event.deleteMany({ where: { siteId: testSite.siteId } });
    });

    it("should store and encrypt sensitive event data", async () => {
      const ip = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';
      const sessionId = 'test-session';

      const event = await db.storeEvent({
        siteId: testSite.siteId,
        type: 'pageview',
        properties: { url: 'https://test.com' },
        ip,
        userAgent,
        sessionId
      });

      expect(event.ip).not.toBe(ip);
      expect(event.userAgent).not.toBe(userAgent);
      expect(event.sessionId).not.toBe(sessionId);
    });

    it("should handle events with PII data", async () => {
      const event = await db.storeEvent({
        siteId: testSite.siteId,
        type: 'signup',
        properties: {
          email: 'test@example.com',
          name: 'Test User',
          userId: '12345'
        }
      });

      const storedEvent = await prisma.event.findUnique({
        where: { id: event.id }
      });

      const properties = JSON.parse(storedEvent.properties);
      expect(properties.email).toBeUndefined();
      expect(properties.name).toBeUndefined();
      expect(properties.userId).toBeDefined();
    });

    it("should handle batch event processing", async () => {
      const events = await Promise.all([
        db.storeEvent({
          siteId: testSite.siteId,
          type: 'pageview',
          properties: { url: '/page1' }
        }),
        db.storeEvent({
          siteId: testSite.siteId,
          type: 'pageview',
          properties: { url: '/page2' }
        }),
        db.storeEvent({
          siteId: testSite.siteId,
          type: 'click',
          properties: { buttonId: 'submit' }
        })
      ]);

      expect(events).toHaveLength(3);

      const storedEvents = await prisma.event.findMany({
        where: { siteId: testSite.siteId }
      });
      expect(storedEvents).toHaveLength(3);
    });
  });

  describe("Analytics and Insights", () => {
    beforeEach(async () => {
      await prisma.event.deleteMany({ where: { siteId: testSite.siteId } });

      // Create test events
      await Promise.all([
        db.storeEvent({
          siteId: testSite.siteId,
          type: 'pageview',
          properties: { url: '/home' },
          timestamp: new Date('2025-02-08T00:00:00Z')
        }),
        db.storeEvent({
          siteId: testSite.siteId,
          type: 'pageview',
          properties: { url: '/about' },
          timestamp: new Date('2025-02-08T01:00:00Z')
        }),
        db.storeEvent({
          siteId: testSite.siteId,
          type: 'click',
          properties: { buttonId: 'signup' },
          timestamp: new Date('2025-02-08T02:00:00Z')
        })
      ]);
    });

    it("should get insights with date filtering", async () => {
      const insights = await db.getInsights(testSite.siteId, {
        startDate: '2025-02-08T00:00:00Z',
        endDate: '2025-02-08T03:00:00Z'
      });

      expect(insights.pageViews).toBe(2);
      expect(insights.totalEvents).toBe(3);
      expect(insights.events).toHaveLength(2); // pageview and click
    });

    it("should filter insights by event type", async () => {
      const insights = await db.getInsights(testSite.siteId, {
        eventTypes: ['pageview']
      });

      expect(insights.events).toHaveLength(1);
      expect(insights.events[0].type).toBe('pageview');
      expect(insights.events[0].count).toBe(2);
    });
  });

  describe("Data Retention and GDPR", () => {
    it("should clean up old events based on retention policy", async () => {
      // Create old and new events
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40); // 40 days old

      await Promise.all([
        db.storeEvent({
          siteId: testSite.siteId,
          type: 'old_event',
          properties: {},
          timestamp: oldDate
        }),
        db.storeEvent({
          siteId: testSite.siteId,
          type: 'new_event',
          properties: {},
          timestamp: new Date()
        })
      ]);

      // Set retention to 30 days
      await prisma.site.update({
        where: { siteId: testSite.siteId },
        data: { retentionDays: 30 }
      });

      // Run cleanup
      const deletedCount = await db.cleanupOldEvents();
      expect(deletedCount).toBeGreaterThan(0);

      // Verify old event is gone
      const events = await prisma.event.findMany({
        where: { siteId: testSite.siteId }
      });
      expect(events.every(e => e.timestamp > oldDate)).toBe(true);
    });

    it("should delete user data on request", async () => {
      const userId = 'user-to-delete';
      const hashedUserId = await hash(userId);

      // Create events with user data
      await Promise.all([
        db.storeEvent({
          siteId: testSite.siteId,
          type: 'login',
          properties: { userId: hashedUserId }
        }),
        db.storeEvent({
          siteId: testSite.siteId,
          type: 'purchase',
          properties: { userId: hashedUserId }
        })
      ]);

      // Delete user data
      await prisma.event.deleteMany({
        where: {
          siteId: testSite.siteId,
          properties: { contains: hashedUserId }
        }
      });

      // Verify deletion
      const remainingEvents = await prisma.event.findMany({
        where: {
          siteId: testSite.siteId,
          properties: { contains: hashedUserId }
        }
      });
      expect(remainingEvents).toHaveLength(0);
    });
  });
});
