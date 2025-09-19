'use strict';

// Initialize with some demo data or load from extension storage
let friends = [];
let selectedFriend = null;

function loadFriends() {
    // Try to get friends from the extension's local storage
    if (window.chrome && chrome.runtime) {
        chrome.runtime.sendMessage({ action: 'getState' }, function(response) {
            if (response && response.local && response.local.chats) {
                friends = response.local.chats;
                renderFriends();
            } else {
                // Show demo data if no real data
                showDemoData();
            }
        });
    } else {
        showDemoData();
    }
}

function showDemoData() {
    friends = [
        { name: 'John Doe', email: 'john@example.com', with: { email_normalized: 'john@example.com' } },
        { name: 'Jane Smith', email: 'jane@example.com', with: { email_normalized: 'jane@example.com' } }
    ];
    renderFriends();
}

function renderFriends() {
    const peopleList = document.getElementById('peopleList');
    peopleList.innerHTML = '';

    if (friends.length === 0) {
        peopleList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No friends yet</div>';
        return;
    }

    friends.forEach(friend => {
        const item = document.createElement('div');
        item.className = 'person-item';
        item.addEventListener('click', function() {
            selectFriend(friend, item);
        });

        const avatar = document.createElement('div');
        avatar.className = 'person-avatar';
        avatar.textContent = (friend.name || friend.email || 'U')[0].toUpperCase();

        const info = document.createElement('div');
        info.className = 'person-info';

        const name = document.createElement('div');
        name.className = 'person-name';
        name.textContent = friend.name || friend.with?.email_normalized || friend.email || 'Unknown';

        const email = document.createElement('div');
        email.className = 'person-email';
        email.textContent = friend.with?.email_normalized || friend.email || '';

        info.appendChild(name);
        if (email.textContent) {
            info.appendChild(email);
        }

        item.appendChild(avatar);
        item.appendChild(info);
        peopleList.appendChild(item);
    });
}

function selectFriend(friend, itemElement) {
    selectedFriend = friend;

    // Update UI
    document.querySelectorAll('.person-item').forEach(item => {
        item.classList.remove('selected');
    });
    itemElement.classList.add('selected');

    // Show chat view
    document.querySelector('.empty-state').style.display = 'none';
    document.getElementById('chatView').style.display = 'flex';

    // Update chat header
    const chatHeader = document.getElementById('chatHeader');
    chatHeader.innerHTML = `
        <div style="display: flex; align-items: center;">
            <div class="person-avatar" style="margin-right: 12px;">
                ${(friend.name || friend.email || 'U')[0].toUpperCase()}
            </div>
            <div>
                <div class="person-name">${friend.name || friend.with?.email_normalized || 'Unknown'}</div>
                <div class="person-email" style="font-size: 12px;">${friend.with?.email_normalized || ''}</div>
            </div>
        </div>
    `;

    // Load chat messages if available
    loadChatMessages(friend);
}

function loadChatMessages(friend) {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">Start a conversation!</div>';
}

function addFriend() {
    // Open Pushbullet website to add friend
    if (window.chrome && chrome.tabs) {
        chrome.tabs.create({ url: 'https://www.pushbullet.com/#people/new' });
    } else {
        window.open('https://www.pushbullet.com/#people/new', '_blank');
    }
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (message && selectedFriend) {
        // Send via extension's pb.sendPush
        if (window.chrome && chrome.runtime) {
            chrome.runtime.sendMessage({
                action: 'sendPush',
                data: {
                    type: 'note',
                    body: message,
                    email: selectedFriend.with?.email_normalized || selectedFriend.email
                }
            });
        }

        // Clear input
        input.value = '';

        // Show message in UI (optimistic update)
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages.querySelector('div[style*="text-align: center"]')) {
            chatMessages.innerHTML = '';
        }

        const messageEl = document.createElement('div');
        messageEl.style.cssText = 'background: #4ab367; color: white; padding: 10px 15px; border-radius: 18px; margin-bottom: 10px; max-width: 70%; margin-left: auto; width: fit-content;';
        messageEl.textContent = message;
        chatMessages.appendChild(messageEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Handle Enter key in message input and button clicks
document.addEventListener('DOMContentLoaded', function() {
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const addFriendBtn = document.getElementById('addFriendBtn');

    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    if (addFriendBtn) {
        addFriendBtn.addEventListener('click', addFriend);
    }

    // Load friends on page load
    loadFriends();
});