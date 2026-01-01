# Security Architecture

## Trust-First Design Principles

This system is built with **trust-first** principles, meaning security and privacy are not add-ons but fundamental architectural decisions.

## Non-Negotiable Constraints (Enforced in Code)

### 1. No Super-Admin Role
- **Enforcement**: Database constraint + application-level checks
- **Location**: `src/db/init.sql` (CHECK constraint), `src/middleware/auth.js` (explicit rejection)
- **Rationale**: Prevents single point of failure and abuse

### 2. No Raw Data Access After Submission
- **Enforcement**: Submission endpoints return only ID and hash, never raw data
- **Location**: `src/routes/submissions.js`
- **Rationale**: Once data is submitted, it cannot be retrieved in raw form, preventing misuse

### 3. No Reverse Data Flow from Aggregates
- **Enforcement**: Aggregates are computed on-demand, stored separately, and cannot be used to infer raw data
- **Location**: `src/routes/aggregates.js`
- **Rationale**: Mathematical impossibility of reverse engineering from sums

### 4. No Personal Identifiers
- **Enforcement**: Validation schemas explicitly reject Aadhaar, phone, biometrics, etc.
- **Location**: `src/utils/security.js` (validateNoPersonalData), `src/middleware/validation.js`
- **Rationale**: Privacy by design - cannot leak what is not stored

### 5. No Exports, Downloads, or Public Dashboards
- **Enforcement**: No endpoints for data export or public access
- **Rationale**: Prevents bulk data extraction and unauthorized access

### 6. No Inferred or Predictive Caste Classification
- **Enforcement**: Only explicit caste categories accepted (SC, ST, OBC, GENERAL, OTHER)
- **Location**: `src/middleware/validation.js` (enum validation)
- **Rationale**: Prevents algorithmic bias and discrimination

### 7. No Debug Endpoints
- **Enforcement**: Only production endpoints exist, no `/debug` or `/admin` routes
- **Rationale**: Prevents accidental data exposure

## Security Layers

### 1. Authentication & Authorization
- **JWT-based authentication** with secure token signing
- **Role-based access control** (RBAC) with explicit role checks
- **No super-admin bypass** - all roles are equal in terms of system access

### 2. Data Integrity
- **SHA-256 hashing** for all submissions and computations
- **Immutable audit logs** - append-only, cannot be modified
- **Database constraints** enforce data validity

### 3. Input Validation
- **Zod schemas** for all inputs
- **Explicit rejection** of personal identifiers
- **Type safety** and range validation

### 4. Audit Trail
- **All actions logged** with user, IP, timestamp, and metadata
- **Immutable logs** - cannot be deleted or modified
- **Complete traceability** for legal compliance

### 5. Network Security
- **Helmet.js** for security headers
- **CORS** configuration for allowed origins
- **Rate limiting** to prevent abuse
- **HTTPS/TLS** required in production (configure at reverse proxy)

### 6. Database Security
- **Connection pooling** with limits
- **Parameterized queries** to prevent SQL injection
- **Row-level security** can be added if needed
- **No raw SQL** in application code (all queries parameterized)

## Threat Model

### Mitigated Threats

1. **Unauthorized Access**
   - ✅ JWT authentication required
   - ✅ Role-based access control
   - ✅ Rate limiting

2. **Data Leakage**
   - ✅ No raw data retrieval
   - ✅ No personal identifiers stored
   - ✅ No export endpoints

3. **Data Tampering**
   - ✅ SHA-256 hashing for integrity
   - ✅ Immutable audit logs
   - ✅ Database constraints

4. **Privilege Escalation**
   - ✅ No super-admin role
   - ✅ Explicit role checks
   - ✅ No role modification endpoints

5. **Reverse Engineering**
   - ✅ One-way data flow
   - ✅ Aggregates cannot reverse to raw data
   - ✅ No debug endpoints

### Remaining Risks (Require Operational Controls)

1. **Credential Compromise**
   - **Mitigation**: Strong password policy, credential rotation, MFA (if added)

2. **Database Backup Exposure**
   - **Mitigation**: Encrypt backups, secure storage, access controls

3. **Infrastructure Compromise**
   - **Mitigation**: Network segmentation, firewall rules, intrusion detection

4. **Insider Threat**
   - **Mitigation**: Audit logs, role separation, least privilege

## Compliance & Legal Defensibility

### Auditability
- Every action is logged with complete context
- Logs are immutable and timestamped
- Can demonstrate who did what, when, and from where

### Privacy
- No personal identifiers stored
- Cannot link data to individuals
- Complies with data minimization principles

### Transparency
- Code is explicit about constraints
- No hidden functionality
- All validations are visible

### Accountability
- Role-based access ensures accountability
- Audit logs provide non-repudiation
- No anonymous actions possible

## Operational Security

### Deployment Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secret (min 32 characters, random)
- [ ] Configure CORS for specific origins only
- [ ] Enable HTTPS/TLS at reverse proxy
- [ ] Set up database backups with encryption
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Review audit logs regularly
- [ ] Rotate credentials periodically
- [ ] Keep dependencies updated

### Monitoring

- Monitor audit logs for suspicious activity
- Alert on failed login attempts
- Track rate limit violations
- Monitor database connection pool usage
- Set up health check monitoring

## Incident Response

If a security incident occurs:

1. **Immediate**: Review audit logs to identify scope
2. **Contain**: Revoke affected credentials, block IPs if needed
3. **Assess**: Determine what data (if any) was accessed
4. **Report**: Follow legal requirements for data breach reporting
5. **Remediate**: Fix vulnerabilities, update security controls

## Code Review Guidelines

When reviewing code changes, ensure:

- ✅ No super-admin role is introduced
- ✅ No raw data retrieval endpoints
- ✅ No personal identifier storage
- ✅ All actions are audited
- ✅ Input validation is present
- ✅ Role checks are enforced
- ✅ No debug endpoints added
- ✅ No export/download functionality

## Questions?

If you need to add functionality that might violate these constraints, **you must refuse** and explain why in code comments. The system's trust-first design is non-negotiable.

