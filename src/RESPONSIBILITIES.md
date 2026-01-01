# Responsibility Map

## Folder Structure & Responsibilities

### `/src` - Application Root
**Responsibility**: Entry point and application orchestration
**Must**: Coordinate all subsystems
**Must Never**: Contain business logic, directly access database, or bypass security layers

---

### `/src/db` - Database Infrastructure
**Responsibility**: Database connection management and schema definitions
**Must**: 
- Provide connection pooling
- Define schema with trust-first constraints
- Handle database lifecycle (init, close)
**Must Never**:
- Contain business logic
- Expose raw queries to routes
- Bypass security constraints
- Allow schema modifications that violate trust principles

#### Files:
- `connection.js`: Connection pool management only
- `init.sql`: Schema definition with constraints (one-way data flow, no super-admin)
- `migrate.js`: Schema deployment script

---

### `/src/middleware` - Request Processing Layer
**Responsibility**: Request validation, authentication, and security enforcement
**Must**:
- Validate all inputs before processing
- Enforce authentication and authorization
- Prevent unauthorized access
**Must Never**:
- Access or modify raw census data
- Bypass validation
- Create super-admin roles
- Log sensitive data

#### Files:
- `auth.js`: JWT authentication and role-based access control (NO super-admin)
- `validation.js`: Input validation schemas (rejects personal identifiers)
- `audit.js`: Audit logging middleware (moved to `/src/audit` for separation)

---

### `/src/audit` - Audit System (Separation of Powers)
**Responsibility**: Immutable audit logging, independent of operations
**Must**:
- Log all system actions immutably
- Be independent of business operations
- Provide read-only access to audit trail
**Must Never**:
- Modify or delete audit logs
- Expose raw census data
- Be bypassed by any operation
- Log sensitive personal information

#### Files:
- `logger.js`: Core audit logging functions
- `middleware.js`: Request/response audit hooks

---

### `/src/routes` - API Endpoints
**Responsibility**: HTTP endpoint definitions and request/response handling
**Must**:
- Enforce one-way data flow (submissions cannot be retrieved)
- Require proper authentication and authorization
- Return only allowed data (no raw data after submission)
- Compute aggregates without exposing raw data
**Must Never**:
- Return raw census data after submission
- Allow reverse data flow from aggregates
- Bypass authentication
- Export or download data
- Create super-admin users

#### Files:
- `auth.js`: User registration and authentication endpoints
- `submissions.js`: One-way data submission (DATA_ENTRY role)
- `aggregates.js`: Aggregate computation (ANALYST role, no raw data)
- `audit.js`: Audit log viewing (AUDITOR role, read-only)

---

### `/src/utils` - Utility Functions
**Responsibility**: Pure utility functions for security and data integrity
**Must**:
- Provide cryptographic functions (hashing)
- Validate no personal identifiers
- Sanitize inputs
**Must Never**:
- Store or log sensitive data
- Bypass security checks
- Modify data in place

#### Files:
- `security.js`: Cryptographic utilities and personal data validation

---

### `/src/scripts` - Operational Scripts
**Responsibility**: One-time setup and maintenance operations
**Must**:
- Follow same security constraints as application
- Prevent super-admin creation
- Be run in secure environments
**Must Never**:
- Be exposed as API endpoints
- Bypass security constraints
- Create super-admin users

#### Files:
- `bootstrap.js`: Initial user creation script

---

### `/src/server.js` - Application Entry Point
**Responsibility**: Server initialization, plugin registration, route mounting
**Must**:
- Register all security middleware
- Mount all routes
- Handle graceful shutdown
**Must Never**:
- Contain business logic
- Bypass security layers
- Expose debug endpoints

---

## Data Flow Principles

### One-Way Data Flow
```
Submission → Storage → Aggregates
     ↓           ↓          ↓
  Audit Log  (Encrypted)  (Computed)
```

- **Submissions**: Can be created, never retrieved in raw form
- **Aggregates**: Computed from stored data, cannot reverse to raw data
- **Audit**: Logs actions, never modifies data

### Separation of Powers
- **DATA_ENTRY**: Can submit data, cannot view aggregates or audit logs
- **ANALYST**: Can compute aggregates, cannot view raw data or audit logs
- **AUDITOR**: Can view audit logs, cannot submit data or compute aggregates
- **NO SUPER-ADMIN**: No role has all permissions

---

## Trust-First Constraints (Enforced Everywhere)

1. **No Super-Admin**: Database constraint + code checks
2. **No Raw Data Access**: Submissions return only ID and hash
3. **No Reverse Data Flow**: Aggregates cannot infer raw data
4. **No Personal Identifiers**: Validation rejects Aadhaar, phone, etc.
5. **No Exports**: No bulk data export endpoints
6. **No Inference**: Only explicit caste categories accepted
7. **Complete Auditability**: All actions logged immutably

