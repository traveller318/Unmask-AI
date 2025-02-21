const analyzeButton = document.getElementById('analyze-button');
const highRiskAlert = document.getElementById('high-risk-alert');
const confidenceValue = document.getElementById('confidence-value');
const confidenceProgress = document.getElementById('confidence-progress');

let isAnalyzing = false;

analyzeButton.addEventListener('click', () => {
    if (isAnalyzing) return;

    isAnalyzing = true;
    analyzeButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="activity-icon">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
    Analyzing stream...
  `;
    analyzeButton.classList.add('analyzing');

    setTimeout(() => {
        isAnalyzing = false;
        analyzeButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="camera-icon">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M14.31 8l5.74 9.94M9.69 8h11.48M8 12l5.74-9.94M14.31 16H6.69"></path>
      </svg>
      Analyze Stream
    `;
        analyzeButton.classList.remove('analyzing');

        // Simulate results
        const results = {
            confidence: 78,
            faceDistortion: 65,
            lipSyncDeviation: 82,
            frameConsistency: 71,
            audioVideoMismatch: 75,
        };

        confidenceValue.textContent = `${results.confidence}%`;
        confidenceProgress.style.width = `${results.confidence}%`;

        if (results.confidence > 70) {
            highRiskAlert.classList.remove('hidden');
        } else {
            highRiskAlert.classList.add('hidden');
        }
    }, 2000);
});