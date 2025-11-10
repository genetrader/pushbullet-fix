# Pushbullet Chrome Extension v367

## 🐛 Critical Bug Fixes

### 🔒 Encryption Password Saving Fixed
Users can now successfully save and persist their end-to-end encryption passwords in the extension settings.

**What was fixed:**
- ✅ Encryption password now saves correctly in Options page
- ✅ Password persists across browser sessions and extension reloads
- ✅ Checkbox state remains checked after page refresh
- ✅ Added proper async initialization to prevent race conditions
- ✅ Improved save button feedback (shows "Saving..." state)

**Technical details:**
- Implemented message handlers (`e2eSetPassword`, `e2eGetState`) for service worker communication
- Added e2e proxy object in `page-v3.js` with proper async/await
- Fixed UI initialization timing in `options.js`
- Added event listeners for state synchronization

### 🖼️ CORS Image Loading Fixed
SMS and MMS notification images now load properly without CORS errors.

**What was fixed:**
- ✅ Added `pushbulletusercontent2.com` to manifest permissions
- ✅ Eliminated "Unable to download all specified images" console errors
- ✅ Contact photos display correctly in SMS notifications
- ✅ MMS images load in chat conversations

## 📦 Installation

### Method 1: Load Unpacked (Recommended)
1. Download the source code (ZIP) below
2. Extract to a folder
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the extracted folder
6. Sign in to your Pushbullet account

### Method 2: Install from Release
Download the latest release files and follow the installation instructions in the README.

## 🔧 Files Modified
- `manifest.json` - Version 367, added pushbulletusercontent2.com permission
- `message-handler.js` - Added e2e message handlers (+20 lines)
- `page-v3.js` - Implemented e2e proxy object (+44 lines)
- `options.js` - Fixed e2e UI initialization (+64 lines)

## 🧪 Tested Scenarios
- ✅ Encryption password saves and persists
- ✅ Checkbox state maintains after reload
- ✅ SMS notifications with contact photos display correctly
- ✅ MMS images load without CORS errors
- ✅ Settings page initializes properly

## 📝 Upgrade Notes
If upgrading from v366:
- Simply reload the extension in `chrome://extensions/`
- No data loss or settings reset
- Your encryption password (if set) will be preserved

---

**Full Changelog**: https://github.com/genetrader/pushbullet-fix/compare/e002b7b...v367

🤖 Generated with [Claude Code](https://claude.com/claude-code)
