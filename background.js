// console.log("Background script starting");
// console.trace("Background script initialization trace");

let extensionLog = [];

function logToFile(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - ${isError ? 'ERROR' : 'INFO'}: ${message}`;
  extensionLog.push(logEntry);
  // console[isError ? 'error' : 'log'](logEntry);

  // Limit log size to prevent excessive memory usage
  if (extensionLog.length > 100) {
    extensionLog = extensionLog.slice(-100);
  }
}

// Function to check if a tab is related to the extension
function isExtensionTab(tab) {
  const extensionUrl = `chrome-extension://${chrome.runtime.id}`;
  return tab.url.startsWith(extensionUrl);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logToFile(`Received message: ${JSON.stringify(request)}`);

  if (request.action === "collectTabs") {
    logToFile("Collecting tabs...");
    chrome.windows.getAll({populate: true}, (windows) => {
      if (chrome.runtime.lastError) {
        logToFile(`Error getting windows: ${chrome.runtime.lastError.message}`, true);
        sendResponse({success: false, error: "Error getting windows: " + chrome.runtime.lastError.message});
        return;
      }

      let tabData = [];
      let uniqueUrls = new Set();

      windows.forEach((window, windowIndex) => {
        logToFile(`Processing window ${windowIndex + 1} of ${windows.length}`);
        window.tabs.forEach((tab, tabIndex) => {
          logToFile(`Processing tab ${tabIndex + 1} of ${window.tabs.length} in window ${windowIndex + 1}`);
          if ((!request.excludeExtensionTabs || !isExtensionTab(tab)) && !uniqueUrls.has(tab.url)) {
            tabData.push({
              windowId: window.id,
              url: tab.url,
              title: tab.title
            });
            uniqueUrls.add(tab.url);
          }
        });
      });
      
      logToFile(`Collected ${tabData.length} unique tabs`);

      const urlCount = tabData.length;
      const fileContent = {
        metadata: {
          totalUrls: urlCount,
          fileSizeKB: 0,
          excludedExtensionTabs: request.excludeExtensionTabs
        },
        tabs: tabData
      };
      
      const jsonString = JSON.stringify(fileContent, null, 2);
      const fileSizeKB = Math.round(jsonString.length / 1024);
      
      fileContent.metadata.fileSizeKB = fileSizeKB;
      const finalJsonString = JSON.stringify(fileContent, null, 2);
      
      const now = new Date();
      const fileName = `browser-tabs-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}.json`;
      const backupFileName = fileName.replace('.json', '-backup.json');
      
      logToFile("Saving data to storage...");
      chrome.storage.local.set({
        [fileName]: finalJsonString,
        [backupFileName]: finalJsonString,
        [`${fileName}_meta`]: { urlCount, fileSizeKB, excludedExtensionTabs: request.excludedExtensionTabs },
        [`${backupFileName}_meta`]: { urlCount, fileSizeKB, excludedExtensionTabs: request.excludedExtensionTabs }
      }, () => {
        if (chrome.runtime.lastError) {
          logToFile(`Error saving data: ${chrome.runtime.lastError.message}`, true);
          sendResponse({success: false, error: chrome.runtime.lastError.message});
        } else {
          logToFile("Data saved successfully");
          sendResponse({success: true, fileName: fileName, backupFileName: backupFileName, urlCount, fileSizeKB});
        }
      });
    });
    return true; // Indicates that the response is sent asynchronously
  } else if (request.action === "getSavedFiles") {
    logToFile("Getting saved files...");
    chrome.storage.local.get(null, (items) => {
      if (chrome.runtime.lastError) {
        logToFile(`Error getting saved files: ${chrome.runtime.lastError.message}`, true);
        sendResponse({success: false, error: chrome.runtime.lastError.message});
        return;
      }

      const savedFiles = Object.keys(items)
        .filter(key => key.startsWith('browser-tabs-') && key.endsWith('.json') && !key.endsWith('_meta'))
        .map(fileName => {
          const match = fileName.match(/browser-tabs-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})(-backup)?\.json/);
          if (match) {
            const [, year, month, day, hour, minute, second, isBackup] = match;
            const meta = items[`${fileName}_meta`] || {};
            return {
              fileName: fileName,
              displayName: `${year}/${month}/${day} ${hour}:${minute}:${second}`,
              isBackup: !!isBackup,
              urlCount: meta.urlCount || 'N/A',
              fileSizeKB: meta.fileSizeKB || 'N/A',
              excludedExtensionTabs: meta.excludedExtensionTabs || false
            };
          }
          return null;
        })
        .filter(item => item !== null)
        .sort((a, b) => b.fileName.localeCompare(a.fileName));
      logToFile(`Saved files: ${JSON.stringify(savedFiles)}`);
      sendResponse({success: true, files: savedFiles});
    });
    return true;
  } else if (request.action === "openViewPage") {
    logToFile(`Opening view page for file: ${request.fileName}`);
    chrome.tabs.create({url: `view.html?file=${encodeURIComponent(request.fileName)}`});
  } else if (request.action === "deleteFiles") {
    logToFile(`Deleting files: ${JSON.stringify(request.files)}`);
    const filesToDelete = request.files.concat(request.files.map(f => `${f}_meta`));
    chrome.storage.local.remove(filesToDelete, () => {
      if (chrome.runtime.lastError) {
        logToFile(`Error deleting files: ${chrome.runtime.lastError.message}`, true);
        sendResponse({success: false, error: chrome.runtime.lastError.message});
      } else {
        chrome.storage.local.get(filesToDelete, (remainingItems) => {
          const deletedSuccessfully = Object.keys(remainingItems).length === 0;
          if (deletedSuccessfully) {
            logToFile(`Files deleted successfully: ${JSON.stringify(request.files)}`);
            sendResponse({success: true});
          } else {
            logToFile(`Some files were not deleted: ${JSON.stringify(Object.keys(remainingItems))}`, true);
            sendResponse({success: false, error: "Some files could not be deleted"});
          }
        });
      }
    });
    return true;
  } else if (request.action === "getLog") {
    logToFile("Retrieving extension log");
    sendResponse({success: true, log: extensionLog.join('\n')});
    return true;
  } else if (request.action === "openAllTabs") {
    logToFile("Opening tabs with a limit of 20 per window...");
    if (request.tabs && request.tabs.length > 0) {
      const tabGroups = [];
      for (let i = 0; i < request.tabs.length; i += 20) {
        tabGroups.push(request.tabs.slice(i, i + 20));
      }
      
      let windowsCreated = 0;
      let totalTabsOpened = 0;

      function createNextWindow(index) {
        if (index < tabGroups.length) {
          chrome.windows.create({ url: tabGroups[index][0].url }, (newWindow) => {
            if (chrome.runtime.lastError) {
              logToFile(`Error creating new window: ${chrome.runtime.lastError.message}`, true);
              sendResponse({success: false, error: chrome.runtime.lastError.message});
              return;
            }
            for (let i = 1; i < tabGroups[index].length; i++) {
              chrome.tabs.create({ windowId: newWindow.id, url: tabGroups[index][i].url });
            }
            windowsCreated++;
            totalTabsOpened += tabGroups[index].length;
            logToFile(`Opened ${tabGroups[index].length} tabs in window ${windowsCreated}`);
            createNextWindow(index + 1);
          });
        } else {
          logToFile(`Finished opening ${totalTabsOpened} tabs in ${windowsCreated} windows`);
          sendResponse({success: true, message: `Opened ${totalTabsOpened} tabs in ${windowsCreated} windows`});
        }
      }

      createNextWindow(0);
    } else {
      logToFile("No tabs to open", true);
      sendResponse({success: false, error: "No tabs to open"});
    }
    return true;
  } else {
    logToFile(`Unknown action received: ${request.action}`, true);
    sendResponse({success: false, error: `Unknown action: ${request.action}`});
  }
});

chrome.runtime.onInstalled.addListener(() => {
  logToFile("Extension installed or updated");
});

chrome.runtime.onStartup.addListener(() => {
  logToFile("Browser started");
});

logToFile("Background script loaded and listeners set up");