# Pushbullet Extension v381 - Updater Reliability Fix

## What's Fixed

- Added GitHub release host permissions so the extension can check for updates reliably.
- Changed the updater to use the uploaded extension zip asset instead of GitHub's generated source archive.
- Made the Options update banner download `pushbullet-fix-v###.zip` directly when an update is available.
- Added startup and install-time update checks in addition to the signed-in check.

## Important Note

Version 379 may not be able to discover this update automatically because its own manifest did not grant GitHub release access. PCs already on 379 may need one manual install from this release, then future update checks should use the repaired updater.

## Validation

- `node --check update-checker.js`
- `node --check options.js`
- `node --check manifest.json`
