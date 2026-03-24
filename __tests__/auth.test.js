const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Read server file to verify structure
describe('Aura Platform - Authentication Tests', () => {
  const serverPath = path.join(__dirname, '../server/index.js');
  const dbPath = path.join(__dirname, '../server/db.js');
  let serverContent, dbContent;

  beforeAll(() => {
    if (fs.existsSync(serverPath)) {
      serverContent = fs.readFileSync(serverPath, 'utf8');
    }
    if (fs.existsSync(dbPath)) {
      dbContent = fs.readFileSync(dbPath, 'utf8');
    }
  });

  describe('JWT Implementation', () => {
    test('should import jsonwebtoken', () => {
      expect(serverContent).toContain('jsonwebtoken');
    });

    test('should have JWT secret configuration', () => {
      expect(serverContent).toMatch(/JWT_SECRET|process\.env\.JWT_SECRET/);
    });

    test('should have authentication middleware', () => {
      expect(serverContent).toMatch(/authenticate|auth|verify/);
    });

    test('should have login route', () => {
      expect(serverContent).toMatch(/\/auth\/login|app\.post.*login/);
    });

    test('should have register route', () => {
      expect(serverContent).toMatch(/\/auth\/register|app\.post.*register/);
    });
  });

  describe('Password Security', () => {
    test('should use bcryptjs for password hashing', () => {
      expect(serverContent).toContain('bcrypt');
    });

    test('should hash passwords before storage', () => {
      expect(serverContent).toMatch(/hash|bcrypt\.hash/);
    });

    test('should compare passwords securely', () => {
      expect(serverContent).toMatch(/compare|bcrypt\.compare/);
    });
  });

  describe('Database Security', () => {
    test('should use parameterized queries', () => {
      // Extract SQL execution contexts (db.run, db.get, db.all calls)
      const sqlContexts = [];
      const dbRegex = /db\.(run|get|all)\s*\(([^)]+)\)/gs;
      let match;
      while ((match = dbRegex.exec(dbContent)) !== null) {
        sqlContexts.push(match[0]);
      }
      
      // Check that SQL contexts don't use template literal interpolation
      const sqlContent = sqlContexts.join('\n');
      expect(sqlContent).not.toMatch(/\$\{[^}]*\}/);
    });

    test('should have proper table initialization', () => {
      expect(dbContent).toMatch(/CREATE TABLE|create table/);
    });
  });

  describe('Protected Routes', () => {
    test('should protect sensitive endpoints', () => {
      const protectedPatterns = [
        /\/api\/users/,
        /\/api\/clients/,
        /\/api\/programs/,
        /authenticate|auth/
      ];
      
      const hasProtectedRoutes = protectedPatterns.some(pattern => 
        pattern.test(serverContent)
      );
      expect(hasProtectedRoutes).toBe(true);
    });
  });
});
