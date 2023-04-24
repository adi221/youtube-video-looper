const eventsMap = Object.freeze({
  ADD_INTERVAL: "addInterval",
  RESET_INTERVALS: "resetIntervals",
  CHANGE_INTERVAL: "changeInterval",
});

const defaultPlayerStorageData = {
  intervals: [],
};

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function(message) {
  const { type, data } = message;
  switch (type) {
    case eventsMap.ADD_INTERVAL:
      addInterval(data);
      break;
    case eventsMap.CHANGE_INTERVAL:
      changeInterval(data);
      break;
    case eventsMap.RESET_INTERVALS:
      resetIntervals();
      break;
    default:
      break;
  }
});

function mergeIntervals(intervals) {
  if (intervals.length <= 1) return intervals
  intervals.sort((a, b) => a.startTimeSec - b.startTimeSec || a.endTimeSec - b.endTimeSec)
  const res = [intervals[0]]
  for (const curr of intervals) {
    const prev = res[res.length - 1]
    if (prev.startTimeSec === curr.startTimeSec || prev.endTimeSec >= curr.startTimeSec) {
      if (prev.endTimeSec < curr.endTimeSec) {
        prev.endTimeSec = curr.endTimeSec
        prev.endTimeText = curr.endTimeText
      }
    } else {
      res.push(curr)
    }
  }
  return res
}

function padding2(num) {
  return num.toString().padStart(2, '0')
}

function formatVideoLengthInSeconds(videoLengthSeconds) {
  const hours = Math.floor(videoLengthSeconds / 3600);
  const minutes = Math.floor((videoLengthSeconds - hours * 3600) / 60);
  const seconds = Math.floor(videoLengthSeconds - hours * 3600 - minutes * 60);

  const hoursWithPadding = padding2(hours);
  const minutesWithPadding = padding2(minutes);
  const secondsWithPadding = padding2(seconds);

  const result = `${minutesWithPadding}:${secondsWithPadding}`;
  if (hours > 0) {
    return `${hoursWithPadding}:${result}`;
  }
  return result;
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getVideoPlayerElement() {
  return document.getElementsByTagName("video")[0];
}

let playerStorageData = deepCopy(defaultPlayerStorageData)
let currentIntervalIndex = -1

// Load the data from the storage
chrome.storage.local.get(["playerStorageData"], function(result) {
  if (result.playerStorageData) {
    playerStorageData = result.playerStorageData;
  }
});

function isTimeInInterval(time, interval) {
  return time >= interval.startTimeSec && time <= interval.endTimeSec
}

function calculateNewIntervalIndex() {
  const videoPlayer = getVideoPlayerElement()
  if (!videoPlayer) return
  const { intervals } = playerStorageData
  currentIntervalIndex = intervals.findIndex(interval => isTimeInInterval(videoPlayer.currentTime, interval))
}

function addIntervalToList(newInterval) {
  const newIntervals = [...playerStorageData.intervals, newInterval]
  playerStorageData.intervals = mergeIntervals(newIntervals)
  chrome.storage.local.set({ playerStorageData });
  calculateNewIntervalIndex()
}

function onVideoTimeUpdate() {
  const videoPlayer = getVideoPlayerElement()
  if (!videoPlayer) return
  // If time is interval time, do nothing
  // If time is greater than interval time, go to next interval
  const { intervals } = playerStorageData
  if (!intervals.length) return stopListenToVideoTimeUpdate()
  if (currentIntervalIndex === -1) {
    currentIntervalIndex = 0
  }
  const currentInterval = intervals[currentIntervalIndex]
  if (isTimeInInterval(videoPlayer.currentTime, currentInterval)) return
  if (videoPlayer.currentTime >= currentInterval.endTimeSec) {
    currentIntervalIndex = (currentIntervalIndex + 1) % intervals.length
    const { startTimeSec } = intervals[currentIntervalIndex]
    videoPlayer.currentTime = startTimeSec;
  }
}

function listenToVideoTimeUpdate() {
  const videoPlayer = getVideoPlayerElement()
  if (!videoPlayer) return
  // Ensure that we don't have multiple listeners
  stopListenToVideoTimeUpdate()
  videoPlayer.addEventListener("timeupdate", onVideoTimeUpdate);
}

function stopListenToVideoTimeUpdate() {
  const videoPlayer = getVideoPlayerElement()
  if (!videoPlayer) return
  videoPlayer.removeEventListener("timeupdate", onVideoTimeUpdate);
}

function addInterval(newInterval) {
  const videoPlayer = getVideoPlayerElement()
  if (!videoPlayer) return
  const { endTimeSec } = newInterval;
  const videoLengthSec = videoPlayer.duration;
  if (endTimeSec > videoLengthSec) {
    alert(`End time must be less than video length (${formatVideoLengthInSeconds(videoLengthSec)})`);
    return;
  }
  addIntervalToList(newInterval)
  listenToVideoTimeUpdate()
}

function changeInterval({ startTimeSec }) {
  const videoPlayer = getVideoPlayerElement()
  if (!videoPlayer) return
  videoPlayer.currentTime = startTimeSec;
  calculateNewIntervalIndex()
}

function resetIntervals() {
  const videoPlayer = getVideoPlayerElement()
  if (videoPlayer) {
    stopListenToVideoTimeUpdate();
  }

  // Clear the intervals from the storage
  playerStorageData = deepCopy(defaultPlayerStorageData);
  chrome.storage.local.set({ playerStorageData });
}

// Listen for page unload to clear the storage
window.addEventListener("unload", function() {
  chrome.storage.local.remove("playerStorageData");
});