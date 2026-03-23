# Gemini Chrome Spellcheck Bot

An intuitive and powerful Google Chrome extension that uses the Google Gemini API to instantly correct spelling and grammar directly within text fields across the web. Whether you're typing in a simple `<textarea>` or complex `contenteditable` elements like those found in Gmail, Notion, or WhatsApp Web, this extension seamlessly reviews and replaces your text with AI-powered corrections.

## Features

- **Context Menu Integration**: Right-click any text field or highlighted selection and choose "Correct Spelling" from the context menu.
- **Keyboard Shortcuts**: Quickly trigger corrections using the default shortcut `Ctrl+Shift+K` (or `Cmd+Shift+K` on Mac).
- **Inline Hover Tooltip**: A sleek, non-intrusive floating tooltip appears near your cursor to indicate loading status and present you with the corrected text, along with "Accept" and "Reject" buttons.
- **Complex Text Editor Support**: Correctly handles both standard input fields and complex `contenteditable` elements, preserving structural integrity and cursor placements whenever possible.
- **Options Dashboard**:
  - Requires your own **Gemini API Key**.
  - Dynamically fetches and allows you to choose your preferred Gemini Model (e.g., `gemini-1.5-flash`).
  - Supports Custom System Prompts: Tailor how the AI interprets your text. Not just for spellchecking—you can set the prompt to "Translate to French" if desired!
- **Multilingual Support**: Extension UI is natively available in English and German depending on your browser language.

## Installation

Since this extension requires your personal API key and is not published on the Chrome Web Store, you can install it locally as an unpacked extension:

1. Clone or download this repository to your computer.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Toggle the **Developer mode** switch in the top right corner.
4. Click the **Load unpacked** button.
5. Select the directory containing this extension's files (`manifest.json`, etc.).
6. The extension will now appear in your toolbar. Right-click the extension icon and select **Options** to configure your setup!

## Setup

Before you can use the extension, you must provide a valid Google Gemini API Key:

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and generate a free API Key.
2. Open the extension's **Options** page.
3. Paste your API Key into the designated field.
4. Click **Refresh Models** to connect to the API.
5. Select your desired model from the dropdown.
6. Click **Save Settings**.

## Usage

1. Click into any text field and type some text.
2. Either right-click and select **Correct Spelling** OR press `Ctrl+Shift+K` (`Cmd+Shift+K` on Mac).
3. If you want to correct only a specific part of the text, highlight it before taking action.
4. A tooltip will appear saying "Correcting...". 
5. Once the Gemini API returns a result, the tooltip will show the corrected text.
6. Click **Accept** to automatically insert the new text into your text field, or **Reject** to dismiss the correction.

## License
MIT License. Feel free to fork and modify according to your needs!
