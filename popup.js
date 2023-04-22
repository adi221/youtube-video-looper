/* Chrome listeners */

// Check if the current window is youtube or youtube music
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  var url = tabs[0].url;

  const youtubeOrMusicRegex = /^https?:\/\/(www\.)?(music\.|)youtube\.com\/watch/;
  var isYoutubeOrMusicPage = youtubeOrMusicRegex.test(url);

  if (!isYoutubeOrMusicPage) {
    var div = document.createElement('div');
    div.className = 'overlay';
    div.innerHTML = 'This extension can only work on YouTube and YouTube Music.';
    document.body.appendChild(div);

    document.querySelector('form').style.display = 'none';
  }
});

/* DOM elements and event listeners */
document.getElementById("loopButton").addEventListener("click", onLoopButtonClick);

const VALID_TIME_INPUT_REGEX = /^(\d{1,2}):?(\d{1,2})?:?(\d{1,2})?$/;

function isInputValid(text) {
  return VALID_TIME_INPUT_REGEX.test(text);
}

function getTime(timeStr) {
  const splitted = timeStr.split(':')
  if (splitted.length == 2) splitted.unshift('0')
  const [h, m, s] = splitted
  return parseInt(h) * 60 * 60 + parseInt(m) * 60 + parseInt(s)
}

function onLoopButtonClick(e) {
  e.preventDefault();
  const startTimeValue = document.getElementById("startTimeInput").value;
  const endTimeValue = document.getElementById("endTimeInput").value;
  if (!isInputValid(startTimeValue) || !isInputValid(endTimeValue)) {
    alert("Please enter valid start and end times.");
    return;
  }

  const startTime = getTime(startTimeValue)
  const endTime = getTime(endTimeValue)

  if (startTime >= endTime) {
    alert("Start time must be before end time.");
    return;
  }
  chrome.runtime.sendMessage({ type: "startLoop", startTime, endTime });
}
