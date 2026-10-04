'use strict'

// Manifest V3 context-menu implementation.
// Browser-owned menu items must remain usable after the service worker is
// terminated, so menu IDs encode their target instead of relying on an
// in-memory lookup table.

var CONTEXT_MENU_ALL = 'pb:all'
var CONTEXT_MENU_DEVICE_PREFIX = 'pb:device:'
var CONTEXT_MENU_CHAT_PREFIX = 'pb:chat:'
var CONTEXT_MENU_SNOOZE = 'pb:action:snooze'
var CONTEXT_MENU_UNSNOOZE = 'pb:action:unsnooze'
var CONTEXT_MENU_SEPARATOR = 'pb:separator'

var parseStoredObject = function(value) {
    if (!value) {
        return {}
    }

    if (typeof value == 'object') {
        return value
    }

    try {
        return JSON.parse(value) || {}
    } catch (e) {
        return {}
    }
}

var encodeMenuTarget = function(value) {
    return encodeURIComponent(value || '')
}

var decodeMenuTarget = function(value) {
    try {
        return decodeURIComponent(value || '')
    } catch (e) {
        return ''
    }
}

var createContextMenuItem = function(properties) {
    return new Promise(function(resolve) {
        try {
            chrome.contextMenus.create(properties, function() {
                var error = chrome.runtime.lastError
                if (error) {
                    console.warn('Pushbullet context menu creation failed:', error.message)
                    resolve(false)
                } else {
                    resolve(true)
                }
            })
        } catch (e) {
            console.warn('Pushbullet context menu creation failed:', e)
            resolve(false)
        }
    })
}

var removeAllContextMenuItems = function() {
    return new Promise(function(resolve) {
        try {
            chrome.contextMenus.removeAll(function() {
                // Reading lastError prevents Chromium from reporting an unchecked
                // runtime.lastError while still allowing a rebuild attempt.
                var error = chrome.runtime.lastError
                if (error) {
                    console.warn('Pushbullet context menu cleanup failed:', error.message)
                }
                resolve()
            })
        } catch (e) {
            console.warn('Pushbullet context menu cleanup failed:', e)
            resolve()
        }
    })
}

var readContextMenuState = async function() {
    var stored = {}
    try {
        stored = await chrome.storage.local.get(['devices', 'chats', 'snoozedUntil'])
    } catch (e) {
        console.warn('Pushbullet context menu could not read stored state:', e)
    }

    var storedDevices = parseStoredObject(stored.devices)
    var storedChats = parseStoredObject(stored.chats)

    // Prefer the current in-memory sync result when it exists. Fall back to
    // chrome.storage.local on cold service-worker starts before pb.local has
    // been reconstructed.
    var devices = pb.local && pb.local.devices && Object.keys(pb.local.devices).length
        ? pb.local.devices
        : storedDevices
    var chats = pb.local && pb.local.chats && Object.keys(pb.local.chats).length
        ? pb.local.chats
        : storedChats

    var snoozedUntil = 0
    if (pb.settings && pb.settings.snoozedUntil) {
        snoozedUntil = Number(pb.settings.snoozedUntil) || 0
    } else if (stored.snoozedUntil) {
        snoozedUntil = Number(stored.snoozedUntil) || 0
    }

    return {
        devices: devices || {},
        chats: chats || {},
        snoozed: snoozedUntil > Date.now()
    }
}

pb.updateContextMenu = async function() {
    // Coalesce overlapping sync/startup/storage events. If state changes while
    // a rebuild is running, immediately rebuild once more from the newest state.
    if (pb._contextMenuUpdateRunning) {
        pb._contextMenuUpdateAgain = true
        return
    }

    pb._contextMenuUpdateRunning = true

    try {
        do {
            pb._contextMenuUpdateAgain = false

            var state = await readContextMenuState()
            var contexts = ['page', 'link', 'selection', 'image']
            var desiredItems = []

            // The page context menu is core Pushbullet behavior and is always
            // present. "All of my devices" does not require a device cache, so
            // the menu still exists during a cold start or initial sync.
            desiredItems.push({
                id: CONTEXT_MENU_ALL,
                title: chrome.i18n.getMessage('all_of_my_devices'),
                contexts: contexts
            })

            var devices = utils.asArray(state.devices).sort(function(a, b) {
                return (b.created || 0) - (a.created || 0)
            })

            devices.forEach(function(target) {
                if (!target || !target.iden) {
                    return
                }

                desiredItems.push({
                    id: CONTEXT_MENU_DEVICE_PREFIX + encodeMenuTarget(target.iden),
                    title: utils.streamDisplayName(target),
                    contexts: contexts
                })
            })

            var chats = utils.asArray(state.chats)
            utils.alphabetizeChats(chats)

            var chatItems = []
            chats.forEach(function(target) {
                var email = target && target.with && (target.with.email_normalized || target.with.email)
                if (!email) {
                    return
                }

                chatItems.push({
                    id: CONTEXT_MENU_CHAT_PREFIX + encodeMenuTarget(email),
                    title: utils.streamDisplayName(target),
                    contexts: contexts
                })
            })

            if (chatItems.length > 0) {
                desiredItems.push({
                    id: CONTEXT_MENU_SEPARATOR,
                    type: 'separator',
                    contexts: contexts
                })
                desiredItems = desiredItems.concat(chatItems)
            }

            // Preserve the extension-icon snooze menu as separate action-menu
            // functionality.
            desiredItems.push({
                id: state.snoozed ? CONTEXT_MENU_UNSNOOZE : CONTEXT_MENU_SNOOZE,
                title: chrome.i18n.getMessage(state.snoozed ? 'unsnooze' : 'snooze'),
                contexts: ['action']
            })

            // Only replace the browser menu after the complete desired model is
            // known. This prevents the old "remove everything, then discover
            // devices are not ready" failure mode.
            await removeAllContextMenuItems()

            for (var i = 0; i < desiredItems.length; i++) {
                await createContextMenuItem(desiredItems[i])
            }
        } while (pb._contextMenuUpdateAgain)
    } finally {
        pb._contextMenuUpdateRunning = false
    }
}

var contextMenuItemClicked = function(target, info, tab) {
    var push = {}

    if (target.email) {
        push.email = target.email
    } else if (target.deviceIden) {
        push.device_iden = target.deviceIden
    }

    if (info.srcUrl) {
        utils.downloadImage(info.srcUrl, function(blob) {
            blob.name = utils.imageNameFromUrl(info.srcUrl)
            push.file = blob
            pb.sendPush(push)
        })
        return
    } else if (info.linkUrl) {
        push.type = 'link'
        push.title = info.selectionText
        push.url = info.linkUrl
    } else if (info.selectionText) {
        push.type = 'note'
        push.body = info.selectionText
    } else {
        push.type = 'link'
        push.title = tab && tab.title
        push.url = info.pageUrl || (tab && tab.url)
    }

    pb.sendPush(push)
}

// Register exactly one browser-level click listener. Because the target is
// encoded in menuItemId, this remains valid after a completely cold worker
// restart; there is no transient Map to reconstruct first.
chrome.contextMenus.onClicked.addListener(function(info, tab) {
    var menuId = String(info.menuItemId || '')

    if (menuId == CONTEXT_MENU_SNOOZE) {
        pb.snooze()
        pb.updateContextMenu()
        return
    }

    if (menuId == CONTEXT_MENU_UNSNOOZE) {
        pb.unsnooze()
        pb.updateContextMenu()
        return
    }

    if (menuId == CONTEXT_MENU_ALL) {
        contextMenuItemClicked({}, info, tab)
        return
    }

    if (menuId.indexOf(CONTEXT_MENU_DEVICE_PREFIX) == 0) {
        var deviceIden = decodeMenuTarget(menuId.substring(CONTEXT_MENU_DEVICE_PREFIX.length))
        if (deviceIden) {
            contextMenuItemClicked({ deviceIden: deviceIden }, info, tab)
        }
        return
    }

    if (menuId.indexOf(CONTEXT_MENU_CHAT_PREFIX) == 0) {
        var email = decodeMenuTarget(menuId.substring(CONTEXT_MENU_CHAT_PREFIX.length))
        if (email) {
            contextMenuItemClicked({ email: email }, info, tab)
        }
    }
})

// Rebuild from every reliable lifecycle source rather than depending on one
// later locals_changed event to happen by chance.
pb.addEventListener('signed_in', function() {
    pb.updateContextMenu()
})

pb.addEventListener('locals_changed', function() {
    pb.updateContextMenu()
})

chrome.runtime.onInstalled.addListener(function() {
    pb.updateContextMenu()
})

chrome.runtime.onStartup.addListener(function() {
    pb.updateContextMenu()
})

chrome.storage.onChanged.addListener(function(changes, areaName) {
    if (areaName != 'local') {
        return
    }

    if (changes.devices || changes.chats || changes.snoozedUntil) {
        pb.updateContextMenu()
    }
})

// Service workers can start without onStartup firing (for example when woken by
// another extension event), so initialize from persistent state on every worker
// start as well.
pb.updateContextMenu()
