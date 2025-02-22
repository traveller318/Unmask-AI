document.addEventListener('DOMContentLoaded', () => {
  const analyzeButton = document.getElementById('start-recording');
  const analysisResults = document.getElementById('analysis-results');
  let isRecording = false;
  let mediaRecorder;
  let recordedChunks = [];

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
        audio: false
      });
      startRecording(stream);
    } catch (error) {
      console.error('Error:', error);
      resetButton();
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

  uploadButton.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      uploadFile(file);
    }
  });

  document.getElementById('submit-button').addEventListener('click', async () => {
    const fileInput = document.getElementById('file-upload');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a file to upload.');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('http://127.0.0.1:5000/analyze-distortions', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();
        console.log('File uploaded successfully:', result);
        // Handle the result as needed
    } catch (error) {
        console.error('Error uploading file:', error);
    }
});

  function showAnalysis() {
    analysisResults.style.display = 'block';
    console.log('Analysis displayed');
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
    const riskAlert = document.getElementById('risk-alert');
    
    // Fixed metrics values for demonstration
    const metrics = {
        confidence: 87,
        faceDistortion: 78,
        lipSync: 92,
        frameConsistency: 71,
        audioVideo: 85
    };

    // Update UI with analysis results
    document.getElementById('confidence-value').textContent = `${metrics.confidence}%`;
    document.getElementById('confidence-progress').style.width = `${metrics.confidence}%`;
    
    // Create and update charts
    createMetricChart('face-distortion-chart', metrics.faceDistortion, '#3b82f6');
    createMetricChart('lip-sync-chart', metrics.lipSync, '#ef4444');
    createMetricChart('frame-consistency-chart', metrics.frameConsistency, '#f59e0b');
    createMetricChart('audio-video-chart', metrics.audioVideo, '#10b981');

    // Update metric values
    document.getElementById('face-distortion').textContent = `${metrics.faceDistortion}%`;
    document.getElementById('lip-sync').textContent = `${metrics.lipSync}%`;
    document.getElementById('frame-consistency').textContent = `${metrics.frameConsistency}%`;
    document.getElementById('audio-video').textContent = `${metrics.audioVideo}%`;

    // Show risk alert for high confidence
    if (metrics.confidence > 75) {
        riskAlert.style.display = 'flex';
    }

    // Generate detailed summary
    const summaryText = document.getElementById('summary-text');
    const summary = generateDetailedSummary(metrics);
    summaryText.innerHTML = summary;
  }

  function createMetricChart(elementId, value, color) {
    const canvas = document.getElementById(elementId);
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 10;
    ctx.stroke();

    // Draw value arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -0.5 * Math.PI, (2 * value / 100 - 0.5) * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.stroke();

    // Draw center text
    ctx.font = 'bold 20px Inter';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${value}%`, centerX, centerY);
  }

  function generateDetailedSummary(metrics) {
    let summary = '<strong>Analysis Results:</strong><br>';
    
    if (metrics.confidence > 75) {
        summary += '⚠️ <span class="high-risk">High probability of deepfake content detected.</span><br><br>';
    }

    summary += '<div class="summary-details">';
    summary += `<p>• Face Distortion: ${metrics.faceDistortion}% - ${getMetricDescription(metrics.faceDistortion, 'face')}</p>`;
    summary += `<p>• Lip-Sync Deviation: ${metrics.lipSync}% - ${getMetricDescription(metrics.lipSync, 'lip')}</p>`;
    summary += `<p>• Frame Consistency: ${metrics.frameConsistency}% - ${getMetricDescription(metrics.frameConsistency, 'frame')}</p>`;
    summary += `<p>• Audio-Video Mismatch: ${metrics.audioVideo}% - ${getMetricDescription(metrics.audioVideo, 'audio')}</p>`;
    summary += '</div>';

    return summary;
  }

  function getMetricDescription(value, type) {
    if (value > 80) {
        switch(type) {
            case 'face': return 'Critical facial manipulation detected';
            case 'lip': return 'Severe lip-sync misalignment';
            case 'frame': return 'Significant frame inconsistencies';
            case 'audio': return 'Major audio-visual desynchronization';
        }
    } else if (value > 60) {
        switch(type) {
            case 'face': return 'Moderate facial anomalies present';
            case 'lip': return 'Notable lip-sync issues';
            case 'frame': return 'Some frame artifacts detected';
            case 'audio': return 'Moderate sync issues observed';
        }
    } else {
        switch(type) {
            case 'face': return 'Minor facial variations';
            case 'lip': return 'Slight lip-sync deviation';
            case 'frame': return 'Few frame inconsistencies';
            case 'audio': return 'Minor sync discrepancies';
        }
    }
  }

  function resetButton() {
    isRecording = false;
    analyzeButton.classList.remove('analyzing');
    analyzeButton.innerHTML = '<span class="button-text">Analyze Stream</span>';
  }
});
