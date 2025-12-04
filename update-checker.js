'use strict';

// GitHub Update Checker
pb.updateChecker = {
    GITHUB_API: 'https://api.github.com/repos/genetrader/pushbullet-fix/releases/latest',
    CHECK_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
};

pb.updateChecker.getCurrentVersion = function() {
    return parseInt(pb.version) || 0;
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
            const updateInfo = {
                version: release.tag_name,
                url: release.html_url,
                publishedAt: release.published_at,
                body: release.body || '',
                downloadUrl: release.zipball_url
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

// Check for updates on startup if last check was > 24 hours ago
pb.addEventListener('signed_in', function() {
    const lastCheck = parseInt(localStorage.lastUpdateCheck) || 0;
    const now = Date.now();

    if (now - lastCheck > pb.updateChecker.CHECK_INTERVAL) {
        setTimeout(function() {
            pb.updateChecker.checkForUpdates();
        }, 5000); // Wait 5 seconds after signin
    }
});
