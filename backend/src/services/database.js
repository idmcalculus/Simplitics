import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '../utils/encryption';
import { sanitizeInput } from '../utils/sanitization';

const prisma = new PrismaClient();

export class DatabaseService {
  constructor() {
    this.prisma = prisma;
  }

  /**
   * Store an event in the database
   * @param {Object} event - Event data
   * @returns {Promise<Object>} Stored event
   */
  async storeEvent(event) {
    // Sanitize input
    const sanitizedEvent = {
      siteId: sanitizeInput(event.siteId),
      type: sanitizeInput(event.type),
      properties: JSON.stringify(
        Object.fromEntries(
          Object.entries(event.properties || {}).filter(([k]) => {
            const key = k.toLowerCase();
            return !key.includes('email') && !key.includes('phone') && 
                   !key.includes('address') && !key.includes('name');
          }).map(([k, v]) => [sanitizeInput(k), sanitizeInput(v)])
        )
      ),
      ip: event.ip ? await encrypt(event.ip) : null,
      userAgent: event.userAgent ? await encrypt(event.userAgent) : null,
      sessionId: event.sessionId ? await encrypt(event.sessionId) : null,
      timestamp: new Date(event.timestamp || Date.now())
    };

    return this.prisma.event.create({
      data: sanitizedEvent
    });
  }

  /**
   * Get aggregated insights for a site
   * @param {string} siteId - Site ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Aggregated insights
   */
  async getInsights(siteId, options = {}) {
    const { startDate, endDate, eventTypes } = options;
    const where = {
      siteId: sanitizeInput(siteId),
      timestamp: {
        gte: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lte: endDate ? new Date(endDate) : new Date()
      },
      ...(eventTypes && { type: { in: eventTypes.map(t => sanitizeInput(t)) } })
    };

    const [events, pageViews, totalEvents] = await Promise.all([
      // Get events grouped by type
      this.prisma.event.groupBy({
        by: ['type'],
        where,
        _count: true,
        orderBy: { _count: { type: 'desc' } }
      }),
      // Get total page views
      this.prisma.event.count({
        where: { ...where, type: 'pageview' }
      }),
      // Get total events
      this.prisma.event.count({ where })
    ]);

    return {
      events: events.map(e => ({
        type: e.type,
        count: e._count
      })),
      pageViews,
      totalEvents,
      period: {
        start: where.timestamp.gte,
        end: where.timestamp.lte
      }
    };
  }

  /**
   * Delete old events based on site retention policy
   * @returns {Promise<number>} Number of deleted events
   */
  async cleanupOldEvents() {
    const sites = await this.prisma.site.findMany();
    let totalDeleted = 0;

    for (const site of sites) {
      const cutoffDate = new Date(
        Date.now() - site.retentionDays * 24 * 60 * 60 * 1000
      );

      const { count } = await this.prisma.event.deleteMany({
        where: {
          siteId: site.siteId,
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      totalDeleted += count;
    }

    return totalDeleted;
  }

  /**
   * Register a new site
   * @param {Object} site - Site data
   * @returns {Promise<Object>} Created site
   */
  async registerSite(site) {
    const apiKey = await encrypt(crypto.randomUUID());
    
    return this.prisma.site.create({
      data: {
        siteId: sanitizeInput(site.siteId),
        name: sanitizeInput(site.name),
        domain: site.domain ? sanitizeInput(site.domain) : null,
        settings: JSON.stringify(site.settings || {}),
        apiKey,
        retentionDays: site.retentionDays || 30
      }
    });
  }
}
