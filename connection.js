'use strict'

pb.addEventListener('signed_in', function(e) {
    pb.addEventListener('online', function(e) {
        setTimeout(function() {
            connect()
        }, 2000)
    })

    pb.addEventListener('offline', function(e) {
        disconnect()
    })

    pb.addEventListener('connected', function(e) {
        lastNop = Date.now()
    })

    pb.addEventListener('stream_message', function(e) {
        var message = e.detail

        pb.log('Received message:')
        pb.log(message)

        if (message.type == 'nop') {
            lastNop = Date.now()
        } else if (message.type == 'reconnect') {
            connect()
        }
    })

    connect()
})

pb.addEventListener('signed_out', function(e) {
    disconnect()
})

var DEFAULT_NOP_WAIT = 40 * 1000
var websocket, xhr
var nopInterval, nopWait = DEFAULT_NOP_WAIT, lastNop

var connect = function() {
    disconnect()

    lastNop = Date.now() - DEFAULT_NOP_WAIT + Math.floor(DEFAULT_NOP_WAIT / 4)

    if (!pb.local.apiKey) {
        return
    }

    pb.log('Connecting to server via WebSocket')
    useWebSocket()

    watchNops()
}

var useWebSocket = function() {
    websocket = new WebSocket(pb.websocket + '/' + pb.local.apiKey)
    websocket.onopen = function(e) {
        pb.log('WebSocket onopen')
        pb.dispatchEvent('connected')
    }
    websocket.onmessage = function(e) {
        try {
            nopWait = DEFAULT_NOP_WAIT
            onMessage(e.data)
        } catch (ex) {
            pb.log('Couldn\'t parse message')
        }
    }
}

var onMessage = function(data) {
    try {
        var message = JSON.parse(data)
        if (message.push && message.push.encrypted) {
            message.push = JSON.parse(pb.e2e.decrypt(message.push.ciphertext))
        }

        pb.dispatchEvent('stream_message', message)
    } catch (e) {
        pb.log('Couldn\'t parse message')
    }
}

var watchNops = function() {
    if (nopInterval != null) {
        clearInterval(nopInterval)
    }

    nopInterval = setInterval(function() {
        if (Date.now() - lastNop > nopWait && pb.browserState != 'locked') {
            pb.log('Haven\'t seen a nop lately, reconnecting')
            nopWait = Math.min(10 * 60 * 1000, nopWait * 2)
            connect()
        }
    }, 5 * 1000)
}

var disconnect = function() {
    if (websocket != null) {
        websocket.close()
        websocket = null
    }
    if (xhr != null) {
        xhr.abort()
        xhr = null
    }
    if (nopInterval != null) {
        clearInterval(nopInterval)
    }
}
