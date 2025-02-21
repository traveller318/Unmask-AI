document.addEventListener('DOMContentLoaded', () => {
  const analyzeButton = document.getElementById('start-recording');
  let isRecording = false;
  let mediaRecorder;
  let recordedChunks = [];

  analyzeButton.addEventListener('click', async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    isRecording = true;
    analyzeButton.textContent = "Starting in 3...";
    analyzeButton.classList.add('analyzing');

    let countdown = 3;
    const interval = setInterval(() => {
      countdown--;
      analyzeButton.textContent = `Starting in ${countdown}...`;
      if (countdown <= 0) {
        clearInterval(interval);
        startScreenRecording();
      }
    }, 1000);
  });

  async function startScreenRecording() {
    try {
      console.log("Requesting screen capture...");
      const stream = await captureScreen();
      console.log("Screen capture started successfully.");
      startRecording(stream);
    } catch (error) {
      console.error('Error during capture:', error);
      alert('An error occurred. Please try again.');
      resetButton();
    }
  }

  async function captureScreen() {
    try {
      return await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" },
        audio: false
      });
    } catch (error) {
      throw new Error("Failed to capture screen: " + error.message);
    }
  }

  function startRecording(stream) {
    mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      saveRecording();
    };

    mediaRecorder.start();
    console.log("Recording started...");

    let recordCountdown = 15;
    analyzeButton.textContent = `Recording: ${recordCountdown}s`;

    const recordInterval = setInterval(() => {
      recordCountdown--;
      analyzeButton.textContent = `Recording: ${recordCountdown}s`;
      if (recordCountdown <= 0) {
        clearInterval(recordInterval);
        stopRecording();
      }
    }, 1000);
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      console.log("Recording stopped.");
    }
    resetButton();
  }

  function saveRecording() {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = "recorded-screen.webm";
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetButton() {
    isRecording = false;
    analyzeButton.textContent = "Start Analyzing";
    analyzeButton.classList.remove('analyzing');
  }
});
