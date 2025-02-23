document.addEventListener('DOMContentLoaded', () => {
  const analyzeButton = document.getElementById('start-recording');
  const uploadButton = document.getElementById('file-upload');
  const submitButton = document.getElementById('submit-button');
  const analysisResults = document.querySelector('.card-content');
  const highRiskAlert = document.getElementById('high-risk-alert');

  let isRecording = false;
  let mediaRecorder;
  let recordedChunks = [];
  let selectedFile;

  if (!analyzeButton || !uploadButton || !submitButton) {
    console.error('Required DOM elements are missing.');
    return;
  }

  analyzeButton.addEventListener('click', async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    isRecording = true;
    analyzeButton.innerHTML = `
      <span class="countdown-text">
        Starting in 3
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="2"/>
          <path d="M12 6v6l4 2" stroke-width="2"/>
        </svg>
      </span>
    `;
    analyzeButton.classList.add('analyzing');

    let countdown = 3;
    const interval = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(interval);
        startScreenRecording();
      } else {
        analyzeButton.querySelector('.countdown-text').textContent = `Starting in ${countdown}`;
      }
    }, 1000);
  });

  async function startScreenRecording() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: false,
      });
      startRecording(stream);
    } catch (error) {
      console.error('Error accessing screen recording:', error);
      resetButton();
      alert('Screen recording permission denied.');
    }
  }

  function startRecording(stream) {
    mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    recordedChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(track => track.stop());
      saveRecording();
      showAnalysis();
    };

    mediaRecorder.start();

    let timeLeft = 15;
    analyzeButton.innerHTML = `<span class="recording-text">Stop in ${timeLeft}s</span>`;
    const timerInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        stopRecording();
      } else {
        analyzeButton.querySelector('.recording-text').textContent = `Stop in ${timeLeft}s`;
      }
    }, 1000);
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    resetButton();
  }

  function resetButton() {
    isRecording = false;
    analyzeButton.classList.remove('analyzing');
    analyzeButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="camera-icon">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M14.31 8l5.74 9.94M9.69 8h11.48M8 12l5.74-9.94M14.31 16H6.69"></path>
      </svg>
      Analyze Stream
    `;
  }

  function saveRecording() {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "deepfake-analysis.webm";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  function showAnalysis() {
    analysisResults.style.display = 'block';

    const metrics = {
      confidence: 87,
      faceDistortion: 78,
      lipSync: 92,
      frameConsistency: 71,
      audioVideo: 85,
    };

    document.getElementById('confidence-value').textContent = `${metrics.confidence}%`;
    document.getElementById('confidence-progress').style.width = `${metrics.confidence}%`;

    document.querySelector('.metrics-container .metric:nth-child(1) .value').textContent = `${metrics.faceDistortion}%`;
    document.querySelector('.metrics-container .metric:nth-child(2) .value').textContent = `${metrics.lipSync}%`;
    document.querySelector('.metrics-container .metric:nth-child(3) .value').textContent = `${metrics.frameConsistency}%`;
    document.querySelector('.metrics-container .metric:nth-child(4) .value').textContent = `${metrics.audioVideo}%`;

    if (metrics.confidence > 75) {
      highRiskAlert.classList.remove('hidden');
    }
  }

  uploadButton.addEventListener('change', (event) => {
    selectedFile = event.target.files[0];
    if (selectedFile) {
      alert(`File selected: ${selectedFile.name}. Ready to upload.`);
    }
    console.log(selectedFile);
    
  });

  submitButton.addEventListener('click', async () => {
    if (!selectedFile) {
      alert('Please select a file first.');
      return;
    }

    try {
      await uploadFileToBackend(selectedFile);
      alert('File uploaded successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    }
  });

   function displayAnalysisResults(data) {
    console.log("entered");
    
    const metricsContainer = document.querySelector('.metrics-container');
    if (!metricsContainer) {
      console.error('Metrics container not found in the DOM.');
      return;
    }
  
    metricsContainer.innerHTML = '';
  
    if (!Array.isArray(data) || data.length < 1) {
      console.error('Invalid data format:', data);
      return;
    }
  
    const { cosine_similarity, euclidean_distance, mismatch_score } = data[0];
  
    if (
      typeof cosine_similarity === 'undefined' ||
      typeof euclidean_distance === 'undefined' ||
      typeof mismatch_score === 'undefined'
    ) {
      console.error('Missing expected fields in data:', data);
      return;
    }
  
    const metrics = [
      { label: 'Cosine Similarity', value: cosine_similarity.toFixed(4), color: '#3b82f6' },
      { label: 'Euclidean Distance', value: euclidean_distance.toFixed(4), color: '#ef4444' },
      { label: 'Mismatch Score', value: mismatch_score.toFixed(4), color: '#facc15' },
    ];
  
    if (data.length > 1 && typeof data[1] === 'number') {
      metrics.push({ label: 'Confidence Score', value: data[1].toFixed(4), color: '#10b981' });
    }
  
    metrics.forEach(({ label, value, color }) => {
      const metricDiv = document.createElement('div');
      metricDiv.classList.add('metric');
  
      const labelSpan = document.createElement('span');
      labelSpan.classList.add('label');
      labelSpan.textContent = label;
  
      const valueSpan = document.createElement('span');
      valueSpan.classList.add('value');
      valueSpan.style.color = color;
      valueSpan.textContent = value;
  
      metricDiv.appendChild(labelSpan);
      metricDiv.appendChild(valueSpan);
  
      metricsContainer.appendChild(metricDiv);
    });
  }
  async function uploadFileToBackend(file) {
    const formData = new FormData();
    formData.append('video', file);
    console.log(formData);  
    console.log(file);
    
    
    try {
      const response = await fetch('http://localhost:5000/analyze_audio', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorDetails = await response.text();
        throw new Error(`Network response was not ok: ${response.statusText}. Details: ${errorDetails}`);
      }

      const result = await response.json();
      console.log('File uploaded successfully:', result);
      displayAnalysisResults(result);
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

 

});