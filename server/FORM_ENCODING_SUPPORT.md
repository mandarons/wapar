# Form-Encoded Request Support

## Overview

The WAPAR API endpoints support both JSON and form-encoded request formats for backward compatibility with older versions of the icloud-docker client.

## Supported Endpoints

### 1. Installation Endpoint (`/api/installation`)

**Primary Format:** `application/json` (recommended)
**Legacy Format:** `application/x-www-form-urlencoded` (for older clients)

#### Form-Encoded Request Example

```bash
curl -X POST https://wapar-api.mandarons.com/api/installation \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "appName=icloud-docker" \
  -d "appVersion=1.0.0" \
  -d "ipAddress=192.168.1.100" \
  -d "data=some-data-string" \
  -d "countryCode=US" \
  -d "region=California"
```

#### JSON Request Example (Recommended)

```bash
curl -X POST https://wapar-api.mandarons.com/api/installation \
  -H "Content-Type: application/json" \
  -d '{
    "appName": "icloud-docker",
    "appVersion": "1.0.0",
    "ipAddress": "192.168.1.100",
    "data": "some-data-string",
    "countryCode": "US",
    "region": "California"
  }'
```

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `appName` | string | Yes | Name of the application (e.g., "icloud-docker") |
| `appVersion` | string | Yes | Version of the application (e.g., "1.0.0") |
| `ipAddress` | string | No | Client IP address (auto-detected if not provided) |
| `previousId` | string (UUID) | No | Previous installation ID for tracking upgrades |
| `data` | string | No | Additional data string |
| `countryCode` | string | No | ISO country code (e.g., "US") |
| `region` | string | No | Region/state name |

### 2. Heartbeat Endpoint (`/api/heartbeat`)

**Primary Format:** `application/json` (recommended)
**Legacy Format:** `application/x-www-form-urlencoded` (for older clients)

#### Form-Encoded Request Example

```bash
curl -X POST https://wapar-api.mandarons.com/api/heartbeat \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "installationId=550e8400-e29b-41d4-a716-446655440000" \
  -d 'data={"sessionId":"session-123","metrics":{"cpu":45,"memory":80}}'
```

#### JSON Request Example (Recommended)

```bash
curl -X POST https://wapar-api.mandarons.com/api/heartbeat \
  -H "Content-Type: application/json" \
  -d '{
    "installationId": "550e8400-e29b-41d4-a716-446655440000",
    "data": {
      "sessionId": "session-123",
      "metrics": {
        "cpu": 45,
        "memory": 80
      }
    }
  }'
```

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `installationId` | string (UUID) | Yes | Installation ID from the installation endpoint |
| `data` | object/string | No | Additional telemetry data. For form-encoded requests, must be a JSON string that will be parsed. For JSON requests, can be a nested object. |

## Important Notes

### Form-Encoded Data Field Handling

⚠️ **Critical:** When using form-encoded requests with the heartbeat endpoint, the `data` field must be a **valid JSON string**, not a plain string or object. It will be parsed using `JSON.parse()`.

**Valid Form-Encoded:**
```
installationId=550e8400-e29b-41d4-a716-446655440000&data={"key":"value"}
```

**Invalid Form-Encoded (will cause 500 error):**
```
installationId=550e8400-e29b-41d4-a716-446655440000&data={invalid-json
```

### Backward Compatibility

Form-encoded support is maintained for backward compatibility with older versions of the icloud-docker client (versions < 2.0.0). 

**For new integrations:** Always use JSON format (`Content-Type: application/json`) as it:
- Supports nested objects natively
- Has better error handling
- Is more maintainable
- Matches modern API standards

### Client Usage

#### Older icloud-docker Clients (< 2.0.0)
These clients use form-encoded requests:
```python
# Legacy approach
response = requests.post(
    endpoint,
    data={'appName': 'icloud-docker', 'appVersion': '1.0.0'},
    timeout=10
)
```

#### Modern icloud-docker Clients (>= 2.0.0)
These clients use JSON requests:
```python
# Modern approach (recommended)
response = requests.post(
    endpoint,
    json={'appName': 'icloud-docker', 'appVersion': '1.0.0'},
    timeout=10
)
```

## Testing

Comprehensive integration tests for both formats are available in:
- `server/tests/installation.test.ts` - Installation endpoint tests
- `server/tests/heartbeat.test.ts` - Heartbeat endpoint tests

Run tests with:
```bash
cd server
bun test
```

## Migration Guide

If you're maintaining an older client that uses form-encoded requests:

1. **Update to JSON format** by changing:
   - Header: `Content-Type: application/x-www-form-urlencoded` → `Content-Type: application/json`
   - Body: URL-encoded string → JSON object
   - For heartbeat `data` field: JSON string → nested JSON object

2. **Benefits of migration:**
   - Better type safety
   - Native support for nested data structures
   - Improved error messages
   - Future-proof API compatibility

3. **No breaking changes:** Form-encoded support will remain available indefinitely for backward compatibility.

## Validation

Both formats undergo the same validation:
- Required fields must be present
- UUIDs must be valid (for `installationId` and `previousId`)
- String fields must meet minimum length requirements
- Data types must match schema definitions

Validation errors return `400 Bad Request` with detailed error information.

## Error Handling

### Form-Encoded Specific Errors

1. **Invalid JSON in data field (heartbeat only):**
   - Status: `500 Internal Server Error`
   - Occurs when the `data` field cannot be parsed as JSON

2. **Validation Errors:**
   - Status: `400 Bad Request`
   - Response includes detailed validation error messages

3. **Missing Required Fields:**
   - Status: `400 Bad Request`
   - Response indicates which fields are required

## Security Considerations

- Form-encoded data is validated using the same Zod schemas as JSON data
- All input is sanitized and validated before processing
- Logging includes content type for debugging and monitoring
- IP addresses are automatically extracted from headers when not provided

## Monitoring

All requests are logged with:
- Content type
- Request size
- Parsing method used (form-encoded vs JSON)
- Success/failure status

Monitor logs for:
```
operation: 'installation.form_parse'
operation: 'heartbeat.form_parse'
```

These log entries indicate form-encoded requests are being received and processed.
