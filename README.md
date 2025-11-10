# Pushbullet Chrome Extension UNOFFICIAL (Manifest V3)

A community-maintained version of the Pushbullet Chrome extension updated to work with Manifest V3.  This extension REQUIRES you have an account already with Pushbullet.com and I am NOT affiliated with them and you can sign up when you open the extension.
co_speechnotes_plugin_fab_id:1974,113
REPORT ERRORS AND I WILL GET THEM FIXED.  PLEASE PROVIDE ALL CONSOLE ERROR CODE WHEN YOU REPORT.

IF YOU LIKE THIS EXTENSION I HAVE BUILT A LOT MORE.  JUST SAY THANKS, GIVE IT A STAR AND I WILL START TO COMPILE MY DIRECTORY OF VIBE-CODED CHROME EXTENSIONS AND SHARE THEM!  I HAVE A BUNCH - THANKS.

** UPDATE 11/10 - v378 - FILE UPLOAD IS WORKING.  MMS IMAGE AND FILE SEND IS WORKING.  NOTIFICATIONS ALL WORKING. **

## ⚠️ CRITICAL: MMS REQUIRES ENCRYPTION TO BE DISABLED ⚠️

**IMPORTANT CAVEAT:** MMS (multimedia messages with images) **WILL NOT WORK** if end-to-end encryption is enabled in settings.

### **Why MMS Doesn't Work With Encryption:**
- The Pushbullet server automatically **deletes MMS messages** when encryption is active
- This is a **server-side limitation**, not a bug in the extension
- Regular SMS text messages work fine with encryption
- Only MMS (image/multimedia messages) are affected

### **To Use MMS:**
1. Open Pushbullet Settings
2. **Disable End-to-End Encryption**
3. Send MMS images normally
4. ⚠️ Re-enabling encryption will break MMS again

**You must choose:** MMS functionality (encryption OFF) OR End-to-end encryption (no MMS)

---

## Background

The original Pushbullet Chrome extension uses Manifest V2, which is no longer supported in newer versions of Chrome. This repository contains a modified version that works with Manifest V3, allowing you to continue using Pushbullet in modern Chrome browsers.

## Features

- 📱 Send pushes between devices
- 💬 SMS messaging from your computer
- 📎 File sharing
- 🔔 Notification mirroring
- 🔒 End-to-end encryption support
- ✨ All original Pushbullet features preserved

## Installation

### Method 1: Load Unpacked (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select the directory containing this extension
6. Sign in to your Pushbullet account when prompted

### Method 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/pushbullet-chrome-v3.git
cd pushbullet-chrome-v3

# No build process required - load directly in Chrome
```

## Differences from Original

### Technical Changes for Manifest V3:
- Converted background scripts to service workers
- Replaced `chrome.browserAction` with `chrome.action` API
- Updated `chrome.extension` APIs to modern equivalents
- Added polyfills for `XMLHttpRequest` and `localStorage` in service workers
- Modified context menu implementation to use `onClicked` events
- Implemented message passing between UI pages and service worker

### Files Added:
- `background.js` - Service worker entry point
- `sw-polyfills.js` - Compatibility layer for V3
- `page-v3.js` - Updated page script for UI communication
- `context-menu-v3.js` - Updated context menu implementation
- `message-handler.js` - Message passing handler

## Known Issues

### ⚠️ MMS + Encryption Incompatibility (CRITICAL)
- **MMS messages WILL NOT WORK if end-to-end encryption is enabled**
- The server deletes MMS messages when encryption is active
- You must disable encryption in Settings to use MMS
- This is a server-side limitation, not an extension bug
- Regular SMS works fine with encryption - only MMS is affected

### Other Issues
- Initial load may take a moment as the service worker initializes
- Some features may require re-authentication after browser restart
- Old MMS images from Backblaze may show 404 errors (handled gracefully)

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## Disclaimer

This is an unofficial, community-maintained version of the Pushbullet Chrome extension. It is not affiliated with or endorsed by Pushbullet. All trademarks and copyrights belong to their respective owners.

## Original Source

The original extension can be found on the [Chrome Web Store](https://chrome.google.com/webstore/detail/pushbullet/chlffgpmiacpedhhbkiomidkjlcfhogd).

## License

This project maintains the same license as the original Pushbullet extension. See LICENSE file for details.
