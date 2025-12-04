'use strict';

// Offscreen document manager for playing sounds in Manifest V3
pb.offscreen = {
    created: false
};

// Create offscreen document if it doesn't exist
pb.offscreen.setupDocument = async function() {
    if (pb.offscreen.created) {
        return;
    }

    // Check if offscreen document already exists
    if (chrome.offscreen) {
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: [chrome.runtime.getURL('offscreen.html')]
        });

        if (existingContexts.length > 0) {
            pb.offscreen.created = true;
            return;
        }

        // Create offscreen document
        try {
            await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['AUDIO_PLAYBACK'],
                justification: 'Play notification sound when push notification arrives'
            });
            pb.offscreen.created = true;
            pb.log('Offscreen document created for audio playback');
        } catch (e) {
            pb.log('Error creating offscreen document: ' + e.message);
        }
    } else {
        pb.log('Offscreen API not available (Chrome 109+ required)');
    }
};

// Play sound through offscreen document
pb.offscreen.playSound = async function() {
    try {
        await pb.offscreen.setupDocument();

        if (pb.offscreen.created) {
            chrome.runtime.sendMessage({ action: 'playSound' }, (response) => {
                if (chrome.runtime.lastError) {
                    pb.log('Error sending message to offscreen: ' + chrome.runtime.lastError.message);
                } else if (response && response.success) {
                    pb.log('Sound played successfully');
                } else if (response) {
                    pb.log('Error playing sound: ' + response.error);
                }
            });
        }
    } catch (e) {
        pb.log('Error playing sound: ' + e.message);
    }
};
