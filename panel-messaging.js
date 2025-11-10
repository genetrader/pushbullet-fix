'use strict'

// Listen for state updates from the background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'stateUpdate') {
        if (request.event === 'sms_changed') {
            // SMS data has changed, refresh if we're in SMS tab
            if (activeMessagingTab === 'sms' && typeof smsChangedListener === 'function') {
                smsChangedListener()
            }
        } else if (request.event === 'locals_changed') {
            // Local state has changed, refresh active tab
            if (activeMessagingTab === 'sms' && typeof smsLocalsChangedListener === 'function') {
                smsLocalsChangedListener()
            } else if (activeMessagingTab && typeof pushesLocalsChangedListener === 'function') {
                // Update push tab (me, friends, following)
                pushesLocalsChangedListener()
            }
        }
    }
    return false
})

onFocusChanged = function() {
    if (activeMessagingTab == 'sms') {
        updateActiveSmsChat()
    } else {
        updateActivePushChat()
    }

    if (focused) {
        if (activeMessagingTab != 'sms') {
            pushesLocalsChangedListener()
        }
    }
}

var activeMessagingTab, messagingLeft, messagingRight

var setUpMessaging = function(tab) {
    messagingLeft = document.getElementById('messaging-content-left')
    messagingRight = document.getElementById('messaging-content-right')

    var pushTop = document.getElementById('push-top')
    var smsTop = document.getElementById('sms-top')
    var pushRight = document.getElementById('push-right')
    var smsRight = document.getElementById('sms-right')

    document.getElementById('sms-input').value = localStorage.storedSms || ''

    tearDownMessaging()

    messagingRight.style.display = 'block'

    activeMessagingTab = tab

    if (activeMessagingTab == 'sms') {
        pushTop.style.display = 'none'
        pushRight.style.display = 'none'
        smsTop.style.display = 'block'
        smsRight.style.display = 'block'

        setUpSmsMessaging()
    } else {
        pushTop.style.display = 'block'
        pushRight.style.display = 'block'
        smsTop.style.display = 'none'
        smsRight.style.display = 'none'

        if (activeMessagingTab == 'following') {
            setUpPushMessaging('following')
        } else if (activeMessagingTab == 'friends') {
            setUpPushMessaging('friends')
        } else {
            setUpPushMessaging('me')
        }
    }

    setUpDropZone('messaging-content-right', 'drop-zone', function(file) {
        if (!file) {
            return
        }

        if (activeMessagingTab == 'sms') {
            handleSmsFile(file)
        } else {
            var target = getTargetStream()

            // If no target selected, try to get the first available device
            if (!target) {
                // Try to select "All Devices" if available
                var allDevicesRow = document.getElementById('*')
                if (allDevicesRow) {
                    allDevicesRow.click()
                    target = getTargetStream()
                }

                // If still no target, can't proceed
                if (!target) {
                    alert('Please select a device or friend to send the file to')
                    return
                }
            }

            var push = {
                'file': file
            }

            addTarget(target, push)

            pb.sendPush(push)
        }
    })

    var fileInput = document.getElementById('file-input')

    // Remove old listener if exists
    var oldListener = fileInput.onFileInputChange
    if (oldListener) {
        fileInput.removeEventListener('change', oldListener)
    }

    // Define the new listener
    var fileInputChangeHandler = function(e) {
        console.log('File input changed, files:', e.target.files);
        console.log('Active messaging tab:', activeMessagingTab);

        if (activeMessagingTab == 'sms') {
            var file = e.target.files[0]
            if (!file) {
                console.log('No file selected for SMS');
                return
            }

            handleSmsFile(file)
        } else {
            var target = getTargetStream()
            console.log('Target stream:', target);

            // If no target selected, try to get the first available device
            if (!target) {
                console.log('No target stream selected, looking for default target');
                // Try to select "All Devices" if available
                var allDevicesRow = document.getElementById('*')
                if (allDevicesRow) {
                    console.log('Selecting "All Devices" as default target');
                    allDevicesRow.click()
                    target = getTargetStream()
                }

                // If still no target, can't proceed
                if (!target) {
                    console.error('No target available for file upload');
                    alert('Please select a device or friend to send the file to');
                    return
                }
            }

            var files = e.target.files
            if (!files || files.length == 0) {
                console.log('No files selected');
                return
            }

            for (var i = 0; i < files.length; i++) {
                var file = files[i]
                console.log('Processing file:', file.name, file.type, file.size);

                var push = {
                    'file': file
                }

                addTarget(target, push)
                console.log('Sending push with file:', push);

                pb.sendPush(push)
            }
        }

        fileInput.value = null
    }

    // Store reference and add listener
    fileInput.onFileInputChange = fileInputChangeHandler
    fileInput.addEventListener('change', fileInputChangeHandler, false)
}

var tearDownMessaging = function() {
    resetMessagingContent()
    tearDownPushMessaging()
    tearDownSmsMessaging()
}

var resetMessagingContent = function() {
    if (messagingLeft) {
        while (messagingLeft.hasChildNodes()) {
            messagingLeft.removeChild(messagingLeft.lastChild)
        }

        messagingRight.style.display = 'none'
    }
}

var createStreamRow = function(imageUrl, name, description, descriptionCssClass, onPopOutClick) {
    var img = document.createElement('img')
    img.className = 'stream-row-image'
    img.src = imageUrl

    var content = document.createElement('div')
    content.className = 'stream-row-content'

    var line1 = document.createElement('div')
    line1.className = 'one-line'
    line1.textContent = name

    content.appendChild(line1)

    if (description) {
        var line2 = document.createElement('div')
        line2.className = 'one-line secondary'
        line2.textContent = description

        if (descriptionCssClass) {
            line2.classList.add(descriptionCssClass)
        }

        content.appendChild(line2)
    } else {
        line1.style.lineHeight = '36px'
    }

    var div = document.createElement('div')
    div.className = 'stream-row'
    div.appendChild(img)
    div.appendChild(content)

    if (onPopOutClick) {
        var popOutIcon = document.createElement('i')
        popOutIcon.className = 'pushfont-popout'

        var popOut = document.createElement('div')
        popOut.className = 'pop-out-stream'
        popOut.appendChild(popOutIcon)
        popOut.onclick = onPopOutClick

        div.appendChild(popOut)
    }

    return div
}

var clearSelectedStream = function() {
    var selectedSet = document.getElementsByClassName('stream-row selected')
    for (var i = 0; i < selectedSet.length; i++) {
        var selected = selectedSet[i]
        selected.classList.remove('selected')
    }
}

var scrollStreamRowIntoViewIfNecessary = function(row) {
    messagingLeft.scrollTop = 0

    if (row) {
        var index = 0, element = row
        while ((element = element.previousElementSibling) != null) {
            index++
        }
        
        if (index > 6) {
            row.scrollIntoView(true)
        }
    }
}

var handleSmsFile = function(file) {
    var device = smsDeviceInput.target
    var thread = smsInput.thread

    // Validation checks with user feedback
    if (!device) {
        alert('Please select a phone device first')
        return
    }

    if (!thread) {
        alert('Please select a conversation first')
        return
    }

    if (!device.has_mms) {
        alert('This device does not support MMS. Please enable MMS on your phone or select a different device.')
        return
    }

    if (!file.type || file.type.indexOf('image/') !== 0) {
        alert('Only image files are supported for MMS. Please select a JPG, PNG, or other image file.')
        return
    }

    var img = document.createElement("img")
    img.onload = function() {
        var canvas = document.createElement('canvas')

        var preprocess = canvas.getContext('2d')
        preprocess.drawImage(img, 0, 0)

        var height = img.height
        var width = img.width

        if (width > height) {
            if (width > 1536) {
                height *= 1536 / width
                width = 1536
            }
        } else {
            if (height > 1536) {
                width *= 1536 / height
                height = 1536
            }
        }

        canvas.width = width
        canvas.height = height

        var context = canvas.getContext('2d')
        context.drawImage(img, 0, 0, width, height)

        var dataUrl = canvas.toDataURL(file.type)

        var mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0]

        var byteString
        if (dataUrl.split(',')[0].indexOf('base64') >= 0) {
            byteString = atob(dataUrl.split(',')[1])
        } else {
            byteString = unescape(dataUrl.split(',')[1])
        }

        var array = new Uint8Array(byteString.length)
        for (var i = 0; i < byteString.length; i++) {
            array[i] = byteString.charCodeAt(i)
        }

        var blob = new Blob([array], { 'type': mimeString })

        var addresses = thread.recipients.map(function(recipient) {
            return recipient.address
        })

        var smsPromise = pb.sendSms({
            'target_device_iden': device.iden,
            'addresses': addresses,
            'file': blob
        })

        // Handle promise if it exists (Manifest V3)
        if (smsPromise && typeof smsPromise.then === 'function') {
            smsPromise.then(function() {
                // Success - wait for server to sync before refreshing UI
                console.log('MMS image sent successfully')

                // Wait longer for server sync (2-3 seconds), then refresh multiple times
                var refreshAttempts = 0
                var maxAttempts = 5

                var attemptRefresh = function() {
                    refreshAttempts++

                    pb.sendMessage('getState', {}).then(function(response) {
                        if (response) {
                            // Debug: log what we got
                            console.log('Refresh attempt ' + refreshAttempts + ':',
                                'successfulSms keys:', Object.keys(response.successfulSms || {}).length,
                                'smsQueue length:', (response.smsQueue || []).length,
                                'texts count:', Object.keys(response.local.texts || {}).length
                            )

                            // Update local queues
                            pb.successfulSms = response.successfulSms || {}
                            pb.smsQueue = response.smsQueue || []
                            pb.local = response.local || pb.local

                            // Trigger locals_changed event to update UI
                            pb.dispatchEvent('locals_changed')
                            console.log('SMS UI refresh triggered (attempt ' + refreshAttempts + ')')

                            // Keep refreshing for a few seconds to catch the sync
                            if (refreshAttempts < maxAttempts) {
                                setTimeout(attemptRefresh, 1000)
                            }
                        }
                    }).catch(function(error) {
                        console.error('Failed to refresh SMS state:', error)
                    })
                }

                // Start refreshing after 1 second, then every second for 5 seconds
                setTimeout(attemptRefresh, 1000)
            }).catch(function(error) {
                console.error('Failed to send SMS with file:', error)
                alert('Failed to send MMS image. Please try again.')
            })
        }

        pb.track({
            'name': 'sms_send',
            'thread': true,
            'window': location.hash ? 'popout' : 'panel',
            'address_count': addresses.length,
            'image': true
        })
    }

    img.onerror = function() {
        alert('Failed to load the image. Please try a different file.')
    }

    var reader = new FileReader()
    reader.onload = function(e) {
        img.src = e.target.result
    }

    reader.onerror = function() {
        alert('Failed to read the file. Please try again.')
    }

    reader.readAsDataURL(file)
}
