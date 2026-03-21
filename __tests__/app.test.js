/**
 * Aura Platform - Basic Test Suite
 * 
 * This is a starter test file. Add more comprehensive tests
 * as the project grows.
 */

describe('Aura Platform', () => {
  describe('Environment', () => {
    test('should have Node.js version >= 18', () => {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
      expect(majorVersion).toBeGreaterThanOrEqual(18);
    });
  });

  describe('Configuration', () => {
    test('should have required dependencies defined', () => {
      const fs = require('fs');
      const path = require('path');
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
      );
      
      expect(packageJson.dependencies).toHaveProperty('express');
      expect(packageJson.dependencies).toHaveProperty('better-sqlite3');
      expect(packageJson.dependencies).toHaveProperty('bcryptjs');
      expect(packageJson.dependencies).toHaveProperty('jsonwebtoken');
    });
  });

  describe('Server Module', () => {
    test('server/index.js should be importable', () => {
      const fs = require('fs');
      const path = require('path');
      const serverPath = path.join(__dirname, '../server/index.js');
      
      expect(fs.existsSync(serverPath)).toBe(true);
    });

    test('server/db.js should be importable', () => {
      const fs = require('fs');
      const path = require('path');
      const dbPath = path.join(__dirname, '../server/db.js');
      
      expect(fs.existsSync(dbPath)).toBe(true);
    });
  });
});
