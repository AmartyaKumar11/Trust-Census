# Trust Census System

A government-grade, trust-first system for sensitive caste census data in India.

## Core Principles

- **Auditability**: All actions are logged immutably
- **Privacy by Architecture**: No personal identifiers stored
- **Misuse Resistance**: One-way data flow, no raw data access
- **Strict Role Separation**: No super-admin, role-based access only

## Non-Negotiable Constraints

✅ **Enforced in Code:**
- No super-admin role
- No raw data access after submission
- No reverse data flow from aggregates
- No Aadhaar, biometrics, phone numbers, or identity linkage
- No exports, downloads, or public dashboards
- No inferred or predictive caste classification
- No debug endpoints that expose data

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Fastify
- **Database**: PostgreSQL 16+
- **Authentication**: JWT
- **Containerization**: Docker

## Architecture

### Roles

1. **DATA_ENTRY**: Can submit census data (one-way)
2. **AUDITOR**: Can view audit logs only
3. **ANALYST**: Can compute aggregates (no raw data access)

### Data Flow

```
Submission → One-way Storage → Aggregate Computation
     ↓              ↓                    ↓
  Audit Log    (Encrypted)        (Aggregates Only)
```

**Key Design:**
- Data submitted cannot be retrieved in raw form
- Aggregates are computed on-demand but cannot reverse to raw data
- All actions are logged for audit

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Docker (optional)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment file:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with secure values:
   - `DB_PASSWORD`: Strong database password
   - `JWT_SECRET`: Long random string (min 32 characters)

5. Initialize database:
   ```bash
   # Using Docker Compose (recommended)
   docker-compose up -d postgres
   
   # Or manually: run src/db/init.sql on your PostgreSQL instance
   ```

6. Run migrations (if any):
   ```bash
   npm run migrate
   ```

7. Start server:
   ```bash
   npm start
   # Or for development:
   npm run dev
   ```

### Docker Setup

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## API Endpoints

### Authentication

- `POST /auth/register` - Register new user (bootstrap)
- `POST /auth/login` - Authenticate and get JWT token
- `GET /auth/verify` - Verify token validity

### Submissions (DATA_ENTRY role)

- `POST /submissions` - Submit census data (one-way)
- `GET /submissions/:id/verify` - Verify submission integrity (hash only)

### Aggregates (ANALYST role)

- `POST /aggregates/compute` - Compute aggregate statistics
- `GET /aggregates/:id` - Retrieve stored aggregate computation

### Audit (AUDITOR role)

- `GET /audit/logs` - Retrieve audit logs with filters
- `GET /audit/logs/:id` - Get specific audit log entry

### Health

- `GET /health` - Health check (no auth required)

## Security Features

1. **JWT Authentication**: Secure token-based auth
2. **Role-Based Access Control**: Strict role enforcement
3. **Rate Limiting**: Prevents abuse
4. **Helmet**: Security headers
5. **Input Validation**: Zod schemas for all inputs
6. **Audit Logging**: Immutable action logs
7. **Data Integrity**: SHA-256 hashing for verification
8. **No Personal Data**: Explicit validation prevents storage

## Database Schema

- `users`: User accounts (no super-admin)
- `census_submissions`: One-way data storage
- `audit_logs`: Immutable audit trail
- `aggregate_computations`: Pre-computed aggregates

## Development

```bash
# Development mode with auto-reload
npm run dev

# Run migrations
npm run migrate
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong, unique secrets for `JWT_SECRET` and `DB_PASSWORD`
3. Configure proper CORS origins
4. Use HTTPS/TLS
5. Set up database backups
6. Monitor audit logs regularly
7. Review and rotate credentials periodically

## Legal Compliance

This system is designed to be legally defensible:
- No personal identifiers stored
- Complete audit trail
- No data export capabilities
- Explicit role separation
- No inference or prediction

## License

UNLICENSED - Government use only

