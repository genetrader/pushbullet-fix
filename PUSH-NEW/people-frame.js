'use strict';

let frameLoaded = false;
let retryCount = 0;
const maxRetries = 3;

function onFrameLoad() {
    console.log('Frame load event triggered');
    const frame = document.getElementById('pushbulletFrame');
    const loader = document.getElementById('loader');

    // Always show the frame after a short delay
    // We can't access cross-origin content, but the frame should still display
    setTimeout(() => {
        console.log('Showing iframe');
        frame.style.display = 'block';
        loader.style.display = 'none';
        frameLoaded = true;
    }, 1000);
}

function onFrameError() {
    console.log('Frame error event triggered');
    retryCount++;
    if (retryCount < maxRetries) {
        setTimeout(() => {
            console.log('Retrying frame load');
            document.getElementById('pushbulletFrame').src = 'https://www.pushbullet.com/#people';
        }, 2000);
    } else {
        console.log('Max retries reached, showing error');
        document.getElementById('loader').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'block';
    }
}

function openPushbullet() {
    console.log('Opening Pushbullet in new tab');
    if (window.chrome && chrome.tabs) {
        chrome.tabs.create({ url: 'https://www.pushbullet.com/signin' });
    } else {
        window.open('https://www.pushbullet.com/signin', '_blank');
    }
}

// Set up event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, setting up iframe');
    const frame = document.getElementById('pushbulletFrame');
    const button = document.getElementById('openPushbulletBtn');

    if (frame) {
        frame.addEventListener('load', onFrameLoad);
        frame.addEventListener('error', onFrameError);

        // Also trigger load immediately if iframe is already loaded
        if (frame.contentWindow) {
            console.log('Frame already has content window');
            onFrameLoad();
        }
    }

    if (button) {
        button.addEventListener('click', openPushbullet);
    }

    // Timeout fallback - always show iframe after 3 seconds
    setTimeout(() => {
        if (!frameLoaded) {
            console.log('Timeout reached, forcing iframe display');
            const frame = document.getElementById('pushbulletFrame');
            const loader = document.getElementById('loader');
            if (frame) {
                frame.style.display = 'block';
            }
            if (loader) {
                loader.style.display = 'none';
            }
            frameLoaded = true;
        }
    }, 3000);
});