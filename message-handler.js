'use strict';

// Message handler for communication between service worker and UI pages
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'getState') {
        // Send current state to UI pages
        sendResponse({
            local: pb.local || {},
            settings: pb.settings || {},
            browser: pb.browser,
            version: pb.version,
            browserVersion: pb.browserVersion,
            userAgent: pb.userAgent,
            www: pb.www,
            api: pb.api,
            api2: pb.api2,
            websocket: pb.websocket,
            notifier: pb.notifier || { active: {} },
            smsQueue: pb.smsQueue || [],
            successfulSms: pb.successfulSms || {}
        });
        return true;
    } else if (request.action === 'track') {
        if (pb.track) pb.track(request.data);
        sendResponse({ success: true });
        return true;
    } else if (request.action === 'sendPush') {
        console.log('Background received sendPush:', request.data);

        // If the push contains file data, reconstruct the File object
        if (request.data && request.data.fileData) {
            console.log('Reconstructing file from data');
            const fileData = request.data.fileData;
            const blob = new Blob([fileData.data], { type: fileData.type });
            blob.name = fileData.name;
            request.data.file = blob;
            delete request.data.fileData;
            console.log('File reconstructed:', blob.name, blob.size);
        }

        if (pb.sendPush) {
            console.log('Calling pb.sendPush');
            pb.sendPush(request.data);
            sendResponse({ success: true });
        } else {
            console.error('pb.sendPush not available');
            sendResponse({ success: false, error: 'pb.sendPush not available' });
        }
        return true;
    } else if (request.action === 'pushFile') {
        if (pb.pushFile) pb.pushFile(request.data);
        sendResponse({ success: true });
        return true;
    } else if (request.action === 'clearActiveChat') {
        if (pb.clearActiveChat) {
            // clearActiveChat expects a tabId
            const tabId = request.data?.tabId || (sender.tab && sender.tab.id) || 'panel';
            pb.clearActiveChat(tabId);
        }
        sendResponse({ success: true });
        return true;
    } else if (request.action === 'setActiveChat') {
        if (pb.setActiveChat) {
            // The setActiveChat function expects (tabId, info)
            // If data contains tabId and info, use them; otherwise treat data as info
            if (request.data && request.data.tabId !== undefined) {
                pb.setActiveChat(request.data.tabId, request.data.info || request.data);
            } else {
                // Use sender.tab.id as tabId if available
                const tabId = (sender.tab && sender.tab.id) ? sender.tab.id : 'panel';
                pb.setActiveChat(tabId, request.data || {});
            }
        }
        sendResponse({ success: true });
        return true;
    } else if (request.action === 'signOut') {
        if (pb.signOut) pb.signOut();
        sendResponse({ success: true });
        return true;
    } else if (request.action === 'sendSms') {
        if (pb.sendSms) {
            var result = pb.sendSms(request.data);
            sendResponse({ success: true, result: result });
        } else {
            sendResponse({ success: false, error: 'pb.sendSms not available' });
        }
        return true;
    } else if (request.action === 'deletePush') {
        if (pb.deletePush) pb.deletePush(request.data.iden);
        sendResponse({ success: true });
        return true;
    } else if (request.action === 'updateTicket') {
        if (pb.updateTicket) pb.updateTicket(request.data);
        sendResponse({ success: true });
        return true;
    } else if (request.action === 'saveSettings') {
        pb.settings = request.data;
        if (pb.saveSettings) pb.saveSettings();
        sendResponse({ success: true });
        return true;
    } else if (request.action === 'loadSettings') {
        if (pb.loadSettings) pb.loadSettings();
        sendResponse({ settings: pb.settings });
        return true;
    } else if (request.action === 'setAwake') {
        if (pb.setAwake) pb.setAwake(request.data.source, request.data.awake);
        sendResponse({ success: true });
        return true;
    } else if (request.action === 'snooze') {
        if (pb.snooze) pb.snooze();
        sendResponse({ success: true });
        return true;
    } else if (request.action === 'unsnooze') {
        if (pb.unsnooze) pb.unsnooze();
        sendResponse({ success: true });
        return true;
    } else if (request.action === 'getThreads') {
        if (pb.getThreads && typeof pb.getThreads === 'function') {
            pb.getThreads(request.data.deviceIden, function(threads) {
                sendResponse({ threads: threads || [] });
            });
        } else {
            // Return cached threads or empty
            sendResponse({ threads: pb.threads[request.data.deviceIden] || [] });
        }
        return true;
    } else if (request.action === 'getThread') {
        if (pb.getThread && typeof pb.getThread === 'function') {
            pb.getThread(request.data.deviceIden, request.data.threadId, function(thread) {
                sendResponse({ thread: thread || null });
            });
        } else {
            // Return cached thread or null
            const key = request.data.deviceIden + '_thread_' + request.data.threadId;
            sendResponse({ thread: pb.thread[key] || null });
        }
        return true;
    } else if (request.action === 'getPhonebook') {
        if (pb.getPhonebook && typeof pb.getPhonebook === 'function') {
            pb.getPhonebook(request.data.deviceIden, function(phonebook) {
                sendResponse({ phonebook: phonebook || null });
            });
        } else {
            sendResponse({ phonebook: null });
        }
        return true;
    } else if (request.action === 'findChat') {
        let chatInfo = null;
        if (pb.findChat && typeof pb.findChat === 'function') {
            chatInfo = pb.findChat(request.data.identifier);
        }
        sendResponse({ chat: chatInfo });
        return true;
    } else if (request.action === 'openChat') {
        if (pb.openChat && typeof pb.openChat === 'function') {
            pb.openChat(request.data.type, request.data.identifier);
        }
        sendResponse({ success: true });
        return true;
    } else if (request.action === 'updateContextMenu') {
        if (pb.updateContextMenu) pb.updateContextMenu();
        sendResponse({ success: true });
        return true;
    } else if (request.action === 'apiPost') {
        // Handle API POST requests that need authentication
        if (pb.post) {
            pb.post(request.data.url, request.data.data, function(response, error) {
                sendResponse({ data: response, error: error });
            });
        } else {
            sendResponse({ data: null, error: 'pb.post not available' });
        }
        return true;
    } else if (request.action === 'log') {
        pb.log(request.data);
        sendResponse({ success: true });
        return true;
    } else if (request.type === 'loopback') {
        // Handle loopback requests for tab ID
        sendResponse({ tabId: sender.tab ? sender.tab.id : null });
        return true;
    } else if (request.action === 'dismissNotification') {
        // Handle notification dismissal from UI pages
        if (pb.notifier && pb.notifier.dismiss) {
            pb.notifier.dismiss(request.key);
        } else if (pb.notifier && pb.notifier.active) {
            // Fallback: directly remove from active notifications
            delete pb.notifier.active[request.key];
            pb.dispatchEvent('notifications_changed');
        }
        sendResponse({ success: true });
        return true;
    }

    // Handle other specific requests as needed
    return false;
});

// Helper function to broadcast state changes to all UI pages
pb.broadcastStateUpdate = function(event, data) {
    chrome.runtime.sendMessage({
        type: 'stateUpdate',
        event: event,
        data: data
    }).catch(() => {
        // Ignore errors if no listeners
    });
};