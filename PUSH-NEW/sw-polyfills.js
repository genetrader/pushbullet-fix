'use strict';

// Window polyfill for Service Workers
self.window = self;

// Add onerror handler support
self.onerror = null;

// Document polyfill with minimal implementation
self.document = {
    addEventListener: () => {},
    removeEventListener: () => {},
    createElement: () => ({}),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    body: {},
    head: {},
    documentElement: {},
    cookie: '',
    location: self.location
};

// Navigator polyfill extensions
if (!self.navigator) {
    self.navigator = {};
}

// Additional browser globals
self.alert = (message) => console.log('Alert:', message);
self.confirm = () => true;
self.prompt = () => '';

// Chrome extension API compatibility
if (!chrome.extension) {
    chrome.extension = {};
}
if (!chrome.extension.getURL) {
    chrome.extension.getURL = chrome.runtime.getURL;
}
if (!chrome.extension.getBackgroundPage) {
    chrome.extension.getBackgroundPage = () => self;
}

// browserAction to action migration for Manifest V3
if (!chrome.browserAction && chrome.action) {
    chrome.browserAction = chrome.action;
}

// Note: contextMenus.create now requires an ID and uses onClicked event
// This is handled in context-menu-v3.js

// XMLHttpRequest polyfill for Service Workers
class XMLHttpRequest {
    constructor() {
        this.readyState = 0;
        this.status = 0;
        this.statusText = '';
        this.responseText = '';
        this.responseType = '';
        this.response = null;
        this.responseURL = '';
        this.timeout = 0;
        this.withCredentials = false;

        this._method = '';
        this._url = '';
        this._async = true;
        this._headers = {};
        this._abortController = null;

        // Event handlers
        this.onreadystatechange = null;
        this.onload = null;
        this.onerror = null;
        this.onabort = null;
        this.ontimeout = null;
        this.onloadstart = null;
        this.onloadend = null;
        this.onprogress = null;
    }

    open(method, url, async = true) {
        this._method = method;
        this._url = url;
        this._async = async;
        this.readyState = 1;
        this._dispatchEvent('readystatechange');
    }

    setRequestHeader(name, value) {
        this._headers[name] = value;
    }

    getResponseHeader(name) {
        return this._responseHeaders ? this._responseHeaders[name] : null;
    }

    getAllResponseHeaders() {
        if (!this._responseHeaders) return '';
        return Object.entries(this._responseHeaders)
            .map(([name, value]) => `${name}: ${value}`)
            .join('\r\n');
    }

    send(body = null) {
        this._abortController = new AbortController();

        const options = {
            method: this._method,
            headers: this._headers,
            signal: this._abortController.signal,
            credentials: this.withCredentials ? 'include' : 'same-origin'
        };

        if (body !== null && this._method !== 'GET' && this._method !== 'HEAD') {
            options.body = body;
        }

        if (this.timeout > 0) {
            const timeoutId = setTimeout(() => {
                this.abort();
                this._dispatchEvent('timeout');
            }, this.timeout);

            this._abortController.signal.addEventListener('abort', () => {
                clearTimeout(timeoutId);
            });
        }

        this.readyState = 2;
        this._dispatchEvent('readystatechange');
        this._dispatchEvent('loadstart');

        fetch(this._url, options)
            .then(async response => {
                this.status = response.status;
                this.statusText = response.statusText;
                this.responseURL = response.url;

                // Store response headers
                this._responseHeaders = {};
                response.headers.forEach((value, name) => {
                    this._responseHeaders[name] = value;
                });

                this.readyState = 3;
                this._dispatchEvent('readystatechange');

                if (this.responseType === 'json') {
                    this.response = await response.json();
                    this.responseText = JSON.stringify(this.response);
                } else if (this.responseType === 'blob') {
                    this.response = await response.blob();
                } else if (this.responseType === 'arraybuffer') {
                    this.response = await response.arrayBuffer();
                } else {
                    this.responseText = await response.text();
                    this.response = this.responseText;
                }

                this.readyState = 4;
                this._dispatchEvent('readystatechange');
                this._dispatchEvent('load');
                this._dispatchEvent('loadend');
            })
            .catch(error => {
                if (error.name === 'AbortError') {
                    this._dispatchEvent('abort');
                } else {
                    this.readyState = 4;
                    this._dispatchEvent('readystatechange');
                    this._dispatchEvent('error');
                }
                this._dispatchEvent('loadend');
            });
    }

    abort() {
        if (this._abortController) {
            this._abortController.abort();
        }
    }

    _dispatchEvent(type) {
        const handler = this[`on${type}`];
        if (typeof handler === 'function') {
            handler.call(this, { type, target: this });
        }
    }
}

// localStorage polyfill using chrome.storage.local
const localStoragePolyfill = {
    _cache: {},
    _initialized: false,

    async _init() {
        if (this._initialized) return;
        try {
            const data = await chrome.storage.local.get(null);
            this._cache = data || {};
            this._initialized = true;
        } catch (e) {
            console.error('Failed to initialize localStorage polyfill:', e);
            this._initialized = true;
        }
    },

    async getItem(key) {
        await this._init();
        return this._cache[key] || null;
    },

    async setItem(key, value) {
        await this._init();
        this._cache[key] = String(value);
        try {
            await chrome.storage.local.set({ [key]: this._cache[key] });
        } catch (e) {
            console.error('Failed to save to chrome.storage:', e);
        }
    },

    async removeItem(key) {
        await this._init();
        delete this._cache[key];
        try {
            await chrome.storage.local.remove(key);
        } catch (e) {
            console.error('Failed to remove from chrome.storage:', e);
        }
    },

    async clear() {
        this._cache = {};
        try {
            await chrome.storage.local.clear();
        } catch (e) {
            console.error('Failed to clear chrome.storage:', e);
        }
    },

    get length() {
        return Object.keys(this._cache).length;
    },

    key(index) {
        const keys = Object.keys(this._cache);
        return keys[index] || null;
    }
};

// Create a synchronous-like wrapper for localStorage
const localStorage = new Proxy({}, {
    get(target, prop) {
        if (prop in localStoragePolyfill) {
            return localStoragePolyfill[prop];
        }
        // For property access like localStorage.someKey
        return localStoragePolyfill._cache[prop];
    },

    set(target, prop, value) {
        localStoragePolyfill._cache[prop] = String(value);
        chrome.storage.local.set({ [prop]: String(value) }).catch(e => {
            console.error('Failed to save to chrome.storage:', e);
        });
        return true;
    },

    deleteProperty(target, prop) {
        delete localStoragePolyfill._cache[prop];
        chrome.storage.local.remove(prop).catch(e => {
            console.error('Failed to remove from chrome.storage:', e);
        });
        return true;
    }
});

// Initialize localStorage cache on service worker start
localStoragePolyfill._init();

// Make them globally available
self.XMLHttpRequest = XMLHttpRequest;
self.localStorage = localStorage;