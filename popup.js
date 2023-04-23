const eventsMap = Object.freeze({
  START_LOOP: "startLoop",
  STOP_LOOP: "stopLoop",
});

const VALID_TIME_INPUT_REGEX = /^(\d{1,2}:)?([0-5]?[0-9]:)?[0-5]?[0-9]$/;
const YOUTUBE_WATCH_REGEX = /^https?:\/\/(www\.)?youtube\.com\/watch/;

// Check if the current window is youtube or youtube music
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  const url = tabs[0].url;
  const isYoutubeWatchPage = YOUTUBE_WATCH_REGEX.test(url);

  if (!isYoutubeWatchPage) {
    const div = document.createElement('div');
    div.className = 'overlay';
    div.innerHTML = 'This extension can only work on YouTube.';
    document.body.appendChild(div);

    document.querySelector('form').style.display = 'none';
  }
});

/* Chrome listeners */
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace == "local" && changes.playerStorageData) {
    const { intervals } = changes.playerStorageData.newValue;
    renderTimeIntervals(intervals);
  }
});

/* DOM elements and event listeners */
document.getElementById("loopButton").addEventListener("click", onLoopButtonClick);
document.getElementById("resetButton").addEventListener("click", onResetButtonClick);

function isInputValid(text) {
  return VALID_TIME_INPUT_REGEX.test(text);
}

function getTimeInSeconds(timeStr) {
  const splitted = timeStr.split(':')
  if (splitted.length == 2) splitted.unshift('0')
  const [h, m, s] = splitted
  return parseInt(h) * 60 * 60 + parseInt(m) * 60 + parseInt(s)
}

function onLoopButtonClick(e) {
  e.preventDefault();
  const startTimeText = document.getElementById("startTimeInput").value;
  const endTimeText = document.getElementById("endTimeInput").value;
  if (!isInputValid(startTimeText) || !isInputValid(endTimeText)) {
    alert("Please enter valid start and end times.");
    return;
  }

  const startTimeSec = getTimeInSeconds(startTimeText)
  const endTimeSec = getTimeInSeconds(endTimeText)

  if (startTimeSec >= endTimeSec) {
    alert("Start time must be before end time.");
    return;
  }
  chrome.runtime.sendMessage({ type: eventsMap.START_LOOP, data: { startTimeSec, endTimeSec, startTimeText, endTimeText  } });
}

function onResetButtonClick(e) {
  e.preventDefault();
  chrome.runtime.sendMessage({ type: eventsMap.STOP_LOOP });
}

function renderTimeIntervals(intervals) {
  const ul = document.getElementById("timeIntervals");
  ul.innerHTML = "";
  intervals.forEach(({ startTimeText, endTimeText }) => {
    const li = document.createElement("li");
    li.innerHTML = `${startTimeText} - ${endTimeText}`;
    ul.appendChild(li);
  });
}