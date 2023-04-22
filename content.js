// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  switch (message.type) {
    case "startLoop":
      startLoop(message.startTime, message.endTime);
      break;
    case "stopLoop":
      stopLoop();
      break;
    default:
      break;
  }
});

function startLoop(startTime, endTime) {
  console.log('start loop ', startTime, endTime);
  var videoPlayer = document.getElementsByTagName("video")[0];
  if (videoPlayer) {
    // Set the start time of the loop
    videoPlayer.currentTime = startTime;
    // When the video reaches the end time, go back to the start time
    videoPlayer.addEventListener("timeupdate", function() {
      if (videoPlayer.currentTime >= endTime) {
        videoPlayer.currentTime = startTime;
      }
    });
  }
}

function stopLoop() {
  // Remove the timeupdate event listener to stop the loop
  var videoPlayer = document.getElementsByTagName("video")[0];
  if (videoPlayer) {
    videoPlayer.removeEventListener("timeupdate", null);
  }
}