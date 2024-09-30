document.addEventListener('DOMContentLoaded', function() {
  const collectButton = document.getElementById('collectButton');
  const uploadButton = document.getElementById('uploadButton');
  const fileInput = document.getElementById('fileInput');
  const resultDiv = document.getElementById('result');
  const savedFilesList = document.getElementById('savedFiles');
  const tabCountElement = document.getElementById('tabCount');

  function updateSavedFilesList() {
    chrome.runtime.sendMessage({action: "getSavedFiles"}, function(response) {
      if (chrome.runtime.lastError) {
        showMessage("Error loading saved files. Please try again.", true);
        return;
      }
      savedFilesList.innerHTML = '<h3>Saved Files</h3>';
      if (response && response.files && response.files.length > 0) {
        // Sort files by creation date in descending order
        const sortedFiles = response.files.sort((a, b) => b.createdAt - a.createdAt);

        const ul = document.createElement('ul');
        ul.className = 'file-list';
        sortedFiles.forEach(file => {
          if (!file.isBackup) {
            const li = document.createElement('li');
            li.className = 'file-item';
            li.innerHTML = `
              <div class="file-info">
                <i class="fas fa-file-alt file-icon"></i>
                <div class="file-details">
                  <div class="file-name">${file.displayName}</div>
                  <div class="file-meta">${file.urlCount} URLs, ${file.fileSizeKB} KB</div>
                  <div class="file-date">${new Date(file.createdAt).toLocaleString()}</div>
                </div>
              </div>
              <div class="file-actions">
                <button class="view-btn" title="View & Download"><i class="fas fa-eye"></i></button>
                <button class="delete-btn" title="Delete"><i class="fas fa-trash-alt"></i></button>
              </div>
            `;
            
            li.querySelector('.view-btn').addEventListener('click', function() {
              chrome.runtime.sendMessage({action: "openViewPage", fileName: file.fileName});
            });
            
            li.querySelector('.delete-btn').addEventListener('click', function() {
              deleteFile(file.fileName);
            });
            
            ul.appendChild(li);
          }
        });
        savedFilesList.appendChild(ul);
      } else {
        savedFilesList.innerHTML += '<p>No saved files found.</p>';
      }
    });
  }

  function createConfirmationModal(title, message, confirmCallback, cancelCallback) {
    const modal = document.createElement('div');
    modal.className = 'confirmation-modal';
    modal.innerHTML = `
      <div class="confirmation-modal-content">
        <h2>${title}</h2>
        <p>${message}</p>
        <div class="confirmation-modal-buttons">
          <button class="confirm-btn">Confirm</button>
          <button class="cancel-btn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.confirm-btn').addEventListener('click', () => {
      confirmCallback();
      modal.remove();
    });

    modal.querySelector('.cancel-btn').addEventListener('click', () => {
      if (cancelCallback) cancelCallback();
      modal.remove();
    });
  }

  function showMessage(message, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isError ? 'error' : 'success'}`;
    messageDiv.textContent = message;
    resultDiv.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
  }

  function deleteFile(fileName) {
    createConfirmationModal(
      "Confirm Deletion",
      `Are you sure you want to delete ${fileName}?`,
      () => {
        const backupFileName = fileName.replace('.json', '-backup.json');
        createConfirmationModal(
          "Delete Backup",
          'Do you want to delete the backup file as well?',
          () => {
            createConfirmationModal(
              "Confirm Backup Deletion",
              "Are you really sure you want to delete the backup file?",
              () => {
                chrome.runtime.sendMessage({action: "deleteFiles", files: [fileName, backupFileName]}, function(response) {
                  if (response.success) {
                    showMessage('Files deleted successfully');
                    updateSavedFilesList();
                  } else {
                    showMessage('Failed to delete files', true);
                  }
                });
              },
              () => {
                showMessage("Backup file not deleted");
              }
            );
          },
          () => {
            chrome.runtime.sendMessage({action: "deleteFiles", files: [fileName]}, function(response) {
              if (response.success) {
                showMessage('File deleted successfully');
                updateSavedFilesList();
              } else {
                showMessage('Failed to delete file', true);
              }
            });
          }
        );
      }
    );
  }

  function updateTabCount() {
    chrome.tabs.query({}, function(tabs) {
      const count = tabs.length;
      tabCountElement.textContent = `Current open tabs: ${count}`;
    });
  }

  function handleFileUpload(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const jsonContent = JSON.parse(event.target.result);
        if (jsonContent && jsonContent.tabs && Array.isArray(jsonContent.tabs)) {
          chrome.runtime.sendMessage({action: "generateFileName", prefix: "uploaded-tabs"}, function(response) {
            if (response && response.fileName) {
              const fileName = response.fileName;
              const fileContent = {
                metadata: {
                  totalUrls: jsonContent.tabs.length,
                  fileSizeKB: Math.round(event.target.result.length / 1024),
                  excludedExtensionTabs: false,
                  createdAt: new Date().getTime()
                },
                tabs: jsonContent.tabs
              };
              chrome.storage.local.set({
                [fileName]: JSON.stringify(fileContent),
                [`${fileName}_meta`]: {
                  urlCount: jsonContent.tabs.length,
                  fileSizeKB: Math.round(event.target.result.length / 1024),
                  excludedExtensionTabs: false,
                  createdAt: fileContent.metadata.createdAt
                }
              }, function() {
                if (chrome.runtime.lastError) {
                  showMessage('Error uploading file: ' + chrome.runtime.lastError.message, true);
                } else {
                  showMessage('File uploaded successfully');
                  updateSavedFilesList();
                }
              });
            } else {
              showMessage('Error generating file name', true);
            }
          });
        } else {
          showMessage('Invalid JSON format. Please upload a valid tab collection file.', true);
        }
      } catch (error) {
        showMessage('Error parsing JSON file: ' + error.message, true);
      }
    };
    reader.readAsText(file);
  }

  updateSavedFilesList();
  updateTabCount();

  if (collectButton) {
    collectButton.addEventListener('click', function() {
      chrome.runtime.sendMessage({action: "collectTabs", excludeExtensionTabs: true}, function(response) {
        if (chrome.runtime.lastError) {
          showMessage('Error: ' + chrome.runtime.lastError.message, true);
        } else if (response && response.success) {
          showMessage(`Data saved as: ${response.fileName} (${response.urlCount} URLs, ${response.fileSizeKB} KB)`);
          updateSavedFilesList();
          updateTabCount();
        } else {
          showMessage('Failed to save tab data: ' + (response ? response.error : 'Unknown error'), true);
        }
      });
    });
  }

  if (uploadButton && fileInput) {
    uploadButton.addEventListener('click', function() {
      fileInput.click();
    });

    fileInput.addEventListener('change', function(event) {
      const file = event.target.files[0];
      if (file) {
        handleFileUpload(file);
      }
    });
  }

  // Update tab count when tabs are created or removed
  chrome.tabs.onCreated.addListener(updateTabCount);
  chrome.tabs.onRemoved.addListener(updateTabCount);
});

// Add updated CSS styles
const style = document.createElement('style');
style.textContent = `
  .file-list {
    list-style-type: none;
    padding: 0;
    margin: 0;
  }
  .file-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid #e0e0e0;
    transition: background-color 0.3s ease;
  }
  .file-item:last-child {
    border-bottom: none;
  }
  .file-item:hover {
    background-color: #f5f5f5;
  }
  .file-info {
    display: flex;
    align-items: center;
  }
  .file-icon {
    font-size: 24px;
    color: #3498db;
    margin-right: 10px;
  }
  .file-details {
    display: flex;
    flex-direction: column;
  }
  .file-name {
    font-weight: 500;
    color: #2c3e50;
  }
  .file-meta, .file-date {
    font-size: 12px;
    color: #7f8c8d;
  }
  .file-actions {
    display: flex;
  }
  .view-btn, .delete-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 5px;
    margin-left: 5px;
    font-size: 16px;
    transition: color 0.3s ease;
  }
  .view-btn {
    color: #3498db;
  }
  .view-btn:hover {
    color: #2980b9;
  }
  .delete-btn {
    color: #e74c3c;
  }
  .delete-btn:hover {
    color: #c0392b;
  }
  .message {
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 5px;
    font-size: 14px;
  }
  .message.success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  .message.error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
  .confirmation-modal {
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .confirmation-modal-content {
    background-color: #fefefe;
    padding: 20px;
    border-radius: 5px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    max-width: 80%;
    text-align: center;
  }
  .confirmation-modal-content h2 {
    margin-top: 0;
    color: #333;
  }
  .confirmation-modal-buttons {
    margin-top: 20px;
  }
  .confirmation-modal-buttons button {
    margin: 0 10px;
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.3s ease;
  }
  .confirmation-modal-buttons .confirm-btn {
    background-color: #4CAF50;
    color: white;
  }
  .confirmation-modal-buttons .cancel-btn {
    background-color: #f44336;
    color: white;
  }
  .confirmation-modal-buttons button:hover {
    opacity: 0.8;
  }
`;
document.head.appendChild(style);