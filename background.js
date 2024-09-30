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

// Unified function to generate a filename
function generateFileName(prefix = 'browser-tabs') {
  const now = new Date();
  return `${prefix}-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}.json`;
}

// Function to generate a unique filename
function generateUniqueFileName(baseFileName) {
  return new Promise((resolve) => {
    let counter = 0;
    let uniqueFileName = baseFileName;

    function checkAndIncrement() {
      chrome.storage.local.get(uniqueFileName, (result) => {
        if (chrome.runtime.lastError || Object.keys(result).length > 0) {
          counter++;
          uniqueFileName = baseFileName.replace('.json', `-${counter}.json`);
          checkAndIncrement();
        } else {
          resolve(uniqueFileName);
        }
      });
    }

    checkAndIncrement();
  });
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
      const createdAt = new Date().getTime();
      const fileContent = {
        metadata: {
          totalUrls: urlCount,
          fileSizeKB: 0,
          excludedExtensionTabs: request.excludeExtensionTabs,
          createdAt: createdAt
        },
        tabs: tabData
      };
      
      const jsonString = JSON.stringify(fileContent, null, 2);
      const fileSizeKB = Math.round(jsonString.length / 1024);
      
      fileContent.metadata.fileSizeKB = fileSizeKB;
      const finalJsonString = JSON.stringify(fileContent, null, 2);
      
      const baseFileName = generateFileName();
      
      generateUniqueFileName(baseFileName).then(fileName => {
        const backupFileName = fileName.replace('.json', '-backup.json');
        
        logToFile("Saving data to storage...");
        chrome.storage.local.set({
          [fileName]: finalJsonString,
          [backupFileName]: finalJsonString,
          [`${fileName}_meta`]: { urlCount, fileSizeKB, excludedExtensionTabs: request.excludedExtensionTabs, createdAt },
          [`${backupFileName}_meta`]: { urlCount, fileSizeKB, excludedExtensionTabs: request.excludedExtensionTabs, createdAt }
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
        .filter(key => key.endsWith('.json') && !key.endsWith('_meta') && (key.startsWith('browser-tabs-') || key.startsWith('uploaded-tabs-')))
        .map(fileName => {
          logToFile(`Processing file: ${fileName}`);
          const match = fileName.match(/(?:browser|uploaded)-tabs-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})(?:-(\d+))?(-backup)?\.json/);
          if (match) {
            const [, year, month, day, hour, minute, second, increment, isBackup] = match;
            const meta = items[`${fileName}_meta`] || {};
            let fileContent;
            try {
              fileContent = JSON.parse(items[fileName]);
            } catch (error) {
              logToFile(`Error parsing file content for ${fileName}: ${error.message}`, true);
              return null;
            }
            const urlCount = fileContent.tabs ? fileContent.tabs.length : 'N/A';
            const fileSizeKB = Math.round(items[fileName].length / 1024);
            return {
              fileName: fileName,
              displayName: `${year}/${month}/${day} ${hour}:${minute}:${second}${increment ? `-${increment}` : ''}`,
              isBackup: !!isBackup,
              urlCount: urlCount,
              fileSizeKB: fileSizeKB,
              excludedExtensionTabs: meta.excludedExtensionTabs || false,
              createdAt: meta.createdAt || new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`).getTime()
            };
          }
          logToFile(`File name did not match expected pattern: ${fileName}`, true);
          return null;
        })
        .filter(item => item !== null)
        .sort((a, b) => b.createdAt - a.createdAt);
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
  } else if (request.action === "addCurrentTabs") {
    logToFile("Adding current tabs to existing collection...");
    chrome.windows.getAll({populate: true}, (windows) => {
      if (chrome.runtime.lastError) {
        logToFile(`Error getting windows: ${chrome.runtime.lastError.message}`, true);
        sendResponse({success: false, error: "Error getting windows: " + chrome.runtime.lastError.message});
        return;
      }

      let newTabs = [];
      let uniqueUrls = new Set();

      windows.forEach((window, windowIndex) => {
        logToFile(`Processing window ${windowIndex + 1} of ${windows.length}`);
        window.tabs.forEach((tab, tabIndex) => {
          logToFile(`Processing tab ${tabIndex + 1} of ${window.tabs.length} in window ${windowIndex + 1}`);
          if (!isExtensionTab(tab) && !uniqueUrls.has(tab.url)) {
            newTabs.push({
              url: tab.url,
              title: tab.title
            });
            uniqueUrls.add(tab.url);
          }
        });
      });
      
      logToFile(`Collected ${newTabs.length} unique new tabs`);
      sendResponse({success: true, newTabs: newTabs});
    });
    return true; // Indicates that the response is sent asynchronously
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