# Pushbullet Extension v378 - MMS Upload Fix

## ⚠️ IMPORTANT CAVEATS - MMS FUNCTIONALITY ⚠️

### **Encryption MUST Be Disabled for MMS to Work**
- **MMS (image messages) WILL NOT WORK if end-to-end encryption is enabled**
- The server automatically deletes MMS messages when encryption is active
- You MUST disable encryption in Settings to send/receive MMS images
- Regular SMS text messages work fine with encryption enabled
- Only MMS (multimedia messages) are affected by this limitation

### **To Use MMS:**
1. Open Pushbullet Settings
2. Disable End-to-End Encryption
3. Send MMS images normally
4. Re-enable encryption if needed (but MMS will stop working)

---

## What's Fixed in v378

### Critical Fixes
✅ **Thread Disappearing During MMS Send** - Fixed UI refresh logic that was replacing thread data
✅ **MMS Upload Promise Chain** - MMS images now send successfully (with encryption OFF)
✅ **Greyed Out Preview Removal** - Pending MMS previews properly removed after upload
✅ **UI State Preservation** - Thread data no longer lost during refresh operations

### Previous Fixes (v367-v377)
✅ Fixed CORS errors for notification images from pushbulletusercontent2.com
✅ Fixed encryption password not saving in settings
✅ Fixed file uploads showing as "pending" indefinitely
✅ Fixed UI not refreshing after file uploads
✅ Added graceful handling for 404 errors on expired Backblaze image URLs

---

## Known Limitations

### ⚠️ MMS + Encryption Incompatibility
**MMS messages are deleted by the server when end-to-end encryption is enabled.** This is a server-side limitation, not a bug in the extension. You must choose between:
- **MMS functionality** (encryption OFF), or
- **End-to-end encryption** (MMS disabled)

### Image Expiration
- Old MMS images hosted on Backblaze may return 404 errors after expiration
- The extension handles these gracefully by hiding broken images
- This is expected behavior for expired content

---

## Testing Recommendations

Before upgrading:
1. **Disable encryption** in Settings if you use MMS
2. Test MMS sending with encryption OFF
3. Verify regular SMS still works
4. Test file uploads in Push tab
5. Check that notifications update properly

---

## Installation

1. Download the extension files
2. Load as unpacked extension in Chrome
3. **Important:** Disable end-to-end encryption for MMS to work
4. Enjoy fixed MMS functionality!

---

## Changes Since v366

- v378: Fix thread disappearing during MMS send
- v377: Fix greyed out MMS preview removal
- v376: Make pb.sendSms return promise
- v375: Wait for SMS send completion before resolving
- v374: Make pb.smsFile return promise
- v373: Add multiple refresh attempts for MMS
- v372: Extend refresh timing for server sync
- v371: Add refresh logic after MMS send
- v370: Trigger UI refresh on locals_changed
- v369: Fix Push tab refresh on file upload
- v368: Add file/push queues to state
- v367: Fix CORS and encryption password saving

---

**Full Changelog:** https://github.com/genetrader/pushbullet-fix/compare/v366...v378
