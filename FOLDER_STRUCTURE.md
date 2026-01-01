# Trust Census - Folder Structure & Responsibilities

## Final Folder Tree

```
Trust-Census/
├── src/
│   ├── RESPONSIBILITIES.md          # Detailed responsibility map
│   ├── server.js                    # Application entry point
│   │
│   ├── db/                          # Database Infrastructure
│   │   ├── connection.js           # Connection pool management
│   │   ├── init.sql                # Schema with trust-first constraints
│   │   └── migrate.js              # Schema deployment script
│   │
│   ├── middleware/                 # Request Processing Layer
│   │   ├── auth.js                 # JWT auth & RBAC (no super-admin)
│   │   └── validation.js           # Input validation schemas
│   │
│   ├── audit/                       # Audit System (Separation of Powers)
│   │   ├── logger.js               # Core audit logging functions
│   │   └── middleware.js           # Request/response audit hooks
│   │
│   ├── routes/                      # API Endpoints
│   │   ├── auth.js                 # User registration & login
│   │   ├── submissions.js          # One-way data submission
│   │   ├── aggregates.js           # Aggregate computation
│   │   └── audit.js                # Audit log viewing (read-only)
│   │
│   ├── utils/                       # Utility Functions
│   │   └── security.js             # Cryptographic & validation utils
│   │
│   └── scripts/                     # Operational Scripts
│       └── bootstrap.js            # Initial user creation
│
├── package.json
├── Dockerfile
├── docker-compose.yml
├── README.md
├── SECURITY.md
├── API.md
└── .gitignore
```

---

## Responsibility Summary by Folder

### `/src` - Application Root
**Purpose**: Entry point and application orchestration  
**Key Files**: `server.js`  
**Separation Principle**: Coordinates subsystems without containing business logic

---

### `/src/db` - Database Infrastructure
**Purpose**: Database connection management and schema definitions  
**Key Files**: 
- `connection.js` - Connection pooling
- `init.sql` - Schema with trust-first constraints
- `migrate.js` - Schema deployment

**Responsibilities**:
- ✅ Provide connection pooling
- ✅ Define schema with one-way data flow
- ✅ Enforce database-level constraints (no super-admin)
- ❌ Must never contain business logic
- ❌ Must never bypass security constraints

**Trust-First Constraints**:
- Database CHECK constraint prevents super-admin
- Schema enforces one-way data flow
- Audit logs are append-only

---

### `/src/middleware` - Request Processing Layer
**Purpose**: Request validation, authentication, and security enforcement  
**Key Files**:
- `auth.js` - JWT authentication & RBAC
- `validation.js` - Input validation schemas

**Responsibilities**:
- ✅ Validate all inputs before processing
- ✅ Enforce authentication and authorization
- ✅ Prevent unauthorized access
- ✅ Explicitly reject super-admin role
- ❌ Must never bypass validation
- ❌ Must never log sensitive data
- ❌ Must never allow role escalation

**Trust-First Constraints**:
- Explicit super-admin rejection in code
- Validation rejects personal identifiers
- Only explicit caste categories accepted

---

### `/src/audit` - Audit System (Separation of Powers)
**Purpose**: Immutable audit logging, independent of operations  
**Key Files**:
- `logger.js` - Core audit logging functions
- `middleware.js` - Automatic request/response logging

**Responsibilities**:
- ✅ Log all system actions immutably
- ✅ Be independent of business operations
- ✅ Provide complete audit trail
- ❌ Must never modify or delete audit logs
- ❌ Must never expose raw census data
- ❌ Must never be bypassed

**Separation of Powers**:
- Audit system is separate from operations
- AUDITOR role can only view logs (read-only)
- Cannot be bypassed by any operation

---

### `/src/routes` - API Endpoints
**Purpose**: HTTP endpoint definitions and request/response handling  
**Key Files**:
- `auth.js` - User registration & authentication
- `submissions.js` - One-way data submission (DATA_ENTRY)
- `aggregates.js` - Aggregate computation (ANALYST)
- `audit.js` - Audit log viewing (AUDITOR)

**Responsibilities**:
- ✅ Enforce one-way data flow
- ✅ Require proper authentication and authorization
- ✅ Return only allowed data (no raw data after submission)
- ✅ Compute aggregates without exposing raw data
- ❌ Must never return raw census data after submission
- ❌ Must never allow reverse data flow
- ❌ Must never export or download data

**One-Way Data Flow**:
```
Submission → Storage → Aggregates
     ↓           ↓          ↓
  Audit Log  (Encrypted)  (Computed)
```

**Role Separation**:
- DATA_ENTRY: Submit data only
- ANALYST: Compute aggregates only
- AUDITOR: View audit logs only
- NO SUPER-ADMIN: No role has all permissions

---

### `/src/utils` - Utility Functions
**Purpose**: Pure utility functions for security and data integrity  
**Key Files**: `security.js`

**Responsibilities**:
- ✅ Provide cryptographic functions (hashing)
- ✅ Validate no personal identifiers
- ✅ Sanitize inputs
- ❌ Must never store or log sensitive data
- ❌ Must never bypass security checks

**Trust-First Constraints**:
- SHA-256 hashing for data integrity
- Explicit personal identifier validation
- Input sanitization

---

### `/src/scripts` - Operational Scripts
**Purpose**: One-time setup and maintenance operations  
**Key Files**: `bootstrap.js`

**Responsibilities**:
- ✅ Create initial users securely
- ✅ Follow same security constraints as application
- ✅ Prevent super-admin creation
- ❌ Must never be exposed as API endpoints
- ❌ Must never bypass security constraints

---

## Data Flow Architecture

### One-Way Data Flow
1. **Submission** (`/routes/submissions.js`)
   - Data enters system
   - Stored with one-way encryption/anonymization
   - Returns only ID and hash
   - **Cannot be retrieved in raw form**

2. **Storage** (`/db/init.sql`)
   - Data stored in `census_submissions` table
   - No retrieval endpoints exist
   - Integrity hashes stored

3. **Aggregation** (`/routes/aggregates.js`)
   - Computes statistics from stored data
   - Returns only aggregates
   - **Cannot reverse to raw data**

4. **Audit** (`/audit/`)
   - Logs all actions immutably
   - Independent of operations
   - Read-only access for AUDITOR role

---

## Separation of Powers

### Role-Based Access Control
- **DATA_ENTRY**: Can submit data, cannot view aggregates or audit logs
- **ANALYST**: Can compute aggregates, cannot view raw data or audit logs
- **AUDITOR**: Can view audit logs, cannot submit data or compute aggregates
- **NO SUPER-ADMIN**: No role has all permissions

### System Independence
- **Audit System**: Independent of operations (separate folder)
- **Security Layer**: Independent of business logic
- **Database Layer**: Independent of application logic

---

## Trust-First Constraints (Enforced Everywhere)

1. ✅ **No Super-Admin**: Database constraint + code checks
2. ✅ **No Raw Data Access**: Submissions return only ID and hash
3. ✅ **No Reverse Data Flow**: Aggregates cannot infer raw data
4. ✅ **No Personal Identifiers**: Validation rejects Aadhaar, phone, etc.
5. ✅ **No Exports**: No bulk data export endpoints
6. ✅ **No Inference**: Only explicit caste categories accepted
7. ✅ **Complete Auditability**: All actions logged immutably

---

## File Movement Summary

### Moved Files
- `src/middleware/audit.js` → `src/audit/` (split into `logger.js` and `middleware.js`)
  - **Reason**: Separation of powers - audit system should be independent of middleware

### No Other Files Moved
- Current structure already aligns with trust-first principles
- Clear separation of concerns exists
- One-way data flow is properly enforced

---

## Notes for Future Development

1. **Business Logic Extraction**: If business logic grows, consider `/src/core/` for domain logic
2. **Configuration**: If configuration grows, consider `/src/config/` for environment-specific configs
3. **Tests**: Add `/src/__tests__/` mirroring the structure
4. **Types**: If TypeScript is adopted, add type definitions in `/src/types/`

All future changes must maintain:
- Separation of powers
- One-way data flow
- Complete auditability
- No super-admin role
- No personal identifiers

