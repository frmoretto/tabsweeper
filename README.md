# Tab Collector Extension

Tab Collector is a Chrome extension that allows users to easily collect, manage, and organize their open tabs across multiple windows.

## Features

- Collect open tabs from all Chrome windows
- View and manage collected tabs
- Organize tabs by domain
- Export tab collections as JSON files
- Open all saved tabs at once
- Delete individual tabs from collections
- Automatic backup of tab collections

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
   - Open all tabs in the collection at once

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