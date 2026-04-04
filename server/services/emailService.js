const nodemailer = require('nodemailer');

/**
 * Email Service for Aura Platform
 * Handles appointment reminders, notifications, and marketing emails
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Try SendGrid first (recommended for production)
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.startsWith('SG.')) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
      this.isConfigured = true;
      console.log('✉️ Email service configured with SendGrid');
    }
    // Fall back to SMTP configuration
    else if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: (process.env.SMTP_PORT || 587) == 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      this.isConfigured = true;
      console.log('✉️ Email service configured with SMTP');
    }
    else {
      console.log('⚠️ Email service not configured. Set SENDGRID_API_KEY or SMTP settings to enable email notifications.');
    }
  }

  /**
   * Send an email
   * @param {Object} options - Email options
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(options) {
    if (!this.isConfigured) {
      console.log('Email not sent - service not configured');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Aura Platform'}" <${process.env.EMAIL_FROM || 'noreply@auraplatform.com'}>`,
        ...options
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✉️ Email sent to ${options.to}: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email send error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send appointment reminder
   * @param {Object} appointment - Appointment details
   * @param {Object} client - Client details
   * @returns {Promise<Object>} Send result
   */
  async sendAppointmentReminder(appointment, client) {
    const appointmentDate = new Date(appointment.startTime);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6366f1;">🏋️ Aura Platform</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
          <h2 style="color: #1f2937; margin-top: 0;">Upcoming Appointment Reminder</h2>
          
          <p style="color: #6b7280;">Hi ${client.name},</p>
          
          <p style="color: #1f2937;">This is a friendly reminder about your upcoming appointment:</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1;">
            <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>🕐 Time:</strong> ${formattedTime}</p>
            <p style="margin: 5px 0;"><strong>📋 Type:</strong> ${appointment.type || 'Session'}</p>
            ${appointment.notes ? `<p style="margin: 5px 0;"><strong>📝 Notes:</strong> ${appointment.notes}</p>` : ''}
          </div>
          
          <p style="color: #6b7280;">If you need to reschedule, please contact your trainer at least 24 hours in advance.</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
          <p>Powered by Aura Platform - Your Wellness Business Partner</p>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: client.email,
      subject: `Reminder: Upcoming ${appointment.type || 'Session'} on ${formattedDate}`,
      html
    });
  }

  /**
   * Send welcome email to new client
   * @param {Object} client - Client details
   * @param {Object} professional - Professional details
   * @returns {Promise<Object>} Send result
   */
  async sendWelcomeEmail(client, professional) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6366f1;">🏋️ Welcome to Aura Platform!</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hi ${client.name},</h2>
          
          <p style="color: #6b7280;">Welcome to ${professional.businessName || professional.name}'s wellness program! We're excited to help you achieve your fitness goals.</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #6366f1; margin-top: 0;">Getting Started</h3>
            <ul style="color: #1f2937; padding-left: 20px;">
              <li>Complete your profile and health questionnaire</li>
              <li>Schedule your initial consultation</li>
              <li>Set your fitness and wellness goals</li>
              <li>Download the Aura Platform mobile app (coming soon)</li>
            </ul>
          </div>
          
          <p style="color: #6b7280;">Your trainer will be in touch shortly to schedule your first session.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Access Your Account</a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
          <p>Powered by Aura Platform - Your Wellness Business Partner</p>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: client.email,
      subject: `Welcome to ${professional.businessName || professional.name}!`,
      html
    });
  }

  /**
   * Send progress update to client
   * @param {Object} client - Client details
   * @param {Object} progress - Progress data
   * @returns {Promise<Object>} Send result
   */
  async sendProgressUpdate(client, progress) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6366f1;">🏋️ Aura Platform</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
          <h2 style="color: #1f2937; margin-top: 0;">Great Progress, ${client.name}! 🎉</h2>
          
          <p style="color: #6b7280;">You've been making excellent progress on your wellness journey!</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #10b981; margin-top: 0;">Your Latest Stats</h3>
            ${progress.weight ? `<p style="margin: 5px 0;"><strong>Weight:</strong> ${progress.weight} kg</p>` : ''}
            ${progress.bodyFat ? `<p style="margin: 5px 0;"><strong>Body Fat:</strong> ${progress.bodyFat}%</p>` : ''}
            ${progress.measurements ? `<p style="margin: 5px 0;"><strong>Measurements:</strong> Updated</p>` : ''}
          </div>
          
          <p style="color: #6b7280;">Keep up the great work! Your dedication is paying off.</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
          <p>Powered by Aura Platform - Your Wellness Business Partner</p>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: client.email,
      subject: 'Your Progress Update - Keep Up the Great Work!',
      html
    });
  }

  /**
   * Send invoice to client
   * @param {Object} invoice - Invoice details
   * @param {Object} client - Client details
   * @param {Object} professional - Professional details
   * @returns {Promise<Object>} Send result
   */
  async sendInvoice(invoice, client, professional) {
    const items = JSON.parse(invoice.items || '[]');
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6366f1;">${professional.businessName || professional.name}</h1>
          <p style="color: #6b7280;">Invoice #${invoice.invoiceNumber}</p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div>
              <p style="margin: 0; color: #6b7280;"><strong>Bill To:</strong></p>
              <p style="margin: 5px 0; color: #1f2937;">${client.name}</p>
              <p style="margin: 0; color: #6b7280;">${client.email}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; color: #6b7280;"><strong>Due Date:</strong></p>
              <p style="margin: 5px 0; color: #1f2937;">${new Date(invoice.dueDate).toLocaleDateString()}</p>
            </div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #6366f1; color: white;">
                <th style="padding: 10px; text-align: left;">Description</th>
                <th style="padding: 10px; text-align: right;">Qty</th>
                <th style="padding: 10px; text-align: right;">Price</th>
                <th style="padding: 10px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 10px; text-align: right;"><strong>Subtotal:</strong></td>
                <td style="padding: 10px; text-align: right;">$${invoice.amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="3" style="padding: 10px; text-align: right;"><strong>Tax:</strong></td>
                <td style="padding: 10px; text-align: right;">$${invoice.tax.toFixed(2)}</td>
              </tr>
              <tr style="font-size: 18px;">
                <td colspan="3" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
                <td style="padding: 10px; text-align: right;"><strong>$${invoice.total.toFixed(2)}</strong></td>
              </tr>
            </tfoot>
          </table>
          
          <p style="color: #6b7280; font-size: 12px;">Thank you for your business!</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
          <p>Powered by Aura Platform</p>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: client.email,
      subject: `Invoice #${invoice.invoiceNumber} from ${professional.businessName || professional.name}`,
      html
    });
  }

  /**
   * Send weekly summary to professional
   * @param {Object} professional - Professional details
   * @param {Object} stats - Weekly statistics
   * @returns {Promise<Object>} Send result
   */
  async sendWeeklySummary(professional, stats) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6366f1;">🏋️ Aura Platform</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
          <h2 style="color: #1f2937; margin-top: 0;">Weekly Summary</h2>
          <p style="color: #6b7280;">Hi ${professional.name}, here's how your business performed this week:</p>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
            <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
              <p style="color: #6366f1; font-size: 24px; font-weight: bold; margin: 0;">${stats.newClients || 0}</p>
              <p style="color: #6b7280; margin: 5px 0;">New Clients</p>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
              <p style="color: #10b981; font-size: 24px; font-weight: bold; margin: 0;">${stats.appointments || 0}</p>
              <p style="color: #6b7280; margin: 5px 0;">Appointments</p>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
              <p style="color: #f59e0b; font-size: 24px; font-weight: bold; margin: 0;">$${(stats.revenue || 0).toFixed(2)}</p>
              <p style="color: #6b7280; margin: 5px 0;">Revenue</p>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
              <p style="color: #8b5cf6; font-size: 24px; font-weight: bold; margin: 0;">${stats.clientRetention || 0}%</p>
              <p style="color: #6b7280; margin: 5px 0;">Retention</p>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
          <p>Powered by Aura Platform - Your Wellness Business Partner</p>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: professional.email,
      subject: 'Your Weekly Business Summary',
      html
    });
  }
}

module.exports = new EmailService();
