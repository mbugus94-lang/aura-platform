const fs = require('fs');
const path = require('path');

describe('Aura Platform - API Structure Tests', () => {
  const serverPath = path.join(__dirname, '../server/index.js');
  const publicPath = path.join(__dirname, '../public');
  let serverContent;

  beforeAll(() => {
    if (fs.existsSync(serverPath)) {
      serverContent = fs.readFileSync(serverPath, 'utf8');
    }
  });

  describe('Express Setup', () => {
    test('should import express', () => {
      expect(serverContent).toContain('express');
    });

    test('should use JSON middleware', () => {
      expect(serverContent).toContain('express.json');
    });

    test('should use CORS middleware', () => {
      expect(serverContent).toContain('cors');
    });

    test('should use helmet for security', () => {
      expect(serverContent).toContain('helmet');
    });
  });

  describe('API Routes', () => {
    test('should have health check endpoint', () => {
      expect(serverContent).toMatch(/\/health|app\.get.*health/);
    });

    test('should have client management routes', () => {
      expect(serverContent).toMatch(/\/api\/clients|clients/);
    });

    test('should have program routes', () => {
      expect(serverContent).toMatch(/\/api\/programs|programs/);
    });

    test('should have scheduling routes', () => {
      expect(serverContent).toMatch(/\/api\/appointments|schedule|booking/);
    });
  });

  describe('Static Files', () => {
    test('should serve static files', () => {
      expect(serverContent).toContain('express.static');
    });

    test('should have public directory', () => {
      expect(fs.existsSync(publicPath)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should have error handling middleware', () => {
      expect(serverContent).toMatch(/error|catch|next\(err\)/);
    });

    test('should handle 404 errors', () => {
      expect(serverContent).toMatch(/404|not found|NotFound/);
    });
  });

  describe('Database Integration', () => {
    test('should import database module', () => {
      expect(serverContent).toContain('./db');
    });

    test('should use sqlite3', () => {
      const dbContent = fs.readFileSync(path.join(__dirname, '../server/db.js'), 'utf8');
      expect(dbContent).toContain('sqlite3');
    });
  });
});
