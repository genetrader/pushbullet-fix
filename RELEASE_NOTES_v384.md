# Pushbullet Extension v384 - Manifest V3 Lifecycle and Updater Fixes

## What's Fixed

- The Settings page now shows the installed version directly from the extension manifest.
- Settings performs a fresh GitHub release check every time it opens and displays the update banner from the service-worker response.
- The update banner remains visible until the new version is installed; it can no longer be permanently dismissed while the extension remains outdated.
- Notification dismissal metadata is stored in `chrome.storage.local`, so a notification that survives service-worker termination can still be dismissed correctly after Chrome restarts the worker.
- Mirrored Android notification closes and in-extension notification clears now trigger their remote dismissal instead of only removing the Windows notification.
- Push notification groups retain their push identifiers across worker restarts and mark every underlying push dismissed.
- Merged PR #4's durable context-menu IDs and cold-start reconstruction.
- Preserved the user's context-menu preference and optional website permissions instead of requiring access to every site.

## Validation

- Added and passed regression tests for update discovery, current-version handling, and notification dismissal after a simulated service-worker restart.
- Ran JavaScript syntax checks on every changed script.
- Validated the extension manifest JSON and checked the complete diff for whitespace errors.

## Updating

Download `pushbullet-fix-v384.zip`, extract it over the existing unpacked-extension folder, and click Reload for Pushbullet on `chrome://extensions/`.
