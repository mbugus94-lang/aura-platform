# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.5] - 2026-03-24

### Changed
- Version bump to 1.0.5 for maintenance release
- Updated devDependencies to latest stable versions:
  - prettier: ^3.3.3 → ^3.5.3

### Fixed
- **Documentation**: Fixed README version badge from 1.0.0 to 1.0.5 to match package.json
- **Documentation**: Updated health check response example to show correct version

## [1.0.4] - 2026-03-23

### Changed
- Updated dependencies to latest stable versions:
  - better-sqlite3: ^9.4.3 → ^12.8.0
  - uuid: ^11.1.0 → ^13.0.0
  - multer: ^1.4.5-lts.1 → ^2.1.1
  - jsonwebtoken: ^9.0.2 → ^9.0.3
  - express: ^4.21.2 → ^4.22.1

## [1.0.3] - 2026-03-23

### Changed
- Updated jest from ^29.7.0 to ^30.3.0
- Updated eslint from ^8.57.0 to ^10.1.0

## [1.0.2] - 2026-03-23

### Security
- **CRITICAL FIX**: Fixed authentication vulnerability where any password was accepted for existing users
- Added proper bcrypt password verification in login route
- Fixed registration to properly store hashed passwords in database
- Added password column to users table schema
- Added input validation for email and password fields

## [1.0.1] - 2026-03-22

### Security
- Updated better-sqlite3 to 12.8.0 for latest security patches

### Added
- Comprehensive test suite with Jest
- Auth tests (JWT, bcrypt, authentication middleware)
- API tests (Express setup, routes, security)
- Test coverage improved from ~30% to ~70%

### Changed
- Dependencies updated to latest stable versions

## [1.0.0] - 2026-03-21

### Added
- Initial release
- Core functionality implemented
- Basic documentation
- CI/CD workflow configuration
