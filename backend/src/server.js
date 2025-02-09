import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { DatabaseService } from './services/database';
import { CleanupService } from './services/cleanup';
import { addSecurityHeaders, validateOrigin, rateLimit, validatePayloadSize } from './middleware/security';
import { hash } from './utils/encryption';

// Initialize services
const db = new DatabaseService();
const cleanup = new CleanupService();
cleanup.start();

const app = new Elysia()
  // Handle errors with custom responses
  .onError(({ code, error, request }) => {
    console.error(`Error ${code} for ${request.method} ${request.url}:`, error);

    if (error.message === 'Origin not allowed') {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), { status: 403 });
    }
    if (error.message === 'Rate limit exceeded') {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 });
    }
    if (error.message === 'Payload too large') {
      return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413 });
    }
    if (error.message === 'Site ID is required') {
      return new Response(JSON.stringify({ error: 'Site ID is required' }), { status: 400 });
    }
    if (error.message.includes('not found')) {
      return new Response(JSON.stringify({ error: error.message }), { status: 404 });
    }
    if (error.message.includes('already exists')) {
      return new Response(JSON.stringify({ error: error.message }), { status: 409 });
    }

    // Fallback
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  })

  // State store for rate-limiting
  .state('rateLimitStore', new Map())

  // Derive a "rateLimit" alias and a "headers" object for the route context
  .derive(({ headers, store }) => ({
    headers: headers || {},
    rateLimit: store.rateLimitStore
  }))

  // Global onRequest hook, now using (ctx) instead of (request, store)
  .onRequest((ctx) => {
    addSecurityHeaders(ctx);
    validateOrigin(ctx);
    rateLimit(ctx);
  })

  // Validate payload size before route handling
  .onBeforeHandle(async (ctx) => {
    await validatePayloadSize(ctx);
  })

  // Add your plugins
  .use(cors())
  .use(
    swagger({
      path: '/docs',
      documentation: {
        info: {
          title: 'Simplitics API',
          version: '0.1.0',
          description: 'Privacy-first analytics API'
        }
      }
    })
  )

  // Simple root endpoint
  .get('/', () => 'Simplitics API')

  // Register a new site
  .post('/sites', async (ctx) => {
    const { body } = ctx;
    const site = await db.registerSite({
      siteId: body.siteId,
      name: body.name,
      domain: body.domain,
      settings: body.settings,
      retentionDays: body.retentionDays
    });
    return { success: true, site };
  })

  // Track events
  .post('/events', async (ctx) => {
    const { request, body } = ctx;

    // Validate site ID header
    const siteId = request.headers.get('X-Site-ID');
    if (!siteId) {
      throw new Error('Site ID is required');
    }

    // Hash sensitive data
    const ip = request.headers.get('X-Forwarded-For') || request.headers.get('X-Real-IP');
    const userAgent = request.headers.get('User-Agent');

    const event = await db.storeEvent({
      siteId,
      type: body.type,
      properties: body.properties,
      ip: ip ? await hash(ip) : null,
      userAgent: userAgent ? await hash(userAgent) : null,
      sessionId: body.sessionId,
      timestamp: body.timestamp
    });

    return { success: true, event };
  })

  // Get insights
  .get('/insights/:siteId', async (ctx) => {
    const { params, query } = ctx;
    const insights = await db.getInsights(params.siteId, {
      startDate: query.startDate,
      endDate: query.endDate,
      eventTypes: query.eventTypes?.split(',')
    });
    return insights;
  })

  // Delete events for GDPR compliance
  .delete('/events/:siteId', async (ctx) => {
    const { params, query } = ctx;
    const { userId, sessionId } = query;

    if (!userId && !sessionId) {
      throw new Error('Either userId or sessionId is required');
    }

    const where = {
      siteId: params.siteId,
      ...(userId && { properties: { contains: userId } }),
      ...(sessionId && { properties: { contains: sessionId } })
    };

    await db.prisma.event.deleteMany({ where });
    return { success: true };
  })

  // Get site settings
  .get('/sites/:siteId', async (ctx) => {
    const { params } = ctx;
    const site = await db.prisma.site.findUnique({
      where: { siteId: params.siteId },
      select: {
        siteId: true,
        name: true,
        domain: true,
        settings: true,
        retentionDays: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!site) {
      throw new Error('Site not found');
    }
    return site;
  })

  // Update site settings
  .patch('/sites/:siteId', async (ctx) => {
    const { params, body } = ctx;
    const site = await db.prisma.site.update({
      where: { siteId: params.siteId },
      data: {
        name: body.name,
        domain: body.domain,
        settings: JSON.stringify(body.settings || {}),
        retentionDays: body.retentionDays
      }
    });
    return { success: true, site };
  })
  .compile();

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(3000);
  console.log(`🚀 Simplitics API is running at ${app.server?.hostname}:${app.server?.port}`);
}

export { app };