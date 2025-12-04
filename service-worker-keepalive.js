'use strict';

// Service Worker Keepalive using Chrome Alarms API
// This ensures the service worker wakes up periodically to maintain connection
// and check for missed pushes, even when browser is "closed" (in system tray)

pb.keepalive = {
    ALARM_NAME: 'pushbullet_keepalive',
    CHECK_INTERVAL: 1, // Check every 1 minute (most reliable)
    lastAlarmTime: 0,
    lastConnectionCheck: 0
};

// Initialize keepalive system
pb.keepalive.init = function() {
    pb.log('Initializing service worker keepalive with Alarms API');

    // Create the periodic alarm
    chrome.alarms.create(pb.keepalive.ALARM_NAME, {
        periodInMinutes: pb.keepalive.CHECK_INTERVAL
    });

    // Also do an immediate check
    pb.keepalive.checkConnection();
};

// Check connection status and reconnect if needed
pb.keepalive.checkConnection = function() {
    var now = Date.now();
    pb.keepalive.lastConnectionCheck = now;

    pb.log('Keepalive: Checking connection status');

    // Check if we're signed in
    if (!pb.local.apiKey) {
        pb.log('Keepalive: Not signed in, skipping connection check');
        return;
    }

    // Check if WebSocket exists and is connected
    // The websocket variable is defined in connection.js
    if (typeof websocket === 'undefined' || !websocket || websocket.readyState !== WebSocket.OPEN) {
        pb.log('Keepalive: WebSocket not connected, attempting reconnection');

        // Import connect function from connection.js scope
        if (typeof connect === 'function') {
            connect();
        } else {
            pb.log('Keepalive: connect() function not available');
        }
    } else {
        pb.log('Keepalive: WebSocket already connected (readyState: ' + websocket.readyState + ')');
    }

    // Fetch any pushes we might have missed (last 60 seconds)
    pb.keepalive.fetchRecentPushes();
};

// Fetch recent pushes to catch anything we missed while disconnected
pb.keepalive.fetchRecentPushes = function() {
    if (!pb.local.apiKey) {
        return;
    }

    // Fetch pushes from the last 90 seconds to catch everything (including SMS)
    // Wider window accounts for alarm timing variance
    var now = Date.now() / 1000; // Convert to seconds
    var modifiedAfter = now - 90; // Last 90 seconds

    var url = pb.api + '/v2/pushes?modified_after=' + modifiedAfter + '&limit=20&active=true';

    pb.get(url, function(response) {
        if (response && response.pushes && response.pushes.length > 0) {
            pb.log('Keepalive: Found ' + response.pushes.length + ' recent pushes');

            // Process each push (they'll be handled by existing push handlers)
            // This includes regular pushes AND SMS pushes (type: 'sms_changed')
            response.pushes.forEach(function(push) {
                pb.log('Keepalive: Processing push type: ' + push.type);

                // Dispatch as if it came through the stream
                pb.dispatchEvent('stream_message', {
                    type: 'push',
                    push: push
                });
            });
        } else {
            pb.log('Keepalive: No recent pushes found');
        }
    });
};

// Handle alarm events
chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name === pb.keepalive.ALARM_NAME) {
        pb.keepalive.lastAlarmTime = Date.now();
        pb.log('Keepalive alarm triggered at ' + new Date().toISOString());
        pb.keepalive.checkConnection();
    }
});

// Initialize on signed_in event
pb.addEventListener('signed_in', function() {
    pb.log('User signed in, initializing keepalive');
    pb.keepalive.init();
});

// Also initialize immediately if already signed in
if (pb.local && pb.local.apiKey) {
    pb.keepalive.init();
}

// Monitor service worker lifecycle
self.addEventListener('activate', function(event) {
    pb.log('Service worker activated, ensuring keepalive is set up');
    event.waitUntil(
        chrome.alarms.get(pb.keepalive.ALARM_NAME).then(function(alarm) {
            if (!alarm) {
                pb.log('Keepalive alarm not found, creating it');
                return chrome.alarms.create(pb.keepalive.ALARM_NAME, {
                    periodInMinutes: pb.keepalive.CHECK_INTERVAL
                });
            }
        })
    );
});

pb.log('Service worker keepalive module loaded');
