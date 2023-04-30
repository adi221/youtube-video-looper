const eventsMap = Object.freeze({
  ADD_INTERVAL: 'addInterval',
  UPDATE_INTERVAL: 'updateInterval',
  RESET_INTERVALS: 'resetIntervals',
  PLAY_INTERVAL: 'playInterval',
  REMOVE_INTERVAL: 'removeInterval',
  TOGGLE_IS_ENABLED: 'toggleIsEnabled',
});

const DEFAULT_PLAYER_STORAGE_DATA = {
  isEnabled: true,
  intervals: [],
};
const DEFAULT_CURRENT_INTERVAL_INDEX = -1;

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function (message) {
  const { type, data } = message;
  switch (type) {
    case eventsMap.ADD_INTERVAL:
      addInterval(data);
      break;
    case eventsMap.UPDATE_INTERVAL:
      updateInterval(data);
      break;
    case eventsMap.PLAY_INTERVAL:
      playInterval(data);
      break;
    case eventsMap.RESET_INTERVALS:
      resetIntervals();
      break;
    case eventsMap.REMOVE_INTERVAL:
      removeInterval(data);
      break;
    case eventsMap.TOGGLE_IS_ENABLED:
      toggleIsEnabled(data);
      break;
    default:
      break;
  }
});

function mergeIntervals(intervals) {
  if (intervals.length <= 1) return intervals;
  intervals.sort(
    (a, b) => a.startTimeSec - b.startTimeSec || a.endTimeSec - b.endTimeSec,
  );
  const res = [intervals[0]];
  for (const curr of intervals) {
    const prev = res[res.length - 1];
    if (prev.startTimeSec === curr.startTimeSec || prev.endTimeSec >= curr.startTimeSec) {
      if (prev.endTimeSec < curr.endTimeSec) {
        prev.endTimeSec = curr.endTimeSec;
        prev.endTimeText = curr.endTimeText;
      }
      // The title of the interval with the earliest createdAt is kept
      prev.title = prev.createdAt < curr.createdAt ? prev.title : curr.title;
    } else {
      res.push(curr);
    }
  }
  return res;
}

function padding2(num) {
  return num.toString().padStart(2, '0');
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
  return document.getElementsByTagName('video')[0];
}

function getSeekSliderElement() {
  return document.querySelector('.ytp-progress-bar');
}

let playerStorageData = deepCopy(DEFAULT_PLAYER_STORAGE_DATA);
let currentIntervalIndex = DEFAULT_CURRENT_INTERVAL_INDEX;

function isTimeInInterval(time, interval) {
  return time >= interval.startTimeSec && time <= interval.endTimeSec;
}

function calculateNewIntervalIndex() {
  const videoPlayer = getVideoPlayerElement();
  if (!videoPlayer) return;
  const { intervals } = playerStorageData;
  currentIntervalIndex = intervals.findIndex(interval =>
    isTimeInInterval(videoPlayer.currentTime, interval),
  );
}

function addIntervalToList(newInterval) {
  const newIntervals = [...playerStorageData.intervals, newInterval];
  setPlayerStorageData({
    ...playerStorageData,
    intervals: mergeIntervals(newIntervals),
  });
  calculateNewIntervalIndex();
}

function removeIntervalFromList({ id }) {
  const updatedIntervals = playerStorageData.intervals.filter(
    interval => interval.id !== id,
  );
  setPlayerStorageData({ ...playerStorageData, intervals: updatedIntervals });
  calculateNewIntervalIndex();
}

function onVideoTimeUpdate() {
  const videoPlayer = getVideoPlayerElement();
  if (!videoPlayer) return;
  // If time is interval time, do nothing
  // If time is greater than interval time, go to next interval
  const { intervals } = playerStorageData;
  if (!intervals.length) return stopListenToVideoTimeUpdate();
  // If we increase interval from -1 to 0 now, we should not increase it to 1 if time is not in interval
  let shouldChangeToNextIntervalIfOutOfRange = true;
  if (currentIntervalIndex === DEFAULT_CURRENT_INTERVAL_INDEX) {
    currentIntervalIndex = 0;
    shouldChangeToNextIntervalIfOutOfRange = false;
  }
  const currentInterval = intervals[currentIntervalIndex];
  if (isTimeInInterval(videoPlayer.currentTime, currentInterval)) return;
  currentIntervalIndex = shouldChangeToNextIntervalIfOutOfRange
    ? (currentIntervalIndex + 1) % intervals.length
    : currentIntervalIndex;
  const { startTimeSec } = intervals[currentIntervalIndex];
  videoPlayer.currentTime = startTimeSec;
}

function listenToVideoTimeUpdate() {
  const videoPlayer = getVideoPlayerElement();
  if (!videoPlayer) return;
  // Ensure that we don't have multiple listeners
  stopListenToVideoTimeUpdate();
  videoPlayer.addEventListener('timeupdate', onVideoTimeUpdate);
}

function stopListenToVideoTimeUpdate() {
  const videoPlayer = getVideoPlayerElement();
  if (!videoPlayer) return;
  videoPlayer.removeEventListener('timeupdate', onVideoTimeUpdate);
}

function onSeekSliderMouseChange() {
  toggleIsEnabled({ isEnabled: false });
  stopListenToSeekSliderMouseDown();
}

function listenToSeekSliderMouseDown() {
  const seekSlider = getSeekSliderElement();
  if (!seekSlider) return;
  // Ensure that we don't have multiple listeners
  stopListenToSeekSliderMouseDown();
  // When the user changes time manually, we disable the extension so we won't interrupt the user
  seekSlider.addEventListener('mousedown', onSeekSliderMouseChange);
}

function stopListenToSeekSliderMouseDown() {
  const seekSlider = getSeekSliderElement();
  if (!seekSlider) return;
  seekSlider.removeEventListener('mousedown', onSeekSliderMouseChange);
}

function attachEventListeners() {
  listenToVideoTimeUpdate();
  listenToSeekSliderMouseDown();
}

function detachEventListeners() {
  stopListenToVideoTimeUpdate();
  stopListenToSeekSliderMouseDown();
}

function addInterval(newInterval) {
  const videoPlayer = getVideoPlayerElement();
  if (!videoPlayer) return;
  const { endTimeSec } = newInterval;
  const videoLengthSec = videoPlayer.duration;
  if (endTimeSec > videoLengthSec) {
    alert(
      `End time must be less than video length (${formatVideoLengthInSeconds(
        videoLengthSec,
      )})`,
    );
    return;
  }
  addIntervalToList(newInterval);
  attachEventListeners();
  if (!playerStorageData.isEnabled) {
    setPlayerStorageData({ ...playerStorageData, isEnabled: true });
  }
}

function updateInterval(newIntervalData) {
  const updatedIntervals = playerStorageData.intervals.map(interval => {
    if (interval.id === newIntervalData.id) {
      return { ...interval, ...newIntervalData };
    }
    return interval;
  });
  setPlayerStorageData({ ...playerStorageData, intervals: updatedIntervals });
  calculateNewIntervalIndex();
}

function removeInterval({ id }) {
  removeIntervalFromList({ id });
}

function playInterval({ id }) {
  const videoPlayer = getVideoPlayerElement();
  if (!videoPlayer) return;
  const interval = playerStorageData.intervals.find(interval => interval.id === id);
  if (!interval) return;
  videoPlayer.currentTime = interval.startTimeSec;
  calculateNewIntervalIndex();
}

function toggleIsEnabled({ isEnabled }) {
  if (isEnabled) attachEventListeners();
  else detachEventListeners();

  setPlayerStorageData({ ...playerStorageData, isEnabled });
}

function resetIntervals() {
  detachEventListeners();
  resetInitialData();
}

function resetInitialData() {
  setPlayerStorageData(deepCopy(DEFAULT_PLAYER_STORAGE_DATA));
  currentIntervalIndex = DEFAULT_CURRENT_INTERVAL_INDEX;
}

function setPlayerStorageData(newPlayerStorageData) {
  playerStorageData = newPlayerStorageData;
  chrome.storage.local.set({ playerStorageData });
}

function clearPlayerStorageData() {
  resetInitialData();
  chrome.storage.local.remove('playerStorageData');
}

// Listen for page unload to clear the storage
window.addEventListener('unload', clearPlayerStorageData);
