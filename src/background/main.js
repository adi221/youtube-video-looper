chrome.runtime.onMessage.addListener(function (message) {
  // Send a message to the content script
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, message);
    }
  });
});

// Change the browserAction icon if the extension is disabled
const activeIconsPaths = {
  16: '/icons/icon16.png',
  32: '/icons/icon32.png',
  64: '/icons/icon64.png',
  128: '/icons/icon128.png',
};
const inactiveIconsPaths = {
  16: '/icons/icon_disabled16.png',
  32: '/icons/icon_disabled32.png',
  64: '/icons/icon_disabled64.png',
  128: '/icons/icon_disabled128.png',
};

function changeBrowserIconsIfEnabledStatusChanged(changes) {
  const {
    playerStorageData: {
      newValue: { isEnabled: isEnabledNewValue },
      oldValue: { isEnabled: isEnabledOldValue } = {},
    },
  } = changes;
  if (isEnabledNewValue === isEnabledOldValue) return;
  chrome.action.setIcon({
    path: isEnabledNewValue ? activeIconsPaths : inactiveIconsPaths,
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes?.playerStorageData) return;
  changeBrowserIconsIfEnabledStatusChanged(changes);
});
