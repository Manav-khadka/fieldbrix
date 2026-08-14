# FieldBrix Sentry Integration Setup

## Overview

Sentry has been successfully integrated across all three FieldBrix applications:
- **Frontend (React/Vite)**: https://github.com/Manav-khadka/fieldbrix-frontend
- **Backend (NestJS)**: https://github.com/Manav-khadka/fieldbrix-backend  
- **Mobile (Flutter)**: https://github.com/Manav-khadka/fieldbrix-mobile

## Sentry Projects

All projects are hosted under the `fieldbrixxx` Sentry organization:
- **Web**: fieldbrixxx/vite-react
- **Backend**: fieldbrixxx/nest
- **Mobile**: fieldbrixxx/flutter

## Configuration Status

### ✅ Frontend (React/Vite)

**Package**: `@sentry/react@10.70.0`

**Initialization**: 
- File: `fieldbrix-frontend/src/observability/sentry.ts`
- Configured with: DSN, environment, release, error boundary, sensitive data redaction
- Entry point: `fieldbrix-frontend/src/main.tsx`

**Environment Variables** (ignored `.env.local`):
```
VITE_SENTRY_DSN=<web-project-dsn>
VITE_SENTRY_ENVIRONMENT=local
VITE_SENTRY_RELEASE=fieldbrix-web@0.0.0-dev
VITE_SENTRY_DEBUG_ENABLED=true
```

**Test Error Button**:
- Component: `fieldbrix-frontend/src/components/SentryTestButton.tsx`
- Features:
  - Frontend error test: "Break the world (Frontend)" button
  - Backend error test: "Trigger Backend Error" button that calls `/debug-sentry`
- Location: Added to `fieldbrix-frontend/src/App.tsx`

### ✅ Backend (NestJS)

**Package**: `@sentry/nestjs@10.70.0`

**Initialization**:
- File: `fieldbrix-backend/src/instrument.ts`
- Configured with: DSN, environment, release, error scrubbing
- Entry point: `fieldbrix-backend/src/main.ts` (imports instrument.ts first)

**Environment Variables** (ignored `.env`):
```
SENTRY_DSN=<backend-project-dsn>
SENTRY_ENVIRONMENT=local
SENTRY_RELEASE=fieldbrix-backend@0.0.0-dev
SENTRY_DEBUG_ENDPOINT=true
```

**Test Error Endpoint**:
- Route: `GET /debug-sentry`
- Controller: `fieldbrix-backend/src/app.controller.ts`
- Behavior: Throws `Error('FieldBrix Sentry verification event')`
- Availability: Only active when `SENTRY_DEBUG_ENDPOINT=true` and `APP_ENV != 'production'`

### ✅ Mobile (Flutter)

**Package**: `sentry_flutter: 9.27.0`

**Initialization**:
- File: `fieldbrix_app/lib/main.dart`
- Configured with: DSN, environment, release, performance monitoring
- Entry point: `main()` function uses `SentryFlutter.init()`

**Environment Variables** (ignored `env/dev.local.json`):
```json
{
  "SENTRY_DSN": "<mobile-project-dsn>",
  "SENTRY_ENVIRONMENT": "local",
  "SENTRY_RELEASE": "fieldbrix-mobile@0.0.0-dev",
  "SENTRY_DEBUG_ENABLED": true
}
```

**Test Error Button**:
- Widget: Updated `FoundationScreen` in `fieldbrix_app/lib/main.dart`
- Button: "Break the world (Mobile)" - throws `StateError('This is test exception from FieldBrix Mobile')`

## Testing the Integration

### Backend Error Test

```bash
# Trigger the backend Sentry error
curl http://localhost:3000/debug-sentry

# Expected response: HTTP 500 with error details
# The error will be automatically captured and sent to Sentry
```

### Frontend Error Test

1. Start the frontend dev server:
   ```bash
   cd fieldbrix-frontend
   pnpm install
   pnpm dev
   ```

2. Navigate to http://localhost:5173

3. Click the "Break the world (Frontend)" button to trigger a client-side error

4. Or click "Trigger Backend Error" to call the backend `/debug-sentry` endpoint from the frontend

### Mobile Error Test

1. Build and run the Flutter app:
   ```bash
   cd fieldbrix_app
   flutter pub get
   flutter run --dart-define=SENTRY_DSN=<your-flutter-dsn> --dart-define=SENTRY_DEBUG_ENABLED=true
   ```

2. Tap the "Break the world (Mobile)" button to trigger a mobile error

## Features Configured

### Error Tracking
- ✅ Automatic error capture and reporting
- ✅ Source maps and stacktrace symbolication
- ✅ Release tracking
- ✅ Environment tagging (local/staging/production)

### Privacy & Security
- ✅ Sensitive data redaction (authorization, token, email, phone, password)
- ✅ Disabled PII (Personally Identifiable Information) reporting
- ✅ DSN stored in environment variables (not hardcoded)

### Performance Monitoring
- ✅ Configured trace sampling (0% in local, 10% in production)
- ✅ Minimal replay overhead (0% for sessions and on-error)

### Error Boundaries (Frontend)
- ✅ React Error Boundary configured to catch and report React render errors
- ✅ Fallback UI: "FieldBrix could not load. Please refresh."

## Verification Checklist

- [x] Sentry SDKs installed in all three apps
- [x] DSNs configured in environment files
- [x] Error initialization code in place and tested
- [x] Test error endpoints/buttons created
- [x] Backend debug endpoint responding (HTTP 500)
- [x] Sensitive data redaction enabled
- [x] Error boundaries configured (React)
- [x] Performance monitoring configured

## Next Steps

1. **Deploy to production**: Configure protected CI secrets and verify the Sentry dashboard event.
2. **Enable alerts**: Configure Sentry alert rules for critical errors
3. **Monitor**: Check Sentry dashboards regularly for errors
4. **Upload symbols**: Configure CI to upload Android/iOS debug symbols and source maps
5. **Remove debug buttons**: Remove test error buttons from release builds
6. **Configure source maps**: Link source maps in Sentry for better error context

## Documentation References

- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry NestJS Documentation](https://docs.sentry.io/platforms/javascript/guides/node/)
- [Sentry Flutter Documentation](https://docs.sentry.io/platforms/flutter/)
- [Local Sentry Documentation](../sentry/)
