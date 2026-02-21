# Specification

## Summary
**Goal:** Fix MindAR library CDN loading failure by bundling the library locally instead of relying on external CDN.

**Planned changes:**
- Download MindAR library files and place them in frontend/public/lib/mindar/ directory
- Update frontend/index.html to load MindAR from local path instead of CDN URLs
- Remove CDN-related type declarations (window.mindARCDNLoaded, window.mindARCDNFailed) from frontend/src/types/mindar.d.ts
- Remove network connectivity check from App.tsx
- Update error handling to remove 'network' and 'cdn' error types, keeping only 'permission', 'camera', and 'initialization'
- Remove window.MINDAR undefined check from initialization logic in App.tsx

**User-visible outcome:** The AR shirt experience loads reliably without CDN-related errors, and users see simplified error messages focused only on camera permissions and AR initialization issues.
