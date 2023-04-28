chrome.runtime.onMessage.addListener(function (message) {
  // Send a message to the content script
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, message);
    }
  });
});
