document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const fileName = urlParams.get('file');
    const title = document.getElementById('title');
    const tabList = document.getElementById('tabList');
    const downloadBtn = document.getElementById('downloadBtn');
    const openAllTabsBtn = document.getElementById('openAllTabsBtn');

    let tabData = null;

    if (fileName) {
        title.textContent = `Saved Tabs - ${fileName}`;
        chrome.storage.local.get(fileName, function(result) {
            if (result[fileName]) {
                tabData = JSON.parse(result[fileName]);
                displayTabs(tabData.tabs);
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

    openAllTabsBtn.addEventListener('click', function() {
        if (tabData && tabData.tabs) {
            chrome.runtime.sendMessage({action: "openAllTabs", tabs: tabData.tabs});
        } else {
            alert('No tabs data available to open.');
        }
    });

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
            const domainHeader = document.createElement('div');
            domainHeader.className = 'domain';
            domainHeader.textContent = domain;
            tabList.appendChild(domainHeader);

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
                            // Update the storage
                            chrome.storage.local.set({[fileName]: JSON.stringify(tabData)}, function() {
                                if (chrome.runtime.lastError) {
                                    console.error('Error updating storage:', chrome.runtime.lastError);
                                }
                            });
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
            tabList.appendChild(domainList);
        });
    }
});