// scripts/utils.js

/**
 * Storage helpers
 */
async function saveState(url, preview, chapters) {
  await chrome.storage.local.set({
    lastState: { url, preview, chapters, timestamp: Date.now() }
  });
}

async function clearState() {
  await chrome.storage.local.remove("lastState");
}

/**
 * Tab helpers
 */
function waitForTabComplete(tabId) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      chrome.webNavigation.onCompleted.removeListener(listener);
      resolve();
    }, 60000);

    function listener(details) {
      if (details.tabId === tabId && details.frameId === 0) {
        clearTimeout(timeout);
        chrome.webNavigation.onCompleted.removeListener(listener);
        setTimeout(resolve, 500);
      }
    }

    chrome.webNavigation.onCompleted.addListener(listener);
  });
}

function navigateTab(tabId, url) {
  return new Promise((resolve) => {
    chrome.tabs.update(tabId, { url }, () => {
      waitForTabComplete(tabId).then(resolve);
    });
  });
}

/**
 * Rendering helpers
 */
function renderProgressBar(pct) {
  return `
    <div style="height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden;margin-top:4px;">
      <div style="height:100%;width:${pct}%;background:#1a73e8;transition:width 0.3s;border-radius:3px;"></div>
    </div>`;
}
