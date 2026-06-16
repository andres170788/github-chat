// GitHub Chat - Firebase Chat Logic
(function () {
  'use strict';

  // Firebase configuration (from original repo)
  var firebaseConfig = {
    apiKey: "AIzaSyCIW4NPOTP6L2AZDJyZEkd9PkdNLLp8gbA",
    authDomain: "inquid-chat.firebaseapp.com",
    databaseURL: "https://inquid-chat-default-rtdb.firebaseio.com",
    projectId: "inquid-chat",
    storageBucket: "inquid-chat.appspot.com",
    messagingSenderId: "771474336667",
    appId: "1:771474336667:web:819d6a6fe187018f0a0f3e",
    measurementId: "G-2SRNLJ8J2X"
  };

  firebase.initializeApp(firebaseConfig);
  var db = firebase.firestore();

  // Parse URL params for repo context
  var params = new URLSearchParams(window.location.search);
  var repoOwner = params.get('owner') || '';
  var repoName = params.get('repo') || '';
  var chatRoom = repoOwner && repoName ? repoOwner + '/' + repoName : 'general';

  // UI elements
  var roomNameEl = document.getElementById('chat-room-name');
  var roomContextEl = document.getElementById('chat-room-context');
  var namePrompt = document.getElementById('name-prompt');
  var usernameInput = document.getElementById('username-input');
  var usernameSubmit = document.getElementById('username-submit');
  var messagesContainer = document.querySelector('.messages');
  var messagesContent = document.getElementById('messages-content');
  var messageBox = document.querySelector('.message-box');
  var messageInput = document.getElementById('message');
  var sendBtn = document.getElementById('send-btn');

  var myName = '';
  var unsubscribe = null;

  // Set room info in header
  if (repoOwner && repoName) {
    roomNameEl.textContent = repoName;
    roomContextEl.textContent = repoOwner + '/' + repoName;
  } else {
    roomNameEl.textContent = 'GitHub Chat';
    roomContextEl.textContent = 'General Chat Room';
  }

  // Get Firestore collection for this chat room
  function getCollection() {
    return db.collection('rooms').doc(chatRoom.replace('/', '_')).collection('messages');
  }

  // Format timestamp
  function formatTime(timestamp) {
    if (!timestamp) return '';
    var d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    var hours = d.getHours().toString().padStart(2, '0');
    var mins = d.getMinutes().toString().padStart(2, '0');
    return hours + ':' + mins;
  }

  // Create a message element
  function createMessageEl(data, docId) {
    var div = document.createElement('div');
    var isPersonal = data.sender === myName;
    div.className = 'message' + (isPersonal ? ' message-personal' : '') + ' new';
    div.id = 'message-' + docId;

    var content = '';
    if (!isPersonal) {
      content += '<span class="message-sender">' + escapeHtml(data.sender) + '</span>';
    }
    content += '<span class="message-text">' + escapeHtml(data.message) + '</span>';
    content += '<span class="message-time">' + formatTime(data.timestamp) + '</span>';

    if (isPersonal) {
      content += '<button class="btn-delete" data-id="' + docId + '" title="Delete">×</button>';
    }

    div.innerHTML = content;

    // Delete handler
    var deleteBtn = div.querySelector('.btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        getCollection().doc(id).delete().then(function () {
          var el = document.getElementById('message-' + id);
          if (el) el.remove();
        });
      });
    }

    return div;
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Scroll to bottom
  function scrollToBottom() {
    messagesContent.scrollTop = messagesContent.scrollHeight;
  }

  // Start listening to messages
  function startListening() {
    if (unsubscribe) unsubscribe();

    messagesContent.innerHTML = '';

    unsubscribe = getCollection()
      .orderBy('timestamp', 'asc')
      .onSnapshot(function (snapshot) {
        snapshot.docChanges().forEach(function (change) {
          if (change.type === 'added') {
            var el = createMessageEl(change.doc.data(), change.doc.id);
            messagesContent.appendChild(el);
          } else if (change.type === 'removed') {
            var removed = document.getElementById('message-' + change.doc.id);
            if (removed) removed.remove();
          }
        });
        scrollToBottom();
      });
  }

  // Send a message
  function sendMessage() {
    var text = messageInput.value.trim();
    if (!text) return;

    // Clear input immediately for better UX
    messageInput.value = '';
    messageInput.focus();

    getCollection().add({
      message: text,
      sender: myName,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      room: chatRoom
    }).catch(function (err) {
      // Restore text if send fails
      messageInput.value = text;
      console.error('Failed to send message:', err);
    });
  }

  // Join chat with username
  function joinChat() {
    var name = usernameInput.value.trim();
    if (!name) return;

    myName = name;
    namePrompt.style.display = 'none';
    messagesContainer.style.display = '';
    messageBox.style.display = '';
    messageInput.focus();
    startListening();
  }

  // Event listeners
  usernameSubmit.addEventListener('click', joinChat);
  usernameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      joinChat();
    }
  });

  sendBtn.addEventListener('click', sendMessage);
  messageInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Minimize button: ask the parent (content script) to collapse the chat panel.
  // The chat lives in an iframe, so the panel visibility is controlled by content.js.
  var minimizeBtn = document.getElementById('chat-minimize');
  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', function () {
      window.parent.postMessage({ action: 'minimizeChat' }, '*');
    });
  }
})();
