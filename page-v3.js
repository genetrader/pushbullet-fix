'use strict'

var focused = true, onFocusChanged
window.addEventListener('focus', function() {
    focused = true

    if (onFocusChanged) {
        onFocusChanged()
    }

    if (window.pb) {
        pb.dispatchEvent('active')
    }
})
window.addEventListener('blur', function() {
    focused = false

    if (onFocusChanged) {
        onFocusChanged()
    }
})

// Create a pb proxy object that communicates with the service worker
window.pb = {
    // Store for local data
    local: {},
    settings: {},
    browser: 'chrome',
    version: 366,

    // Notifier object for notifications
    notifier: {
        active: {}
    },

    // Push queues
    successfulPushes: [],
    pushQueue: [],
    fileQueue: [],
    failedPushes: [],

    // SMS related
    smsQueue: [],
    successfulSms: {},
    threads: {},
    thread: {},

    // Event system
    _listeners: {},

    addEventListener: function(event, handler) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(handler);
    },

    removeEventListener: function(event, handler) {
        if (this._listeners[event]) {
            const index = this._listeners[event].indexOf(handler);
            if (index > -1) {
                this._listeners[event].splice(index, 1);
            }
        }
    },

    dispatchEvent: function(event, detail) {
        if (this._listeners[event]) {
            this._listeners[event].forEach(function(handler) {
                handler({ type: event, detail: detail });
            });
        }
    },

    // Proxy methods that send messages to the service worker
    sendMessage: function(action, data) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: action, data: data }, function(response) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });
    },

    // Proxy common methods
    track: function(data) {
        this.sendMessage('track', data);
    },

    sendPush: function(push) {
        console.log('pb.sendPush called with:', push);

        // If the push contains a file, we need to handle it specially
        if (push.file) {
            console.log('Push contains file:', push.file.name, push.file.type, push.file.size);

            // For file uploads, we need to send the file data properly
            // Use base64 encoding instead of ArrayBuffer for reliable transfer
            const reader = new FileReader();
            reader.onload = () => {
                console.log('File read complete as base64, length:', reader.result.length);
                const fileData = {
                    name: push.file.name,
                    type: push.file.type,
                    size: push.file.size,
                    lastModified: push.file.lastModified || Date.now(),
                    dataBase64: reader.result.split(',')[1]  // Remove data URL prefix
                };
                console.log('FileData prepared:', fileData.name, fileData.type, fileData.size, 'base64 length:', fileData.dataBase64.length);

                // Create new push object without the file
                const pushWithFile = {};
                for (let key in push) {
                    if (key !== 'file') {
                        pushWithFile[key] = push[key];
                    }
                }
                pushWithFile.fileData = fileData;

                this.sendMessage('sendPush', pushWithFile).then(response => {
                    console.log('sendPush response:', response);
                }).catch(error => {
                    console.error('sendPush error:', error);
                    alert('Failed to send file. Please try again.');
                });
            };
            reader.onerror = (error) => {
                console.error('FileReader error:', error);
                alert('Failed to read file. Please try again.');
            };
            reader.readAsDataURL(push.file);
            return; // Return early for file pushes
        } else {
            console.log('Regular push (no file)');
            return this.sendMessage('sendPush', push);
        }
    },

    pushFile: function(push) {
        return this.sendMessage('pushFile', push);
    },

    clearActiveChat: function() {
        return this.sendMessage('clearActiveChat', {});
    },

    setActiveChat: function(chat) {
        // If chat is just a string or doesn't have the expected structure, wrap it
        const chatInfo = typeof chat === 'object' ? chat : { other: chat };
        // Add default values if missing
        if (!chatInfo.other) chatInfo.other = '';
        if (!chatInfo.focused) chatInfo.focused = true;
        if (!chatInfo.mode) chatInfo.mode = 'push';

        return this.sendMessage('setActiveChat', chatInfo);
    },

    signOut: function() {
        return this.sendMessage('signOut', {});
    },

    sendSms: function(data) {
        // If the SMS contains a file (Blob), we need to serialize it
        if (data.file && data.file instanceof Blob) {
            console.log('SMS contains file (Blob):', data.file.type, data.file.size);

            const reader = new FileReader();
            return new Promise((resolve, reject) => {
                reader.onload = () => {
                    console.log('SMS file read complete as base64, length:', reader.result.length);
                    const fileData = {
                        type: data.file.type,
                        size: data.file.size,
                        dataBase64: reader.result.split(',')[1]  // Remove data URL prefix
                    };
                    console.log('SMS FileData prepared:', fileData.type, fileData.size, 'base64 length:', fileData.dataBase64.length);

                    // Create new SMS object without the file
                    const smsWithFile = {};
                    for (let key in data) {
                        if (key !== 'file') {
                            smsWithFile[key] = data[key];
                        }
                    }
                    smsWithFile.fileData = fileData;

                    this.sendMessage('sendSms', smsWithFile).then(resolve).catch(reject);
                };
                reader.onerror = (error) => {
                    console.error('FileReader error for SMS:', error);
                    reject(error);
                };
                reader.readAsDataURL(data.file);
            });
        } else {
            return this.sendMessage('sendSms', data);
        }
    },

    deletePush: function(iden) {
        return this.sendMessage('deletePush', { iden: iden });
    },

    updateTicket: function(data) {
        return this.sendMessage('updateTicket', data);
    },

    saveSettings: function() {
        return this.sendMessage('saveSettings', this.settings);
    },

    loadSettings: function() {
        return this.sendMessage('loadSettings', {});
    },

    openTab: function(url) {
        chrome.tabs.create({ url: url });
    },

    setAwake: function(source, awake) {
        return this.sendMessage('setAwake', { source: source, awake: awake });
    },

    snooze: function() {
        return this.sendMessage('snooze', {});
    },

    unsnooze: function() {
        return this.sendMessage('unsnooze', {});
    },

    isSnoozed: function() {
        return localStorage.snoozedUntil > Date.now();
    },

    getThreads: function(deviceIden, callback) {
        // Check if callback is provided, if not return a promise
        if (typeof callback === 'function') {
            this.sendMessage('getThreads', { deviceIden: deviceIden }).then(response => {
                callback(response.threads || response);
            }).catch(error => {
                console.error('getThreads error:', error);
                callback(null);
            });
        } else {
            // If no callback, return the promise
            return this.sendMessage('getThreads', { deviceIden: deviceIden });
        }
    },

    getThread: function(deviceIden, threadId, callback) {
        if (typeof callback === 'function') {
            this.sendMessage('getThread', { deviceIden: deviceIden, threadId: threadId }).then(response => {
                callback(response.thread || response);
            }).catch(error => {
                console.error('getThread error:', error);
                callback(null);
            });
        } else {
            return this.sendMessage('getThread', { deviceIden: deviceIden, threadId: threadId });
        }
    },

    getPhonebook: function(deviceIden, callback) {
        if (typeof callback === 'function') {
            this.sendMessage('getPhonebook', { deviceIden: deviceIden }).then(response => {
                callback(response.phonebook || response);
            }).catch(error => {
                console.error('getPhonebook error:', error);
                callback(null);
            });
        } else {
            return this.sendMessage('getPhonebook', { deviceIden: deviceIden });
        }
    },

    popOutPanel: function() {
        const url = chrome.runtime.getURL('panel.html') + '#popout';
        chrome.windows.create({
            url: url,
            type: 'popup',
            width: 420,
            height: 550
        });
        window.close();
    },

    updateContextMenu: function() {
        return this.sendMessage('updateContextMenu', {});
    },

    markDismissed: function(push) {
        return this.sendMessage('markDismissed', push);
    },

    clearFailed: function(push) {
        return this.sendMessage('clearFailed', push);
    },

    cancelUpload: function(push) {
        return this.sendMessage('cancelUpload', push);
    },

    savePushes: function() {
        return this.sendMessage('savePushes', {});
    },

    groupKey: function(push) {
        // This is a local utility function
        return push.iden || push.guid || '';
    },

    findChat: function(identifier) {
        return this.sendMessage('findChat', { identifier: identifier });
    },

    openChat: function(type, identifier) {
        return this.sendMessage('openChat', { type: type, identifier: identifier });
    },

    smsFile: function(sms) {
        return this.sendMessage('smsFile', sms);
    },

    deleteText: function(iden) {
        return this.sendMessage('deleteText', { iden: iden });
    },

    sendRefreshSms: function(device) {
        return this.sendMessage('sendRefreshSms', device);
    },

    post: function(url, data, callback) {
        // For API calls that need authentication, send to background
        return this.sendMessage('apiPost', { url: url, data: data }).then(response => {
            if (callback) {
                callback(response.data, response.error);
            }
            return response;
        }).catch(error => {
            if (callback) {
                callback(null, error);
            }
            throw error;
        });
    },

    maybeApi2: function() {
        // Return the API endpoint
        return this.api || 'https://api.pushbullet.com';
    },

    e2e: {
        enabled: false,
        encrypt: function(data) { return data; },
        decrypt: function(data) { return data; }
    },

    log: function(message) {
        console.log(message);
        this.sendMessage('log', message);
    }
};

// Initialize pb data from service worker
async function initializePb() {
    try {
        // Get initial data from service worker
        const response = await pb.sendMessage('getState', {});
        if (response) {
            pb.local = response.local || {};
            pb.settings = response.settings || {};
            pb.browser = response.browser || 'chrome';
            pb.version = response.version || 366;
            pb.browserVersion = response.browserVersion;
            pb.userAgent = response.userAgent;

            // Additional properties that might be needed
            pb.www = response.www || 'https://www.pushbullet.com';
            pb.api = response.api || 'https://api.pushbullet.com';

            // Initialize notifier data
            if (response.notifier) {
                pb.notifier = response.notifier;
            }

            // Initialize push queues
            pb.successfulPushes = response.successfulPushes || [];
            pb.pushQueue = response.pushQueue || [];
            pb.fileQueue = response.fileQueue || [];
            pb.failedPushes = response.failedPushes || [];

            // Initialize SMS queues
            pb.smsQueue = response.smsQueue || [];
            pb.successfulSms = response.successfulSms || {};
        }
    } catch (error) {
        console.error('Failed to initialize pb:', error);
    }
}

// Listen for updates from service worker
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type === 'stateUpdate') {
        // Update local state
        if (message.data) {
            Object.assign(pb.local, message.data.local || {});
            Object.assign(pb.settings, message.data.settings || {});

            // Update SMS queues if provided
            if (message.data.smsQueue !== undefined) {
                pb.smsQueue = message.data.smsQueue;
            }
            if (message.data.successfulSms !== undefined) {
                pb.successfulSms = message.data.successfulSms;
            }
        }

        // Dispatch event if specified
        if (message.event) {
            pb.dispatchEvent(message.event, message.data);
        }
    }
    return true;
});

var onload = async function() {
    onload = null

    // Initialize pb proxy
    await initializePb();

    ready()
}

var ready = function() {
    addBodyCssClasses()

    if (window.init) {
        window.init()
    }

    pb.dispatchEvent('active')
}

var addBodyCssClasses = function() {
    if (pb.local && pb.local.user) {
        document.body.classList.add('signed-in')
    } else {
        document.body.classList.add('not-signed-in')
    }

    if (pb.browser == 'chrome') {
        document.body.classList.add('chrome')
    } else {
        document.body.classList.add('not-chrome')
    }

    if (pb.browser == 'edge') {
        document.body.classList.add('edge')
    } else {
        document.body.classList.add('not-edge')
    }

    if (pb.browser == 'opera') {
        document.body.classList.add('opera')
    } else {
        document.body.classList.add('not-opera')
    }

    if (pb.browser == 'safari') {
        document.body.classList.add('safari')
    } else {
        document.body.classList.add('not-safari')
    }

    if (pb.browser == 'firefox') {
        document.body.classList.add('firefox')
    } else {
        document.body.classList.add('not-firefox')
    }

    if (navigator.platform.indexOf('MacIntel') != -1) {
        document.body.classList.add('mac')
    } else {
        document.body.classList.add('not-mac')
    }

    if (navigator.platform.toLowerCase().indexOf('win') != -1) {
        document.body.classList.add('windows')
    } else {
        document.body.classList.add('not-windows')
    }
}

document.addEventListener('DOMContentLoaded', onload)

window.onerror = function(message, file, line, column, error) {
    pb.track({
        'name': 'error',
        'stack': error ? error.stack : file + ':' + line + ':' + column,
        'message': message
    })
}