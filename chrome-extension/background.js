// Toggle chat panel when the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.url && tab.url.startsWith('https://github.com/')) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggleChat' });
  }
});
