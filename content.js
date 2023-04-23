const eventsMap = Object.freeze({
  START_LOOP: "startLoop",
  STOP_LOOP: "stopLoop",
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  const { type, data } = message;
  switch (type) {
    case eventsMap.START_LOOP:
      startLoop(data);
      break;
    case eventsMap.STOP_LOOP:
      stopLoop();
      break;
    default:
      break;
  }
});

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const defaultPlayerStorageData = {
  intervals: [],
};

let playerStorageData = deepCopy(defaultPlayerStorageData)

// Load the data from the storage
chrome.storage.local.get(["playerStorageData"], function(result) {
  if (result.playerStorageData) {
    playerStorageData = result.playerStorageData;
  }
});


function startLoop(data) {
  const { startTimeSec: startTime, endTimeSec: endTime } = data;
  const videoPlayer = document.getElementsByTagName("video")[0];
  if (!videoPlayer) return
  const videoLength = videoPlayer.duration;
  if (endTime > videoLength) {
    alert("End time must be less than the video length.");
    return;
  }
  // Set the start time of the loop
  videoPlayer.currentTime = startTime;
  // When the video reaches the end time, go back to the start time
  videoPlayer.addEventListener("timeupdate", function() {
    if (videoPlayer.currentTime >= endTime) {
      videoPlayer.currentTime = startTime;
    }
  });

  // Add the interval to the storage with mergeIntervals
  playerStorageData.intervals.push(data);
  chrome.storage.local.set({ playerStorageData });
}

function stopLoop() {
  // Remove the timeupdate event listener to stop the loop
  const videoPlayer = document.getElementsByTagName("video")[0];
  if (videoPlayer) {
    videoPlayer.removeEventListener("timeupdate", null);
  }

  // Clear the intervals from the storage
  playerStorageData = deepCopy(defaultPlayerStorageData);
  chrome.storage.local.set({ playerStorageData });
}

// Listen for page unload to clear the intervals
window.addEventListener("unload", function() {
  chrome.storage.local.remove("playerStorageData");
});