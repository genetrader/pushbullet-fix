# Pushbullet Extension v382 - Settings Page and Version Sync Fix

## What's Fixed

- Restored the in-extension settings page sections so they match the GitHub release description.
- Added v380 MMS image upload fixes to the settings page release notes.
- Added v381 updater reliability fixes to the settings page release notes.
- Synced the local unpacked workspace version so it no longer reports v367.

## Includes Previous Fixes

- v380: MMS image sending, filename preservation, File-like service worker reconstruction, and upload error handling.
- v381: GitHub release permissions, direct extension zip update links, and startup/install-time update checks.

## Validation

- `node --check update-checker.js`
- `node --check options.js`
- `node --check manifest.json`
- Release zip inspected for manifest version and excluded test files.
