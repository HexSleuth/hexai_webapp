# 👋 Welcome to HEX AI
**HEX AI** is your all-in-one multimedia and AI companion. Experience a seamless blend of advanced artificial intelligence, creative generation tools, and uninterrupted music—all in one dynamic workspace.
When you open HEX AI, a background track sets the mood, inviting you to chat, create, and listen seamlessly.
## ✨ Key Features
 * **Multimodal AI Chat:** Chat with free AI models, upload Images and PDFs for analysis, and use Voice Input for hands-free interaction.
 * **Creative Studio:** Generate stunning AI images and create short, animated looping AI videos—completely free.
 * **Built-in YouTube Music Player:**
   * Search for tracks, import your favorite playlists via URL, and enjoy integrated **SponsorBlock** to automatically skip annoying sponsored segments.
   * Features include Auto-Sync lyrics, AI-powered lyrics translation, and customizable album art displays (Spin, Video embedded, or None).
 * **Animated Emojis:**🫵😎 Bring your interface to life with expressive, animated emojis.
 * **Privacy & Persistence:** Everything—your playlists, settings, volume, and themes—is saved completely locally.
## 🔧 Setup & Usage
To get the most out of HEX AI, you will need to configure a few settings.
 1. **API Keys:** Open the **Settings** (gear icon) and add your keys:
   * **YouTube Data v3 API Key** *(Required)*: For YouTube search and playlist imports.
   * **OpenRouter** or **Gemini API Key** *(Highly Recommended)*: To power AI chat, vision features, and lyrics translation.
 2. **Chatting:** Type a message, use voice input, or attach images/PDFs. Press Enter or click send to get a response from your chosen AI model.
 3. **Image Generation:** Describe the scene you want, select your style and aspect ratio, and click **Generate**. The resulting image can be added straight to your chat for further analysis.
 4. **Video Generation:** Enter a prompt, choose your desired duration, and click **Generate** to turn an AI image into a short, looping animated video.
 5. **Music Player:** A default playlist loads automatically on startup.
   * Click any song to play it.
   * Search YouTube for new tracks and add them instantly.
   * Paste a YouTube Music playlist URL to import it.
   * Toggle Auto-Sync, AI Translation, and SponsorBlock via the player controls.
## 🔐 How to Get Your API Keys
You will need to generate API keys to unlock HEX AI's full potential.
### 1. OpenRouter API Key (For AI Models)
 1. **Sign up:** Go to the OpenRouter website and create an account using your Email, Google, or GitHub.
 2. **Go to Keys:** Click your profile picture in the top right corner and select **Keys** from the dropdown menu.
 3. **Create a Key:** Click **Create API Key**.
 4. **Configure & Generate:** Give it a descriptive name (e.g., HEX-AI-App). You can optionally set a credit limit or expiration date for security, or leave these blank for unlimited usage. Click **Create**.
 5. **Copy the Key:** *Make sure to copy the key immediately!* It will only be shown to you once.
### 2. Google Gemini API Key (For AI Models)
 1. **Sign in:** Go to Google AI Studio and sign in with your Google Account.
 2. **Accept Terms:** Accept the terms of service and confirm your location if prompted.
 3. **Find the Menu:** Click on **Get API key** in the left-hand sidebar.
 4. **Generate:** Click **Create API key**.
 5. **Link Project:** Select an existing Google Cloud project to link the key to, or create a new one, then click **Create key**.
 6. **Save it:** Copy your new API key and store it securely.
### 3. YouTube Data v3 API Key (For Music Player)
 1. Go to the Google Cloud Console.
 2. Create a new project (or select an existing one).
 3. Navigate to **APIs & Services** > **Library**.
 4. Search for **YouTube Data API v3** and click **Enable**.
 5. Go to **APIs & Services** > **Credentials**.
 6. Click **Create Credentials** > **API Key** and copy the generated key.

# HEX AI – Full Web Application

# hexai_webapp/
├── server.py                # Python local server (serves static files)
├── static/
│   ├── index.html           # Main HTML (layout, CDN scripts, UI structure)
│   ├── style.css            # All 30+ themes, Material 3 styling, music panel, offline UI
│   └── script.js            # Full application logic (chat, YouTube player, offline MP3, visualizer)
├── requirements.txt         # (Empty – uses only Python standard library)
└── README.md                # Quick start guide

## How to Run
You can turn it into a standalone executable using PyInstaller:
  ```bash
1. pip install pyinstaller

pyinstaller --onefile --name "HEX_AI" --add-data "hexai_player.py;." hexai_player.py

2. **Open a terminal** in the `hexai_webapp` folder.
3. Run the server:
   ```bash
   python server.py

---

### How to create the files instantly (Automated Script)

Instead of copy-pasting the massive CSS/JS, run this Python script **once** to generate the entire structured project:

```python
# generate_webapp.py
import os
import re

# Load the original single-file HTML content (you need to paste it here or load from file)
# For this example, I'll assume you have the original HTML in a variable.

html_source = """https://raw.githubusercontent.com/HexSleuth/HEX-AI/refs/heads/main/index.html"""

# Define the output directory
OUTPUT_DIR = "hexai_webapp"
STATIC_DIR = os.path.join(OUTPUT_DIR, "static")

os.makedirs(STATIC_DIR, exist_ok=True)

# Extract CSS using a simple regex pattern
css_match = re.search(r'<style>(.*?)</style>', html_source, re.DOTALL)
if css_match:
    with open(os.path.join(STATIC_DIR, "style.css"), "w", encoding="utf-8") as f:
        f.write(css_match.group(1))

# Extract JS - find all script tags that are not CDN
# (Simplified approach: remove the main script and save to script.js)
js_pattern = r'<script>(.*?)</script>'
js_matches = re.findall(js_pattern, html_source, re.DOTALL)
# Join all JS blocks (excluding the gtranslate and analytics snippets if you want)
full_js = "\n\n".join(js_matches)
with open(os.path.join(STATIC_DIR, "script.js"), "w", encoding="utf-8") as f:
    f.write(full_js)

# Generate index.html by removing <style> and <script> blocks and adding links
html_cleaned = re.sub(r'<style>.*?</style>', '', html_source, flags=re.DOTALL)
html_cleaned = re.sub(r'<script>.*?</script>', '', html_cleaned, flags=re.DOTALL)
# Add external CSS and JS links
html_cleaned = html_cleaned.replace('</head>', '    <link rel="stylesheet" href="style.css" />\n</head>')
html_cleaned = html_cleaned.replace('</body>', '    <script src="script.js"></script>\n</body>')

with open(os.path.join(STATIC_DIR, "index.html"), "w", encoding="utf-8") as f:
    f.write(html_cleaned)

# Write server.py
server_code = '''#!/usr/bin/env python3
import http.server
import socketserver
import webbrowser
import threading
import os
import sys

PORT = 8080
DIRECTORY = "static"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    try:
        httpd = socketserver.TCPServer(("", PORT), Handler)
    except OSError:
        print(f"❌ Port {PORT} in use.")
        sys.exit(1)
    url = f"http://localhost:{PORT}"
    print(f"Serving: {url}")
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\\nStopped.")

if __name__ == "__main__":
    main()
'''

with open(os.path.join(OUTPUT_DIR, "server.py"), "w", encoding="utf-8") as f:
    f.write(server_code)

print("✅ Webapp generated in 'hexai_webapp' folder!")
print("Run: cd hexai_webapp && python server.py")

> **Note:** Once your keys are added to the settings menu, you are ready to enjoy everything HEX AI has to offer! 🎶💃🪩
> 
