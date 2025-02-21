document.addEventListener("DOMContentLoaded", async () => {
    const startButton = document.getElementById("start-recording");
    const stopButton = document.getElementById("stop-recording");

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    startButton.addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "startRecording", tabId: tab.id });
        startButton.disabled = true;
        stopButton.disabled = false;
    });

    stopButton.addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "stopRecording", tabId: tab.id });
        startButton.disabled = false;
        stopButton.disabled = true;
    });
});
