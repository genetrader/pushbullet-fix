'use strict';

let frameLoaded = false;
let retryCount = 0;
const maxRetries = 3;

function onFrameLoad() {
    const frame = document.getElementById('pushbulletFrame');
    const loader = document.getElementById('loader');

    // Try to inject CSS to hide everything except People section
    try {
        // This will only work if same-origin or CORS allows it
        const frameDoc = frame.contentDocument || frame.contentWindow.document;

        // Wait a bit for the page to fully render
        setTimeout(() => {
            // Inject CSS to hide header, sidebar except People, and show only People content
            const style = frameDoc.createElement('style');
            style.textContent = `
                /* Hide header */
                .navbar, .header, nav { display: none !important; }

                /* Hide sidebar items except People */
                .sidebar > *:not([href*="people"]) { display: none !important; }

                /* Hide everything except the main content area */
                body > *:not(.main-container):not(.content-area) { display: none !important; }

                /* Adjust spacing */
                .main-container { padding-top: 0 !important; }
                .content-area { margin-top: 0 !important; }

                /* Hide unnecessary UI elements */
                .upgrade-banner, .pro-banner, .footer { display: none !important; }
            `;
            frameDoc.head.appendChild(style);

            // Navigate to People section if not already there
            if (!frame.src.includes('#people')) {
                frame.src = 'https://www.pushbullet.com/#people';
            }

            // Show frame, hide loader
            frame.style.display = 'block';
            loader.style.display = 'none';
            frameLoaded = true;
        }, 2000);
    } catch (e) {
        // Cross-origin, try alternative approach
        console.log('Cross-origin frame, using alternative approach');

        // Just navigate to People section
        if (!frame.src.includes('#people')) {
            frame.src = 'https://www.pushbullet.com/#people';
        }

        // Show frame anyway (will show full Pushbullet site)
        setTimeout(() => {
            frame.style.display = 'block';
            loader.style.display = 'none';
            frameLoaded = true;
        }, 2000);
    }
}

function onFrameError() {
    retryCount++;
    if (retryCount < maxRetries) {
        setTimeout(() => {
            document.getElementById('pushbulletFrame').src = 'https://www.pushbullet.com/#people';
        }, 2000);
    } else {
        document.getElementById('loader').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'block';
    }
}

function openPushbullet() {
    if (window.chrome && chrome.tabs) {
        chrome.tabs.create({ url: 'https://www.pushbullet.com/signin' });
    } else {
        window.open('https://www.pushbullet.com/signin', '_blank');
    }
}

// Set up event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const frame = document.getElementById('pushbulletFrame');
    const button = document.getElementById('openPushbulletBtn');

    if (frame) {
        frame.addEventListener('load', onFrameLoad);
        frame.addEventListener('error', onFrameError);
    }

    if (button) {
        button.addEventListener('click', openPushbullet);
    }

    // Timeout fallback
    setTimeout(() => {
        if (!frameLoaded) {
            const frame = document.getElementById('pushbulletFrame');
            frame.style.display = 'block';
            document.getElementById('loader').style.display = 'none';
        }
    }, 5000);
});