pb.fileQueue = []

var xhrs = {}

pb.pushFile = function(push) {
    push.queued = true

    pb.fileQueue.push(push)

    pb.dispatchEvent('locals_changed')

    // Broadcast to all tabs/windows
    if (pb.broadcastStateUpdate) {
        pb.broadcastStateUpdate('locals_changed', {
            fileQueue: pb.fileQueue
        })
    }

    startUpload()
}

pb.smsFile = function(sms) {
    sms.type = 'sms'

    pb.fileQueue.push(sms)

    pb.dispatchEvent('locals_changed')

    // Broadcast to all tabs/windows
    if (pb.broadcastStateUpdate) {
        pb.broadcastStateUpdate('locals_changed', {
            fileQueue: pb.fileQueue
        })
    }

    // Create a promise that resolves when upload completes
    var promise = new Promise(function(resolve, reject) {
        sms._uploadResolve = resolve
        sms._uploadReject = reject
    })

    startUpload()

    return promise
}

pb.cancelUpload = function(push) {
    var index = pb.fileQueue.indexOf(push)
    if (index != -1) {
        pb.fileQueue.splice(index, 1)
    }

    var xhr = xhrs[push]
    if (xhr) {
        xhr.abort()
        uploading = false
        startUpload()
    }

    pb.dispatchEvent('locals_changed')
}

var uploading = false
var startUpload = function() {
    if (uploading) {
        return
    }

    var data = pb.fileQueue[0]
    if (!data) {
        return
    }

    var failed, succeeded
    if (data.type =='sms') {
        failed = function() {
            uploading = false
            pb.fileQueue.shift()

            // Reject the promise if it exists
            if (data._uploadReject) {
                data._uploadReject(new Error('MMS upload failed'))
            }

            pb.dispatchEvent('locals_changed')

            // Broadcast to all tabs/windows
            if (pb.broadcastStateUpdate) {
                pb.broadcastStateUpdate('locals_changed', {
                    fileQueue: pb.fileQueue
                })
            }

            startUpload()
        }

        succeeded = function(response) {
            uploading = false
            pb.fileQueue.shift()

            delete data.file

            data.file_url = response.file_url
            data.file_type = response.file_type

            // Send the SMS and wait for it to complete before resolving our promise
            var smsResult = pb.sendSms(data)

            // If pb.sendSms returns a promise, wait for it
            if (smsResult && typeof smsResult.then === 'function') {
                smsResult.then(function() {
                    if (data._uploadResolve) {
                        data._uploadResolve(response)
                    }
                }).catch(function(error) {
                    if (data._uploadReject) {
                        data._uploadReject(error)
                    }
                })
            } else {
                // No promise, resolve immediately
                if (data._uploadResolve) {
                    data._uploadResolve(response)
                }
            }

            // Broadcast to all tabs/windows
            if (pb.broadcastStateUpdate) {
                pb.broadcastStateUpdate('locals_changed', {
                    fileQueue: pb.fileQueue
                })
            }

            startUpload()
        }
    } else {
        failed = function() {
            uploading = false
            delete data.progress
            data.failed = true
            pb.fileQueue.shift()
            pb.failedPushes.push(data)

            pb.dispatchEvent('locals_changed')

            // Broadcast to all tabs/windows
            if (pb.broadcastStateUpdate) {
                pb.broadcastStateUpdate('locals_changed', {
                    fileQueue: pb.fileQueue,
                    failedPushes: pb.failedPushes
                })
            }

            startUpload()
        }

        succeeded = function(response) {
            uploading = false
            pb.fileQueue.shift()

            delete data.file

            data.type = 'file'
            data.file_name = response.file_name
            data.file_type = response.file_type
            data.file_url = response.file_url
            pb.sendPush(data)

            // Broadcast to all tabs/windows
            if (pb.broadcastStateUpdate) {
                pb.broadcastStateUpdate('locals_changed', {
                    fileQueue: pb.fileQueue
                })
            }

            startUpload()
        }
    }

    uploading = true

    uploadFile(data, succeeded, failed)
}

var uploadFile = function(data, onsuccess, onfail) {
    pb.post(pb.api + '/v3/start-upload', {
        'name': data.file.name,
        'size': data.file.size,
        'suggested_type': data.file.type
    }, function(response, error) {
        if (!response) {
            onfail(error)
            return
        }

        try {
            var tasks = [], progress = 0

            var start = 0
            response.piece_urls.forEach(function(url) {
                var end = start + response.piece_size
                var piece = data.file.slice(start, end)

                var task = {
                    'url': url,
                    'piece': piece
                }

                tasks.push(task)

                start = end
            })

            var finished = function() {
                delete xhrs[data]

                pb.post(pb.api + '/v3/finish-upload', {
                    'id': response.id
                }, function(response) {
                    if (response) {
                        onsuccess(response)
                    } else {
                        onfail()
                    }
                })
            }

            var runTask = function(task) {
                pb.log('Uploading chunk to ' + task.url)

                var xhr = new XMLHttpRequest()
                xhr.open("POST", task.url, true)

                var lastUpdate = Date.now()

                // Check if xhr.upload exists (not available in service worker polyfill)
                if (xhr.upload) {
                    xhr.upload.onprogress = function(e) {
                        var percent = e.loaded / e.total
                        var percentInRemainingTasks = tasks.length / response.piece_urls.length
                        data.progress = (1 - percentInRemainingTasks) * percent + ((response.piece_urls.length - (tasks.length + 1)) / response.piece_urls.length)

                        if (Date.now() - lastUpdate > 900) {
                            pb.dispatchEvent('locals_changed')
                            lastUpdate = Date.now()
                        }
                    }
                } else {
                    // Fallback: estimate progress without upload events
                    pb.log('xhr.upload not available, using estimated progress')
                    data.progress = ((response.piece_urls.length - (tasks.length + 1)) / response.piece_urls.length)
                    pb.dispatchEvent('locals_changed')
                }

                xhr.onload = function () {
                    delete xhrs[data]

                    var next = tasks.shift()
                    if (next) {
                        runTask(next)
                    } else {
                        finished()
                    }
                }

                xhr.onerror = function() {
                    delete xhrs[data]
                    onfail()
                }

                xhr.send(task.piece)

                xhrs[data] = xhr
            }

            var task = tasks.shift()
            runTask(task)
        } catch (e) {
            onfail()
            throw e
        }
    })
}
