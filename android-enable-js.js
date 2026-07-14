// ==UserScript==//
/**
 * Enable JavaScript in Android Chrome & Firefox.
 * Requires: Rooted device + Node.js in Termux.
 * Usage:   tsu -c "node android-enable-js.js"
 */

'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { execSync } = require('child_process');

// ---- Helpers ----
function isRoot() {
  try {
    execSync('su -c "id"', { stdio: 'ignore' });
    return true;
  } catch { return false; }
}

// ---- Chrome for Android ----
async function enableChrome() {
  const prefsPath = '/data/data/com.android.chrome/app_chrome/Default/Preferences';
  try {
    await fsp.access(prefsPath, fs.constants.R_OK | fs.constants.W_OK);
  } catch {
    console.log(`Chrome Preferences not accessible at ${prefsPath}.\nMaybe not installed or need root?`);
    return false;
  }

  try {
    const raw = await fsp.readFile(prefsPath, 'utf8');
    const prefs = JSON.parse(raw);
    prefs.profile = prefs.profile || {};
    prefs.profile.default_content_setting_values = prefs.profile.default_content_setting_values || {};
    prefs.profile.default_content_setting_values.javascript = 1;  // 1 = Allow
    await fsp.writeFile(prefsPath, JSON.stringify(prefs), 'utf8');
    console.log('Chrome: JavaScript enabled.');
    return true;
  } catch (err) {
    console.log(`Failed to update Chrome preferences: ${err.message}`);
    return false;
  }
}

// ---- Firefox for Android ----
async function enableFirefox() {
  const base = '/data/data/org.mozilla.firefox/files/mozilla';
  let profileDir = null;
  try {
    const dirs = await fsp.readdir(base);
    // Firefox profile folder is like "xxxxxxxx.default"
    profileDir = dirs.find(d => d.endsWith('.default'));
    if (!profileDir) {
      console.log('No Firefox profile found.');
      return false;
    }
  } catch {
    console.log(`Cannot list Firefox profiles at ${base}. Check if Firefox is installed and root available.`);
    return false;
  }

  const prefsJs = path.join(base, profileDir, 'prefs.js');
  try {
    await fsp.access(prefsJs, fs.constants.R_OK | fs.constants.W_OK);
  } catch {
    console.log(`prefs.js not accessible at ${prefsJs}`);
    return false;
  }

  try {
    let lines = (await fsp.readFile(prefsJs, 'utf8')).split(/\r?\n/);
    let found = false;
    const newPref = 'user_pref("javascript.enabled", true);';
    lines = lines.map(line => {
      if (line.includes('javascript.enabled')) {
        found = true;
        return newPref;
      }
      return line;
    });
    if (!found) lines.push(newPref);
    await fsp.writeFile(prefsJs, lines.join('\n') + '\n', 'utf8');
    console.log('Firefox: JavaScript enabled.');
    return true;
  } catch (err) {
    console.log(`Failed to update Firefox prefs.js: ${err.message}`);
    return false;
  }
}

// ---- Main ----
(async () => {
  console.log('Android browser JavaScript enabler\n');

  if (!isRoot()) {
    console.error('This script needs root. Run it with:\n  tsu -c "node android-enable-js.js"');
    process.exit(1);
  }

  const chromeOk = await enableChrome();
  const firefoxOk = await enableFirefox();

  if (chromeOk || firefoxOk) {
    console.log('\nDone. Force-stop the browsers (or reboot) for changes to take effect.');
  } else {
    console.log('\nNo changes made. Browsers may not be installed or files could not be modified.');
  }
})();
