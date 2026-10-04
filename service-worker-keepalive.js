'use strict';

// Service Worker Keepalive using Chrome Alarms API
// This ensures the service worker wakes up periodically to maintain connection
// and check for missed pushes, even when browser is "closed" (in system tray)

pb.keepalive = {
    ALARM_NAME: 'pushbullet_keepalive',
    CHECK_INTERVAL: 1, // Check every 1 minute (most reliable)
    SMS_STATE_KEY: 'smsPollStateV1',
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

    // Fetch normal pushes and independently poll SMS permanent objects. SMS change
    // notices are ephemerals and never appear in /v2/pushes, so the old push-only
    // fallback could not recover a missed sms_changed WebSocket event.
    pb.keepalive.fetchRecentPushes();
    pb.keepalive.pollSmsState();
};

// Fetch recent pushes to catch anything we missed while disconnected
pb.keepalive.fetchRecentPushes = function() {
    if (!pb.local.apiKey) {
        return;
    }

    // Fetch normal pushes from the last 90 seconds.
    // Wider window accounts for alarm timing variance
    var now = Date.now() / 1000; // Convert to seconds
    var modifiedAfter = now - 90; // Last 90 seconds

    var url = pb.api + '/v2/pushes?modified_after=' + modifiedAfter + '&limit=20&active=true';

    pb.get(url, function(response) {
        if (response && response.pushes && response.pushes.length > 0) {
            pb.log('Keepalive: Found ' + response.pushes.length + ' recent pushes');

            // Process each normal push through the existing handlers.
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

pb.keepalive.getSmsPollState = function() {
    try {
        return localStorage[pb.keepalive.SMS_STATE_KEY]
            ? JSON.parse(localStorage[pb.keepalive.SMS_STATE_KEY])
            : {};
    } catch (e) {
        pb.log('Keepalive: Invalid SMS poll state, rebuilding it');
        return {};
    }
};

pb.keepalive.saveSmsPollState = function(state) {
    localStorage[pb.keepalive.SMS_STATE_KEY] = JSON.stringify(state);
};

pb.keepalive.latestTimestamp = function(thread) {
    return thread && thread.latest && Number(thread.latest.timestamp) || 0;
};

pb.keepalive.pollSmsDevice = function(device, state) {
    pb.post(pb.maybeApi2() + '/v3/get-permanent', {
        key: device.iden + '_threads'
    }, function(response, error) {
        if (!response || !response.data || response.data.encrypted || !response.data.threads) {
            if (error) {
                pb.log('Keepalive: SMS poll failed for ' + device.iden + ': ' + (error.message || error.code || 'unknown error'));
            }
            return;
        }

        var hadBaseline = Object.prototype.hasOwnProperty.call(state, device.iden);
        var previous = state[device.iden] || {};
        var current = {};
        var notifications = [];

        response.data.threads.forEach(function(thread) {
            var timestamp = pb.keepalive.latestTimestamp(thread);
            current[thread.id] = timestamp;

            var previousTimestamp = Number(previous[thread.id]) || 0;
            if (hadBaseline && timestamp > previousTimestamp && thread.latest && thread.latest.direction === 'incoming') {
                var recipients = thread.recipients || [];
                notifications.push({
                    thread_id: thread.id,
                    title: recipients.map(function(recipient) {
                        return recipient.name || recipient.address || 'SMS';
                    }).join(', ') || 'SMS',
                    body: thread.latest.body || '',
                    timestamp: timestamp,
                    image_url: recipients.length === 1 ? recipients[0].image_url : null
                });
            }
        });

        state[device.iden] = current;
        pb.keepalive.saveSmsPollState(state);

        // The authoritative background caches must be invalidated before any UI
        // receives the event. Otherwise the popup simply renders the stale object.
        pb.thread = {};
        pb.threads = {};

        if (notifications.length > 0) {
            pb.log('Keepalive: Recovered ' + notifications.length + ' missed SMS update(s) by polling');
            pb.dispatchEvent('sms_changed', {
                type: 'sms_changed',
                source_device_iden: device.iden,
                notifications: notifications,
                recovered_by_poll: true
            });
        } else if (!hadBaseline) {
            pb.log('Keepalive: Established SMS polling baseline for ' + device.iden);
        }
    });
};

pb.keepalive.pollSmsState = function() {
    if (!pb.local.apiKey || !pb.local.devices) {
        return;
    }

    var state = pb.keepalive.getSmsPollState();
    Object.keys(pb.local.devices).forEach(function(deviceIden) {
        var device = pb.local.devices[deviceIden];
        if (device && device.active !== false && device.has_sms) {
            pb.keepalive.pollSmsDevice(device, state);
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
