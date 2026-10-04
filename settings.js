'use strict'

pb.addEventListener('signed_in', function(e) {
    pb.updateIcon()

    pb.addEventListener('notifications_changed', function(e) {
        pb.updateIcon()
    })
})

pb.loadSettings = function() {
    pb.settings = {
        'darkMode': localStorage['darkMode'] === 'true',
        'openMyLinksAutomatically': localStorage['openMyLinksAutomatically'] !== 'false',
        'onlyShowTitles': localStorage['onlyShowTitles'] === 'true',
        'useDarkIcon': localStorage['useDarkIcon'] === 'true',
        'playSound': localStorage['playSound'] === 'true',
        'showMirrors': localStorage['showMirrors'] !== 'false',
        'showContextMenu': localStorage['showContextMenu'] !== 'false',
        'notificationDuration': parseInt(localStorage['notificationDuration']) || 0,
        'snoozedUntil': localStorage['snoozedUntil'] ? parseInt(localStorage['snoozedUntil']) || 0 : 0,
        'showNotificationCount': localStorage['showNotificationCount'] !== 'false',
        'hideSignInReminder': localStorage['hideSignInReminder'] === 'true',
        'allowInstantPush': localStorage['allowInstantPush'] === 'true',
        'instantPushIden': localStorage['instantPushIden'],
        'automaticallyAttachLink': localStorage['automaticallyAttachLink'] !== 'false',
        'disableAnalytics': localStorage['disableAnalytics'] === 'true',
        'needsDataApproval': localStorage['needsDataApproval'] === 'true'
    }

    pb.updateContextMenu()
    pb.updateIcon()

    clearTimeout(pb.snoozeTimeout)
    if (pb.isSnoozed()) {
        pb.snoozeTimeout = setTimeout(function() {
            delete localStorage.snoozedUntil
            pb.loadSettings()
        }, localStorage.snoozedUntil - Date.now())
    }
}

pb.saveSettings = function() {
    Object.keys(pb.settings).forEach(function(key) {
        localStorage[key] = pb.settings[key]
    })

    pb.dispatchEvent('notifications_changed')
}

pb.snooze = function() {
    localStorage.snoozedUntil = Date.now() + (60 * 60 * 1000)
    pb.loadSettings()
}

pb.unsnooze = function() {
    delete localStorage.snoozedUntil
    pb.loadSettings()
}

pb.isSnoozed = function() {
    return pb.settings.snoozedUntil > Date.now()
}

pb.updateIcon = function() {
    // Use chrome.action for Manifest V3
    var iconApi = chrome.action || chrome.browserAction

    if (!localStorage.apiKey) {
        iconApi.setBadgeBackgroundColor({ 'color': '#e85845' })
        iconApi.setBadgeText({ 'text': '1' })
        return
    }

    if (pb.settings.useDarkIcon) {
        iconApi.setIcon({
            'path': {
                '19': 'icon_19_gray.png',
                '38': 'icon_38_gray.png'
            }
        })
    } else {
        iconApi.setIcon({
            'path': {
                '19': 'icon_19.png',
                '38': 'icon_38.png'
            }
        })
    }

    if (pb.isSnoozed()) {
        iconApi.setBadgeText({ 'text': 'zzz' })

        if (pb.settings.useDarkIcon) {
            iconApi.setBadgeBackgroundColor({ 'color': '#76c064' })
        } else {
            iconApi.setBadgeBackgroundColor({ 'color': '#4a4a4a' })
        }
    } else {
        var notificationCount = Object.keys(pb.notifier.active).length
        iconApi.setBadgeText({
            'text': (notificationCount > 0 && pb.settings.showNotificationCount) ? '' + notificationCount : ''
        })

        if (pb.settings.useDarkIcon) {
            iconApi.setBadgeBackgroundColor({ 'color': '#4ab367' })
        } else {
            iconApi.setBadgeBackgroundColor({ 'color': '#e85845' })
        }
    }
}
