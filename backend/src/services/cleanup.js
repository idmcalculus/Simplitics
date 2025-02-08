import { DatabaseService } from './database';

export class CleanupService {
  constructor() {
    this.db = new DatabaseService();
    this.isRunning = false;
  }

  /**
   * Start the cleanup service
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Run cleanup every day at midnight
    setInterval(async () => {
      try {
        const deletedCount = await this.db.cleanupOldEvents();
        console.log(`Cleaned up ${deletedCount} old events`);
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    }, 24 * 60 * 60 * 1000);

    // Run initial cleanup
    this.db.cleanupOldEvents().catch(error => {
      console.error('Error during initial cleanup:', error);
    });
  }

  /**
   * Stop the cleanup service
   */
  stop() {
    this.isRunning = false;
  }
}
