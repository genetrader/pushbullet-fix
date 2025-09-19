'use strict'

var textMappings = {
    'thanks': 'thanks_for_installing_title',
    'cookies-label': 'cookies_label',
    'cookies-desc': 'cookies_desc',
    'analytics-label': 'analytics_label',
    'analytics-desc': 'analytics_desc',
    'heading-privacy': 'heading_privacy',
    'welcome-done': 'sign_in',
    'cookies-required': 'cookies_required'
}

window.init = function() {
    Object.keys(textMappings).forEach(function(key) {
        document.getElementById(key).textContent = chrome.i18n.getMessage(textMappings[key])
    })

    document.getElementById('logo-link').href = pb.www
    document.getElementById('version').textContent = 'v' + pb.version

    var cookiesCheckbox = document.getElementById('cookies-checkbox')
    cookiesCheckbox.onclick = function() {
        if (cookiesCheckbox.checked) {
            document.getElementById('welcome-done').style.display = 'inline-block'
            document.getElementById('cookies-required').style.display = 'none'
        } else {
            document.getElementById('welcome-done').style.display = 'none'
            document.getElementById('cookies-required').style.display = 'block'
        }
    }

    document.getElementById('welcome-done').onclick = function() {
        pb.settings.disableAnalytics = !document.getElementById('analytics-checkbox').checked
        pb.settings.needsDataApproval = false
        pb.saveSettings()
        pb.openTab('https://www.pushbullet.com/signin?source=' + pb.browser)
        window.close()
    }
}
