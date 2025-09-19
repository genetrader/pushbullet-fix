# Pushbullet Chrome Extension (Manifest V3)

A community-maintained version of the Pushbullet Chrome extension updated to work with Manifest V3.  This extension REQUIRES you have an account already with Pushbullet.com and I am NOT affiliated with them and you can sign up when you open the extension.

IF YOU LIKE THIS EXTENSION I HAVE BUILT A LOT MORE.  JUST SAY THANKS, GIVE IT A STAR AND I WILL START TO COMPILE MY DIRECTORY OF VIBE-CODED CHROME EXTENSIONS AND SHARE THEM!  I HAVE A BUNCH - THANKS.

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

- Initial load may take a moment as the service worker initializes
- Some features may require re-authentication after browser restart

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## Disclaimer

This is an unofficial, community-maintained version of the Pushbullet Chrome extension. It is not affiliated with or endorsed by Pushbullet. All trademarks and copyrights belong to their respective owners.

## Original Source

The original extension can be found on the [Chrome Web Store](https://chrome.google.com/webstore/detail/pushbullet/chlffgpmiacpedhhbkiomidkjlcfhogd).

## License

This project maintains the same license as the original Pushbullet extension. See LICENSE file for details.
