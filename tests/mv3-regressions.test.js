'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const repo = path.resolve(__dirname, '..')

const tick = () => new Promise(resolve => setTimeout(resolve, 0))

function createNotifierContext(storageData) {
    const listeners = { clicked: [], closed: [], button: [] }
    const events = {}
    const context = {
        Promise,
        Date,
        JSON,
        Object,
        Array,
        console,
        setTimeout,
        clearTimeout,
        pb: {
            browser: 'chrome',
            browserVersion: 120,
            settings: { showMirrors: true, playSound: false, notificationDuration: 0 },
            notifier: null,
            log: function() {},
            isSnoozed: function() { return false },
            dispatchEvent: function() {},
            addEventListener: function(name, handler) {
                events[name] = events[name] || []
                events[name].push(handler)
            }
        },
        utils: { wrap: function(callback) { callback() } },
        chrome: {
            runtime: { lastError: null, onMessage: { addListener: function() {} } },
            storage: {
                local: {
                    get: async function(key) {
                        if (!key) return Object.assign({}, storageData)
                        const result = {}
                        result[key] = storageData[key]
                        return result
                    },
                    set: async function(update) { Object.assign(storageData, update) }
                }
            },
            notifications: {
                create: function(key, spec, callback) { callback(key) },
                update: function(key, spec, callback) { callback(true) },
                clear: function(key, callback) { callback(true) },
                onClicked: { addListener: function(handler) { listeners.clicked.push(handler) } },
                onClosed: { addListener: function(handler) { listeners.closed.push(handler) } },
                onButtonClicked: { addListener: function(handler) { listeners.button.push(handler) } }
            },
            windows: {
                remove: function() {},
                onRemoved: { addListener: function() {} }
            }
        }
    }
    vm.createContext(context)
    vm.runInContext(fs.readFileSync(path.join(repo, 'notifier.js'), 'utf8'), context)
    return { context, listeners, events }
}

async function testDismissalSurvivesWorkerRestart() {
    const storage = {}
    const first = createNotifierContext(storage)
    first.context.pb.notifier.show({
        key: 'com.example_null_7',
        type: 'basic',
        title: 'Example',
        message: 'Message',
        iconUrl: 'icon.png',
        dismissal: { type: 'mirror', mirror: { package_name: 'com.example', notification_id: 7 } }
    })
    await tick()
    await tick()

    assert(storage.notificationDismissalStateV1['com.example_null_7'])

    const restarted = createNotifierContext(storage)
    let recovered = null
    restarted.context.pb.notifier.registerDismissalHandler('mirror', function(dismissal) {
        recovered = dismissal.mirror
        return true
    })
    restarted.listeners.closed[0]('com.example_null_7', true)
    await tick()
    await tick()
    await tick()

    assert.deepStrictEqual(JSON.parse(JSON.stringify(recovered)), {
        package_name: 'com.example',
        notification_id: 7
    })
    assert.strictEqual(storage.notificationDismissalStateV1['com.example_null_7'], undefined)
}

async function testUpdateCheckerReturnsFreshResult() {
    const localStorage = {}
    const context = {
        console,
        localStorage,
        setTimeout,
        clearTimeout,
        pb: {
            version: 383,
            log: function() {},
            addEventListener: function() {}
        },
        chrome: {
            runtime: {
                onStartup: { addListener: function() {} },
                onInstalled: { addListener: function() {} }
            }
        },
        fetch: async function() {
            return {
                ok: true,
                json: async function() {
                    return {
                        tag_name: 'v384',
                        html_url: 'https://github.com/genetrader/pushbullet-fix/releases/tag/v384',
                        published_at: '2026-10-04T00:00:00Z',
                        body: 'notes',
                        assets: [{
                            name: 'pushbullet-fix-v384.zip',
                            browser_download_url: 'https://example.invalid/pushbullet-fix-v384.zip'
                        }]
                    }
                }
            }
        }
    }
    vm.createContext(context)
    vm.runInContext(fs.readFileSync(path.join(repo, 'update-checker.js'), 'utf8'), context)

    const available = await context.pb.updateChecker.checkForUpdates()
    assert.strictEqual(available.updateAvailable, true)
    assert.strictEqual(available.updateInfo.version, 'v384')
    assert.strictEqual(available.updateInfo.assetName, 'pushbullet-fix-v384.zip')

    context.pb.version = 384
    const current = await context.pb.updateChecker.checkForUpdates()
    assert.strictEqual(current.updateAvailable, false)
    assert.strictEqual(localStorage.latestVersion, undefined)
}

async function main() {
    await testDismissalSurvivesWorkerRestart()
    await testUpdateCheckerReturnsFreshResult()
    console.log('MV3 regression tests passed')
}

main().catch(function(error) {
    console.error(error)
    process.exitCode = 1
})
