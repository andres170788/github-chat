// GitHub Chat - Content Script
// Injects a toggle button and chat iframe on github.com pages

(function () {
  'use strict';

  // Prevent double injection
  if (document.getElementById('github-chat-toggle')) return;

  // Extract repo info from current URL
  function getRepoInfo() {
    const path = window.location.pathname.split('/').filter(Boolean);
    if (path.length >= 2) {
      return { owner: path[0], repo: path[1] };
    }
    return null;
  }

  // Create toggle button
  const toggle = document.createElement('button');
  toggle.id = 'github-chat-toggle';
  toggle.title = 'Toggle GitHub Chat';
  toggle.innerHTML = `
    <svg class="chat-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
    </svg>
    <svg class="close-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
  `;

  // Create iframe for chat
  const panel = document.createElement('iframe');
  panel.id = 'github-chat-panel';
  const repoInfo = getRepoInfo();
  const chatUrl = chrome.runtime.getURL('chat.html');
  const params = repoInfo
    ? `?owner=${encodeURIComponent(repoInfo.owner)}&repo=${encodeURIComponent(repoInfo.repo)}`
    : '';
  panel.src = chatUrl + params;

  // Toggle visibility
  function toggleChat() {
    const isVisible = panel.classList.contains('visible');
    if (isVisible) {
      panel.classList.remove('visible');
      toggle.classList.remove('active');
    } else {
      panel.classList.add('visible');
      toggle.classList.add('active');
    }
  }

  toggle.addEventListener('click', toggleChat);

  // Listen for messages from background script (toolbar icon click)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'toggleChat') {
      toggleChat();
    }
  });

  // Minimize request coming from inside the chat iframe (minimize button).
  // Collapses the panel back to the toggle bubble without losing the conversation.
  window.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'minimizeChat') {
      panel.classList.remove('visible');
      toggle.classList.remove('active');
    }
  });

  // Inject into page
  document.body.appendChild(toggle);
  document.body.appendChild(panel);
})();
