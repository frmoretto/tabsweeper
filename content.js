let modal = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showModal') {
    if (!modal) {
      createModal();
    }
    updateModalContent(request.tabTitle);
    showModal();
  }
});

function createModal() {
  modal = document.createElement('div');
  modal.id = 'tabsweeper-modal';
  modal.className = 'tabsweeper-modal';
  applyStyles(modal, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '2147483647',
    fontFamily: 'Arial, sans-serif',
    fontSize: '16px',
    color: '#333',
  });

  const modalContent = document.createElement('div');
  modalContent.className = 'tabsweeper-modal-content';
  applyStyles(modalContent, {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '5px',
    textAlign: 'center',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    maxWidth: '80%',
    position: 'relative',
    margin: '0',
    border: 'none',
    outline: 'none',
  });

  const question = document.createElement('p');
  question.id = 'tabsweeper-modal-question';
  question.className = 'tabsweeper-modal-question';
  applyStyles(question, {
    fontSize: '18px',
    marginBottom: '20px',
    fontWeight: 'bold',
  });
  
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'tabsweeper-modal-buttons';
  applyStyles(buttonContainer, {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
  });

  const createButton = (text, color, action) => {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = `tabsweeper-modal-button tabsweeper-modal-button-${action}`;
    applyStyles(button, {
      padding: '10px 20px',
      fontSize: '16px',
      cursor: 'pointer',
      border: 'none',
      borderRadius: '5px',
      backgroundColor: color,
      color: 'white',
      fontWeight: 'bold',
      textTransform: 'uppercase',
    });
    button.onclick = () => {
      chrome.runtime.sendMessage({action: 'modalResponse', response: action});
      hideModal();
    };
    return button;
  };

  const yesBtn = createButton('Yes', '#4CAF50', 'yes');
  const noBtn = createButton('No', '#f44336', 'no');
  const skipBtn = createButton('Skip', '#2196F3', 'skip');

  buttonContainer.appendChild(yesBtn);
  buttonContainer.appendChild(noBtn);
  buttonContainer.appendChild(skipBtn);

  modalContent.appendChild(question);
  modalContent.appendChild(buttonContainer);
  modal.appendChild(modalContent);

  // Prevent interaction with the page behind the modal
  modal.addEventListener('click', function(event) {
    event.stopPropagation();
  });

  document.body.appendChild(modal);

  // Focus on the modal to ensure keyboard navigation works
  modalContent.tabIndex = -1;
  modalContent.focus();

  // Ensure the modal stays on top
  setInterval(() => {
    const highestZIndex = Math.max(
      ...Array.from(document.querySelectorAll('body *'))
        .map(el => parseFloat(window.getComputedStyle(el).zIndex))
        .filter(zIndex => !isNaN(zIndex))
    );
    modal.style.zIndex = Math.max(highestZIndex + 1, 2147483647) + '';
  }, 100);
}

function applyStyles(element, styles) {
  Object.keys(styles).forEach(key => {
    element.style.setProperty(key, styles[key], 'important');
  });
}

function updateModalContent(tabTitle) {
  const question = document.getElementById('tabsweeper-modal-question');
  question.textContent = `Is this tab still relevant? "${tabTitle}"`;
}

function showModal() {
  if (modal) {
    modal.style.setProperty('display', 'flex', 'important');
    // Attempt to close GDPR banners or other overlays
    const possibleOverlays = document.querySelectorAll('div[id*="cookie"], div[id*="gdpr"], div[class*="cookie"], div[class*="gdpr"]');
    possibleOverlays.forEach(overlay => {
      overlay.style.setProperty('display', 'none', 'important');
    });
  }
}

function hideModal() {
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
  }
}

// Initial attempt to handle GDPR banners
document.addEventListener('DOMContentLoaded', () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.id && (node.id.includes('cookie') || node.id.includes('gdpr')) ||
                node.className && (typeof node.className === 'string' && (node.className.includes('cookie') || node.className.includes('gdpr')))) {
              node.style.setProperty('display', 'none', 'important');
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
});