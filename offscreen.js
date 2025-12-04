'use strict';

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'playSound') {
        const audio = document.getElementById('alert-sound');
        audio.play()
            .then(() => {
                console.log('Sound played successfully');
                sendResponse({ success: true });
            })
            .catch((error) => {
                console.error('Error playing sound:', error);
                sendResponse({ success: false, error: error.message });
            });

        // Return true to indicate we'll send response asynchronously
        return true;
    }
});

console.log('Pushbullet offscreen document loaded');
