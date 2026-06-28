'use strict';

// GitHub Update Checker
pb.updateChecker = {
    GITHUB_API: 'https://api.github.com/repos/genetrader/pushbullet-fix/releases/latest',
    CHECK_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
};

pb.updateChecker.getCurrentVersion = function() {
    return parseInt(pb.version) || 0;
};

pb.updateChecker.getReleaseDownloadUrl = function(release) {
    const assets = release.assets || [];
    const extensionZip = assets.find(function(asset) {
        return asset &&
            asset.browser_download_url &&
            /^pushbullet-fix-v\d+\.zip$/i.test(asset.name || '');
    });

    if (extensionZip) {
        return {
            url: extensionZip.browser_download_url,
            name: extensionZip.name
        };
    }

    return {
        url: release.html_url,
        name: ''
    };
};

pb.updateChecker.checkForUpdates = async function() {
    try {
        const response = await fetch(pb.updateChecker.GITHUB_API);
        if (!response.ok) {
            pb.log('Failed to check for updates: ' + response.status);
            return null;
        }

        const release = await response.json();
        const latestVersion = parseInt(release.tag_name.replace(/^v/, '')) || 0;
        const currentVersion = pb.updateChecker.getCurrentVersion();

        if (latestVersion > currentVersion) {
            const download = pb.updateChecker.getReleaseDownloadUrl(release);
            const updateInfo = {
                version: release.tag_name,
                url: release.html_url,
                publishedAt: release.published_at,
                body: release.body || '',
                downloadUrl: download.url,
                assetName: download.name
            };

            // Store update info
            localStorage.latestVersion = JSON.stringify(updateInfo);
            localStorage.lastUpdateCheck = Date.now();

            pb.log('Update available: v' + latestVersion + ' (current: v' + currentVersion + ')');
            return updateInfo;
        } else {
            pb.log('No updates available (current: v' + currentVersion + ')');
            localStorage.lastUpdateCheck = Date.now();
            return null;
        }
    } catch (e) {
        pb.log('Error checking for updates: ' + e.message);
        return null;
    }
};

pb.updateChecker.dismissUpdate = function(version) {
    localStorage['dismissedUpdate_' + version] = 'true';
};

pb.updateChecker.isUpdateDismissed = function(version) {
    return localStorage['dismissedUpdate_' + version] === 'true';
};

pb.updateChecker.checkIfDue = function(delay) {
    const lastCheck = parseInt(localStorage.lastUpdateCheck) || 0;
    const now = Date.now();

    if (now - lastCheck > pb.updateChecker.CHECK_INTERVAL) {
        setTimeout(function() {
            pb.updateChecker.checkForUpdates();
        }, delay || 5000);
    }
};

// Check for updates on startup if last check was > 24 hours ago.
pb.addEventListener('signed_in', function() {
    pb.updateChecker.checkIfDue(5000); // Wait 5 seconds after signin
});

if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onStartup.addListener(function() {
        pb.updateChecker.checkIfDue(5000);
    });

    chrome.runtime.onInstalled.addListener(function() {
        pb.updateChecker.checkIfDue(5000);
    });
}
