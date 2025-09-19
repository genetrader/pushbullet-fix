'use strict'

var textMappings = {
    'sign-in': 'sign_in',
    'sign-up': 'panel_sign_up',
    'cant-sign-in': 'panel_cant_sign_in',
    'third-party-cookies': 'panel_third_party_cookies',
    'pushing-tab-label': 'pushing',
    'sms-tab-label': 'sms',
    'notifications-tab-label': 'notifications',
    'account-tab-label': 'account',
    'friends-tab': 'friends',
    'me-tab': 'me',
    'following-tab': 'following',
    'notifications-empty-text': 'no_notifications',
    'sms-disclaimer-tooltip': 'sms_disclaimer',
    'compose-recipient-picker-label': 'recipient_placeholder',
    'settings': 'options',
    'sign-out': 'sign_out',
    'pushbullet-pro': 'pushbullet_pro',
    'sms-no-devices-text': 'sms_no_devices_text'
}

var tabId
window.init = function() {
    if (pb.settings.needsDataApproval) {
        pb.openTab('welcome.html')
        window.close()
        return
    }

    if (!location.hash) {
        tabId = 'panel'
        setUp()
    } else {
        if (pb.browser == 'firefox') { // Special case for Firefox since chrome.runtime.sendMessage doesn't seem to work yet
            chrome.tabs.query({ 'currentWindow': true, 'active' : true}, function(tabs) {
                tabId = tabs[0].id
                setUp()
            })
        } else {
            chrome.runtime.sendMessage({
                'type': 'loopback'
            }, function(response) {
                tabId = response.tabId
                setUp()
            })
        }
    }
}

var setUp = function() {
    if (location.hash) {
        document.body.classList.add(location.hash.substring(1))
    }

    Object.keys(textMappings).forEach(function(key) {
        document.getElementById(key).textContent = chrome.i18n.getMessage(textMappings[key])
    })

    moment.locale(navigator.language)

    var goToSite = function() {
        pb.openTab(pb.www)
    }

    document.getElementById('logo-link').onclick = goToSite

    var signIn = function() {
        pb.openTab('https://www.pushbullet.com/signin?source=' + pb.browser)
    }

    document.getElementById('sign-in').onclick = signIn
    document.getElementById('sign-up').onclick = signIn

    document.getElementById('third-party-cookies').onclick = function() {
        pb.openTab('https://support.mozilla.org/en-US/kb/disable-third-party-cookies')
    }

    if (!pb.local.user) {
        return
    }

    if (pb.local.user.pro && pb.settings.darkMode) {
        document.body.classList.add('darkmode')
    }

    document.getElementById('sign-out-link').onclick = function() {
        pb.signOut()
        window.close()
    }

    setTimeout(function() {
        setUpPopout()
        setUpNotificationsContent()
        setUpAccountContent()
        setUpTabs()
        setUpSnooze()
        checkNativeClient()
        monitorAwake()
    }, 100)

    window.addEventListener('unload', onunload)

    pb.track({
        'name': 'goto',
        'url': location.hash ? '/panel' : '/popout'
    })
}

var onunload = function() {
    pb.setAwake(location.hash ? location.hash.substring(1) : 'panel', false)

    tearDownNotificationsContent()
    tearDownMessaging()
}

var setUpPopout = function() {
    var popout = document.getElementById('popout-holder')

    if (location.hash) {
        popout.style.display = 'none'
    } else {
        popout.onclick = function() {
            pb.popOutPanel()
        }
    }
}

var setUpTabs = function() {
    var pushingTab = document.getElementById('pushing-tab')
    var smsTab = document.getElementById('sms-tab')
    var notificationsTab = document.getElementById('notifications-tab')
    var accountTab = document.getElementById('account-tab')

    var tabs = [pushingTab, smsTab, notificationsTab, accountTab]

    var messagingContent = document.getElementById('messaging-content')
    var notificationsContent = document.getElementById('notifications-content')
    var accountContent = document.getElementById('account-content')

    var friendsTab = document.getElementById('friends-tab')
    var meTab = document.getElementById('me-tab')
    var followingTab = document.getElementById('following-tab')

    var pushTabs = [friendsTab, meTab, followingTab]

    var onclick = function(tab) {
        tabs.forEach(function(tab) {
            tab.classList.remove('selected')
        })

        tab.classList.add('selected')

        localStorage.activePanelTab = tab.id.split('-')[0]

        var popoutHolder = document.getElementById('popout-holder')
        if (tab == accountTab) {
            popoutHolder.style.color = 'white'
        } else {
            popoutHolder.style.color = ''
        }

        if (tab == notificationsTab) {
            notificationsContent.style.display = 'block'
            messagingContent.style.display = 'none'
            accountContent.style.display = 'none'

            tearDownMessaging()
        } else if (tab == accountTab) {
            notificationsContent.style.display = 'none'
            messagingContent.style.display = 'none'
            accountContent.style.display = 'block'

            tearDownMessaging()
        } else {
            notificationsContent.style.display = 'none'
            messagingContent.style.display = 'block'
            accountContent.style.display = 'none'

            if (tab == smsTab) {
                setUpMessaging('sms')
            } else {
                var pushTab = document.getElementById(localStorage.activePushingTab + '-tab')
                if (pushTab) {
                    pushTab.onclick()
                } else {
                    meTab.onclick()
                }
            }
        }
    }

    tabs.forEach(function(tab) {
        tab.onclick = function() {
            onclick(tab)
        }
    })

    var pushTabClick = function(tab) {
        pushTabs.forEach(function(tab) {
            tab.classList.remove('selected')
        })

        tab.classList.add('selected')

        localStorage.activePushingTab = tab.id.split('-')[0]

        setUpMessaging(localStorage.activePushingTab)
    }

    pushTabs.forEach(function(tab) {
        tab.onclick = function() {
            pushTabClick(tab)
        }
    })

    if (localStorage.activePanelTab == 'notifications') {
        notificationsTab.click()
    } else if (localStorage.activePanelTab == 'sms') {
        smsTab.click()
    } else if (localStorage.activePanelTab == 'account') {
        accountTab.click()
    } else {
        pushingTab.click()
    }
}

var setUpAccountContent = function() {
    if (!pb.local || !pb.local.user) {
        return
    }

    document.getElementById('account-email').textContent = pb.local.user.email
    document.getElementById('account-image').src = pb.local.user.image_url || 'chip_user.png'

    if (pb.local.user.pro) {
        document.getElementById('ribbon').style.display = 'block'
    }
}

var setUpSnooze = function() {
    var snooze = document.getElementById('snooze-holder')

    if (localStorage.snoozedUntil > Date.now()) {
        snooze.textContent = chrome.i18n.getMessage('unsnooze')
        snooze.onclick = function() {
            pb.unsnooze()

            setTimeout(function() {
                setUpSnooze()
            }, 200)
        }
    } else {
        snooze.textContent = chrome.i18n.getMessage('snooze')
        snooze.onclick = function() {
            pb.snooze()

            setTimeout(function() {
                setUpSnooze()
            }, 100)
        }
    }
}

var checkNativeClient = function() {
    utils.checkNativeClient(function(response) {
        if (response) {
            document.getElementById('notifications-empty').classList.add('desktop-app')
            document.getElementById('notifications-empty-text').textContent = chrome.i18n.getMessage('alert_desktop_app_notifications')
            document.getElementById('snooze-holder').style.display = 'none'
        }
    })
}

var monitorAwake = function() {
    pb.setAwake(location.hash ? location.hash.substring(1) : 'panel', true)

    document.body.onmousemove = function(e) {
        if (window.mouseLastX !== e.clientX || window.mouseLastY !== e.clientY) {
            reportAwake()
        }

        window.mouseLastX = e.clientX
        window.mouseLastY = e.clientY
    }
}

var lastReportedAwake = Date.now()
var reportAwake = function() {
    if (Date.now() - lastReportedAwake > 15 * 1000) {
        lastReportedAwake = Date.now()
        pb.setAwake(location.hash ? location.hash.substring(1) : 'panel', true)
    }
}
