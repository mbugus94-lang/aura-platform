/**
 * Calendar Service for Aura Platform
 * Handles Google Calendar integration for appointment syncing
 */

const { google } = require('googleapis');
const db = require('../db');

class CalendarService {
  constructor() {
    this.oauth2Client = null;
    this.calendar = null;
    this.isConfigured = false;
    this.initialize();
  }

  /**
   * Initialize the calendar service with OAuth2 credentials
   */
  initialize() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.log('⚠️ Calendar service not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google Calendar integration.');
      return;
    }

    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/calendar/oauth/callback'
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.isConfigured = true;
    console.log('✅ Calendar service initialized');
  }

  /**
   * Generate OAuth URL for Google Calendar authorization
   * @param {string} professionalId - Professional ID to associate with token
   * @returns {string} OAuth URL
   */
  getAuthUrl(professionalId) {
    if (!this.isConfigured) {
      throw new Error('Calendar service not configured');
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    const state = Buffer.from(JSON.stringify({ professionalId })).toString('base64');

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: state,
      include_granted_scopes: true
    });
  }

  /**
   * Exchange authorization code for tokens
   * @param {string} code - Authorization code from OAuth callback
   * @param {string} professionalId - Professional ID
   * @returns {Object} Token information
   */
  async exchangeCode(code, professionalId) {
    if (!this.isConfigured) {
      throw new Error('Calendar service not configured');
    }

    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      // Store tokens in database
      db.prepare(`
        INSERT OR REPLACE INTO professional_settings (professionalId, googleCalendarTokens, updatedAt)
        VALUES (?, ?, ?)
      `).run(professionalId, JSON.stringify(tokens), new Date().toISOString());

      console.log(`✅ Google Calendar connected for professional: ${professionalId}`);
      return tokens;
    } catch (error) {
      console.error('❌ Error exchanging OAuth code:', error.message);
      throw error;
    }
  }

  /**
   * Get stored tokens for a professional
   * @param {string} professionalId - Professional ID
   * @returns {Object|null} Tokens or null if not found
   */
  getTokens(professionalId) {
    const row = db.prepare(`
      SELECT googleCalendarTokens FROM professional_settings WHERE professionalId = ?
    `).get(professionalId);

    return row?.googleCalendarTokens ? JSON.parse(row.googleCalendarTokens) : null;
  }

  /**
   * Refresh access token if expired
   * @param {string} professionalId - Professional ID
   * @returns {boolean} Success status
   */
  async refreshToken(professionalId) {
    const tokens = this.getTokens(professionalId);
    if (!tokens?.refresh_token) return false;

    try {
      this.oauth2Client.setCredentials(tokens);
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      // Update stored tokens
      db.prepare(`
        UPDATE professional_settings 
        SET googleCalendarTokens = ?, updatedAt = ?
        WHERE professionalId = ?
      `).run(JSON.stringify(credentials), new Date().toISOString(), professionalId);

      return true;
    } catch (error) {
      console.error('❌ Error refreshing token:', error.message);
      return false;
    }
  }

  /**
   * Create a calendar event for an appointment
   * @param {Object} appointment - Appointment details
   * @param {Object} client - Client details
   * @param {Object} professional - Professional details
   * @returns {string|null} Google Calendar event ID
   */
  async createEvent(appointment, client, professional) {
    if (!this.isConfigured) {
      console.log('Calendar service not configured, skipping event creation');
      return null;
    }

    const tokens = this.getTokens(professional.id);
    if (!tokens) {
      console.log(`No Google Calendar tokens for professional: ${professional.id}`);
      return null;
    }

    try {
      // Check and refresh token if needed
      if (new Date(tokens.expiry_date) < new Date()) {
        await this.refreshToken(professional.id);
      }

      this.oauth2Client.setCredentials(this.getTokens(professional.id));

      const startTime = new Date(appointment.startTime);
      const endTime = new Date(startTime.getTime() + (appointment.duration || 60) * 60000);

      const event = {
        summary: `${appointment.type || 'Session'} with ${client.name}`,
        description: `Client: ${client.name}\nEmail: ${client.email}\nNotes: ${appointment.notes || 'No notes'}`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: process.env.TZ || 'UTC'
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: process.env.TZ || 'UTC'
        },
        attendees: [
          { email: client.email, displayName: client.name },
          { email: professional.email, displayName: professional.name }
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 30 } // 30 minutes before
          ]
        }
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all'
      });

      // Store Google Calendar event ID in appointment record
      db.prepare(`
        UPDATE appointments SET googleCalendarEventId = ? WHERE id = ?
      `).run(response.data.id, appointment.id);

      console.log(`✅ Created calendar event: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      console.error('❌ Error creating calendar event:', error.message);
      return null;
    }
  }

  /**
   * Update an existing calendar event
   * @param {Object} appointment - Updated appointment details
   * @param {Object} client - Client details
   * @param {Object} professional - Professional details
   * @returns {boolean} Success status
   */
  async updateEvent(appointment, client, professional) {
    if (!appointment.googleCalendarEventId) {
      // No existing event, create new one
      await this.createEvent(appointment, client, professional);
      return true;
    }

    const tokens = this.getTokens(professional.id);
    if (!tokens) return false;

    try {
      this.oauth2Client.setCredentials(tokens);

      const startTime = new Date(appointment.startTime);
      const endTime = new Date(startTime.getTime() + (appointment.duration || 60) * 60000);

      const event = {
        summary: `${appointment.type || 'Session'} with ${client.name}`,
        description: `Client: ${client.name}\nEmail: ${client.email}\nNotes: ${appointment.notes || 'No notes'}`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: process.env.TZ || 'UTC'
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: process.env.TZ || 'UTC'
        }
      };

      await this.calendar.events.patch({
        calendarId: 'primary',
        eventId: appointment.googleCalendarEventId,
        requestBody: event,
        sendUpdates: 'all'
      });

      console.log(`✅ Updated calendar event: ${appointment.googleCalendarEventId}`);
      return true;
    } catch (error) {
      console.error('❌ Error updating calendar event:', error.message);
      return false;
    }
  }

  /**
   * Delete a calendar event
   * @param {string} eventId - Google Calendar event ID
   * @param {string} professionalId - Professional ID
   * @returns {boolean} Success status
   */
  async deleteEvent(eventId, professionalId) {
    const tokens = this.getTokens(professionalId);
    if (!tokens) return false;

    try {
      this.oauth2Client.setCredentials(tokens);

      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all'
      });

      console.log(`✅ Deleted calendar event: ${eventId}`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting calendar event:', error.message);
      return false;
    }
  }

  /**
   * Sync all upcoming appointments to Google Calendar
   * @param {string} professionalId - Professional ID
   * @returns {Object} Sync results
   */
  async syncAllAppointments(professionalId) {
    const tokens = this.getTokens(professionalId);
    if (!tokens) {
      return { error: 'Google Calendar not connected' };
    }

    const professional = db.prepare('SELECT * FROM professionals WHERE id = ?').get(professionalId);
    if (!professional) {
      return { error: 'Professional not found' };
    }

    const appointments = db.prepare(`
      SELECT a.*, c.name as clientName, c.email as clientEmail
      FROM appointments a
      JOIN clients c ON a.clientId = c.id
      WHERE a.professionalId = ? 
      AND a.startTime >= datetime('now')
      AND a.status != 'cancelled'
    `).all(professionalId);

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      total: appointments.length
    };

    for (const appointment of appointments) {
      const client = {
        name: appointment.clientName,
        email: appointment.clientEmail
      };

      try {
        if (appointment.googleCalendarEventId) {
          await this.updateEvent(appointment, client, professional);
          results.updated++;
        } else {
          const eventId = await this.createEvent(appointment, client, professional);
          if (eventId) {
            results.created++;
          } else {
            results.failed++;
          }
        }
      } catch (error) {
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Get calendar connection status for a professional
   * @param {string} professionalId - Professional ID
   * @returns {Object} Connection status
   */
  getConnectionStatus(professionalId) {
    const tokens = this.getTokens(professionalId);
    
    return {
      connected: !!tokens,
      expiryDate: tokens?.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      hasRefreshToken: !!tokens?.refresh_token
    };
  }

  /**
   * Disconnect Google Calendar for a professional
   * @param {string} professionalId - Professional ID
   * @returns {boolean} Success status
   */
  disconnect(professionalId) {
    try {
      db.prepare(`
        UPDATE professional_settings 
        SET googleCalendarTokens = NULL, updatedAt = ?
        WHERE professionalId = ?
      `).run(new Date().toISOString(), professionalId);

      console.log(`✅ Disconnected Google Calendar for professional: ${professionalId}`);
      return true;
    } catch (error) {
      console.error('❌ Error disconnecting calendar:', error.message);
      return false;
    }
  }
}

module.exports = new CalendarService();
