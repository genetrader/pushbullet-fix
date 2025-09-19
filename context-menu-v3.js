'use strict'

// Store menu item metadata for click handling
const menuItemData = new Map();

pb.addEventListener('signed_in', function(e) {
    pb.addEventListener('locals_changed', function(e) {
        pb.updateContextMenu()
    })
})

// Set up the onClicked listener once
chrome.contextMenus.onClicked.addListener(function(info, tab) {
    const menuData = menuItemData.get(info.menuItemId);
    if (menuData) {
        if (menuData.action === 'snooze') {
            pb.snooze()
            pb.updateContextMenu()
        } else if (menuData.action === 'unsnooze') {
            pb.unsnooze()
            pb.updateContextMenu()
        } else if (menuData.target) {
            contextMenuItemClicked(menuData.target, info, tab)
        }
    }
});

pb.updateContextMenu = function() {
    chrome.contextMenus.removeAll(function() {
        // Clear stored menu data
        menuItemData.clear();

        try {
            if (pb.isSnoozed()) {
                const menuId = 'unsnooze_menu';
                chrome.contextMenus.create({
                    'id': menuId,
                    'title': chrome.i18n.getMessage('unsnooze'),
                    'contexts': ['action'] // 'browser_action' is now 'action' in V3
                })
                menuItemData.set(menuId, { action: 'unsnooze' });
            } else {
                const menuId = 'snooze_menu';
                chrome.contextMenus.create({
                    'id': menuId,
                    'title': chrome.i18n.getMessage('snooze'),
                    'contexts': ['action']
                })
                menuItemData.set(menuId, { action: 'snooze' });
            }
        } catch (e) { }

        if (!pb.settings.showContextMenu || !pb.local.devices) {
            return
        }

        var contexts = ['page', 'link', 'selection', 'image']

        var devices = utils.asArray(pb.local.devices).sort(function(a, b) {
            return b.created - a.created
        })

        devices.unshift({
            'name': chrome.i18n.getMessage('all_of_my_devices')
        })

        devices.forEach(function(target, index) {
            const menuId = 'device_' + index;
            chrome.contextMenus.create({
                'id': menuId,
                'title': utils.streamDisplayName(target),
                'contexts': contexts
            })
            menuItemData.set(menuId, { target: target });
        })

        var chats = utils.asArray(pb.local.chats)
        utils.alphabetizeChats(chats)

        if (devices.length > 0 && chats.length > 0) {
            chrome.contextMenus.create({
                'id': 'separator_1',
                'type': 'separator',
                'contexts': contexts
            })
        }

        chats.forEach(function(target, index) {
            const menuId = 'chat_' + index;
            chrome.contextMenus.create({
                'id': menuId,
                'title': utils.streamDisplayName(target),
                'contexts': contexts
            })
            menuItemData.set(menuId, { target: target });
        })
    });
}

var contextMenuItemClicked = function(target, info, tab) {
    var push = {}

    if (target.with) {
        push.email = target.with.email
    } else if (target.iden) {
        push.device_iden = target.iden
    }

    if (info.srcUrl) {
        utils.downloadImage(info.srcUrl, function(blob) {
            blob.name =  utils.imageNameFromUrl(info.srcUrl)
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
        push.title = tab.title
        push.url = info.pageUrl
    }

    pb.sendPush(push)
}