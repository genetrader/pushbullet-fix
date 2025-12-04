'use strict';

// Import polyfills first
importScripts('sw-polyfills.js');

// Import all background scripts in order
importScripts(
    'forge.min.js',
    'utils.js',
    'pb.js',
    'http.js',
    'analytics.js',
    'settings.js',
    'offscreen-manager.js',
    'notifier.js',
    'update-checker.js',
    'listeners.js',
    'end-to-end.js',
    'alive.js',
    'awake.js',
    'connection.js',
    'service-worker-keepalive.js',
    'local.js',
    'device.js',
    'mirroring.js',
    'files.js',
    'pushing.js',
    'chats.js',
    'pushes.js',
    'sms.js',
    'context-menu-v3.js',
    'log-request.js',
    'pong.js',
    'keyboard-shortcuts.js',
    'main.js',
    'message-handler.js'
);

// Service worker lifecycle events
self.addEventListener('install', function(event) {
    console.log('Pushbullet service worker installed');
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    console.log('Pushbullet service worker activated');
    event.waitUntil(clients.claim());

    // Initialize offscreen document for sound playback (don't block activation)
    setTimeout(() => {
        if (typeof pb !== 'undefined' && pb.offscreen && pb.offscreen.setupDocument) {
            pb.offscreen.setupDocument().then(() => {
                pb.log('Offscreen document initialized after activation');
            }).catch(e => {
                pb.log('Error initializing offscreen document: ' + e.message);
            });
        }
    }, 500);
});

// Keep service worker alive
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();