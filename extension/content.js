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
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "screen_recording.webm";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  console.log("Recording saved.");
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "stopRecording") {
    stopRecording();
  }
});

startRecording();
