let mediaRecorder;
let recordedChunks = [];

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: "browser" },
      audio: false
    });

    mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunks.push(event.data);
    };

    mediaRecorder.onstop = saveRecording;
    mediaRecorder.start();
    console.log("Recording started...");
  } catch (error) {
    console.error("Screen capture error:", error);
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    console.log("Recording stopped...");
  }
}

function saveRecording() {
  const blob = new Blob(recordedChunks, { type: "video/webm" });
  
  // Send the blob to background script for download
  const reader = new FileReader();
  reader.onload = () => {
    const buffer = reader.result;
    chrome.runtime.sendMessage({
      action: "download",
      data: {
        url: buffer,
        filename: `screen_recording_${new Date().getTime()}.webm`
      }
    });
  };
  reader.readAsDataURL(blob);
  
  // Clear the recorded chunks
  recordedChunks = [];
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "stopRecording") {
    stopRecording();
  }
});

startRecording();