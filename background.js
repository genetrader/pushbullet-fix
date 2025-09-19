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
    'notifier.js',
    'listeners.js',
    'end-to-end.js',
    'alive.js',
    'awake.js',
    'connection.js',
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
});

// Keep service worker alive
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();