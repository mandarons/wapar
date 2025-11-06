# Server Documentation

Backend API documentation for the WAPAR server application.

## Documents

### [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)
Complete local development guide:
- Quick start with `./run.sh`
- Manual setup instructions
- Production-ready SQLite configuration
- Database management and tooling
- Testing infrastructure
- Troubleshooting common issues

### [TEST_COVERAGE_REPORT.md](./TEST_COVERAGE_REPORT.md)
Test coverage metrics and documentation:
- Coverage improvements and achievements
- Unit, integration, and E2E test details
- Test infrastructure overview
- Running tests and generating coverage reports

### [ACTIVE_INSTALLATIONS.md](./ACTIVE_INSTALLATIONS.md)
Active installations tracking feature:
- `lastHeartbeatAt` field implementation
- Activity threshold configuration
- API endpoints for installation statistics
- Database schema changes

### [FORM_ENCODING_SUPPORT.md](./FORM_ENCODING_SUPPORT.md)
API request format documentation:
- JSON request format (recommended)
- Form-encoded format (legacy support)
- Endpoint examples and compatibility notes

## Quick Links

- **Main README**: [../README.md](../README.md)
- **API Source Code**: [../src/](../src/)
- **Database Schema**: [../src/db/schema.ts](../src/db/schema.ts)
- **Tests**: [../tests/](../tests/)

## Getting Started

1. Read [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) for local setup
2. See [../README.md](../README.md) for quick start commands
3. Check [TEST_COVERAGE_REPORT.md](./TEST_COVERAGE_REPORT.md) for testing info

## For Contributors

When adding new features:
- Update [ACTIVE_INSTALLATIONS.md](./ACTIVE_INSTALLATIONS.md) for analytics features
- Update [FORM_ENCODING_SUPPORT.md](./FORM_ENCODING_SUPPORT.md) for API changes
- Document environment-specific behavior in [ENVIRONMENTS.md](./ENVIRONMENTS.md)
