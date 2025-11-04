# Server Documentation

Backend API documentation for the WAPAR Cloudflare Workers application.

## Documents

### [DEPLOYMENT.md](./DEPLOYMENT.md)
Complete deployment guide for Workers API:
- Database setup and migrations
- Deployment to Cloudflare Workers
- Drizzle ORM configuration
- Troubleshooting deployment issues

### [ENVIRONMENTS.md](./ENVIRONMENTS.md)
Environment configuration guide:
- Staging and production setup
- Frontend-backend integration
- Local development workflow
- Database migrations across environments
- Deployment workflows and diagrams
- Monitoring and debugging

### [ACTIVE_INSTALLATIONS.md](./ACTIVE_INSTALLATIONS.md)
Active installations tracking feature documentation:
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

1. Read [DEPLOYMENT.md](./DEPLOYMENT.md) for initial setup
2. Read [ENVIRONMENTS.md](./ENVIRONMENTS.md) for environment configuration
3. See [../README.md](../README.md) for quick start commands

## For Contributors

When adding new features:
- Update [ACTIVE_INSTALLATIONS.md](./ACTIVE_INSTALLATIONS.md) for analytics features
- Update [FORM_ENCODING_SUPPORT.md](./FORM_ENCODING_SUPPORT.md) for API changes
- Document environment-specific behavior in [ENVIRONMENTS.md](./ENVIRONMENTS.md)
