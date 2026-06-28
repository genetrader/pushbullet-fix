# Pushbullet Extension v380 - Image Upload Reliability Fix

## What's Fixed

- Fixed MMS image uploads failing because the service worker received a nameless Blob.
- Preserved filenames when SMS images are serialized from the popup to the service worker.
- Rebuilt SMS uploads as File-like objects so `/v3/start-upload` receives name, size, type, and slice.
- Switched upload metadata back to the Pushbullet-compatible `type` field.
- Added upload guards and chunk status checks so failed uploads stop cleanly instead of finishing broken files.

## Notes

- End-to-end encryption still needs to be disabled for MMS image sending.
- Test HTML files are not included in the release zip.

## Validation

- `node --check page-v3.js`
- `node --check message-handler.js`
- `node --check files.js`
- `node --check manifest.json`
