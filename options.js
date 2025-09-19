'use strict'

var textMappings = {
    'heading-general': 'general',
    'heading-notifications': 'notifications',
    'heading-advanced': 'advanced',
    'heading-faqs': 'faqs',
    'darkmode-label': 'darkmode_label',
    'darkmode-desc': 'darkmode_desc',
    'background-permission-label': 'option_background_permission',
    'background-permission-desc': 'option_background_permission_desc',
    'tabs-permission-label': 'option_tabs_permission',
    'tabs-permission-desc': 'option_tabs_permission_desc',
    'hosts-permission-label': 'option_hosts_permission',
    'hosts-permission-desc': 'option_hosts_permission_desc',
    'dark-icon-label': 'option_use_dark_icon',
    'dark-icon-desc': 'option_use_dark_icon_desc',
    'notification-count-label': 'option_show_notification_count',
    'notification-count-desc': 'option_show_notification_count_desc',
    'open-automatically-label': 'option_open_my_pushes_automatically',
    'open-automatically-desc': 'option_open_my_pushes_automatically_desc',
    'auto-attach-link-label': 'option_automatically_attach_link',
    'auto-attach-link-desc': 'option_automatically_attach_link_desc',
    // 'notification-duration-label': 'option_notification_duration',
    'show-notifications-label': 'option_show_mirrors',
    'show-notifications-desc': 'option_show_mirrors_desc',
    'titles-only-label': 'option_only_show_titles',
    'titles-only-desc': 'option_only_show_titles_desc',
    'play-sound-label': 'option_play_sound',
    'play-sound-desc': 'option_play_sound_desc',
    'context-menu-label': 'option_show_context_menu',
    'context-menu-desc': 'option_show_context_menu_desc',
    'instant-push-label': 'option_allow_instant_push',
    'instant-push-desc': 'option_allow_instant_push_desc',
    'e2e-label': 'end_to_end_encryption_label',
    'e2e-desc': 'end_to_end_encryption_desc',
    'e2e-password-label': 'end_to_end_password_label',
    'e2e-password-desc': 'end_to_end_password_desc',
    'e2e-save': 'save',
    'e2e-clear': 'clear',
    'question1': 'how_to_unmute_app',
    'answer1': 'how_to_unmute_app_answer',
    'pro-required': 'pushbullet_pro_required',
    'pro-required-desc': 'pushbullet_pro_feature',
    'pro-dialog-more': 'learn_more',
    'pro-dialog-cancel': 'cancel'
}

window.init = function() {
    Object.keys(textMappings).forEach(function(key) {
        document.getElementById(key).textContent = chrome.i18n.getMessage(textMappings[key])
    })

    document.getElementById('logo-link').href = pb.www
    document.getElementById('version').textContent = 'v' + pb.version

    if (pb.local && pb.local.user) {
        document.getElementById('account-holder').style.display = 'block'
        document.getElementById('account-image').src = pb.local.user.image_url || 'chip_user.png'

        if (pb.local.user.pro) {
            document.getElementById('ribbon').style.display = 'block'

            if (pb.settings.darkMode) {
                document.body.classList.add('darkmode')
            }
        }
    }

    setUpOptions()

    pb.track({
        'name': 'goto',
        'url': '/options'
    })
}

var setUpOptions = function() {
    var basicOption = function(checkboxId, settingKey) {
        var checkbox = document.getElementById(checkboxId)
        checkbox.checked = pb.settings[settingKey]
        checkbox.onclick = function() {
            optionChanged(settingKey, checkbox.checked)
        }
    }

    setUpDarkModeOption()

    basicOption('dark-icon-checkbox', 'useDarkIcon')
    basicOption('notification-count-checkbox', 'showNotificationCount')
    basicOption('open-automatically-checkbox', 'openMyLinksAutomatically')
    basicOption('auto-attach-link-checkbox', 'automaticallyAttachLink')
    basicOption('show-notifications-checkbox', 'showMirrors')
    basicOption('titles-only-checkbox', 'onlyShowTitles')
    basicOption('play-sound-checkbox', 'playSound')
    basicOption('context-menu-checkbox', 'showContextMenu')

    if (pb.browser == 'chrome') {
        setUpBackgroundPermission()
        setUpInstantPushOption()
    }

    setUpTabsPermission()
    setUpHostsPermission()

    // setUpNotificationDurationOption()
    setUpEndToEndOption()

    utils.checkNativeClient(function(response) {
        if (response) {
            document.getElementById('category-notifications').style.display = 'none'
        }
    })
}

var setUpDarkModeOption = function() {
    var checkbox = document.getElementById('darkmode-checkbox')
    checkbox.checked = pb.settings['darkMode']
    checkbox.onclick = function() {
        if (checkbox.checked && !pb.local.user.pro) {
            checkbox.checked = false
            showProPrompt()
        } else {
            optionChanged('darkMode', checkbox.checked)
        }
    }
}

var setUpBackgroundPermission = function() {
    var backgroundPermissionCheckbox = document.getElementById('background-permission-checkbox')

    var hasPermission, permission = { 'permissions': ['background'] }

    var onPermissionUpdate = function(granted) {
        hasPermission = !!granted
        backgroundPermissionCheckbox.checked = hasPermission
    }

    chrome.permissions.contains(permission, onPermissionUpdate)

    backgroundPermissionCheckbox.addEventListener('click', function(event) {
        if (hasPermission) {
            chrome.permissions.remove(permission,
                function(removed) {
                    onPermissionUpdate(!removed)
                }
            )
        } else {
            chrome.permissions.request(permission, onPermissionUpdate)
        }
    })
}

var setUpTabsPermission = function() {
    var tabsPermissionCheckbox = document.getElementById('tabs-permission-checkbox')

    var hasPermission, permission = { 'permissions': ['tabs'] }

    var onPermissionUpdate = function(granted) {
        hasPermission = !!granted
        tabsPermissionCheckbox.checked = hasPermission
    }

    chrome.permissions.contains(permission, onPermissionUpdate)

    tabsPermissionCheckbox.addEventListener('click', function(event) {
        if (hasPermission) {
            chrome.permissions.remove(permission,
                function(removed) {
                    onPermissionUpdate(!removed)
                }
            )
        } else {
            chrome.permissions.request(permission, onPermissionUpdate)
        }
    })
}

var setUpHostsPermission = function() {
    var hostsPermissionCheckbox = document.getElementById('hosts-permission-checkbox')

    var hasPermission, permission = { 'origins': ['http://*/*', 'https://*/*'] }

    var onPermissionUpdate = function(granted) {
        hasPermission = !!granted
        hostsPermissionCheckbox.checked = hasPermission
    }

    chrome.permissions.contains(permission, onPermissionUpdate)

    hostsPermissionCheckbox.addEventListener('click', function(event) {
        if (hasPermission) {
            chrome.permissions.remove(permission,
                function(removed) {
                    onPermissionUpdate(!removed)
                }
            )
        } else {
            chrome.permissions.request(permission, onPermissionUpdate)
        }
    })
}

var setUpInstantPushOption = function() {
    var shortcutLink = document.getElementById('keyboard-shortcut-link')

    chrome.commands.getAll(function(commands) {
        for (var commandKey in commands) {
            var command = commands[commandKey]
            if (command.name === 'instant-push-current-tab' && command.shortcut) {
                shortcutLink.textContent = ' ' + chrome.i18n.getMessage('option_instant_push_shortcuts', [command.shortcut])
                return
            }
        }

        shortcutLink.textContent = ' ' + chrome.i18n.getMessage('option_instant_push_shortcuts_not_set')
    })

    shortcutLink.onclick = function() {
        pb.openTab('chrome://extensions/configureCommands')
    }

    var instantPushCheckbox = document.getElementById('instant-push-checkbox')
    var instantPushDevices = document.getElementById('instant-push-devices')

    if (!pb.local.user || !pb.local.devices) {
        instantPushCheckbox.checked = false
        instantPushCheckbox.disabled = true
        instantPushDevices.disabled = true
        return
    }

    var deviceKeys = Object.keys(pb.local.devices), device, deviceOption

    deviceOption = document.createElement('option')
    deviceOption.value = '*'
    deviceOption.textContent = chrome.i18n.getMessage('all_of_my_devices')

    instantPushDevices.add(deviceOption)

    deviceKeys.map(function(key) {
        device = pb.local.devices[key]
        deviceOption = document.createElement('option')

        deviceOption.value = device.iden
        deviceOption.textContent = device.nickname

        instantPushDevices.add(deviceOption)
    })

    var instantOptionChanged = function() {
        instantPushDevices.disabled = !instantPushCheckbox.checked

        if (instantPushCheckbox.checked) {
            optionChanged('allowInstantPush', true)
            optionChanged('instantPushIden', instantPushDevices.value)
        } else {
            optionChanged('allowInstantPush', false)
        }
    }

    instantPushCheckbox.onclick = instantOptionChanged
    instantPushDevices.onchange = instantOptionChanged

    instantPushCheckbox.checked = pb.settings.allowInstantPush
    instantPushDevices.disabled = !instantPushCheckbox.checked

    if (pb.settings.instantPushIden) {
        instantPushDevices.value = pb.settings.instantPushIden
    } else if (instantPushDevices.children.length) {
        instantPushDevices.value = instantPushDevices.firstChild.value
    }
}

var setUpNotificationDurationOption = function() {
    var notificationDurationSelect = document.getElementById('notification-duration-select')

    if (pb.settings.notificationDuration == '0') {
        notificationDurationSelect.selectedIndex = 1
    } else {
        notificationDurationSelect.selectedIndex = 0
    }

    notificationDurationSelect.onchange = function() {
        optionChanged('notificationDuration', notificationDurationSelect.options[notificationDurationSelect.selectedIndex].value)
    }
}

var setUpEndToEndOption = function() {
    var checkbox = document.getElementById('e2e-checkbox')
    var configuration = document.getElementById('e2e-configuration')

    checkbox.onclick = function() {
        if (checkbox.checked) {
            configuration.style.display = 'block'
        } else {
            clear.onclick()
            configuration.style.display = 'none'
        }
    }

    checkbox.checked = pb.e2e.enabled
    if (checkbox.checked) {
        configuration.style.display = 'block'
    } else {
        configuration.style.display = 'none'
    }

    var input = document.getElementById('e2e-password')
    var save = document.getElementById('e2e-save')
    var clear = document.getElementById('e2e-clear')

    input.value = pb.e2e.enabled ? btoa(pb.e2e.key) : ''

    save.onclick = function() {
        pb.e2e.setPassword(input.value)
    }

    clear.onclick = function() {
        input.value = ''
        save.click()
    }

    input.onkeypress = function(e) {
        if (e.keyCode == 13) {
            pb.e2e.setPassword(input.value)
        }
    }

    input.onfocus = function(e) {
        input.value = ''
    }
}

var optionChanged = function(key, value) {
    if (value == null) {
        // this doesn't work because it isn't saved
        delete pb.settings[key]
    } else {
        pb.settings[key] = value
    }

    pb.saveSettings()
    pb.loadSettings()

    if (pb.local.user.pro && pb.settings.darkMode) {
        document.body.classList.add('darkmode')
    } else {
        document.body.classList.remove('darkmode')
    }
}

var showProPrompt = function() {
    document.getElementById('overlay').style.display = 'block'
    document.getElementById('overlay').onclick = function() {
        hideProPrompt()
    }
    document.getElementById('pro-dialog').onclick = function(e) {
        e.cancelBubble = true
    }
    document.getElementById('pro-dialog-cancel').onclick = function() {
        hideProPrompt()
    }
    document.getElementById('pro-dialog-more').onclick = function () {
        pb.openTab(pb.www + '/pro')
        hideProPrompt()
    }
}

var hideProPrompt = function() {
    document.getElementById('overlay').style.display = 'none'
}
