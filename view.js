document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const fileName = urlParams.get('file');
    const title = document.getElementById('title');
    const tabList = document.getElementById('tabList');
    const downloadBtn = document.getElementById('downloadBtn');
    const declutterBtn = document.getElementById('openAllTabsBtn');
    const tabCounter = document.createElement('div');
    tabCounter.id = 'tabCounter';
    tabCounter.style.marginTop = '10px';
    tabCounter.style.fontWeight = 'bold';
    document.body.insertBefore(tabCounter, tabList);

    let tabData = null;
    let currentTabId = null;
    let skippedTabs = [];

    function updateTabCounter() {
        const totalTabs = tabData ? tabData.tabs.length : 0;
        tabCounter.textContent = `Total tabs: ${totalTabs}`;
    }

    if (fileName) {
        title.textContent = `Saved Tabs - ${fileName}`;
        chrome.storage.local.get(fileName, function(result) {
            if (result[fileName]) {
                tabData = JSON.parse(result[fileName]);
                displayTabs(tabData.tabs);
                updateTabCounter();
            } else {
                tabList.textContent = 'File not found.';
            }
        });
    } else {
        title.textContent = 'No file specified';
        tabList.textContent = 'Please specify a file to view.';
    }

    downloadBtn.addEventListener('click', function() {
        if (fileName) {
            chrome.storage.local.get(fileName, function(result) {
                if (result[fileName]) {
                    const blob = new Blob([result[fileName]], {type: 'application/json'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                } else {
                    alert('File not found.');
                }
            });
        } else {
            alert('No file specified for download.');
        }
    });

    declutterBtn.textContent = 'Declutter your browser...';
    declutterBtn.addEventListener('click', function() {
        if (tabData && tabData.tabs && tabData.tabs.length > 0) {
            skippedTabs = [];
            declutterBrowser();
        } else {
            alert('No tabs data available to declutter.');
        }
    });

    function declutterBrowser() {
        let currentList = tabData.tabs.length > 0 ? tabData.tabs : skippedTabs;
        
        if (currentList.length === 0) {
            alert('All tabs have been reviewed!');
            return;
        }

        let randomIndex = Math.floor(Math.random() * currentList.length);
        let randomTab = currentList[randomIndex];

        openTabAndGetResponse(randomTab)
            .then(response => {
                currentList.splice(randomIndex, 1);
                if (response === 'yes') {
                    if (currentList === skippedTabs) {
                        tabData.tabs.push(randomTab);
                    }
                } else if (response === 'no') {
                    // Tab is already removed
                } else if (response === 'skip') {
                    if (currentList === tabData.tabs) {
                        skippedTabs.push(randomTab);
                    } else {
                        skippedTabs.push(randomTab);
                    }
                }
                updateStorage();
                displayTabs(tabData.tabs);
                updateTabCounter();
                declutterBrowser(); // Process next tab
            })
            .catch(error => {
                console.error('Error processing tab:', error);
                declutterBrowser(); // Move to next tab even if there's an error
            });
    }

    function openTabAndGetResponse(tab) {
        return new Promise((resolve, reject) => {
            chrome.tabs.create({ url: tab.url }, function(newTab) {
                currentTabId = newTab.id;
                chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                    if (tabId === newTab.id && info.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        chrome.tabs.sendMessage(tabId, { action: 'showModal', tabTitle: tab.title });
                    }
                });

                chrome.runtime.onMessage.addListener(function responseListener(request) {
                    if (request.action === 'modalResponse') {
                        chrome.runtime.onMessage.removeListener(responseListener);
                        chrome.tabs.remove(currentTabId, () => {
                            resolve(request.response);
                        });
                    }
                });
            });
        });
    }

    function updateStorage() {
        chrome.storage.local.set({[fileName]: JSON.stringify(tabData)}, function() {
            if (chrome.runtime.lastError) {
                console.error('Error updating storage:', chrome.runtime.lastError);
            }
        });
    }

    function displayTabs(tabs) {
        const domains = {};
        tabs.forEach(tab => {
            const url = new URL(tab.url);
            const domain = url.hostname;
            if (!domains[domain]) {
                domains[domain] = [];
            }
            domains[domain].push(tab);
        });

        // Sort domains alphabetically
        const sortedDomains = Object.keys(domains).sort();

        tabList.innerHTML = ''; // Clear existing content

        sortedDomains.forEach(domain => {
            const domainContainer = document.createElement('div');
            domainContainer.className = 'domain-container';

            const domainHeader = document.createElement('div');
            domainHeader.className = 'domain';
            
            const domainName = document.createElement('span');
            domainName.textContent = domain;
            domainHeader.appendChild(domainName);

            const deleteDomainBtn = document.createElement('span');
            deleteDomainBtn.className = 'delete-domain-btn';
            deleteDomainBtn.innerHTML = '&#128465;'; // Trash bin icon
            deleteDomainBtn.title = 'Delete all tabs from this domain';
            deleteDomainBtn.onclick = function() {
                if (confirm(`Are you sure you want to delete all tabs from ${domain}?`)) {
                    // Remove all tabs from this domain
                    tabData.tabs = tabData.tabs.filter(tab => {
                        const tabUrl = new URL(tab.url);
                        return tabUrl.hostname !== domain;
                    });
                    updateStorage();
                    displayTabs(tabData.tabs);
                    updateTabCounter();
                }
            };
            domainHeader.appendChild(deleteDomainBtn);

            domainContainer.appendChild(domainHeader);

            const domainList = document.createElement('ul');
            domainList.className = 'domain-list';

            // Sort tabs within the domain alphabetically by title
            domains[domain].sort((a, b) => (a.title || a.url).localeCompare(b.title || b.url));

            domains[domain].forEach(tab => {
                const li = document.createElement('li');
                const deleteBtn = document.createElement('span');
                deleteBtn.className = 'delete-btn';
                deleteBtn.innerHTML = '&#128465;'; // Trash bin icon
                deleteBtn.title = 'Delete this tab';
                deleteBtn.onclick = function() {
                    if (confirm('Are you sure you want to delete this tab?')) {
                        li.remove();
                        // Update the tabData to reflect this deletion
                        const index = tabData.tabs.findIndex(t => t.url === tab.url && t.title === tab.title);
                        if (index > -1) {
                            tabData.tabs.splice(index, 1);
                            updateStorage();
                            updateTabCounter();
                        }
                    }
                };
                const a = document.createElement('a');
                a.href = tab.url;
                a.textContent = tab.title || tab.url;
                a.target = '_blank';
                li.appendChild(deleteBtn);
                li.appendChild(a);
                domainList.appendChild(li);
            });
            domainContainer.appendChild(domainList);
            tabList.appendChild(domainContainer);
        });
        updateTabCounter();
    }
});

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
    .domain-container {
        margin-bottom: 20px;
    }
    .domain {
        font-weight: bold;
        margin-bottom: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .delete-domain-btn {
        cursor: pointer;
        color: #f44336;
        font-size: 20px;
    }
    .delete-btn {
        cursor: pointer;
        color: #f44336;
        margin-right: 5px;
    }
    .domain-list {
        list-style-type: none;
        padding-left: 20px;
    }
    .domain-list li {
        margin-bottom: 5px;
    }
`;
document.head.appendChild(style);