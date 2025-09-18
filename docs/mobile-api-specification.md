# Mobile API v1 Specification
## منصة بناء اليمن الرقمية - مواصفات الواجهة البرمجية للتطبيق المحمول

### 📋 Overview / نظرة عامة

هذه المواصفات تحدد Restful API كاملة للتطبيق المحمول "بنّاء المساحي" للتكامل مع منصة بناء اليمن الرقمية. تدعم المواصفات المزامنة التدريجية، الأمان الشامل، والتحكم في الوصول الجغرافي (LBAC).

---

## 🔐 Authentication / المصادقة

### Mobile Login / تسجيل الدخول المحمول
```http
POST /api/mobile/v1/auth/login
Content-Type: application/json

Request Body:
{
  "username": "string",
  "password": "string",
  "deviceInfo": {
    "deviceId": "string", // Unique device identifier
    "deviceName": "string", // Human-readable device name
    "deviceModel": "string", // Device model (optional)
    "osVersion": "string", // OS version (optional)
    "appVersion": "string" // Mobile app version (optional)
  }
}

Response 200:
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string",
    "expiresIn": 3600, // seconds
    "user": {
      "id": "uuid",
      "username": "string",
      "fullName": "string",
      "role": "string",
      "department": "string",
      "geographicAssignments": [
        {
          "governorateId": "uuid",
          "districtId": "uuid", // optional
          "subDistrictId": "uuid", // optional
          "neighborhoodId": "uuid" // optional
        }
      ]
    },
    "device": {
      "deviceRegistrationId": "uuid",
      "status": "active"
    }
  }
}
```

### Device Registration / تسجيل الجهاز
```http
POST /api/mobile/v1/auth/register-device
Content-Type: application/json
Authorization: Bearer {user_jwt_token}

Request Body:
{
  "deviceId": "string", // Unique device identifier
  "deviceName": "string", // Human-readable device name
  "deviceModel": "string", // Device model (optional)
  "osVersion": "string", // OS version (optional)
  "appVersion": "string" // Mobile app version (optional)
}

Response 201:
{
  "success": true,
  "data": {
    "deviceRegistrationId": "uuid",
    "refreshToken": "string", // Hashed on server side
    "accessToken": "string",
    "expiresIn": 3600, // seconds
    "deviceStatus": "active"
  }
}
```

### Token Refresh / تجديد الرمز المميز
```http
POST /api/mobile/v1/auth/refresh
Content-Type: application/json
X-Device-ID: {device_id}

# SECURITY: Server MUST verify token is bound to this device

Request Body:
{
  "refreshToken": "string"
}

Response 200:
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string", // New refresh token (rotation)
    "expiresIn": 3600
  }
}
```

### Logout / تسجيل الخروج
```http
POST /api/mobile/v1/auth/logout
Authorization: Bearer {access_token}
X-Device-ID: {device_id}

Response 200:
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Revoke Device / إلغاء الجهاز
```http
POST /api/mobile/v1/auth/revoke-device
Authorization: Bearer {access_token}
X-Device-ID: {device_id}

Response 200:
{
  "success": true,
  "message": "Device revoked successfully"
}
```

---

## 📱 Core Mobile Endpoints / نقاط النهاية الأساسية

### 1. Get Assigned Tasks / الحصول على المهام المكلفة

```http
GET /api/mobile/v1/tasks
Authorization: Bearer {access_token}
X-Device-ID: {device_id}
API-Version: 1.0

# SECURITY: Surveyor ID derived from access token, NOT from URL parameter
# LBAC: Tasks filtered by user's geographic assignments automatically

Query Parameters:
- status: string[] (optional) - Filter by task status
- assignedAfter: string (optional) - ISO date filter
- limit: integer (default: 20, max: 100)
- cursor: string (optional) - Pagination cursor

Response 200:
{
  "success": true,
  "data": {
    "tasks": [
      {
        "applicationId": "uuid",
        "applicationNumber": "string",
        "applicantName": "string",
        "applicantPhone": "string",
        "serviceType": "building_permit|surveying_decision",
        "priority": "low|medium|high|urgent",
        "assignedAt": "ISO_date",
        "dueDate": "ISO_date",
        "estimatedDuration": "integer", // minutes
        "location": {
          "governorate": "string",
          "district": "string", 
          "subDistrict": "string",
          "neighborhood": "string",
          "plotNumber": "string"
        },
        "coordinates": {
          "lat": "decimal",
          "lng": "decimal",
          "accuracy": "decimal"
        },
        "attachments": [
          {
            "id": "uuid",
            "filename": "string",
            "fileType": "string",
            "downloadUrl": "string"
          }
        ],
        "instructions": "string",
        "requirements": ["string"],
        "status": "assigned|in_progress|completed|submitted",
        "lastUpdated": "ISO_date"
      }
    ],
    "pagination": {
      "hasMore": "boolean",
      "nextCursor": "string",
      "totalCount": "integer"
    },
    "syncMetadata": {
      "serverTimestamp": "ISO_date",
      "syncCursor": "string"
    }
  }
}
```

### 2. Create Survey Session / إنشاء جلسة مسح

```http
POST /api/mobile/v1/sessions
Authorization: Bearer {access_token}
X-Device-ID: {device_id}
X-Idempotency-Key: {unique_key}

Request Body:
{
  "applicationId": "uuid",
  "surveyType": "building_permit|surveying_decision|cadastral_survey",
  "startLocation": {
    "lat": "decimal", // WGS84 latitude
    "lng": "decimal", // WGS84 longitude  
    "accuracy": "decimal", // meters
    "timestamp": "ISO_date"
  },
  "weatherConditions": "string", // optional
  "notes": "string", // optional
  "clientMetadata": {
    "appVersion": "string",
    "deviceModel": "string",
    "batteryLevel": "integer"
  }
}

Response 201:
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "sessionNumber": "string", // Human-readable ID
    "status": "draft",
    "startTime": "ISO_date",
    "syncCursor": "string"
  }
}

Error Responses:
400 - Validation error / LBAC violation
409 - Session already exists (idempotency)
429 - Rate limit exceeded
```

### 3. Submit Survey Session / إرسال جلسة المسح

```http
PUT /api/mobile/v1/sessions/{sessionId}/submit
Authorization: Bearer {access_token}
X-Device-ID: {device_id}
X-Idempotency-Key: {unique_key}

Request Body:
{
  "endLocation": {
    "lat": "decimal",
    "lng": "decimal",
    "accuracy": "decimal",
    "timestamp": "ISO_date"
  },
  "qualityScore": "decimal", // 0-100
  "notes": "string",
  "pointsCount": "integer",
  "geometriesCount": "integer",
  "attachmentsCount": "integer"
}

Response 200:
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "status": "submitted",
    "submittedAt": "ISO_date",
    "syncCursor": "string"
  }
}
```

---

## 📍 Survey Data Endpoints / نقاط البيانات المساحية

### 1. Upload Survey Points / رفع النقاط المساحية

```http
POST /api/mobile/v1/sessions/{sessionId}/points/batch
Authorization: Bearer {access_token}
X-Device-ID: {device_id}
X-Idempotency-Key: {unique_key}

Request Body:
{
  "points": [
    {
      "idempotencyKey": "string", // Per-point idempotency
      "pointNumber": "integer",
      "latitude": "decimal", // WGS84 (EPSG:4326)
      "longitude": "decimal", // WGS84 (EPSG:4326)
      "elevation": "decimal", // optional, meters
      "horizontalAccuracy": "decimal", // meters
      "verticalAccuracy": "decimal", // meters, optional
      "gpsSource": "device|external_receiver|manual",
      "pointType": "corner|boundary|reference|building|utility",
      "featureCode": "string", // optional
      "description": "string", // optional
      "capturedAt": "ISO_date",
      "qualityFlags": ["string"], // Array of quality issues
      "isVerified": "boolean"
    }
  ]
}

Response 201:
{
  "success": true,
  "data": {
    "uploadedCount": "integer",
    "skippedCount": "integer", // Due to idempotency
    "results": [
      {
        "idempotencyKey": "string", // Echo client key
        "pointNumber": "integer", // Echo client number
        "status": "created|updated|skipped|error",
        "serverId": "uuid", // New server-generated ID
        "serverVersion": "integer", // For sync
        "error": {
          "message": "string",
          "code": "VALIDATION_ERROR|DUPLICATE|LBAC_VIOLATION"
        } // Only if status = error
      }
    ],
    "syncCursor": "string"
  }
}
```

### 2. Upload Survey Geometries / رفع الأشكال الهندسية

```http
POST /api/mobile/v1/sessions/{sessionId}/geometries/batch
Authorization: Bearer {access_token}
X-Device-ID: {device_id}
X-Idempotency-Key: {unique_key}

Request Body:
{
  "geometries": [
    {
      "idempotencyKey": "string",
      "geometryNumber": "integer",
      "geometryType": "Point|LineString|Polygon|MultiPolygon",
      "coordinates": "GeoJSON_coordinates", // Must be WGS84
      "properties": "object", // GeoJSON properties
      "featureType": "building|boundary|road|utility|structure",
      "featureCode": "string",
      "description": "string",
      "area": "decimal", // square meters (for polygons)
      "perimeter": "decimal", // meters (for polygons)
      "length": "decimal", // meters (for lines)
      "isComplete": "boolean",
      "isClosed": "boolean", // for polygons
      "qualityScore": "decimal",
      "validationFlags": ["string"],
      "startedAt": "ISO_date",
      "completedAt": "ISO_date" // optional if not complete
    }
  ]
}

Response 201:
{
  "success": true,
  "data": {
    "uploadedCount": "integer",
    "skippedCount": "integer",
    "results": [
      {
        "idempotencyKey": "string", // Echo client key
        "geometryNumber": "integer", // Echo client number
        "status": "created|updated|skipped|error",
        "serverId": "uuid", // New server-generated ID for attachment linking
        "serverVersion": "integer", // For sync
        "error": {
          "message": "string",
          "code": "VALIDATION_ERROR|INVALID_GEOJSON|LBAC_VIOLATION"
        } // Only if status = error
      }
    ],
    "syncCursor": "string"
  }
}
```

---

## 📎 Attachment Management / إدارة المرفقات

### 1. Request Upload URLs / طلب روابط الرفع

```http
POST /api/mobile/v1/sessions/{sessionId}/attachments/upload-urls
Authorization: Bearer {access_token}
X-Device-ID: {device_id}

Request Body:
{
  "attachments": [
    {
      "filename": "string",
      "fileType": "image/jpeg|image/png|image/heic|video/mp4|application/pdf",
      "fileSize": "integer", // bytes
      "attachmentType": "photo|video|document|signature",
      "relatedPointId": "uuid", // optional
      "relatedGeometryId": "uuid", // optional
      "captureLocation": {
        "lat": "decimal",
        "lng": "decimal",
        "accuracy": "decimal"
      },
      "capturedAt": "ISO_date",
      "metadata": {
        "cameraDirection": "decimal", // compass degrees
        "deviceOrientation": "portrait|landscape",
        "compressionQuality": "decimal"
      }
    }
  ]
}

Response 200:
{
  "success": true,
  "data": {
    "uploadUrls": [
      {
        "attachmentId": "uuid",
        "uploadUrl": "string", // Pre-signed URL
        "expiresAt": "ISO_date",
        "maxFileSize": "integer",
        "requiredHeaders": {
          "Content-Type": "string"
        }
      }
    ]
  }
}
```

### 2. Confirm Upload / تأكيد الرفع

```http
POST /api/mobile/v1/attachments/{attachmentId}/confirm
Authorization: Bearer {access_token}
X-Device-ID: {device_id}

Request Body:
{
  "uploadSuccess": "boolean",
  "fileSize": "integer", // actual uploaded size
  "checksumSha256": "string" // SHA-256 file checksum for integrity
}

Response 200:
{
  "success": true,
  "data": {
    "attachmentId": "uuid",
    "status": "uploaded|processing|available|failed",
    "downloadUrl": "string", // Available after processing
    "thumbnailUrl": "string" // For images
  }
}
```

---

## 🔄 Delta Sync System / نظام المزامنة التدريجية

### 1. Get Sync Changes / الحصول على التغييرات

```http
GET /api/mobile/v1/sync/changes
Authorization: Bearer {access_token}
X-Device-ID: {device_id}

Query Parameters:
- entity: string[] - Entity types to sync (sessions|points|geometries|attachments)
- cursor: string - Last sync cursor (optional)
- limit: integer (default: 50, max: 200)
# READ-ONLY downward sync from server to client only

Response 200:
{
  "success": true,
  "data": {
    "changes": [
      {
        "entity": "session|point|geometry|attachment",
        "entityId": "uuid",
        "operation": "created|updated|deleted",
        "data": "object", // Full entity data or tombstone
        "version": "integer",
        "timestamp": "ISO_date",
        "changeId": "uuid"
      }
    ],
    "pagination": {
      "hasMore": "boolean",
      "nextCursor": "string"
    },
    "syncMetadata": {
      "serverTimestamp": "ISO_date",
      "syncCursor": "string",
      "conflictsCount": "integer"
    }
  }
}
```

### 2. Apply Local Changes / تطبيق التغييرات المحلية

```http
POST /api/mobile/v1/sync/apply
Authorization: Bearer {access_token}
X-Device-ID: {device_id}
X-Idempotency-Key: {unique_key}

Request Body:
{
  "changes": [
    {
      "entity": "session|point|geometry|attachment",
      "entityId": "uuid",
      "operation": "created|updated|deleted",
      "data": "object",
      "clientVersion": "integer",
      "clientTimestamp": "ISO_date",
      "idempotencyKey": "string"
    }
  ],
  "syncCursor": "string" // Client's last known cursor
}

Response 200:
{
  "success": true,
  "data": {
    "accepted": [
      {
        "changeId": "uuid",
        "serverVersion": "integer",
        "serverTimestamp": "ISO_date"
      }
    ],
    "conflicts": [
      {
        "changeId": "uuid",
        "reason": "version_conflict|lbac_violation|validation_error",
        "serverVersion": "integer",
        "serverData": "object" // Current server state
      }
    ],
    "syncCursor": "string" // Updated cursor
  }
}
```

---

## 🔄 Idempotency Policy / سياسة عدم التكرار

### Key Scope / نطاق المفتاح
Idempotency keys are scoped by: `{method}+{path}+{device_id}+{idempotency_key}`

Examples:
- `POST+/api/mobile/v1/sessions+device123+key456`
- `POST+/api/mobile/v1/sessions/abc/points/batch+device123+key789`

### TTL and Retention / مدة الاحتفاظ
- Idempotency keys expire after **72 hours**
- Server maintains deduplication store for safe retries
- Keys auto-expire from store after TTL

### Payload Mismatch Behavior / سلوك عدم التطابق
If same idempotency key used with different payload:
```json
HTTP 409 Conflict
{
  "success": false,
  "error": {
    "code": "IDEMPOTENCY_CONFLICT",
    "message": "Request with this idempotency key has different payload",
    "originalResponse": {
      "status": 201,
      "data": "..." // Reference to original successful response
    }
  }
}
```

### Batch Operations / العمليات المجمعة
- **Envelope Key**: X-Idempotency-Key header for entire batch request
- **Per-Item Keys**: Individual idempotencyKey fields within batch items
- Both must be unique within their respective scopes
- Envelope key prevents duplicate batch; per-item keys prevent duplicate items

---

## 🔄 Delta Sync & Cursor Semantics / دلالات المزامنة والمؤشرات

### Cursor Properties / خصائص المؤشر
- **Format**: Opaque base64-encoded string (client must not parse)
- **Ordering**: Monotonically increasing (newer cursors > older cursors)
- **Scope**: Per-device cursors (each device has independent position)
- **Monotonicity**: Based on server timestamp + sequence ID

### Sync Guarantees / ضمانات المزامنة
- **At-least-once delivery**: Changes may be delivered multiple times
- **Ordering**: Changes delivered in server timestamp order
- **Replay Window**: 30 days of change history available
- **Idempotent**: Safe to replay same cursor multiple times

### Tombstone Format / تنسيق علامات الحذف
```json
{
  "entity": "session|point|geometry|attachment",
  "entityId": "uuid",
  "operation": "deleted",
  "data": {
    "id": "uuid",
    "deletedAt": "ISO_date",
    "deletedBy": "uuid" // user who deleted
  },
  "version": "integer",
  "timestamp": "ISO_date"
}
```

### Tombstone TTL / انتهاء صلاحية علامات الحذف
- Tombstones retained for **90 days**
- After TTL, tombstones removed from sync feed
- Clients must handle missing tombstones gracefully

### Server Version / إصدار الخادم
- Global monotonic counter across all entities
- Used for conflict resolution (higher version wins)
- Incremented on every data change operation

---

## 📊 API Standards / معايير الواجهة البرمجية

### Error Response Format / تنسيق استجابة الخطأ

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "object", // Optional additional details
    "timestamp": "ISO_date",
    "requestId": "uuid", // For correlation
    "validationErrors": [ // For 400 errors
      {
        "field": "fieldName",
        "message": "Validation error message",
        "code": "VALIDATION_CODE"
      }
    ]
  }
}
```

### Standard Error Codes / رموز الخطأ المعيارية

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | Missing or invalid token |
| `DEVICE_NOT_REGISTERED` | 401 | Device not registered |
| `TOKEN_EXPIRED` | 401 | Access token expired |
| `REFRESH_TOKEN_INVALID` | 401 | Refresh token invalid/expired |
| `PERMISSION_DENIED` | 403 | User lacks required permission |
| `LBAC_VIOLATION` | 403 | Geographic access control violation |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `DUPLICATE_REQUEST` | 409 | Idempotency key conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `PAYLOAD_TOO_LARGE` | 413 | Request body exceeds limits |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Invalid file type |
| `GEOGRAPHIC_BOUNDS_ERROR` | 400 | Coordinates outside Yemen |
| `INVALID_GEOJSON` | 400 | Malformed GeoJSON data |
| `SESSION_NOT_ACTIVE` | 400 | Session not in valid state |
| `SYNC_CONFLICT` | 409 | Data synchronization conflict |
| `SERVER_ERROR` | 500 | Internal server error |

### Rate Limiting / حدود المعدل

| Endpoint Category | Rate Limit | Window |
|------------------|------------|---------|
| Authentication | 10 requests | 1 minute |
| Read Operations | 100 requests | 1 minute |
| Write Operations | 50 requests | 1 minute |
| File Uploads | 20 requests | 1 minute |
| Sync Operations | 30 requests | 1 minute |

### Payload Limits / حدود الحمولة

| Content Type | Maximum Size |
|-------------|--------------|
| JSON Request Body | 1 MB |
| Image Upload | 50 MB |
| Video Upload | 100 MB |
| Document Upload | 10 MB |
| Batch Operations | 200 items |

---

## 🔒 Security Requirements / متطلبات الأمان

### 1. Authentication Security / أمان المصادقة
- JWT tokens with 1-hour expiration
- Refresh tokens with 30-day expiration and rotation
- Device-specific token binding
- Secure token storage requirements

### 2. Data Validation / التحقق من البيانات
- Strict schema validation using Zod
- Geographic bounds checking (Yemen coordinates)
- File type and size validation
- GeoJSON structure validation

### 3. LBAC Enforcement / تطبيق التحكم في الوصول الجغرافي
- Surveyor geographic assignments validation
- Session location verification
- Cross-reference with user permissions
- Audit logging for access violations

### 4. Network Security / أمان الشبكة
- HTTPS only (TLS 1.2+)
- Request correlation IDs
- Rate limiting per device
- Payload size limits

---

## 📈 Monitoring & Observability / المراقبة والمتابعة

### Metrics to Track / المقاييس المطلوبة
- API response times by endpoint
- Authentication success/failure rates
- Sync operation success rates
- File upload success rates
- Geographic access violations
- Device registration trends
- Error rates by error code

### Logging Requirements / متطلبات السجلات
- Request/Response correlation IDs
- User and device identification
- Geographic coordinates for audit
- Sync operation details
- Security violations
- Performance metrics

---

## 🚀 API Versioning / إصدارات الواجهة البرمجية

### Version Strategy / استراتيجية الإصدار
- URL-based versioning: `/api/mobile/v1/`
- Backward compatibility for 2 major versions
- Deprecation notices 6 months in advance
- Version-specific documentation

### Version Headers / رؤوس الإصدار
```
API-Version: 1.0
Supported-Versions: 1.0,1.1
Deprecated-Versions: 0.9
```

---

## 📱 Flutter Integration Notes / ملاحظات تكامل Flutter

### Required Packages / الحزم المطلوبة
- `dio` for HTTP client with interceptors
- `flutter_secure_storage` for token storage
- `geolocator` for GPS coordinates
- `connectivity_plus` for network status
- `uuid` for idempotency keys
- `crypto` for checksums

### Data Model Alignment / مطابقة نماذج البيانات
- Convert from canvas coordinates to WGS84
- Implement GeoJSON serialization
- Match server schema structure
- Handle offline/online state

### Sync Strategy / استراتيجية المزامنة
- Background sync when network available
- Conflict resolution (last-write-wins)
- Retry mechanism with exponential backoff
- Local cache management with Hive

---

This specification provides the foundation for implementing a robust, secure, and scalable mobile API that integrates seamlessly with the Yemen Digital Construction Platform while supporting offline-capable mobile surveying workflows.