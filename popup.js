document.addEventListener('DOMContentLoaded', function() {
  const collectButton = document.getElementById('collectButton');
  const resultDiv = document.getElementById('result');
  const savedFilesList = document.getElementById('savedFiles');

  function addIntroduction() {
    const introDiv = document.createElement('div');
    introDiv.className = 'introduction';
    introDiv.innerHTML = `
      <h2>Welcome to Tabs Saved Files</h2>
      <p>This extension helps you manage your browser tabs efficiently:</p>
      <ul>
        <li>Save all your open tabs with a single click</li>
        <li>Organize and access your saved tab collections easily</li>
        <li>Backup your browsing sessions for future reference</li>
        <li>Streamline your workflow and reduce browser clutter</li>
      </ul>
    `;
    document.body.insertBefore(introDiv, document.body.firstChild);
  }

  function updateSavedFilesList() {
    chrome.runtime.sendMessage({action: "getSavedFiles"}, function(response) {
      if (chrome.runtime.lastError) {
        showMessage("Error loading saved files. Please try again.", true);
        return;
      }
      savedFilesList.innerHTML = '';
      if (response && response.files) {
        response.files.forEach(file => {
          if (!file.isBackup) {
            const li = document.createElement('li');
            li.className = 'file-item';

            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            fileInfo.innerHTML = `
              <div class="file-name">${file.displayName}</div>
              <div class="file-details">(${file.urlCount} URLs, ${file.fileSizeKB} KB)</div>
            `;

            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'file-buttons';

            const viewButton = document.createElement('button');
            viewButton.innerHTML = 'View<br>&<br>Download';
            viewButton.className = 'view-btn';
            viewButton.addEventListener('click', function() {
              chrome.runtime.sendMessage({action: "openViewPage", fileName: file.fileName});
            });

            buttonsDiv.appendChild(viewButton);

            const deleteButtonDiv = document.createElement('div');
            deleteButtonDiv.className = 'delete-button-container';

            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '&#128465;'; // Trash bin icon
            deleteButton.className = 'delete-btn';
            deleteButton.addEventListener('click', function() {
              deleteFile(file.fileName);
            });

            deleteButtonDiv.appendChild(deleteButton);

            li.appendChild(fileInfo);
            li.appendChild(buttonsDiv);
            li.appendChild(deleteButtonDiv);
            savedFilesList.appendChild(li);
          }
        });
        showMessage("Saved files list updated successfully");
      } else {
        showMessage("Unexpected response when loading saved files", true);
      }
    });
  }

  function createModal(message, yesCallback, noCallback) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <p>${message}</p>
        <button class="yes-btn">Yes</button>
        <button class="no-btn">No</button>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.yes-btn').addEventListener('click', () => {
      yesCallback();
      modal.remove();
    });

    modal.querySelector('.no-btn').addEventListener('click', () => {
      if (noCallback) noCallback();
      modal.remove();
    });
  }

  function showMessage(message, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isError ? 'error' : 'success'}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
  }

  function deleteFile(fileName) {
    createModal(`Are you sure you want to delete ${fileName}?`, 
      () => {
        const backupFileName = fileName.replace('.json', '-backup.json');
        createModal('Do you want to delete the backup file as well?',
          () => {
            createModal("Are you really sure you want to delete the backup file?",
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

  addIntroduction();
  updateSavedFilesList();

  if (collectButton) {
    collectButton.addEventListener('click', function() {
      chrome.runtime.sendMessage({action: "collectTabs", excludeExtensionTabs: true}, function(response) {
        if (chrome.runtime.lastError) {
          showMessage('Error: ' + chrome.runtime.lastError.message, true);
        } else if (response && response.success) {
          showMessage(`Data saved as: ${response.fileName} (${response.urlCount} URLs, ${response.fileSizeKB} KB)`);
          updateSavedFilesList();
        } else {
          showMessage('Failed to save tab data: ' + (response ? response.error : 'Unknown error'), true);
        }
      });
    });
  }
});

// Add updated CSS styles
const style = document.createElement('style');
style.textContent = `
  .view-btn, .delete-btn {
    padding: 8px 12px;
    font-size: 14px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .view-btn {
    background-color: #4CAF50;
    color: white;
    width: 100px;
    height: 60px;
    flex-direction: column;
    text-align: center;
    line-height: 1.2;
  }
  .view-btn:hover {
    background-color: #45a049;
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  .delete-btn {
    background-color: #f44336;
    color: white;
    width: 60px;
    height: 60px;
    font-size: 24px;
  }
  .delete-btn:hover {
    background-color: #d32f2f;
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
`;
document.head.appendChild(style);