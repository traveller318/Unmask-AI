chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startRecording") {
        chrome.scripting.executeScript({
            target: { tabId: message.tabId },
            files: ["content.js"]
        });
    } else if (message.action === "stopRecording") {
        chrome.tabs.sendMessage(message.tabId, { action: "stopRecording" });
    } else if (message.action === "download") {
        chrome.downloads.download({
            url: message.data.url,
            filename: message.data.filename,
            saveAs: true
        });
    }
});