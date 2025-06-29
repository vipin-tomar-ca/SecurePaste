# GuardPasteAI - Sensitive Data Paste Guard

A Chrome extension that prevents accidentally pasting sensitive information into AI tools like ChatGPT, Claude, and Gemini.

## 🛡️ Features

- **Real-time Detection**: Monitors paste events on AI tool websites
- **Pattern Recognition**: Detects sensitive data patterns including:
  - API keys and tokens
  - Credit card numbers
  - Social Security Numbers
  - Email addresses
  - Phone numbers
  - Bank account numbers
  - Passwords and secrets
  - IP addresses
  - Bitcoin addresses
- **Animated Warnings**: Eye-catching warnings with customizable intensity
- **Enterprise Features**: Team policies, webhook integration, geofencing
- **Custom Rules**: Add your own detection patterns
- **Privacy-First**: No data leaves your browser unless configured

## 🎯 Protected Sites

- ChatGPT (chat.openai.com)
- Claude (claude.ai)
- Google Gemini (gemini.google.com)
- Google Bard (bard.google.com)
- Poe (poe.com)
- Character.AI (character.ai)
- Hugging Face (huggingface.co)
- Replicate (replicate.com)
- Cohere (cohere.ai)
- Anthropic (anthropic.com)

## 🚀 Quick Installation

### Method 1: Development Installation (Recommended)

1. **Build the extension**:
   ```bash
   chmod +x build.sh
   ./build.sh
   ```

2. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist/development` folder from this project

### Method 2: Direct Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd SecurePaste
   ```

2. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project root folder

## ⚙️ Configuration

### Basic Settings

Click the extension icon in your browser toolbar to access settings:

- **Enable/Disable**: Toggle the extension on/off
- **Detection Sensitivity**: Low, Medium, High
- **Warning Style**: Discreet, Standard, Animated
- **Auto-replace**: Automatically replace sensitive data with placeholders

### Advanced Settings

- **Custom Rules**: Add your own regex patterns
- **Whitelist/Blacklist**: Control which sites are monitored
- **Enterprise Mode**: Team policies and webhook integration
- **Logging**: Configure event logging and retention

### Enterprise Features

For team deployments:

1. **Webhook Integration**: Send alerts to your security team
2. **Geofencing**: Restrict usage by location
3. **Policy Enforcement**: Centralized rule management
4. **Audit Logging**: Comprehensive activity tracking

## 🔧 Development

### Project Structure

```
SecurePaste/
├── manifest.json          # Extension manifest
├── background.js          # Service worker
├── content.js            # Main content script
├── popup.html/js/css     # Settings UI
├── detection-engine.js   # Pattern detection logic
├── patterns.js           # Detection patterns
├── warning.html/js/css   # Warning dialog
├── config/
│   └── rules.json        # Detection rules
└── icons/                # Extension icons
```

### Building

```bash
# Make build script executable
chmod +x build.sh

# Build the extension
./build.sh
```

This creates:
- `dist/development/` - Unpacked extension for development
- `dist/guardpasteai-extension.zip` - Packaged extension for distribution
- `dist/build-info.txt` - Build information

### Testing

1. Load the extension in Chrome
2. Visit an AI tool website (e.g., chat.openai.com)
3. Try pasting sensitive data like:
   - `sk-1234567890abcdef` (API key)
   - `4111-1111-1111-1111` (Credit card)
   - `user@example.com` (Email)

You should see a warning dialog appear.

## 🛠️ Customization

### Adding Custom Patterns

Edit `config/rules.json` to add your own detection patterns:

```json
{
  "id": "customPattern",
  "label": "Custom Pattern",
  "description": "Your custom pattern description",
  "regex": "your-regex-pattern",
  "severity": "medium",
  "enabled": true
}
```

### Modifying Warning Styles

Edit `warning.css` and `animated-warning.css` to customize the appearance of warnings.

### Enterprise Integration

Configure webhook endpoints in the extension settings to integrate with your security tools.

## 🔒 Privacy & Security

- **Local Processing**: All detection happens in your browser
- **No Data Collection**: No sensitive data is sent to external servers
- **Configurable Logging**: Control what gets logged and for how long
- **Enterprise Controls**: Optional team policies and audit trails

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🐛 Troubleshooting

### Extension Not Working

1. Check that Developer mode is enabled in Chrome
2. Verify the extension is loaded in `chrome://extensions/`
3. Check the browser console for errors
4. Ensure you're on a supported domain

### False Positives

1. Adjust detection sensitivity in settings
2. Add patterns to the whitelist
3. Create custom rules for your specific use case

### Performance Issues

1. Disable animated warnings if experiencing lag
2. Reduce logging level
3. Clear extension storage if needed

## 📞 Support

For issues and questions:
- Check the troubleshooting section above
- Review the browser console for error messages
- Create an issue in the repository

---

**⚠️ Disclaimer**: This extension helps prevent accidental data exposure but should not be your only security measure. Always follow your organization's security policies and best practices. 