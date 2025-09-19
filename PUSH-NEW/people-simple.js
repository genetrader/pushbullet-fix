'use strict';

document.addEventListener('DOMContentLoaded', function() {
    const openBtn = document.getElementById('openPushbulletBtn');
    const simpleBtn = document.getElementById('useSimpleViewBtn');
    const mainContainer = document.getElementById('mainContainer');
    const iframeContainer = document.getElementById('iframeContainer');

    if (openBtn) {
        openBtn.addEventListener('click', function() {
            // Open Pushbullet People in a new tab
            if (window.chrome && chrome.tabs) {
                chrome.tabs.create({ url: 'https://www.pushbullet.com/#people' });
            } else {
                window.open('https://www.pushbullet.com/#people', '_blank');
            }
        });
    }

    if (simpleBtn) {
        simpleBtn.addEventListener('click', function() {
            // Show the simple people view
            mainContainer.style.display = 'none';
            iframeContainer.style.display = 'block';
        });
    }
});