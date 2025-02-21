chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startRecording") {
        chrome.scripting.executeScript({
            target: { tabId: message.tabId },
            files: ["content.js"]
        });
    } else if (message.action === "stopRecording") {
        chrome.tabs.sendMessage(message.tabId, { action: "stopRecording" });
    }
});
