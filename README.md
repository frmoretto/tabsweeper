# Tab Collector Extension

Tab Collector is a Chrome extension that allows users to easily collect, manage, and organize their open tabs across multiple windows.

## Features

- Collect open tabs from all Chrome windows
- View and manage collected tabs
- Organize tabs by domain
- Export tab collections as JSON files
- Open all saved tabs at once (with a limit of 20 tabs per window)
- Delete individual tabs or entire collections
- Automatic backup of tab collections
- Declutter feature to review and organize saved tabs
- GDPR/Cookie banner handling in declutter mode
- Detailed logging system for debugging and error tracking

## Project Structure

```
tab-collector-extension/
│
├── manifest.json        # Extension manifest file
├── background.js        # Background script for the extension
├── popup.html           # HTML for the extension popup
├── popup.js             # JavaScript for the extension popup
├── view.html            # HTML for viewing saved tab collections
├── view.js              # JavaScript for viewing saved tab collections
├── content.js           # Content script for interacting with web pages
├── .gitignore           # Git ignore file
├── package.json         # NPM package file
└── README.md            # This file
```

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/your-username/tab-collector-extension.git
   ```
2. Navigate to the project directory:
   ```
   cd tab-collector-extension
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Open Chrome and navigate to `chrome://extensions`
5. Enable "Developer mode" in the top right corner
6. Click "Load unpacked" and select the `tab-collector-extension` directory

## Usage

1. Click on the Tab Collector icon in your Chrome toolbar to open the popup.
2. Click the "Save Tabs" button to collect all open tabs.
3. View your saved tab collections by clicking on the file names in the popup.
4. In the view page, you can:
   - See tabs organized by domain
   - Open individual tabs
   - Delete individual tabs
   - Download the tab collection as a JSON file
   - Open all tabs in the collection at once (with a limit of 20 tabs per window)
   - Use the declutter feature to review and organize saved tabs

## Key Features

### 20-Tab Limit Per Window

When opening all saved tabs, the extension limits the number of tabs opened per window to 20. This feature helps manage browser performance and prevents overwhelming the user with too many tabs in a single window. If there are more than 20 tabs to open, the extension will create additional windows as needed.

### Declutter Feature

The declutter feature allows users to review their saved tabs and decide which ones to keep. It presents tabs one by one, asking the user if they want to keep, remove, or skip the tab. This helps users maintain a clean and relevant tab collection.

### GDPR/Cookie Banner Handling

In declutter mode, the extension attempts to handle GDPR and cookie banners by hiding them, ensuring a cleaner view of the webpage when reviewing tabs.

### Logging System

The extension includes a detailed logging system that helps with debugging and tracking errors. This is particularly useful for developers maintaining and improving the extension.

## Development

To set up the development environment:

1. Make sure you have Node.js and npm installed.
2. Install dependencies: `npm install`
3. Make changes to the source files as needed.
4. To test your changes:
   - Go to `chrome://extensions/`
   - Click "Load unpacked" if you haven't already
   - Find the "Tab Collector" extension and click the refresh icon

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch: `git checkout -b feature-branch-name`
3. Make your changes and commit them: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-branch-name`
5. Submit a pull request

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please file an issue on the GitHub issue tracker.

## Acknowledgements

- Thanks to all contributors who have helped to improve this project.
- Icon made by [Freepik](https://www.freepik.com) from [www.flaticon.com](https://www.flaticon.com/)