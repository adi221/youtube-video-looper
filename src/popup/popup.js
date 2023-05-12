const eventsMap = Object.freeze({
  ADD_INTERVAL: 'addInterval',
  UPDATE_INTERVAL: 'updateInterval',
  RESET_INTERVALS: 'resetIntervals',
  PLAY_INTERVAL: 'playInterval',
  REMOVE_INTERVAL: 'removeInterval',
  TOGGLE_IS_ENABLED: 'toggleIsEnabled',
});

const VALID_TIME_INPUT_REGEX = /^(\d{1,2}:)?([0-5]?[0-9]:)?[0-5]?[0-9]$/;
const YOUTUBE_WATCH_REGEX = /^https?:\/\/(www\.)?youtube\.com\/watch/;

let idCounter = 1;

/**
 * interface Interval {
 *  id: number;
 *  startTimeSec: number;
 *  endTimeSec: number;
 *  startTimeText: string;
 *  endTimeText: string;
 *  title: string;
 *  createdAt: string;
 * }
 */

// Check if the current window is youtube watch
chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  const url = tabs[0].url;
  const isYoutubeWatchPage = YOUTUBE_WATCH_REGEX.test(url);

  if (!isYoutubeWatchPage) {
    renderCurrentPageNotSupportedByExtension();
    hideExtensionElements();
  }
});

// Load the data from the storage
chrome.storage.local.get(['playerStorageData'], function (result) {
  if (result.playerStorageData) {
    handleStorageChange(result.playerStorageData);
  }
});

/* Chrome listeners */
chrome.storage.onChanged.addListener(function (changes, namespace) {
  if (namespace == 'local' && changes.playerStorageData) {
    handleStorageChange(changes.playerStorageData.newValue);
  }
});

/* DOM elements and event listeners */
const addIntervalButton = document.getElementById('addIntervalButton');
const resetIntervalsButton = document.getElementById('resetButton');
const toggleIsEnabledButton = document.getElementById('toggleIsEnabledButton');

addIntervalButton.addEventListener('click', onAddIntervalClick);
resetIntervalsButton.addEventListener('click', onResetButtonClick);
toggleIsEnabledButton.addEventListener('click', onToggleIsEnabledClick);

function isInputValid(text) {
  return VALID_TIME_INPUT_REGEX.test(text);
}

function getTimeInSeconds(timeStr) {
  const splitted = timeStr.split(':');
  if (splitted.length == 2) splitted.unshift('0');
  const [h, m, s] = splitted;
  return parseInt(h) * 60 * 60 + parseInt(m) * 60 + parseInt(s);
}

function formatTimeText(timeStr) {
  return timeStr
    .split(':')
    .map(t => t.padStart(2, '0'))
    .join(':');
}

function onAddIntervalClick(e) {
  e.preventDefault();
  const startTimeText = document.getElementById('startTimeInput').value;
  const endTimeText = document.getElementById('endTimeInput').value;
  if (!isInputValid(startTimeText) || !isInputValid(endTimeText)) {
    alert('Please enter valid start and end times.');
    return;
  }

  const startTimeSec = getTimeInSeconds(startTimeText);
  const endTimeSec = getTimeInSeconds(endTimeText);

  if (startTimeSec >= endTimeSec) {
    alert('Start time must be before end time.');
    return;
  }
  const data = {
    id: idCounter,
    startTimeSec,
    endTimeSec,
    startTimeText: formatTimeText(startTimeText),
    endTimeText: formatTimeText(endTimeText),
    title: `Interval ${idCounter}`,
    createdAt: new Date().toISOString(),
  };
  idCounter++;
  chrome.runtime.sendMessage({ type: eventsMap.ADD_INTERVAL, data });
}

function onResetButtonClick(e) {
  e.preventDefault();
  chrome.runtime.sendMessage({ type: eventsMap.RESET_INTERVALS });
}

function onToggleIsEnabledClick(e) {
  e.preventDefault();
  const isCurrentlyEnabled =
    toggleIsEnabledButton.getAttribute('data-is-enabled') === 'true';
  chrome.runtime.sendMessage({
    type: eventsMap.TOGGLE_IS_ENABLED,
    data: { isEnabled: !isCurrentlyEnabled },
  });
}

function handleStorageChange({ intervals, isEnabled }) {
  renderTimeIntervals(intervals);
  updateToggleIsEnabledButtonAttributes(isEnabled);
}

function updateToggleIsEnabledButtonAttributes(isEnabled) {
  toggleIsEnabledButton.setAttribute('data-is-enabled', isEnabled ? 'true' : 'false');
  toggleIsEnabledButton.textContent = isEnabled ? 'Disable' : 'Enable';
}

function playInterval(e, id) {
  e.preventDefault();
  chrome.runtime.sendMessage({ type: eventsMap.PLAY_INTERVAL, data: { id } });
}

function removeInterval(e, id) {
  e.preventDefault();
  chrome.runtime.sendMessage({ type: eventsMap.REMOVE_INTERVAL, data: { id } });
}

function updateInterval(e, id, title) {
  e.preventDefault();
  chrome.runtime.sendMessage({
    type: eventsMap.UPDATE_INTERVAL,
    data: { id, title },
  });
}

function renderTimeIntervals(intervals) {
  const ul = document.getElementById('timeIntervals');
  ul.innerHTML = '';
  intervals.forEach(({ id, title, startTimeText, endTimeText }) => {
    const li = document.createElement('li');
    li.classList.add('interval-row');

    const nameSpan = document.createElement('p');
    nameSpan.classList.add('interval-name');
    nameSpan.textContent = title;
    nameSpan.title = title;

    nameSpan.onclick = () => {
      const nameInput = document.createElement('input');
      nameInput.classList.add('interval-name-input');
      nameInput.type = 'text';
      nameInput.value = title;
      const computedStyle = window.getComputedStyle(nameSpan);
      nameInput.style.width = computedStyle.width;
      nameInput.style.fontSize = computedStyle.fontSize;
      nameInput.onblur = e => {
        updateInterval(e, id, nameInput.value);
        nameInput.replaceWith(nameSpan);
      };
      nameInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          updateInterval(e, id, nameInput.value);
        }
      });
      nameInput.addEventListener('input', () => {
        nameInput.style.width = nameInput.scrollWidth + 'px';
      });
      nameSpan.replaceWith(nameInput);
      nameInput.focus();
    };

    nameSpan.addEventListener('mouseover', () => {
      if (nameSpan.offsetWidth < nameSpan.scrollWidth) {
        nameSpan.classList.add('truncated');
      }
    });
    nameSpan.addEventListener('mouseout', () => {
      nameSpan.classList.remove('truncated');
    });

    li.appendChild(nameSpan);

    const timeSpan = document.createElement('span');
    timeSpan.classList.add('interval-time');
    timeSpan.textContent = `${startTimeText} - ${endTimeText}`;
    li.appendChild(timeSpan);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('interval-buttons');
    li.appendChild(buttonsContainer);

    const playButton = document.createElement('button');
    playButton.classList.add('play-interval-button');
    playButton.innerHTML = '<i class="fa fa-play icon"></i>';
    playButton.onclick = e => playInterval(e, id);
    buttonsContainer.appendChild(playButton);

    const deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-interval-button');
    deleteButton.innerHTML = '<i class="fa fa-trash icon"></i>';
    deleteButton.onclick = e => removeInterval(e, id);
    buttonsContainer.appendChild(deleteButton);

    ul.appendChild(li);
  });
}

function renderCurrentPageNotSupportedByExtension() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  const containerElement = document.createElement('div');
  containerElement.className = 'page-not-supported';

  const iconElement = document.createElement('i');
  iconElement.className = 'fa-sharp fa-regular fa-circle-xmark page-not-supported-svg';
  const textElement = document.createElement('p');
  textElement.className = 'page-not-supported-text';
  textElement.innerHTML = 'This extension can work only on YouTube videos.';

  containerElement.appendChild(iconElement);
  containerElement.appendChild(textElement);
  overlay.appendChild(containerElement);
  document.body.appendChild(overlay);
}

function hideExtensionElements() {
  document.querySelector('form').style.display = 'none';
  document.querySelector('#timeIntervals').style.display = 'none';
}
