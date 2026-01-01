# API Reference

## Base URL

```
http://localhost:3000
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "username": "data_entry_user",
  "password": "secure_password_123",
  "role": "DATA_ENTRY"
}
```

**Roles**: `DATA_ENTRY`, `AUDITOR`, `ANALYST` (NO `SUPER_ADMIN`)

**Response**:
```json
{
  "id": "uuid",
  "username": "data_entry_user",
  "role": "DATA_ENTRY"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "data_entry_user",
  "password": "secure_password_123"
}
```

**Response**:
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "username": "data_entry_user",
    "role": "DATA_ENTRY"
  }
}
```

#### Verify Token
```http
GET /auth/verify
Authorization: Bearer <token>
```

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "username": "data_entry_user",
    "role": "DATA_ENTRY"
  }
}
```

---

### Submissions (DATA_ENTRY role)

#### Submit Census Data
```http
POST /submissions
Authorization: Bearer <token>
Content-Type: application/json

{
  "stateCode": "KA",
  "districtCode": "1234",
  "blockCode": "123456",
  "villageCode": "1234567890",
  "householdCount": 150,
  "populationCount": 600,
  "casteCategory": "SC"
}
```

**Caste Categories**: `SC`, `ST`, `OBC`, `GENERAL`, `OTHER`

**Response** (NO raw data returned):
```json
{
  "id": "uuid",
  "submittedAt": "2024-01-01T00:00:00Z",
  "submissionHash": "sha256_hash",
  "message": "Submission recorded. Raw data is not accessible after submission."
}
```

#### Verify Submission Integrity
```http
GET /submissions/:id/verify
Authorization: Bearer <token>
```

**Response** (hash only, NO raw data):
```json
{
  "id": "uuid",
  "submittedAt": "2024-01-01T00:00:00Z",
  "submissionHash": "sha256_hash",
  "isVerified": false,
  "geographicCodes": {
    "stateCode": "KA",
    "districtCode": "1234",
    "blockCode": "123456"
  }
}
```

---

### Aggregates (ANALYST role)

#### Compute Aggregates
```http
POST /aggregates/compute
Authorization: Bearer <token>
Content-Type: application/json

{
  "geographicLevel": "district",
  "geographicCode": "1234",
  "casteCategory": "SC"
}
```

**Geographic Levels**: `state`, `district`, `block`, `village`  
**Caste Categories**: `SC`, `ST`, `OBC`, `GENERAL`, `OTHER`, `ALL`

**Response** (aggregates only, NO raw data):
```json
{
  "geographicLevel": "district",
  "geographicCode": "1234",
  "casteCategory": "SC",
  "aggregates": [
    {
      "casteCategory": "SC",
      "totalHouseholds": 500,
      "totalPopulation": 2000,
      "submissionCount": 10
    }
  ],
  "computationHash": "sha256_hash",
  "computedAt": "2024-01-01T00:00:00Z",
  "note": "These are aggregate statistics only. Raw data is not accessible."
}
```

#### Get Stored Aggregate
```http
GET /aggregates/:id
Authorization: Bearer <token>
```

**Response**:
```json
{
  "id": "uuid",
  "computationType": "POPULATION_AGGREGATE",
  "geographicLevel": "district",
  "geographicCode": "1234",
  "casteCategory": "SC",
  "aggregateValue": 2000,
  "computedAt": "2024-01-01T00:00:00Z",
  "computationHash": "sha256_hash"
}
```

---

### Audit (AUDITOR role)

#### Get Audit Logs
```http
GET /audit/logs?userId=uuid&actionType=SUBMISSION_CREATED&limit=100&offset=0
Authorization: Bearer <token>
```

**Query Parameters**:
- `userId` (optional): Filter by user ID
- `actionType` (optional): Filter by action type
- `resourceType` (optional): Filter by resource type
- `startDate` (optional): ISO 8601 datetime
- `endDate` (optional): ISO 8601 datetime
- `limit` (optional): Max 1000, default 100
- `offset` (optional): Default 0

**Response**:
```json
{
  "logs": [
    {
      "id": "uuid",
      "userId": "uuid",
      "actionType": "SUBMISSION_CREATED",
      "resourceType": "submission",
      "resourceId": "uuid",
      "ipAddress": "127.0.0.1",
      "requestMethod": "POST",
      "requestPath": "/submissions",
      "statusCode": 201,
      "metadata": {},
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 1000,
    "limit": 100,
    "offset": 0,
    "hasMore": true
  }
}
```

#### Get Specific Audit Log
```http
GET /audit/logs/:id
Authorization: Bearer <token>
```

**Response**:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "actionType": "SUBMISSION_CREATED",
  "resourceType": "submission",
  "resourceId": "uuid",
  "ipAddress": "127.0.0.1",
  "userAgent": "Mozilla/5.0...",
  "requestMethod": "POST",
  "requestPath": "/submissions",
  "statusCode": 201,
  "metadata": {},
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### Health Check

#### Health Status
```http
GET /health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": ["stateCode"],
      "message": "Expected string, received number"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid credentials"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions",
  "required": ["ANALYST"],
  "current": "DATA_ENTRY"
}
```

### 404 Not Found
```json
{
  "error": "Submission not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Important Notes

1. **No Raw Data Access**: Once data is submitted, it cannot be retrieved in raw form. Only hashes and metadata are returned.

2. **One-Way Data Flow**: Submissions → Storage → Aggregates. No reverse flow possible.

3. **No Personal Identifiers**: The system explicitly rejects and prevents storage of Aadhaar, phone numbers, biometrics, etc.

4. **Role-Based Access**: Each endpoint requires specific roles. No super-admin exists.

5. **Complete Auditability**: All actions are logged immutably for legal compliance.

6. **No Exports**: There are no endpoints to export or download data in bulk.

