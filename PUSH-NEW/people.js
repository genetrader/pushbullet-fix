'use strict';

function openPushbulletPeople() {
    // Open Pushbullet People page in a new tab
    if (window.chrome && chrome.tabs) {
        chrome.tabs.create({ url: 'https://www.pushbullet.com/#people' });
    } else {
        window.open('https://www.pushbullet.com/#people', '_blank');
    }
}

// Set up button click handler
document.addEventListener('DOMContentLoaded', function() {
    const openBtn = document.getElementById('openPushbulletBtn');
    if (openBtn) {
        openBtn.addEventListener('click', openPushbulletPeople);
    }
});