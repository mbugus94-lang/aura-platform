/**
 * Scheduler Service for Aura Platform
 * Handles automated email scheduling using node-cron
 */

const cron = require('node-cron');
const EmailService = require('./emailService');
const db = require('../db');

class SchedulerService {
  constructor() {
    this.scheduledJobs = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the scheduler service
   */
  initialize() {
    if (this.isInitialized) return;
    
    console.log('⏰ Initializing scheduler service...');
    
    // Schedule daily appointment reminders (9:00 AM)
    this.scheduleDailyReminders();
    
    // Schedule weekly summary emails (Monday 8:00 AM)
    this.scheduleWeeklySummaries();
    
    // Schedule progress check-ins (every 3 days at 10:00 AM)
    this.scheduleProgressCheckins();
    
    // Schedule invoice reminders (daily at 9:00 AM)
    this.scheduleInvoiceReminders();
    
    this.isInitialized = true;
    console.log('✅ Scheduler service initialized');
  }

  /**
   * Schedule daily appointment reminders
   */
  scheduleDailyReminders() {
    // Run every day at 9:00 AM
    const job = cron.schedule('0 9 * * *', async () => {
      console.log('📅 Running daily appointment reminders...');
      await this.sendAppointmentReminders();
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'UTC'
    });
    
    this.scheduledJobs.set('dailyReminders', job);
    console.log('✅ Daily reminders scheduled (9:00 AM)');
  }

  /**
   * Schedule weekly summary emails
   */
  scheduleWeeklySummaries() {
    // Run every Monday at 8:00 AM
    const job = cron.schedule('0 8 * * 1', async () => {
      console.log('📊 Running weekly summary emails...');
      await this.sendWeeklySummaries();
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'UTC'
    });
    
    this.scheduledJobs.set('weeklySummaries', job);
    console.log('✅ Weekly summaries scheduled (Monday 8:00 AM)');
  }

  /**
   * Schedule progress check-in emails
   */
  scheduleProgressCheckins() {
    // Run every 3 days at 10:00 AM
    const job = cron.schedule('0 10 */3 * *', async () => {
      console.log('📈 Running progress check-ins...');
      await this.sendProgressCheckins();
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'UTC'
    });
    
    this.scheduledJobs.set('progressCheckins', job);
    console.log('✅ Progress check-ins scheduled (every 3 days at 10:00 AM)');
  }

  /**
   * Schedule invoice reminders
   */
  scheduleInvoiceReminders() {
    // Run daily at 9:00 AM
    const job = cron.schedule('0 9 * * *', async () => {
      console.log('💰 Running invoice reminders...');
      await this.sendInvoiceReminders();
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'UTC'
    });
    
    this.scheduledJobs.set('invoiceReminders', job);
    console.log('✅ Invoice reminders scheduled (daily 9:00 AM)');
  }

  /**
   * Send appointment reminders for upcoming appointments
   */
  async sendAppointmentReminders() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);
      
      // Get appointments for tomorrow
      const appointments = db.prepare(`
        SELECT a.*, c.name as clientName, c.email as clientEmail, c.id as clientId,
               p.name as professionalName, p.email as professionalEmail, p.businessName
        FROM appointments a
        JOIN clients c ON a.clientId = c.id
        JOIN professionals p ON a.professionalId = p.id
        WHERE a.startTime >= ? AND a.startTime < ?
        AND a.status = 'scheduled'
        AND a.reminderSent = 0
      `).all(tomorrow.toISOString(), dayAfter.toISOString());

      for (const appointment of appointments) {
        const client = {
          id: appointment.clientId,
          name: appointment.clientName,
          email: appointment.clientEmail
        };
        
        const appointmentData = {
          startTime: appointment.startTime,
          type: appointment.type,
          notes: appointment.notes
        };
        
        await EmailService.sendAppointmentReminder(appointmentData, client);
        
        // Mark reminder as sent
        db.prepare('UPDATE appointments SET reminderSent = 1 WHERE id = ?').run(appointment.id);
      }
      
      console.log(`✅ Sent ${appointments.length} appointment reminders`);
    } catch (error) {
      console.error('❌ Error sending appointment reminders:', error.message);
    }
  }

  /**
   * Send weekly summary emails to professionals
   */
  async sendWeeklySummaries() {
    try {
      const professionals = db.prepare('SELECT * FROM professionals').all();
      
      for (const professional of professionals) {
        // Calculate stats for the past week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const newClients = db.prepare(`
          SELECT COUNT(*) as count FROM clients 
          WHERE professionalId = ? AND createdAt >= ?
        `).get(professional.id, weekAgo.toISOString()).count;
        
        const appointments = db.prepare(`
          SELECT COUNT(*) as count FROM appointments 
          WHERE professionalId = ? AND startTime >= ? AND startTime <= datetime('now')
        `).get(professional.id, weekAgo.toISOString()).count;
        
        const revenue = db.prepare(`
          SELECT COALESCE(SUM(total), 0) as total FROM invoices 
          WHERE professionalId = ? AND paidAt >= ? AND status = 'paid'
        `).get(professional.id, weekAgo.toISOString()).total;
        
        const totalClients = db.prepare(`
          SELECT COUNT(*) as count FROM clients WHERE professionalId = ?
        `).get(professional.id).count;
        
        const activeClients = db.prepare(`
          SELECT COUNT(DISTINCT clientId) as count FROM appointments 
          WHERE professionalId = ? AND startTime >= ?
        `).get(professional.id, weekAgo.toISOString()).count;
        
        const retentionRate = totalClients > 0 
          ? Math.round((activeClients / totalClients) * 100) 
          : 0;
        
        await EmailService.sendWeeklySummary(professional, {
          newClients,
          appointments,
          revenue,
          clientRetention: retentionRate
        });
      }
      
      console.log(`✅ Sent ${professionals.length} weekly summaries`);
    } catch (error) {
      console.error('❌ Error sending weekly summaries:', error.message);
    }
  }

  /**
   * Send progress check-in emails to clients
   */
  async sendProgressCheckins() {
    try {
      // Get clients who haven't had progress recorded in 2 weeks
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const clients = db.prepare(`
        SELECT c.*, p.name as professionalName, p.email as professionalEmail,
               MAX(pr.recordedAt) as lastProgressDate
        FROM clients c
        JOIN professionals p ON c.professionalId = p.id
        LEFT JOIN progress pr ON c.id = pr.clientId
        WHERE c.goals IS NOT NULL
        GROUP BY c.id
        HAVING lastProgressDate IS NULL OR lastProgressDate <= ?
      `).all(twoWeeksAgo.toISOString());

      for (const client of clients) {
        // Get latest progress if available
        const latestProgress = db.prepare(`
          SELECT * FROM progress WHERE clientId = ? ORDER BY recordedAt DESC LIMIT 1
        `).get(client.id);
        
        await EmailService.sendProgressUpdate(client, latestProgress || {});
      }
      
      console.log(`✅ Sent ${clients.length} progress check-ins`);
    } catch (error) {
      console.error('❌ Error sending progress check-ins:', error.message);
    }
  }

  /**
   * Send invoice reminders for overdue invoices
   */
  async sendInvoiceReminders() {
    try {
      const today = new Date().toISOString();
      
      // Get overdue invoices that haven't been reminded in 3 days
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const invoices = db.prepare(`
        SELECT i.*, c.name as clientName, c.email as clientEmail,
               p.name as professionalName, p.email as professionalEmail, p.businessName
        FROM invoices i
        JOIN clients c ON i.clientId = c.id
        JOIN professionals p ON i.professionalId = p.id
        WHERE i.dueDate < ? 
        AND i.status = 'sent'
        AND (i.lastReminder IS NULL OR i.lastReminder <= ?)
      `).all(today, threeDaysAgo.toISOString());

      for (const invoice of invoices) {
        const client = {
          name: invoice.clientName,
          email: invoice.clientEmail
        };
        
        const professional = {
          name: invoice.professionalName,
          email: invoice.professionalEmail,
          businessName: invoice.businessName
        };
        
        // Send overdue reminder
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <h3 style="color: #92400e; margin-top: 0;">⏰ Payment Reminder</h3>
              <p style="color: #78350f;">Hi ${client.name},</p>
              <p style="color: #78350f;">This is a friendly reminder that invoice <strong>#${invoice.invoiceNumber}</strong> for <strong>$${invoice.total.toFixed(2)}</strong> was due on ${new Date(invoice.dueDate).toLocaleDateString()}.</p>
              <p style="color: #78350f;">Please make payment at your earliest convenience. If you have any questions, please contact ${professional.businessName || professional.name}.</p>
            </div>
          </div>
        `;
        
        await EmailService.sendEmail({
          to: client.email,
          subject: `Reminder: Invoice #${invoice.invoiceNumber} Payment Due`,
          html
        });
        
        // Update last reminder timestamp
        db.prepare('UPDATE invoices SET lastReminder = ? WHERE id = ?')
          .run(new Date().toISOString(), invoice.id);
      }
      
      console.log(`✅ Sent ${invoices.length} invoice reminders`);
    } catch (error) {
      console.error('❌ Error sending invoice reminders:', error.message);
    }
  }

  /**
   * Schedule a custom one-time email
   * @param {string} email - Recipient email
   * @param {string} subject - Email subject
   * @param {string} html - Email HTML content
   * @param {Date} scheduledTime - When to send
   * @returns {string} Job ID
   */
  scheduleCustomEmail(email, subject, html, scheduledTime) {
    const jobId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const cronTime = `${scheduledTime.getMinutes()} ${scheduledTime.getHours()} ${scheduledTime.getDate()} ${scheduledTime.getMonth() + 1} *`;
    
    const job = cron.schedule(cronTime, async () => {
      await EmailService.sendEmail({
        to: email,
        subject,
        html
      });
      this.scheduledJobs.delete(jobId);
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'UTC'
    });
    
    this.scheduledJobs.set(jobId, job);
    console.log(`✅ Custom email scheduled: ${jobId} for ${scheduledTime.toISOString()}`);
    
    return jobId;
  }

  /**
   * Cancel a scheduled job
   * @param {string} jobId - Job ID to cancel
   * @returns {boolean} Success status
   */
  cancelJob(jobId) {
    const job = this.scheduledJobs.get(jobId);
    if (job) {
      job.stop();
      this.scheduledJobs.delete(jobId);
      console.log(`✅ Cancelled job: ${jobId}`);
      return true;
    }
    return false;
  }

  /**
   * Get all scheduled jobs
   * @returns {Array} List of job IDs
   */
  getScheduledJobs() {
    return Array.from(this.scheduledJobs.keys());
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll() {
    for (const [jobId, job] of this.scheduledJobs) {
      job.stop();
      console.log(`⏹️ Stopped job: ${jobId}`);
    }
    this.scheduledJobs.clear();
    this.isInitialized = false;
  }
}

module.exports = new SchedulerService();
