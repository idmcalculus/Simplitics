import { Database } from 'bun:sqlite';
import { PrismaClient } from '@prisma/client';

async function migrateToMongoDB() {
  // Connect to SQLite database
  const db = new Database('data/simplitics.db');

  // Initialize Prisma client
  const prisma = new PrismaClient();

  try {
    // Migrate Sites
    console.log('Migrating Sites...');
    const sites = db.query('SELECT * FROM Site').all();
    if (sites.length > 0) {
      await prisma.site.createMany({
        data: sites.map(site => ({
          id: site.id,
          siteId: site.siteId,
          name: site.name,
          domain: site.domain,
          createdAt: new Date(site.createdAt),
          updatedAt: new Date(site.updatedAt),
          settings: site.settings,
          apiKey: site.apiKey,
          retentionDays: site.retentionDays
        }))
      });
      console.log(`Migrated ${sites.length} sites`);
    }

    // Migrate Events
    console.log('Migrating Events...');
    const events = db.query('SELECT * FROM Event').all();
    if (events.length > 0) {
      await prisma.event.createMany({
        data: events.map(event => ({
          id: event.id,
          siteId: event.siteId,
          type: event.type,
          properties: event.properties,
          timestamp: new Date(event.timestamp),
          ip: event.ip,
          userAgent: event.userAgent,
          sessionId: event.sessionId,
          createdAt: new Date(event.createdAt),
          updatedAt: new Date(event.updatedAt)
        }))
      });
      console.log(`Migrated ${events.length} events`);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    db.close();
    await prisma.$disconnect();
  }
}

// Run migration
migrateToMongoDB().catch(console.error);
