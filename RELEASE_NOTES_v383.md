# Pushbullet Extension v383 - SMS Sync Recovery Fix

## What's Fixed

- Fixed SMS conversations becoming permanently stale when Chrome's Manifest V3 service worker misses a WebSocket `sms_changed` event.
- Added a one-minute poll of each active SMS device's permanent thread state so missed events are recovered automatically.
- Invalidated the authoritative service-worker SMS caches before refreshed thread data is returned to the popup or chat window.
- Made SMS panel and chat-window refreshes explicitly request fresh data instead of deleting only their page-local cache.
- Corrected the keepalive fallback documentation and behavior: SMS change notices are ephemerals and are not returned by `/v2/pushes`.

## Validation

- Confirmed authenticated Pushbullet API access and current SMS thread data.
- Confirmed a newly sent SMS appeared in the Chrome extension after installing v383.
- Ran JavaScript syntax checks on every changed JavaScript file.
- Inspected the release ZIP and confirmed manifest version 383 and exclusion of development-only files.

## Updating

Download `pushbullet-fix-v383.zip`, extract it over your existing unpacked-extension folder, then click Reload for Pushbullet on `chrome://extensions/`.
