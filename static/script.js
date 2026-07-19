// =============================================================
//  script.js – HEX AI Main Application Logic
//  Extracted from the original HTML source.
//  Includes: Theme Engine, State Management, Chat, YouTube Player,
//  Offline MP3 Player, Visualizer, Karaoke, Summarizer,
//  Background Playback Fix, and Integrated AdBlocker.
// =============================================================

window.gtranslateSettings = {
    "default_language": "en",
    "detect_browser_language": true,
    "wrapper_selector": ".gtranslate_wrapper"
};

// =============================================================
//  THEME ENGINE – Complete with all presets
// =============================================================

(() => {
    const THEME_CLASS = 'theme-transition';
    const TRANSITION_MS = 320;

    let albumArtEl = null;
    let dynamicEnabled = true;

    const ThemeEngine = {
        init(options = {}) {
            albumArtEl = options.albumArtEl || document.getElementById('albumArt');
            const savedTheme = localStorage.getItem('hexai_theme_appearance') || 'default';
            const sel = document.getElementById('themeAppearanceSelect');
            if (sel) {
                sel.value = savedTheme;
                this.applyThemeAppearance(savedTheme);
            }
        },

        applyThemeAppearance(theme) {
            const root = document.documentElement;
            if (theme === 'default') {
                root.removeAttribute('data-theme');
                document.body.classList.remove('dynamic-theme-active');
                if (dynamicEnabled && albumArtEl && albumArtEl.src && albumArtEl.src !== 'https://via.placeholder.com/300') {
                    this.applyVibrantFromUrl(albumArtEl.src);
                }
            } else {
                root.setAttribute('data-theme', theme);
                const isDark = document.body.classList.contains('dark');
                root.setAttribute('data-mode', isDark ? 'dark' : 'light');
                document.body.classList.add('dynamic-theme-active');
            }
            localStorage.setItem('hexai_theme_appearance', theme);
        },

        syncMode() {
            const root = document.documentElement;
            const theme = root.getAttribute('data-theme');
            if (theme) {
                const isDark = document.body.classList.contains('dark');
                root.setAttribute('data-mode', isDark ? 'dark' : 'light');
            }
        },

        setDynamicEnabled(enabled) {
            dynamicEnabled = Boolean(enabled);
        },

        async applyVibrantFromImage(img) {
            if (!dynamicEnabled || !img) return;
            const palette = await getPalette(img);
            if (!palette) return;
            applyPalette(palette);
            document.body.classList.add('dynamic-theme-active');
        },

        async applyVibrantFromUrl(url) {
            if (!dynamicEnabled || !url || url === 'https://via.placeholder.com/300') {
                this.clearDynamicPalette();
                document.body.classList.remove('dynamic-theme-active');
                return;
            }
            const img = await loadImage(url);
            if (!img) return;
            return this.applyVibrantFromImage(img);
        },

        clearDynamicPalette() {
            const root = document.documentElement.style;
            root.removeProperty('--ui-accent');
            root.removeProperty('--ui-accent-2');
            root.removeProperty('--ui-progress-fill');
            root.removeProperty('--ui-glow');
            root.removeProperty('--ui-bg');
            root.removeProperty('--ui-surface');
            root.removeProperty('--ui-surface-2');
            root.removeProperty('--ui-text');
            root.removeProperty('--ui-text-muted');
            root.removeProperty('--ui-border');
            root.removeProperty('--ui-shadow');
            root.removeProperty('--ui-progress-bg');
            root.removeProperty('--ui-button-bg');
            root.removeProperty('--ui-button-text');
            root.removeProperty('--ui-button-border');
            root.removeProperty('--ui-control-radius');
            root.removeProperty('--ui-play-radius');
            root.removeProperty('--ui-scanline');
            document.body.classList.remove('dynamic-theme-active');
        }
    };

    function withTransition(fn) {
        const root = document.documentElement;
        root.classList.add(THEME_CLASS);
        fn();
        window.setTimeout(() => root.classList.remove(THEME_CLASS), TRANSITION_MS);
    }

    async function getPalette(img) {
        if (window.Vibrant) {
            try {
                const palette = await new Vibrant(img).getPalette();
                return {
                    accent: swatchToRgb(palette.Vibrant || palette.Muted),
                    accent2: swatchToRgb(palette.LightVibrant || palette.LightMuted),
                    bg: swatchToRgb(palette.DarkMuted || palette.DarkVibrant),
                    surface: swatchToRgb(palette.Muted || palette.DarkMuted)
                };
            } catch (err) {
                return null;
            }
        }
        if (window.ColorThief) {
            try {
                const colorThief = new ColorThief();
                const [primary, secondary] = colorThief.getPalette(img, 2);
                return {
                    accent: rgbArrayToCss(primary),
                    accent2: rgbArrayToCss(secondary || primary),
                    bg: rgbArrayToCss(darken(primary, 0.7)),
                    surface: rgbArrayToCss(darken(primary, 0.85))
                };
            } catch (err) {
                return null;
            }
        }
        return null;
    }

    function applyPalette(palette) {
        withTransition(() => {
            const root = document.documentElement.style;
            if (palette.accent) root.setProperty('--ui-accent', palette.accent);
            if (palette.accent2) root.setProperty('--ui-accent-2', palette.accent2);
            if (palette.bg) root.setProperty('--ui-bg', palette.bg);
            if (palette.surface) {
                root.setProperty('--ui-surface', palette.surface);
                root.setProperty('--ui-surface-2', lightenCss(palette.surface, 0.08));
            }
            root.setProperty('--ui-progress-fill', palette.accent || 'var(--ui-accent)');
            root.setProperty('--ui-glow', glowFrom(palette.accent || '#00b3ff'));
        });
    }

    function swatchToRgb(swatch) {
        if (!swatch) return null;
        const rgb = swatch.getRgb();
        return rgbArrayToCss(rgb);
    }

    function rgbArrayToCss(rgb) {
        if (!rgb) return null;
        const [r, g, b] = rgb.map(v => Math.round(v));
        return `rgb(${r} ${g} ${b})`;
    }

    function darken(rgb, amount) {
        return rgb.map(v => Math.max(0, v * amount));
    }

    function lightenCss(css, amount) {
        const match = css.match(/(\d+)\s+(\d+)\s+(\d+)/);
        if (!match) return css;
        const [r, g, b] = match.slice(1).map(Number);
        const nr = Math.min(255, Math.round(r + (255 - r) * amount));
        const ng = Math.min(255, Math.round(g + (255 - g) * amount));
        const nb = Math.min(255, Math.round(b + (255 - b) * amount));
        return `rgb(${nr} ${ng} ${nb})`;
    }

    function glowFrom(css) {
        return css.replace('rgb(', 'rgba(').replace(')', ', 0.35)');
    }

    function loadImage(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = url;
        });
    }

    window.ThemeEngine = ThemeEngine;
})();


// =============================================================
//  GLOBAL STATE
// =============================================================

const STATE = {
    activePanel: 'chat',
    settings: {
        provider: 'openrouter',
        openRouterKey: '',
        geminiKey: '',
        chatModel: 'google/gemini-3.1-flash-lite',
        geminiModel: 'gemini-3.1-flash-lite',
        transcriptApiKey: '',
        ytApiKey: '',
        theme: 'system',
        themeAppearance: 'default',
        openRouterModels: [],
        geminiModels: [],
        translationService: 'auto',
        translationTargetLang: 'en',
    },
    playlist: [],
    currentTrackIndex: -1,
    isPlaying: false,
    sponsorBlockEnabled: true,
    lyricsEnabled: false,
    albumSpinEnabled: true,
    skipSegments: [],
    progressInterval: null,
    chatHistory: [],
    attachedFiles: [],
    isVoiceActive: false,
    speechRecognition: null,
    transcriptData: null,
    transcriptSegments: [],
    emojiPickerOpen: false,
    playerReady: false,
    messageIdCounter: 1,
    isProcessing: false,
    bgPlaybackEnabled: false,
    bgAudioContext: null,
    bgSilentBuffer: null,
    bgSilentSource: null,
    karaokeActive: false,

    // --- Offline Music State ---
    offlinePlaylist: [],
    offlineCurrentSongIndex: -1,
    offlineIsPlaying: false,
    offlineIsRepeating: false,
    offlineIsShuffling: false,
    offlinePlayHistory: [],
    offlineShuffleQueue: [],
    offlineShufflePos: -1,
};

let player = null;
let playing = false;
let songUnavailable = false;
let progressInterval = null;
let isDragging = false;
let errorTimeout = null;
let countdownInterval = null;
let actualSelectedVideoId = null;
let albumArtDisplayMode = localStorage.getItem("albumArtDisplayMode") || "spin";
let albumArtSpinEnabled = albumArtDisplayMode === "spin";
let repeatSong = false;
let currentVolume = parseInt(localStorage.getItem("volumeLevel")) || 70;
let lastSong = '';
let lastAuthor = '';
let lyricsData = null;
let autoSyncEnabled = true;
let lyricsAutoScroll = true;
let syncInterval = null;
let translationEnabled = false;
let translatedLyrics = null;
let lyricsState = {
    status: "idle",
    artist: "",
    title: ""
};
let currentLang = localStorage.getItem('translationTargetLang') || 'en';
let sponsorVideoId = null;
let sponsorSegments = [];
let skippedSegments = new Set();
let sponsorCheckInterval = null;
let selectedVideoId = null;

// Visualizer variables (for offline)
let offlineAudio = null;
let offlineAnalyser = null;
let offlineAudioContext = null;
let offlineVizActive = false;
let offlineVizAnimId = null;
let offlineVizType = 'bars';
let offlineSensitivity = 1.0;
let offlineShowParticles = true;
let offlineParticles = [];
let offlineAutoCycleEnabled = false;
let offlineAutoCycleTimer = null;
let offlineAutoCycleSeconds = 8;
let offlineSpectrogramRowHeight = 2;
let offlineSyntheticPhase = 0;

// DOM refs for offline
const offlineUploadArea = document.getElementById('offlineUploadArea');
const offlineFileInput = document.getElementById('offlineFileInput');
const offlineSongTitle = document.getElementById('offlineSongTitle');
const offlineSongInfo = document.getElementById('offlineSongInfo');
const offlineAlbumArt = document.getElementById('offlineAlbumArt');
const offlinePlayPauseBtn = document.getElementById('offlinePlayPauseBtn');
const offlineRepeatBtn = document.getElementById('offlineRepeatBtn');
const offlineShuffleBtn = document.getElementById('offlineShuffleBtn');
const offlineProgressBar = document.getElementById('offlineProgressBar');
const offlineProgressFill = document.getElementById('offlineProgressFill');
const offlineCurrentTime = document.getElementById('offlineCurrentTime');
const offlineTotalTime = document.getElementById('offlineTotalTime');
const offlineVolumeSlider = document.getElementById('offlineVolumeSlider');
const offlineVolumeIcon = document.getElementById('offlineVolumeIcon');
const offlineVizToggleBtn = document.getElementById('offlineVizToggleBtn');
const offlineVizCanvas = document.getElementById('offlineVizCanvas');
const offlineVizControls = document.getElementById('offlineVizControls');
const offlineModeSelect = document.getElementById('offlineModeSelect');
const offlineParticlesCheck = document.getElementById('offlineParticlesCheck');
const offlineSensitivityInput = document.getElementById('offlineSensitivityInput');
const offlineRandomBtn = document.getElementById('offlineRandomBtn');
const offlineAutoCycleCheck = document.getElementById('offlineAutoCycleCheck');
const offlineCycleInterval = document.getElementById('offlineCycleInterval');
const offlineStatusDisplay = document.getElementById('offlineStatusDisplay');
const offlinePlaylistContainer = document.getElementById('offlinePlaylistContainer');
const offlinePlaylistItems = document.getElementById('offlinePlaylistItems');

// =============================================================
//  HELPER FUNCTIONS
// =============================================================

function emojiToCodepointPath(emoji) {
    return [...emoji].map(c => c.codePointAt(0).toString(16)).join('-');
}

function escapeHTML(s) {
    return s.replace(/[&<>"]/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '"': '&quot;'
    })[c]);
}

function formatTime(sec) {
    if (!sec || isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60),
        s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2,'0')}`;
}

function extractYouTubeID(input) {
    if (!input) return null;
    const bare = input.match(/^([a-zA-Z0-9_-]{11})$/);
    if (bare) return bare[1];
    const url = input.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return url ? url[1] : null;
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
    });
}

async function extractPDFText(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await pdfjsLib.getDocument({
            data: arrayBuffer
        }).promise;
        let text = '';
        for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(it => it.str).join(' ') + '\n';
        }
        return text.substring(0, 6000);
    } catch (e) {
        console.error(e);
        return '[PDF extraction error]';
    }
}

function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function isValidImageUrl(url) {
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) return false;
        return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(parsed.pathname);
    } catch {
        return false;
    }
}

function removeArtistFromTitle(title, artist) {
    if (!title) return title;
    let cleaned = title.trim();
    if (artist) {
        const pattern = new RegExp(`^${artist}\\s*-?\\s*`, 'i');
        cleaned = cleaned.replace(pattern, '').trim();
    }
    if (cleaned.includes('-')) {
        cleaned = cleaned.split('-').slice(1).join('-').trim();
    }
    return cleaned;
}

function getTimestamp() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2,'0')} ${ampm}`;
}

// =============================================================
//  STATE PERSISTENCE
// =============================================================

function loadState() {
    try {
        const saved = localStorage.getItem('hexai_state');
        if (saved) {
            const parsed = JSON.parse(saved);
            STATE.settings = {
                ...STATE.settings,
                ...parsed.settings
            };
            STATE.playlist = parsed.playlist || [];
            STATE.currentTrackIndex = parsed.currentTrackIndex ?? -1;
            STATE.chatHistory = parsed.chatHistory || [];
            STATE.sponsorBlockEnabled = parsed.sponsorBlockEnabled ?? true;
            STATE.lyricsEnabled = parsed.lyricsEnabled ?? false;
            STATE.albumSpinEnabled = parsed.albumSpinEnabled ?? true;
            STATE.messageIdCounter = parsed.messageIdCounter || 1;
            STATE.bgPlaybackEnabled = parsed.bgPlaybackEnabled || false;
            STATE.karaokeActive = parsed.karaokeActive || false;
        }
    } catch (e) {
        console.warn('loadState:', e);
    }
}

function saveState() {
    try {
        localStorage.setItem('hexai_state', JSON.stringify({
            settings: STATE.settings,
            playlist: STATE.playlist,
            currentTrackIndex: STATE.currentTrackIndex,
            chatHistory: STATE.chatHistory,
            sponsorBlockEnabled: STATE.sponsorBlockEnabled,
            lyricsEnabled: STATE.lyricsEnabled,
            albumSpinEnabled: STATE.albumSpinEnabled,
            messageIdCounter: STATE.messageIdCounter,
            bgPlaybackEnabled: STATE.bgPlaybackEnabled,
            karaokeActive: STATE.karaokeActive,
        }));
    } catch (e) {
        console.warn('saveState:', e);
    }
}

// =============================================================
//  THEME & SETTINGS
// =============================================================

function applyTheme(theme) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let effective = theme;
    if (effective === 'system') effective = prefersDark ? 'dark' : 'light';
    document.body.classList.toggle('dark', effective === 'dark');
    const sel = document.getElementById('themeSelect');
    if (sel) sel.value = theme;
    localStorage.setItem('hexai_theme_pref', theme);
    const root = document.documentElement;
    const appearance = root.getAttribute('data-theme');
    if (appearance) {
        root.setAttribute('data-mode', effective === 'dark' ? 'dark' : 'light');
    }
}

function getThemePreference() {
    return localStorage.getItem('hexai_theme_pref') || 'system';
}

function toggleSettings() {
    const modal = document.getElementById('settingsOverlay');
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
        document.getElementById('openRouterKeyInput').value = STATE.settings.openRouterKey || '';
        document.getElementById('geminiKeyInput').value = STATE.settings.geminiKey || '';
        document.getElementById('transcriptApiKeyInput').value = STATE.settings.transcriptApiKey || '';
        document.getElementById('ytApiKeyInput').value = STATE.settings.ytApiKey || '';
        document.getElementById('providerSelect').value = STATE.settings.provider || 'openrouter';
        document.getElementById('themeSelect').value = STATE.settings.theme || 'system';
        const appearance = document.getElementById('themeAppearanceSelect');
        if (appearance) appearance.value = STATE.settings.themeAppearance || 'default';
        const transService = document.getElementById('settingsTranslationServiceSelect');
        if (transService) transService.value = STATE.settings.translationService || 'auto';
        const transLang = document.getElementById('translationTargetLang');
        if (transLang) transLang.value = STATE.settings.translationTargetLang || 'en';
        onProviderChange();
        populateModelDropdown();
    }
}

function onProviderChange() {
    const provider = document.getElementById('providerSelect').value;
    const orSection = document.getElementById('openRouterKeySection');
    const geminiSection = document.getElementById('geminiKeySection');
    orSection.style.display = provider === 'openrouter' ? 'block' : 'none';
    geminiSection.style.display = provider === 'gemini' ? 'block' : 'none';
    if (provider === 'openrouter') populateModelDropdown();
}

async function refreshOpenRouterModels() {
    const key = document.getElementById('openRouterKeyInput').value.trim();
    if (!key) {
        showToast('⚠️ Enter OpenRouter API key first.', 'error');
        return;
    }
    const btn = document.getElementById('refreshModelsBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
        const resp = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${key}`
            }
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const models = data.data || [];
        const freeModels = models.filter(m =>
            m.id.includes('free') || m.id.includes('flash') || m.id.includes('mini') ||
            m.id.includes('haiku') || m.id.includes('llama') || m.id.includes('mistral') ||
            m.id.includes('gemini')
        ).map(m => m.id);
        const list = freeModels.length ? freeModels : models.map(m => m.id);
        STATE.settings.openRouterModels = list;
        const sel = document.getElementById('modelSelect');
        sel.innerHTML = list.map(id => `<option value="${id}">${id}</option>`).join('');
        if (list.length) sel.value = list[0];
        showToast(`✔ ${list.length} models loaded!`);
        saveState();
    } catch (err) {
        showToast('✘' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sync"></i>';
    }
}

function populateModelDropdown() {
    const provider = document.getElementById('providerSelect').value;
    if (provider === 'openrouter') {
        const sel = document.getElementById('modelSelect');
        const stored = STATE.settings.openRouterModels;
        if (stored && stored.length) {
            sel.innerHTML = stored.map(id => `<option value="${id}">${id}</option>`).join('');
            if (STATE.settings.chatModel && stored.includes(STATE.settings.chatModel)) {
                sel.value = STATE.settings.chatModel;
            } else {
                sel.value = stored[0] || '';
            }
        } else {
            sel.innerHTML =
                `<option value="google/gemini-3.1-flash-lite">gemini-3.1-flash-lite</option><option value="openai/gpt-4o-mini">GPT-4o Mini</option><option value="anthropic/claude-3-haiku">Claude 3 Haiku</option><option value="meta-llama/llama-4-maverick">Llama 4 Maverick</option>`;
            sel.value = STATE.settings.chatModel || 'gemini-3.1-flash-lite';
        }
    } else {
        const sel = document.getElementById('geminiModelSelect');
        sel.value = STATE.settings.geminiModel || 'gemini-3.1-flash-lite';
    }
}

function saveSettings() {
    const provider = document.getElementById('providerSelect').value;
    STATE.settings.provider = provider;
    STATE.settings.openRouterKey = document.getElementById('openRouterKeyInput').value.trim();
    STATE.settings.geminiKey = document.getElementById('geminiKeyInput').value.trim();
    STATE.settings.transcriptApiKey = document.getElementById('transcriptApiKeyInput').value.trim();
    STATE.settings.ytApiKey = document.getElementById('ytApiKeyInput').value.trim();
    STATE.settings.theme = document.getElementById('themeSelect').value;
    const appearance = document.getElementById('themeAppearanceSelect');
    if (appearance) STATE.settings.themeAppearance = appearance.value;
    const transService = document.getElementById('settingsTranslationServiceSelect');
    if (transService) STATE.settings.translationService = transService.value;
    const transLang = document.getElementById('translationTargetLang');
    if (transLang) STATE.settings.translationTargetLang = transLang.value;
    if (provider === 'openrouter') {
        const sel = document.getElementById('modelSelect');
        STATE.settings.chatModel = sel.value;
    } else {
        const sel = document.getElementById('geminiModelSelect');
        STATE.settings.geminiModel = sel.value;
    }
    applyTheme(STATE.settings.theme);
    if (window.ThemeEngine) {
        window.ThemeEngine.applyThemeAppearance(STATE.settings.themeAppearance || 'default');
    }
    saveState();
    updateModelBadge();
    toggleSettings();
    showToast('✔ Settings saved!');
}

function updateModelBadge() {
    const dot = document.getElementById('modelBadgeDot');
    const text = document.getElementById('modelBadgeText');
    const provider = STATE.settings.provider;
    const key = provider === 'openrouter' ? STATE.settings.openRouterKey : STATE.settings.geminiKey;
    const model = provider === 'openrouter' ? STATE.settings.chatModel : STATE.settings.geminiModel;
    if (key && key.length > 8) {
        dot.className = 'model-badge-dot online';
        const shortModel = model.replace('google/', '').replace('openai/', '').replace('anthropic/', '').replace(
            'meta-llama/', '');
        text.textContent = '' + shortModel.substring(0, 14);
    } else if (key && key.length > 0) {
        dot.className = 'model-badge-dot idle';
        text.textContent = 'Key set';
    } else {
        dot.className = 'model-badge-dot offline';
        text.textContent = 'No API Key';
    }
}

function switchPanel(name) {
    STATE.activePanel = name;
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const panel = document.getElementById(`panel-${name}`);
    if (panel) panel.classList.add('active');
    const navItem = document.querySelector(`.nav-item[data-panel="${name}"]`);
    if (navItem) navItem.classList.add('active');
    if (name === 'music') {
        const activeTab = document.querySelector('.music-section.active');
        if (!activeTab) {
            document.getElementById('yt-section').classList.add('active');
            document.getElementById('ytTab').classList.add('filled');
            document.getElementById('offlineTab').classList.remove('filled');
        }
    }
    if (name === 'chat') closeEmojiPicker();
}

function switchMusicTab(tab) {
    const ytSection = document.getElementById('yt-section');
    const offlineSection = document.getElementById('offline-section');
    const ytTab = document.getElementById('ytTab');
    const offlineTab = document.getElementById('offlineTab');
    ytSection.classList.toggle('active', tab === 'yt');
    offlineSection.classList.toggle('active', tab === 'offline');
    ytTab.classList.toggle('filled', tab === 'yt');
    offlineTab.classList.toggle('filled', tab === 'offline');
    if (tab === 'yt') {
        if (typeof renderPlaylist === 'function') renderPlaylist(STATE.playlist);
        document.getElementById('songListContainer').classList.remove('d-none');
        document.getElementById('playlistSearchContainer').classList.remove('d-none');
        document.getElementById('lyricsContainer').classList.add('d-none');
        document.getElementById('summarizerContainer').classList.add('d-none');
        document.getElementById('showSongListBtn').classList.add('active');
        document.getElementById('showSongListBtn').classList.remove('btn-outline-primary');
        document.getElementById('showLyricsBtn').classList.remove('active');
        document.getElementById('showLyricsBtn').classList.add('btn-outline-primary');
        document.getElementById('showSummarizerBtn').classList.remove('active');
        document.getElementById('showSummarizerBtn').classList.add('btn-outline-primary');
    } else {
        // Offline tab: show controls if there are files
        if (window.offlinePlayer && window.offlinePlayer.playlist && window.offlinePlayer.playlist.length > 0) {
            document.getElementById('offlinePlayerControls').classList.add('visible');
            document.getElementById('offlinePlaylistContainer').classList.add('visible');
        }
    }
}

// =============================================================
//  CHAT
// =============================================================

function handleChatKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
    autoResizeTextarea(e.target);
}

function autoResizeTextarea(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function handleFileAttach(e) {
    const files = Array.from(e.target.files);
    files.forEach(f => STATE.attachedFiles.push(f));
    renderFilePreview();
    e.target.value = '';
}

function renderFilePreview() {
    const container = document.getElementById('filePreview');
    container.innerHTML = STATE.attachedFiles.map((f, i) => {
        const icon = f.type.startsWith('image/') ? 'fa-image' : 'fa-file-pdf';
        const name = f.name.length > 18 ? f.name.substring(0, 16) + '…' : f.name;
        return `<span class="file-preview-item"><i class="fas ${icon}"></i> ${name} <span class="remove" onclick="STATE.attachedFiles.splice(${i},1);renderFilePreview();">×</span></span>`;
    }).join('');
}

function renderChatMessages() {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';
    STATE.chatHistory.forEach(msg => {
        const div = createMessageElement(msg.role, msg.content, msg.timestamp, msg.id, msg.images);
        container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
}

function createMessageElement(role, content, timestamp, id, images) {
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    if (!id) id = 'msg-' + (STATE.messageIdCounter++);
    div.dataset.msgid = id;
    const isUser = role === 'user';
    const avatarIcon = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    const timeDisplay = timestamp || getTimestamp();
    let processed = content || '';
    processed = processMessageText(processed);
    let imageHtml = '';
    if (images && images.length) {
        if (images.length === 1) {
            imageHtml =
                `<img src="${images[0]}" class="msg-image" onclick="window.open('${images[0]}','_blank')" loading="lazy" />`;
        } else {
            imageHtml = `<div class="msg-image-grid">`;
            images.forEach(url => {
                imageHtml +=
                    `<img src="${url}" class="msg-image" onclick="window.open('${url}','_blank')" loading="lazy" />`;
            });
            imageHtml += `</div>`;
        }
    }
    div.innerHTML = `
                <div class="msg-header">
                    <span class="msg-avatar">${avatarIcon}</span>
                    <span class="msg-timestamp">${timeDisplay}</span>
                </div>
                <div class="msg-bubble">
                    ${imageHtml}
                    ${processed}
                </div>
                <div class="msg-actions">
                    <button data-action="copy" data-msgid="${id}"><i class="fas fa-copy"></i> <span class="action-label">Copy</span></button>
                    <button data-action="share" data-msgid="${id}"><i class="fas fa-share-alt"></i> <span class="action-label">Share</span></button>
                    <button data-action="delete" data-msgid="${id}"><i class="fas fa-trash"></i> <span class="action-label">Delete</span></button>
                </div>
            `;
    return div;
}

function processMessageText(text) {
    if (!text) return '';
    const segmenter = new Intl.Segmenter('en', {
        granularity: 'grapheme'
    });
    const segments = [...segmenter.segment(text)];
    let result = '';
    for (const {
            segment
        }
        of segments) {
        if (/\p{Emoji}/u.test(segment)) {
            const cp = emojiToCodepointPath(segment);
            result +=
                `<img src="https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/512.gif" alt="${segment}" class="message-emoji" loading="lazy" onerror="this.outerHTML='<span>${segment}</span>';">`;
        } else {
            result += escapeHTML(segment);
        }
    }
    result = result.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/\*(.*?)\*/g, '<em>$1</em>');
    result = result.replace(/`(.*?)`/g, '<code>$1</code>');
    result = result.replace(/\n/g, '<br>');
    return result;
}

function setupMessageActionDelegation() {
    const container = document.getElementById('chatMessages');
    container.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;
        e.stopPropagation();
        const msgId = actionBtn.dataset.msgid;
        const wrapper = container.querySelector(`[data-msgid="${msgId}"]`);
        if (!wrapper) return;
        const action = actionBtn.dataset.action;
        if (action === 'copy') copyMessage(wrapper);
        else if (action === 'share') shareMessage(wrapper);
        else if (action === 'delete') {
            const idx = STATE.chatHistory.findIndex(m => m.id === msgId);
            if (idx !== -1) {
                STATE.chatHistory.splice(idx, 1);
                saveState();
            }
            wrapper.remove();
            showToast('Message deleted', 'success');
        }
    });
}

function copyMessage(wrapper) {
    const contentDiv = wrapper.querySelector('.msg-bubble');
    if (!contentDiv) return;
    const text = contentDiv.innerText.trim();
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard', 'success'))
            .catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast('Copied to clipboard', 'success');
    } catch (err) {
        showToast('Copy failed', 'error');
    }
    document.body.removeChild(textarea);
}

function shareMessage(wrapper) {
    const contentDiv = wrapper.querySelector('.msg-bubble');
    if (!contentDiv) return;
    const text = contentDiv.innerText.trim();
    if (navigator.share) {
        navigator.share({
            text
        }).catch(() => {});
    } else {
        copyMessage(wrapper);
        showToast('Copied (share not supported)', 'success');
    }
}

async function sendMessage() {
    if (STATE.isProcessing) return;
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    const hasFiles = STATE.attachedFiles.length > 0;
    if (!text && !hasFiles) return;
    STATE.isProcessing = true;
    const timestamp = getTimestamp();
    const msgId = 'msg-' + (STATE.messageIdCounter++);
    const imageUrls = [];
    const imageDataList = [];
    let pdfTextContent = '';
    let mimeType = 'image/jpeg';
    for (const file of STATE.attachedFiles) {
        if (file.type.startsWith('image/')) {
            const b64 = await fileToBase64(file);
            imageUrls.push(b64);
            imageDataList.push(b64);
            mimeType = file.type;
        } else if (file.type === 'application/pdf') {
            const text = await extractPDFText(file);
            pdfTextContent += '📄 ' + file.name + '\n' + text + '\n\n';
        }
    }
    let userContent = text;
    if (pdfTextContent) {
        userContent = (text ? text + '\n\n' : '') + 'PDF content:\n' + pdfTextContent;
    }
    STATE.chatHistory.push({
        id: msgId,
        role: 'user',
        content: userContent,
        timestamp: timestamp,
        images: imageUrls
            .filter(Boolean)
    });
    STATE.attachedFiles = [];
    renderFilePreview();
    input.value = '';
    input.style.height = 'auto';
    renderChatMessages();
    const container = document.getElementById('chatMessages');
    container.scrollTop = container.scrollHeight;
    const typingDiv = document.createElement('div');
    typingDiv.className = 'msg assistant';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
                <div class="msg-header">
                    <span class="msg-avatar"><i class="fas fa-robot"></i></span>
                    <span class="msg-timestamp">thinking...</span>
                </div>
                <div class="msg-bubble">
                    <div class="typing-indicator"><span></span><span></span><span></span></div>
                </div>
            `;
    container.appendChild(typingDiv);
    container.scrollTop = container.scrollHeight;
    try {
        let aiResponse = '';
        const hasGeminiKey = STATE.settings.geminiKey && STATE.settings.geminiKey.length > 8;
        const hasImages = imageDataList.filter(Boolean).length > 0;
        const combinedPrompt = (text ? text : '') + (pdfTextContent ? '\n\n--- PDF Content ---\n' + pdfTextContent :
            '');
        if (hasImages && hasGeminiKey) {
            aiResponse = await callGeminiVision(combinedPrompt || 'Describe this image.', imageDataList.find(
                Boolean), mimeType);
        } else if (hasImages && !hasGeminiKey) {
            aiResponse =
                'Image received! To analyze images, please configure your **Gemini API Key** in Settings (⚙).';
        } else if (STATE.settings.openRouterKey && STATE.settings.openRouterKey.length > 8) {
            aiResponse = await callOpenRouter(combinedPrompt || text);
        } else if (hasGeminiKey) {
            aiResponse = await callGeminiText(combinedPrompt || text);
        } else {
            aiResponse =
                'HEX AI is ready. Configure **Gemini** or **OpenRouter** API keys in Settings (⚙) to get real AI responses.';
        }
        const typingEl = document.getElementById('typingIndicator');
        if (typingEl) typingEl.remove();
        const aiTimestamp = getTimestamp();
        const aiId = 'msg-' + (STATE.messageIdCounter++);
        STATE.chatHistory.push({
            id: aiId,
            role: 'assistant',
            content: aiResponse,
            timestamp: aiTimestamp
        });
        renderChatMessages();
        container.scrollTop = container.scrollHeight;
    } catch (err) {
        const typingEl = document.getElementById('typingIndicator');
        if (typingEl) typingEl.remove();
        const errMsg = '⚠️ Error: ' + err.message;
        const aiTimestamp = getTimestamp();
        const aiId = 'msg-' + (STATE.messageIdCounter++);
        STATE.chatHistory.push({
            id: aiId,
            role: 'assistant',
            content: errMsg,
            timestamp: aiTimestamp
        });
        renderChatMessages();
        container.scrollTop = container.scrollHeight;
        showToast(err.message, 'error');
    } finally {
        STATE.isProcessing = false;
    }
}

async function callOpenRouter(promptText) {
    const apiKey = STATE.settings.openRouterKey || '';
    if (!apiKey || apiKey.length < 8) throw new Error('OpenRouter API key not configured.');
    const model = STATE.settings.chatModel || 'google/gemini-3.1-flash-lite';
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            messages: [{
                role: 'user',
                content: promptText
            }]
        })
    });
    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`OpenRouter error (${resp.status}): ${errText}`);
    }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() || 'No response.';
}

async function callGeminiText(promptText) {
    const apiKey = STATE.settings.geminiKey || '';
    if (!apiKey || apiKey.length < 8) throw new Error('Gemini API key not configured.');
    const model = STATE.settings.geminiModel || 'gemini-3.1-flash-lite';
    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = {
        contents: [{
            parts: [{
                text: promptText
            }]
        }]
    };
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON
            .stringify(body)
    });
    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Gemini error (${resp.status}): ${errText}`);
    }
    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No response.';
}

async function callGeminiVision(promptText, imageBase64Data, mimeType = 'image/jpeg') {
    const apiKey = STATE.settings.geminiKey || '';
    if (!apiKey || apiKey.length < 8) throw new Error('Gemini API key not configured.');
    const model = STATE.settings.geminiModel || 'gemini-3.1-flash-lite';
    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const parts = [{
        text: promptText || 'Describe this image in detail.'
    }];
    if (imageBase64Data) {
        parts.push({
            inline_data: {
                mime_type: mimeType,
                data: imageBase64Data.replace(/^data:image\/[a-zA-Z]+;base64,/, '')
            }
        });
    }
    const body = {
        contents: [{
            parts: parts
        }]
    };
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON
            .stringify(body)
    });
    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Gemini API error (${resp.status}): ${errText}`);
    }
    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No response from Gemini.';
}

// =============================================================
//  EMOJI PICKER
// =============================================================

function toggleEmojiPicker() {
    const picker = document.getElementById('emojiPicker3D');
    if (picker) {
        if (picker.classList.contains('open')) closeEmojiPicker();
        else {
            picker.classList.add('open');
            STATE.emojiPickerOpen = true;
        }
    }
}

function closeEmojiPicker() {
    const picker = document.getElementById('emojiPicker3D');
    if (picker) {
        picker.classList.remove('open');
        STATE.emojiPickerOpen = false;
    }
}

document.addEventListener('click', function(e) {
    const picker = document.getElementById('emojiPicker3D');
    if (picker && picker.classList.contains('open')) {
        const emojiBtn = document.getElementById('emojiBtn');
        if (!picker.contains(e.target) && e.target !== emojiBtn && !emojiBtn.contains(e.target)) {
            closeEmojiPicker();
        }
    }
});

function init3DEmojiPicker() {
    const picker = document.getElementById('emojiPicker3D');
    if (!picker) return;
    picker.innerHTML = '';
    const emojiList = ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩",
        "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨",
        "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "😮", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕",
        "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐", "😕", "😟", "🙁",
        "😮‍💨", "☹️", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣",
        "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "👿", "😈", "💀", "☠️", "💩", "🤡", "👹", "👺",
        "👻", "👽", "👾", "🤖", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "🙈", "🙉", "🙊", "💋",
        "💌", "💘", "💝", "💖", "💗", "💓", "💞", "💕", "💟", "❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤",
        "🤍", "💯", "💢", "💥", "💫", "💦", "💨", "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞",
        "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌",
        "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦵", "🦿", "🦶", "👣", "👀", "👁️", "👅", "👄",
        "🦻", "👂", "🧠", "🫀", "🫁", "🦷", "🦴", "👶", "🧒", "👦", "👧", "🧑", "👱", "👨", "🧔", "👩", "🧓",
        "👴", "👵", "👮", "🕵️", "💂", "🥷", "👷", "🤴", "👸", "👳", "👲", "🧕", "🤵", "👰", "🤰", "🤱", "👼",
        "🎅", "🤶", "🦸", "🦹", "🧙", "🧚", "🧛", "🧜", "🧝", "🧞", "🧟", "💆", "💇", "🚶", "🧍", "🧎", "🏃",
        "💃", "🕺", "🏄", "🏊", "🤽", "🤿", "🚣", "🧘", "🏋️", "🚴", "🚵", "🤼", "🤹", "👫", "👬", "👭", "💏",
        "💑", "👪", "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷",
        "🐸", "🐵", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄",
        "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🕷️", "🕸️", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑",
        "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🐘",
        "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌", "🐕",
        "🐩", "🦮", "🐈", "🐓", "🦃", "🦚", "🦜", "🦢", "🦩", "🕊️", "🐇", "🦝", "🦨", "🦡", "🦫", "🦦", "🦥",
        "🐁", "🐀", "🐿️", "🦔", "🐾", "🐉", "🐲", "🌵", "🎄", "🌲", "🌳", "🌴", "🌱", "🌿", "☘️", "🍀", "🎍",
        "🎋", "🍃", "🍂", "🍁", "🍄", "🐚", "🌾", "💐", "🌷", "🌹", "🥀", "🌺", "🌸", "🌼", "🌻", "🌞", "🌝",
        "🌛", "🌜", "🌚", "🌕", "🌖", "🌗", "🌘", "🌑", "🌒", "🌓", "🌔", "🌙", "🌎", "🌍", "🌏", "🪐", "💫",
        "⭐", "🌟", "✨", "⚡", "☄️", "💥", "🔥", "🌪️", "🌈", "☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️",
        "⛈️", "🌩️", "🌨️", "❄️", "☃️", "⛄", "🌬️", "💨", "💧", "💦", "☔", "☂️", "🌊", "🌫️", "🍏", "🍎",
        "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆",
        "🥑", "🥦", "🥬", "🥒", "🌶️", "🌽", "🥕", "🧄", "🧅", "🥔", "🍠", "🥐", "🍞", "🥖", "🥨", "🧀", "🥚",
        "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🌭", "🍔", "🍟", "🍕", "🥪", "🥙", "🌮", "🌯", "🥗",
        "🥘", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🍢", "🍡", "🍧",
        "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯", "🥛",
        "🍼", "☕", "🍵", "🍶", "🍾", "🍷", "🍸", "🍹", "🍺", "🍻", "🥂", "🥃", "🥤", "🧋", "🧃", "🧊", "🥢",
        "🍽️", "🍴", "🥄", "🔪", "🏺", "🎃", "🎄", "🎆", "🎇", "🧨", "✨", "🎈", "🎉", "🎊", "🎋", "🎍", "🎎",
        "🎏", "🎐", "🎑", "🧧", "🎀", "🎁", "🎗️", "🎟️", "🎫", "🎖️", "🏆", "🏅", "🥇", "🥈", "🥉", "⚽", "⚾",
        "🥎", "🏀", "🏐", "🏈", "🏉", "🎾", "🥏", "🎳", "🏏", "🏑", "🏒", "🥍", "🏓", "🏸", "🥊", "🥋", "🥅",
        "⛳", "⛸️", "🎣", "🤿", "🎽", "🎿", "🛷", "🥌", "🎯", "🪀", "🪁", "🎱", "🔮", "🧿", "🎮", "🕹️", "🎰",
        "🎲", "🧩", "🧸", "♟️", "🃏", "🀄", "🎴", "🎭", "🖼️", "🎨", "🧵", "🧶", "🎵", "🎶", "🎙️", "🎚️",
        "🎛️", "🎤", "🎧", "📻", "🎷", "🎸", "🎹", "🎺", "🎻", "🥁", "📱", "📲", "☎️", "📞", "📟", "📠", "🔋",
        "🔌", "💻", "🖥️", "🖨️", "⌨️", "🖱️", "🖲️", "💽", "💾", "💿", "📀", "🧮", "🎥", "🎞️", "📽️", "🎬",
        "📺", "📷", "📸", "📹", "📼", "🔍", "🔎", "🕯️", "💡", "🔦", "🏮", "🔒", "🔓", "🔏", "🔐", "🔑", "🗝️",
        "🔨", "🪓", "⛏️", "⚒️", "🛠️", "🗡️", "⚔️", "🔫", "🏹", "🛡️", "🔧", "🔩", "⚙", "🗜️", "⚖️", "🦯",
        "🔗", "⛓️", "🧰", "🧲", "⚗️", "🧪", "🧫", "🧬", "🔬", "🔭", "📡", "💉", "🩸", "💊", "🩹", "🚀", "🛸",
        "🗿", "⚠️", "🚸", "⛔", "🚫", "✔", "✖", "❓", "❗", "💱", "💲", "♻️", "🔱", "📛", "🔰", "⭕", "🟢",
        "🔵", "🟣", "🟡", "🟠", "🔴", "⚫", "⚪", "⬛", "⬜", "🔶", "🔷", "🔸", "🔹", "🔺", "🔻", "💠", "🔘",
        "🔲", "🔳", "🏁", "🚩", "🎌", "🏴", "🏳️", "🏳️‍🌈", "🏴‍☠️"
    ];
    emojiList.forEach(emoji => {
        const span = document.createElement('span');
        span.className = 'emoji-3d-item';
        const cp = emojiToCodepointPath(emoji);
        span.innerHTML =
            `<img src="https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/512.gif" alt="${emoji}" width="30" height="30" loading="lazy" style="background:transparent !important;object-fit:contain;" onerror="this.outerHTML='<span>${emoji}</span>';">`;
        span.addEventListener('click', () => {
            const input = document.getElementById('chatInput');
            const start = input.selectionStart;
            const end = input.selectionEnd;
            input.value = input.value.substring(0, start) + emoji + input.value.substring(end);
            input.focus();
            input.selectionStart = input.selectionEnd = start + emoji.length;
            input.dispatchEvent(new Event('input'));
            autoResizeTextarea(input);
            picker.classList.remove('open');
        });
        picker.appendChild(span);
    });
}

// =============================================================
//  VOICE INPUT
// =============================================================

function setupVoiceRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) voiceBtn.style.display = 'none';
        return;
    }
    STATE.speechRecognition = new SR();
    STATE.speechRecognition.continuous = false;
    STATE.speechRecognition.interimResults = true;
    STATE.speechRecognition.lang = 'en-US';
    STATE.speechRecognition.onresult = function(e) {
        const promptEditor = document.getElementById('chatInput');
        if (promptEditor) {
            let transcript = '';
            for (let i = 0; i < e.results.length; i++) {
                transcript += e.results[i][0].transcript;
            }
            promptEditor.value = transcript;
            autoResizeTextarea(promptEditor);
        }
    };
    STATE.speechRecognition.onend = function() {
        STATE.isVoiceActive = false;
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) voiceBtn.classList.remove('voice-active');
    };
    STATE.speechRecognition.onerror = function() {
        STATE.isVoiceActive = false;
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) voiceBtn.classList.remove('voice-active');
    };
}

function toggleVoiceInput() {
    if (!STATE.speechRecognition) {
        showToast('Voice not supported', 'error');
        return;
    }
    if (STATE.isVoiceActive) {
        STATE.speechRecognition.stop();
        STATE.isVoiceActive = false;
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) voiceBtn.classList.remove('voice-active');
    } else {
        STATE.speechRecognition.start();
        STATE.isVoiceActive = true;
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) voiceBtn.classList.add('voice-active');
        showToast('Listening...', 'info');
    }
}

// =============================================================
//  YOUTUBE MUSIC
// =============================================================

const API_BASE = 'https://lyrics.paxsenix.org';
const CORS_PROXY_URL = 'https://api.codetabs.com/v1/proxy?quest=';
const ICON_PLAY = '<i class="fas fa-play" style="color:#fff;font-size:1.1rem;"></i>';
const ICON_PAUSE = '<i class="fas fa-pause" style="color:#fff;font-size:1.1rem;"></i>';
const ICON_REVISION = '<i class="fas fa-undo-alt" style="color:#fff;font-size:1.1rem;"></i>';
const ICON_TRASH = '<i class="fas fa-trash"></i>';

const progressFill = document.getElementById('progress');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const progressBar = document.getElementById('progressBar');
const volumeControl = document.getElementById('volumeControl');
const volumeProgress = document.getElementById('volumeProgress');
const volumeThumb = document.getElementById('volumeThumb');
const albumArt = document.getElementById('albumArt');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const repeatBtn = document.getElementById('repeatBtn');
const autoPlayToggle = document.getElementById('autoPlayToggle');
const albumArtDisplayToggle = document.getElementById('albumArtDisplayToggle');
const playerContainer = document.getElementById('playerContainer');
const errorMessage = document.getElementById('errorMessage');
const songList = document.getElementById('songList');
const lyricsText = document.getElementById('lyricsText');
const lyricsMeta = document.getElementById('lyricsMeta');
const toggleTranslationBtn = document.getElementById('toggleTranslationBtn');
const toggleSyncBtn = document.getElementById('toggleSyncBtn');
const refreshLyricsBtn = document.getElementById('refreshLyricsBtn');
const openRawBtn = document.getElementById('openRawBtn');
const searchResultsList = document.getElementById('searchResultsList');
const searchLoading = document.getElementById('searchLoading');
const searchError = document.getElementById('searchError');
const searchResults = document.getElementById('searchResults');
const youtubeSearchInput = document.getElementById('youtubeSearchInput');
const youtubeSearchBtn = document.getElementById('youtubeSearchBtn');
const searchPlaylistInput = document.getElementById('searchPlaylistInput');
const clearPlaylistSearchBtn = document.getElementById('clearPlaylistSearchBtn');
const songListContainer = document.getElementById('songListContainer');
const lyricsContainer = document.getElementById('lyricsContainer');
const showSongListBtn = document.getElementById('showSongListBtn');
const showLyricsBtn = document.getElementById('showLyricsBtn');
const playlistSearchContainer = document.getElementById('playlistSearchContainer');
const playlistImportInput = document.getElementById('playlistImportInput');
const importPlaylistBtn = document.getElementById('importPlaylistBtn');
const sponsorToggle = document.getElementById('sponsorBlockToggle');
const bgPlaybackToggle = document.getElementById('bgPlaybackToggle');
const importFileBtn = document.getElementById('importFileBtn');
const exportPlaylistBtn = document.getElementById('exportPlaylistBtn');
const importFileInput = document.getElementById('importFileInput');

// ===== NEW KARAOKE / LRCLIB / AI BUTTONS =====
const toggleKaraokeBtn = document.getElementById('toggleKaraokeBtn');
const searchLrcLibBtn = document.getElementById('searchLrcLibBtn');
const generateAILyricsBtn = document.getElementById('generateAILyricsBtn');

// ===== SUMMARIZER ELEMENTS =====
const summarizerContainer = document.getElementById('summarizerContainer');
const showSummarizerBtn = document.getElementById('showSummarizerBtn');
const summarizeBtn = document.getElementById('summarizeBtn');
const summarizeCurrentBtn = document.getElementById('summarizeCurrentBtn');
const summarizerUrlInput = document.getElementById('summarizerUrlInput');
const summarizerStatus = document.getElementById('summarizerStatus');
const summarizerResult = document.getElementById('summarizerResult');
const summarizerCopyBtn = document.getElementById('summarizerCopyBtn');
const clearSummarizerBtn = document.getElementById('clearSummarizerBtn');

// =============================================================
//  PLAYLIST IMPORT / EXPORT (File-based)
// =============================================================

function exportPlaylist() {
    try {
        const exportData = {
            playlist: STATE.playlist,
            albumArtDisplayMode: albumArtDisplayMode,
            darkMode: document.body.classList.contains('dark'),
            karaokeActive: STATE.karaokeActive,
            translationEnabled: translationEnabled,
            autoSyncEnabled: autoSyncEnabled,
            exportDate: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'text/plain'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hexai-playlist-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        showToast('✔ Playlist exported successfully!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('✖ Error exporting playlist.', 'error');
    }
}

function importPlaylist(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            let importedPlaylist = [];
            let importDarkMode = false;
            let importKaraoke = STATE.karaokeActive;
            let importTranslation = translationEnabled;
            let importAutoSync = autoSyncEnabled;
            let importAlbumArtMode = albumArtDisplayMode;

            if (Array.isArray(importedData)) {
                importedPlaylist = importedData;
            } else if (importedData.playlist && Array.isArray(importedData.playlist)) {
                importedPlaylist = importedData.playlist;
                importDarkMode = importedData.darkMode === true;
                importKaraoke = importedData.karaokeActive !== undefined ? importedData.karaokeActive : STATE.karaokeActive;
                importTranslation = importedData.translationEnabled !== undefined ? importedData.translationEnabled : translationEnabled;
                importAutoSync = importedData.autoSyncEnabled !== undefined ? importedData.autoSyncEnabled : autoSyncEnabled;
                importAlbumArtMode = importedData.albumArtDisplayMode || albumArtDisplayMode;
            } else {
                throw new Error('Invalid playlist format');
            }

            if (!Array.isArray(importedPlaylist) || importedPlaylist.length === 0) {
                throw new Error('Playlist is empty or invalid.');
            }

            // Validate structure
            for (const item of importedPlaylist) {
                if (!item.videoId || !item.songName) {
                    throw new Error('Invalid song data found.');
                }
            }

            if (confirm(`Replace current playlist with ${importedPlaylist.length} songs?`)) {
                STATE.playlist = importedPlaylist;
                savePlaylist();
                renderPlaylist(STATE.playlist);

                // Apply imported settings
                if (importDarkMode !== undefined) {
                    const theme = importDarkMode ? 'dark' : 'light';
                    applyTheme(theme);
                    document.getElementById('themeSelect').value = theme;
                    updateThemeToggleIcon();
                }
                if (importAlbumArtMode) {
                    albumArtDisplayMode = importAlbumArtMode;
                    localStorage.setItem('albumArtDisplayMode', albumArtDisplayMode);
                    applyAlbumArtDisplayMode();
                }

                // Restore karaoke / translation / sync state
                STATE.karaokeActive = importKaraoke;
                translationEnabled = importTranslation;
                autoSyncEnabled = importAutoSync;

                if (toggleKaraokeBtn) {
                    if (importKaraoke) {
                        lyricsContainer.classList.add('karaoke-active');
                        toggleKaraokeBtn.classList.add('active');
                        toggleKaraokeBtn.style.background = 'var(--md-primary)';
                        toggleKaraokeBtn.style.color = 'var(--md-on-primary)';
                        toggleKaraokeBtn.style.borderColor = 'var(--md-primary)';
                    } else {
                        lyricsContainer.classList.remove('karaoke-active');
                        toggleKaraokeBtn.classList.remove('active');
                        toggleKaraokeBtn.style.background = 'transparent';
                        toggleKaraokeBtn.style.color = 'var(--md-on-surface)';
                        toggleKaraokeBtn.style.borderColor = 'var(--md-outline-variant)';
                    }
                }
                if (toggleTranslationBtn) {
                    if (importTranslation) {
                        toggleTranslationBtn.innerHTML = '<i class="fas fa-check"></i> ON';
                        toggleTranslationBtn.style.background = 'var(--md-primary)';
                        toggleTranslationBtn.style.color = 'var(--md-on-primary)';
                    } else {
                        toggleTranslationBtn.innerHTML = '<i class="fas fa-language"></i>';
                        toggleTranslationBtn.style.background = 'transparent';
                        toggleTranslationBtn.style.color = 'var(--md-on-surface-variant)';
                    }
                }
                if (toggleSyncBtn) {
                    toggleSyncBtn.textContent = importAutoSync ? 'Auto-Sync: ON' : 'Auto-Sync: OFF';
                }

                if (STATE.playlist.length > 0) {
                    const first = STATE.playlist[0];
                    loadNewVideo(first.videoId, first.albumArt, first);
                }

                showToast(`✔ Imported ${importedPlaylist.length} songs successfully!`, 'success');
            }
        } catch (error) {
            console.error('Import error:', error);
            showToast('✖ Import failed: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
}

// ===== TAB SWITCHING =====
showSongListBtn?.addEventListener('click', function() {
    if (!songListContainer.classList.contains('d-none')) return;
    songListContainer.classList.remove('d-none');
    playlistSearchContainer.classList.remove('d-none');
    lyricsContainer.classList.add('d-none');
    summarizerContainer.classList.add('d-none');
    this.classList.add('active');
    this.classList.remove('btn-outline-primary');
    showLyricsBtn.classList.remove('active');
    showLyricsBtn.classList.add('btn-outline-primary');
    showSummarizerBtn.classList.remove('active');
    showSummarizerBtn.classList.add('btn-outline-primary');
});

showLyricsBtn?.addEventListener('click', function() {
    if (!lyricsContainer.classList.contains('d-none')) return;
    lyricsContainer.classList.remove('d-none');
    songListContainer.classList.add('d-none');
    playlistSearchContainer.classList.add('d-none');
    summarizerContainer.classList.add('d-none');
    this.classList.add('active');
    this.classList.remove('btn-outline-primary');
    showSongListBtn.classList.remove('active');
    showSongListBtn.classList.add('btn-outline-primary');
    showSummarizerBtn.classList.remove('active');
    showSummarizerBtn.classList.add('btn-outline-primary');
});

showSummarizerBtn?.addEventListener('click', function() {
    if (!summarizerContainer.classList.contains('d-none')) return;
    summarizerContainer.classList.remove('d-none');
    songListContainer.classList.add('d-none');
    playlistSearchContainer.classList.add('d-none');
    lyricsContainer.classList.add('d-none');
    this.classList.add('active');
    this.classList.remove('btn-outline-primary');
    showSongListBtn.classList.remove('active');
    showSongListBtn.classList.add('btn-outline-primary');
    showLyricsBtn.classList.remove('active');
    showLyricsBtn.classList.add('btn-outline-primary');
});

// =============================================================
//  KARAOKE MODE
// =============================================================

let karaokeActive = STATE.karaokeActive || false;

toggleKaraokeBtn?.addEventListener('click', function() {
    karaokeActive = !karaokeActive;
    STATE.karaokeActive = karaokeActive;
    if (karaokeActive) {
        lyricsContainer.classList.add('karaoke-active');
        this.classList.add('active');
        this.style.background = 'var(--md-primary)';
        this.style.color = 'var(--md-on-primary)';
        this.style.borderColor = 'var(--md-primary)';
        showToast('🎤 Karaoke mode ON', 'success');
        if (autoSyncEnabled) startLyricsSync();
    } else {
        lyricsContainer.classList.remove('karaoke-active');
        this.classList.remove('active');
        this.style.background = 'transparent';
        this.style.color = 'var(--md-on-surface)';
        this.style.borderColor = 'var(--md-outline-variant)';
        showToast('🎤 Karaoke mode OFF', 'info');
    }
    saveState();
});

// ---- Enhanced lyrics sync for karaoke ----
function startLyricsSync() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => {
        if (autoSyncEnabled && player && typeof player.getCurrentTime === 'function') {
            const cur = player.getCurrentTime();
            if (lyricsData && lyricsData.isLrc && lyricsData.lrcLines) {
                const lines = lyricsData.lrcLines;
                let low = 0,
                    high = lines.length - 1,
                    found = 0;
                while (low <= high) {
                    const mid = Math.floor((low + high) / 2);
                    if (lines[mid].time <= cur) {
                        found = mid;
                        low = mid + 1;
                    } else high = mid - 1;
                }
                const el = lyricsText;
                const children = el.children;
                for (let i = 0; i < children.length; i++) {
                    children[i].classList.remove('highlight');
                    children[i].classList.remove('past');
                }
                for (let i = 0; i < found; i++) {
                    if (children[i]) children[i].classList.add('past');
                }
                const toHighlight = el.querySelector(`.lrc-line[data-index="${found}"]`);
                if (toHighlight) {
                    toHighlight.classList.add('highlight');
                    if (lyricsAutoScroll) {
                        const parent = el;
                        const pRect = parent.getBoundingClientRect();
                        const cRect = toHighlight.getBoundingClientRect();
                        const offset = cRect.top - pRect.top - parent.clientHeight / 2 + cRect.height / 2;
                        parent.scrollBy({
                            top: offset,
                            behavior: 'smooth'
                        });
                    }
                }
            }
        }
    }, 300);
}

// =============================================================
//  LRCLib Search
// =============================================================

searchLrcLibBtn?.addEventListener('click', async function() {
    const title = document.querySelector("#nowPlaying .song-title")?.textContent || '';
    const artist = document.querySelector("#nowPlaying .author-name")?.textContent || '';
    if (!title || !artist) {
        showToast('No song currently playing.', 'error');
        return;
    }
    const {
        artist: cleanArtist,
        track: cleanTrack
    } = cleanTitleAndArtist(title, artist);
    this.disabled = true;
    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
        const resp = await fetch(
            `https://lrclib.net/api/search?q=${encodeURIComponent(cleanTrack + ' ' + cleanArtist)}`);
        if (!resp.ok) throw new Error('LRCLib error');
        const results = await resp.json();
        if (results && results.length > 0) {
            const best = results[0];
            if (best.syncedLyrics) {
                renderLyricsFromLRC(best.syncedLyrics);
                showToast('✔ Synced lyrics found via LRCLib!', 'success');
            } else if (best.plainLyrics) {
                showToast('ℹ️ Plain lyrics only (no timestamps). Try AI generation.', 'info');
                lyricsText.innerHTML = best.plainLyrics.split('\n').filter(l => l.trim()).map(l =>
                    `<div class="plain-line">${l}</div>`).join('');
                lyricsData = {
                    isLrc: false,
                    plain: best.plainLyrics
                };
                lyricsMeta.textContent = `Plain lyrics from LRCLib – ${cleanArtist} – ${cleanTrack}`;
            } else {
                showToast('No lyrics found on LRCLib.', 'error');
            }
        } else {
            showToast('No lyrics found on LRCLib.', 'error');
        }
    } catch (err) {
        showToast('LRCLib search failed: ' + err.message, 'error');
    } finally {
        this.disabled = false;
        this.innerHTML = '<i class="fas fa-search"></i> LRCLib';
    }
});

// =============================================================
//  AI Lyrics Generation (Gemini)
// =============================================================

generateAILyricsBtn?.addEventListener('click', async function() {
    const title = document.querySelector("#nowPlaying .song-title")?.textContent || '';
    const artist = document.querySelector("#nowPlaying .author-name")?.textContent || '';
    const dur = player?.getDuration?.() || 0;
    if (!title || !artist) {
        showToast('No song currently playing.', 'error');
        return;
    }
    const gmKey = STATE.settings.geminiKey;
    if (!gmKey || gmKey.length < 8) {
        showToast('Gemini API key required. Set it in Settings.', 'error');
        return;
    }
    this.disabled = true;
    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    const model = STATE.settings.geminiModel || 'gemini-3.1-flash-lite';
    const systemInstruction =
        `You are a creative songwriter and expert at formatting timed lyrics. Given a song's title, artist, and total duration (in seconds), create a full, realistic set of lyrics with timestamps. Use the LRC format: [mm:ss.xx]lyric line. Timestamps should be evenly spaced and match a typical song structure (intro, verse, chorus, etc). The total length of all lines must stay within the video duration. Output ONLY the LRC text, no explanation. Make the lyrics authentic and fitting for the song's title and artist.`;
    const userPrompt =
        `Song title: "${title}"\nArtist: "${artist}"\nVideo duration: ${Math.floor(dur)} seconds (${formatTime(dur)})\nGenerate full synced lyrics in LRC format.`;

    try {
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gmKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{
                            text: systemInstruction
                        }]
                    },
                    contents: [{
                        parts: [{
                            text: userPrompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.8,
                        topP: 0.9,
                        maxOutputTokens: 4096
                    }
                })
            });
        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.error?.message || 'Gemini API error');
        }
        const data = await resp.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
        if (!generatedText) throw new Error('Empty response from Gemini.');
        renderLyricsFromLRC(generatedText);
        showToast('✔ AI lyrics generated!', 'success');
    } catch (err) {
        showToast('AI Generation failed: ' + err.message, 'error');
    } finally {
        this.disabled = false;
        this.innerHTML = '<i class="fas fa-robot"></i> AI Lyrics';
    }
});

// =============================================================
//  LRC Rendering (unified)
// =============================================================

function parseLrc(text) {
    const lines = [];
    const regex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/;
    text.split(/\r?\n/).forEach(line => {
        const match = line.match(regex);
        if (match) {
            const time = parseInt(match[1]) * 60 + parseInt(match[2]) + ((parseInt(match[3]) || 0) / 100);
            const textContent = match[4].trim();
            if (textContent) lines.push({
                time,
                text: textContent
            });
        }
    });
    return lines;
}

function renderLyricsFromLRC(lrcString) {
    const lines = parseLrc(lrcString);
    if (lines.length === 0) {
        showToast('No valid LRC lines found.', 'error');
        return;
    }
    lyricsData = {
        isLrc: true,
        lrcLines: lines
    };
    renderLrcLines(lines);
    const title = document.querySelector("#nowPlaying .song-title")?.textContent || 'Unknown';
    const artist = document.querySelector("#nowPlaying .author-name")?.textContent || 'Unknown';
    lyricsMeta.textContent = `Synced lyrics (${lines.length} lines) – ${artist} – ${title}`;
    lyricsState.status = 'synced';
    startLyricsSync();
    if (translationEnabled) applyTranslation();
}

function renderLrcLines(lines) {
    if (!lyricsText) return;
    lyricsText.innerHTML = lines.map((l, i) => {
        const m = Math.floor(l.time / 60);
        const s = Math.floor(l.time % 60);
        const fmt = `${m}:${s < 10 ? '0' + s : s}`;
        return `<div class="lrc-line" data-index="${i}" data-time="${l.time}" data-formatted-time="${fmt}">
                <span class="lrc-time">[${fmt}]</span>
                <span class="lrc-text">${l.text}</span>
              </div>`;
    }).join('');
}

function renderLrcLinesWithTranslation(lines, translationsArr) {
    if (!lyricsText) return;
    lyricsText.innerHTML = lines.map((l, i) => {
        const m = Math.floor(l.time / 60);
        const s = Math.floor(l.time % 60);
        const fmt = `${m}:${s < 10 ? '0' + s : s}`;
        const hasTrans = translationsArr && translationsArr[i] && translationsArr[i] !== l.text;
        const transText = hasTrans ? translationsArr[i] : '';
        return `<div class="lrc-line" data-index="${i}" data-time="${l.time}" data-formatted-time="${fmt}">
                <span class="lrc-time">[${fmt}]</span>
                <div class="lyrics-pair">
                  <div class="original-lyric" data-label="Original">${l.text}</div>
                  ${hasTrans ? `<div class="translated-lyric" data-label="Translation">${transText}</div>` : ''}
                </div>
              </div>`;
    }).join('');
}

function cleanTitleAndArtist(rawTitle, rawArtist) {
    let title = rawTitle || '';
    let artist = rawArtist || '';
    title = title.replace(/\[[^\]]*\]|\([^)]*\)|［[^］]*］|【[^】]*】|「[^」]*」|『[^』]*』/g, '');
    title = title.replace(/official\s*(music\s*)?video|music\s*video|mv|lyrics?|lyric\s*video|ver\.?|HD|4K|provided\s*to\s*youtube\s*by|auto[-\s]*generated\s*by\s*youtube|topic/gi, '');
    title = title.replace(/\s+[fF](?:ea)?t\.?\s+[^-–—]*/g, '');
    title = title.replace(/\s+[fF]eaturing\s+[^-–—]*/g, '');
    title = title.replace(/\s+[fF](?:ea)?t\.?\s*[-–—]/g, '');
    title = title.replace(/\s+[fF]eaturing\s*[-–—]/g, '');
    title = title.replace(/\(\s*\)/g, '');
    title = title.replace(/\[\s*\]/g, '');
    title = title.replace(/\（\s*\）/g, '');
    title = title.replace(/\［\s*\］/g, '');
    title = title.replace(/[\uFF5E\u2013\u2014\-–—]+/g, '-');
    title = title.replace(/\s{2,}/g, ' ').trim();
    let extractedArtist = artist.trim();
    let extractedTrack = title.trim();
    const jpMatch = rawTitle.match(/^(.+?)「(.+?)」/);
    if (jpMatch) {
        extractedArtist = jpMatch[1].trim();
        extractedTrack = jpMatch[2].trim();
    } else {
        const dashMatch = extractedTrack.match(/^(.+?)\s*-\s*(.+)$/);
        if (dashMatch) {
            extractedArtist = dashMatch[1].trim();
            extractedTrack = dashMatch[2].trim();
        }
    }
    extractedArtist = extractedArtist.replace(/[【】\[\]()「」『』]/g, '').replace(/\s*-\s*topic$/i, '').replace(
        /^[-–—]+|[-–—]+$/g, '').trim();
    extractedTrack = extractedTrack.replace(/[【】\[\]()「」『』]/g, '').replace(/\s+[fF](?:ea)?t\.?\s+[^-–—]*/g,
        '').replace(/\s+[fF]eaturing\s+[^-–—]*/g, '').replace(/\(\s*\)/g, '').replace(/\[\s*\]/g, '').trim();
    if (extractedTrack.toLowerCase().startsWith(extractedArtist.toLowerCase())) {
        extractedTrack = extractedTrack.slice(extractedArtist.length).trim();
    }
    if (!extractedTrack || extractedTrack.toLowerCase() === extractedArtist.toLowerCase()) {
        const fb = rawTitle.match(/「(.+?)」/);
        if (fb) extractedTrack = fb[1].trim();
    }
    return {
        artist: extractedArtist,
        track: extractedTrack
    };
}

async function fetchLyricsMultiSource(artist, title, videoId) {
    const cacheKey = `lyrics_${encodeURIComponent(artist)}_${encodeURIComponent(title)}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        try {
            const json = JSON.parse(cached);
            if (json.syncedLyrics || json.plainLyrics) return json;
        } catch {}
    }
    if (videoId) {
        try {
            const data = await fetchLyricsFromPaxsenix(videoId);
            if (data && (data.syncedLyrics || data.plainLyrics || data.lyrics || data.text)) {
                const result = {
                    syncedLyrics: data.syncedLyrics || data.lyrics || data.text || null,
                    plainLyrics: data.plainLyrics || data.lyrics || data.text || null,
                    timestamp: Date
                        .now(),
                    source: 'paxsenix'
                };
                localStorage.setItem(cacheKey, JSON.stringify(result));
                return result;
            }
        } catch (e) {
            console.warn('Paxsenix API failed:', e);
        }
    }
    const sources = [{
            name: 'LRCLIB',
            url: `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`
        },
        {
            name: 'Lyrics.ovh',
            url: `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
        }
    ];
    for (const src of sources) {
        try {
            const proxied = `${CORS_PROXY_URL}${encodeURIComponent(src.url)}`;
            const res = await fetch(proxied);
            if (!res.ok) continue;
            const data = await res.json();
            if (src.name === 'LRCLIB') {
                if (data.syncedLyrics || data.plainLyrics) {
                    data.timestamp = Date.now();
                    data.source = src.name;
                    localStorage.setItem(cacheKey, JSON.stringify(data));
                    return data;
                }
            } else if (src.name === 'Lyrics.ovh') {
                if (data.lyrics) {
                    const result = {
                        plainLyrics: data.lyrics,
                        timestamp: Date.now(),
                        source: src.name
                    };
                    localStorage.setItem(cacheKey, JSON.stringify(result));
                    return result;
                }
            }
        } catch (e) {
            console.warn(`${src.name} failed:`, e);
        }
    }
    return null;
}

async function fetchLyricsFromPaxsenix(videoId) {
    const url = `${API_BASE}/api/lyrics?v=${encodeURIComponent(videoId)}`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Lyrics HTTP ${res.status}`);
        const data = await res.json();
        return data;
    } catch (err) {
        console.error('Paxsenix lyrics error:', err);
        throw err;
    }
}

async function fetchLyrics(title, artist, videoId) {
    const {
        artist: cleanArtist,
        track: cleanTrack
    } = cleanTitleAndArtist(title, artist);
    lyricsState = {
        status: 'loading',
        artist: cleanArtist,
        title: cleanTrack
    };
    lyricsMeta.textContent = 'Searching...';
    lyricsText.textContent = 'Searching...';
    try {
        const data = await fetchLyricsMultiSource(cleanArtist, cleanTrack, videoId);
        if (!data) throw new Error('No lyrics found from any source');
        const lyrics = data.syncedLyrics || data.plainLyrics;
        if (!lyrics) throw new Error('No lyrics');
        const isLrc = /^\s*\[\d{1,2}:\d{2}/m.test(lyrics);
        if (isLrc) {
            const parsed = parseLrc(lyrics);
            lyricsData = {
                isLrc: true,
                lrcLines: parsed
            };
            renderLrcLines(parsed);
            const source = data.source || 'LRCLIB';
            lyricsMeta.textContent = `Synced lyrics found for ${cleanArtist} – ${cleanTrack} (${source})`;
            lyricsState.status = 'synced';
        } else {
            lyricsData = {
                isLrc: false,
                plain: lyrics
            };
            const lines = lyrics.split(/\r?\n/).filter(l => l.trim().length > 0);
            lyricsText.innerHTML = lines.map(line => `<div class="plain-line">${line}</div>`).join('');
            const source = data.source || 'Lyrics.ovh/Genius';
            lyricsMeta.textContent = `Plain lyrics found for ${cleanArtist} – ${cleanTrack} (${source})`;
            lyricsState.status = 'plain';
        }
        window.currentSongArtist = cleanArtist;
        window.currentSongTitle = cleanTrack;
        startLyricsSync();
        if (translationEnabled) await applyTranslation();
    } catch (e) {
        lyricsData = null;
        lyricsText.textContent = 'Lyrics not found.';
        lyricsMeta.textContent = 'Lyrics not found.';
        lyricsState.status = 'error';
        console.warn('Lyrics fetch error:', e);
    }
}

function loadLyricsFor(title, artist, videoId) {
    const {
        artist: cleanArtist,
        track: cleanTrack
    } = cleanTitleAndArtist(title, artist);
    fetchLyrics(cleanTrack, cleanArtist, videoId);
}

// ---- Translation ----
toggleTranslationBtn?.addEventListener('click', () => {
    translationEnabled = !translationEnabled;
    if (translationEnabled) {
        toggleTranslationBtn.innerHTML = '<i class="fas fa-check"></i> ON';
        toggleTranslationBtn.style.background = 'var(--md-primary)';
        toggleTranslationBtn.style.color = 'var(--md-on-primary)';
        if (lyricsData) applyTranslation();
    } else {
        toggleTranslationBtn.innerHTML = '<i class="fas fa-language"></i>';
        toggleTranslationBtn.style.background = 'transparent';
        toggleTranslationBtn.style.color = 'var(--md-on-surface-variant)';
        if (lyricsData) {
            if (lyricsData.isLrc) renderLrcLines(lyricsData.lrcLines);
            else {
                const lines = lyricsData.plain.split(/\r?\n/).filter(l => l.trim().length > 0);
                lyricsText.innerHTML = lines.map(line => `<div class="plain-line">${line}</div>`).join('');
            }
            lyricsMeta.textContent = lyricsMeta.textContent.replace(/ \(Translated.*\)/, '');
        }
    }
});

async function applyTranslation() {
    if (!lyricsData || !lyricsData.isLrc || !lyricsData.lrcLines) return;
    const lines = lyricsData.lrcLines;
    const texts = lines.map(l => l.text);
    const targetLang = STATE.settings.translationTargetLang || 'en';
    const service = STATE.settings.translationService || 'auto';
    let translations = [];
    try {
        if (service === 'gemini' || service === 'auto') {
            translations = await translateWithGemini(texts, targetLang);
        }
        if ((!translations || translations.length === 0) && (service === 'openrouter' || service === 'auto')) {
            translations = await translateWithOpenRouter(texts, targetLang);
        }
        if (translations && translations.length > 0) {
            renderLrcLinesWithTranslation(lines, translations);
            lyricsMeta.textContent += ` (Translated to ${targetLang})`;
        }
    } catch (e) {
        console.warn('Translation failed:', e);
        showToast('Translation failed: ' + e.message, 'error');
    }
}

async function translateWithGemini(texts, targetLang) {
    const apiKey = STATE.settings.geminiKey;
    if (!apiKey || apiKey.length < 8) return [];
    const model = STATE.settings.geminiModel || 'gemini-3.1-flash-lite';
    const prompt =
        `Translate the following song lyrics to ${targetLang}. Return ONLY a JSON array of translated strings, one per line. Do not add any other text.\n\nLyrics:\n${texts.join('\n')}`;
    try {
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 4096
                    }
                })
            });
        if (!resp.ok) throw new Error('Gemini translation error');
        const data = await resp.json();
        const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '[]';
        const parsed = JSON.parse(result);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn('Gemini translation error:', e);
        return [];
    }
}

async function translateWithOpenRouter(texts, targetLang) {
    const apiKey = STATE.settings.openRouterKey;
    if (!apiKey || apiKey.length < 8) return [];
    const model = STATE.settings.chatModel || 'google/gemini-3.1-flash-lite';
    const prompt =
        `Translate the following song lyrics to ${targetLang}. Return ONLY a JSON array of translated strings, one per line. Do not add any other text.\n\nLyrics:\n${texts.join('\n')}`;
    try {
        const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });
        if (!resp.ok) throw new Error('OpenRouter translation error');
        const data = await resp.json();
        const result = data.choices?.[0]?.message?.content?.trim() || '[]';
        const parsed = JSON.parse(result);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn('OpenRouter translation error:', e);
        return [];
    }
}

toggleSyncBtn?.addEventListener('click', () => {
    autoSyncEnabled = !autoSyncEnabled;
    toggleSyncBtn.textContent = autoSyncEnabled ? 'Auto-Sync: ON' : 'Auto-Sync: OFF';
    if (!autoSyncEnabled && syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    } else if (autoSyncEnabled && lyricsData && lyricsData.isLrc) {
        startLyricsSync();
    }
});

refreshLyricsBtn?.addEventListener('click', async () => {
    const title = document.querySelector("#nowPlaying .song-title")?.textContent || '';
    const artist = document.querySelector("#nowPlaying .author-name")?.textContent || '';
    const vid = player ? player.getVideoData?.()?.video_id : selectedVideoId;
    if (title && artist && vid) await loadLyricsFor(title, artist, vid);
});

openRawBtn?.addEventListener('click', () => {
    if (!lyricsData) return alert('No lyrics loaded.');
    const blob = new Blob([JSON.stringify(lyricsData, null, 2)], {
        type: 'application/json'
    });
    window.open(URL.createObjectURL(blob), '_blank');
});

// =============================================================
//  SUMMARIZER – CORE LOGIC
// =============================================================

async function summarizeYouTubeVideo(url) {
    const geminiKey = STATE.settings.geminiKey;
    if (!geminiKey || geminiKey.length < 8) {
        showToast('Gemini API key required. Set it in Settings.', 'error');
        return false;
    }
    const ytKey = STATE.settings.ytApiKey;
    if (!ytKey || ytKey.length < 10) {
        showToast('YouTube API key required. Set it in Settings.', 'error');
        return false;
    }
    const videoId = extractYouTubeID(url);
    if (!videoId) {
        showToast('Invalid YouTube URL.', 'error');
        return false;
    }
    summarizerStatus.textContent = 'Fetching video data from YouTube API...';
    summarizerResult.innerHTML =
        '<div class="text-center text-muted" style="padding:20px 0;"><i class="fas fa-spinner fa-pulse"></i> Loading...</div>';
    try {
        const videoData = await fetchYouTubeVideoData(videoId, ytKey);
        summarizerStatus.textContent = 'Generating summary with Gemini AI...';
        const model = STATE.settings.geminiModel || 'gemini-3.1-flash-lite';
        const systemInstruction =
            `You are an expert YouTube video content summarizer. Analyze the provided video metadata (title, description, channel, publish date, duration) and create a detailed, insightful, and well-structured summary. Use clear markdown formatting with headings (##), bullet points, and sections. Structure your response to include: ## Overview (a concise paragraph summarizing the video's content and purpose), ## Key Topics Covered (bullet points of the main subjects discussed), ## Main Takeaways (actionable insights or conclusions), and optionally ## Additional Context if relevant. Be comprehensive but clear. Match the language of the summary to the video's content language, unless the user requests otherwise.`;
        let userPrompt = `**Video Title:** ${videoData.title}\n`;
        userPrompt += `**Channel:** ${videoData.channelTitle}\n`;
        userPrompt += `**Published:** ${formatDate(videoData.publishedAt)}\n`;
        userPrompt += `**Duration:** ${videoData.duration}\n`;
        userPrompt += `**YouTube URL:** ${videoData.url}\n\n`;
        userPrompt += `**Video Description:**\n${videoData.description || '(No description available)'}\n\n`;
        userPrompt +=
            `---\nPlease provide a comprehensive summary of this YouTube video based on the information above.`;
        const summary = await callGeminiWithSystem(model, geminiKey, systemInstruction, userPrompt);
        summarizerStatus.textContent = 'Summary ready!';
        renderSummarizerResult(videoData, summary);
        showToast('Summary generated!', 'success');
        return true;
    } catch (err) {
        summarizerStatus.textContent = '✘ Error: ' + err.message;
        summarizerResult.innerHTML =
            `<div class="error-text" style="padding:16px 20px;border-radius:8px;color:var(--md-error);">⚠️ <strong>Error:</strong> ${escapeHTML(err.message)}</div>`;
        showToast(err.message, 'error');
        return false;
    }
}

async function callGeminiWithSystem(model, apiKey, systemInstruction, userPrompt) {
    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const body = {
        system_instruction: {
            parts: [{
                text: systemInstruction
            }]
        },
        contents: [{
            parts: [{
                text: userPrompt
            }]
        }],
        generationConfig: {
            temperature: 0.4,
            topP: 0.9,
            maxOutputTokens: 4096,
        },
    };
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        let errorMsg = `Gemini API error (${response.status})`;
        try {
            const errJson = JSON.parse(errorBody);
            if (errJson.error && errJson.error.message) {
                errorMsg = errJson.error.message;
            }
        } catch {}
        throw new Error(errorMsg);
    }
    const data = await response.json();
    if (data.promptFeedback && data.promptFeedback.blockReason) {
        throw new Error(`Content blocked by safety filter: ${data.promptFeedback.blockReason}`);
    }
    if (!data.candidates || data.candidates.length === 0) {
        throw new Error('Gemini returned no candidates. The response may have been blocked.');
    }
    const candidate = data.candidates[0];
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        throw new Error(`Gemini response finished unexpectedly: ${candidate.finishReason}`);
    }
    const parts = candidate.content && candidate.content.parts;
    if (!parts || parts.length === 0) {
        throw new Error('Gemini returned an empty response.');
    }
    return parts.map(p => p.text || '').join('\n');
}

async function fetchYouTubeVideoData(videoId, apiKey) {
    const url =
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url);
    if (!response.ok) {
        const errorBody = await response.text();
        let errorMsg = `YouTube API error (${response.status})`;
        try {
            const errJson = JSON.parse(errorBody);
            if (errJson.error && errJson.error.message) {
                errorMsg = errJson.error.message;
            }
        } catch {}
        throw new Error(errorMsg);
    }
    const data = await response.json();
    if (!data.items || data.items.length === 0) {
        throw new Error('Video not found. It may be private, deleted, or the ID is invalid.');
    }
    const item = data.items[0];
    const snippet = item.snippet || {};
    const contentDetails = item.contentDetails || {};
    return {
        videoId: item.id,
        title: snippet.title || 'Untitled',
        description: snippet.description || '',
        channelTitle: snippet.channelTitle || 'Unknown channel',
        publishedAt: snippet.publishedAt || '',
        thumbnailUrl: (snippet.thumbnails && snippet.thumbnails.medium && snippet.thumbnails.medium.url) ||
            (snippet.thumbnails && snippet.thumbnails.default && snippet.thumbnails.default.url) || '',
        duration: parseDuration(contentDetails.duration),
        url: `https://www.youtube.com/watch?v=${item.id}`,
    };
}

function parseDuration(isoDuration) {
    if (!isoDuration) return 'N/A';
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return isoDuration;
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatDate(isoDate) {
    if (!isoDate) return 'Unknown date';
    try {
        const date = new Date(isoDate);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return isoDate;
    }
}

function renderSummarizerResult(videoData, summary) {
    let html = '';
    html += `<div class="summarizer-video-card">`;
    if (videoData.thumbnailUrl) {
        html +=
            `<a href="${escapeHTML(videoData.url)}" target="_blank" rel="noopener"><img src="${escapeHTML(videoData.thumbnailUrl)}" alt="Video thumbnail" loading="lazy"></a>`;
    }
    html += `<div class="summ-info">`;
    html +=
        `<h4><a href="${escapeHTML(videoData.url)}" target="_blank" rel="noopener">${escapeHTML(videoData.title)}</a></h4>`;
    html += `<p>📺 ${escapeHTML(videoData.channelTitle)}</p>`;
    html += `<div class="summ-meta">`;
    html += `<span>📅 ${escapeHTML(formatDate(videoData.publishedAt))}</span>`;
    html += `<span>⏱ ${escapeHTML(videoData.duration)}</span>`;
    html += `</div>`;
    html += `</div>`;
    html += `</div>`;
    html += `<div class="summary-markdown">`;
    if (typeof marked !== 'undefined' && marked.parse) {
        try {
            html += marked.parse(summary);
        } catch {
            html += `<pre>${escapeHTML(summary)}</pre>`;
        }
    } else {
        html += `<pre>${escapeHTML(summary)}</pre>`;
    }
    html += `</div>`;
    summarizerResult.innerHTML = html;
    summarizerCopyBtn.style.display = 'inline-flex';
    summarizerCopyBtn.dataset.summary = summary;
}

// ===== SUMMARIZER EVENT HANDLERS =====

summarizeBtn?.addEventListener('click', async function() {
    const url = summarizerUrlInput.value.trim();
    if (!url) {
        showToast('Please enter a YouTube URL.', 'error');
        return;
    }
    this.disabled = true;
    this.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Working...';
    await summarizeYouTubeVideo(url);
    this.disabled = false;
    this.innerHTML = '<i class="fas fa-magic"></i> Summarize';
});

summarizeCurrentBtn?.addEventListener('click', async function() {
    let currentUrl = null;
    const vid = player ? player.getVideoData?.()?.video_id : selectedVideoId;
    if (vid) currentUrl = `https://www.youtube.com/watch?v=${vid}`;
    if (!currentUrl) {
        showToast('No video is currently playing.', 'error');
        return;
    }
    summarizerUrlInput.value = currentUrl;
    this.disabled = true;
    this.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Working...';
    await summarizeYouTubeVideo(currentUrl);
    this.disabled = false;
    this.innerHTML = '<i class="fas fa-play-circle"></i> Current Video';
});

clearSummarizerBtn?.addEventListener('click', function() {
    summarizerUrlInput.value = '';
    summarizerStatus.textContent = 'Ready. Paste a URL or click "Current Video".';
    summarizerResult.innerHTML =
        '<div class="text-muted text-center" style="padding:30px 0;">Summary will appear here</div>';
    summarizerCopyBtn.style.display = 'none';
});

summarizerCopyBtn?.addEventListener('click', function() {
    const summary = this.dataset.summary || summarizerResult.innerText;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(summary).then(() => {
            showToast('Summary copied!', 'success');
        }).catch(() => {
            fallbackCopy(summary);
        });
    } else {
        fallbackCopy(summary);
    }
});

summarizerUrlInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') summarizeBtn.click();
});

// ===== ENHANCED ANALYZE BUTTON (uses summarizer) =====

async function analyzeYouTubeVideo() {
    const vid = player ? player.getVideoData?.()?.video_id : selectedVideoId;
    if (!vid) {
        showToast('No video is currently playing.', 'error');
        return;
    }
    const url = `https://www.youtube.com/watch?v=${vid}`;
    summarizerUrlInput.value = url;
    document.getElementById('showSummarizerBtn').click();
    const btn = summarizeBtn;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Working...';
    await summarizeYouTubeVideo(url);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-magic"></i> Summarize';
}


// =============================================================
//  PLAYLIST & YT PLAYER (existing)
// =============================================================

function loadPlaylist() {
    const stored = localStorage.getItem('youtubeMusicPlaylist');
    if (stored) {
        try {
            STATE.playlist = JSON.parse(stored);
        } catch {
            STATE.playlist = [];
        }
    }
    if (!STATE.playlist || STATE.playlist.length === 0) {
        STATE.playlist = [{
                videoId: '9mPlWG-fXAU',
                songName: 'Mortals x Royalty Mashup',
                authorName: 'NCS',
                albumArt: 'https://i.ytimg.com/vi/Z_XS05HcQmQ/hqdefault.jpg'
            },
            {
                videoId: "gw1z1d4QpWs",
                songName: "Rang De Lal (Oye Oye) (From Dhurandhar The Revenge) (feat. Reble) ",
                authorName: "Shashwat Sachdev",
                albumArt: "https://i.ytimg.com/vi/Z_XS05HcQmQ/hqdefault.jpg"
            },

            {
                videoId: "h7HY6naAG5A",
                songName: "Oh Ho Ho Ho",
                authorName: "Ikka Singh and Sukhbir",
                albumArt: "https://i.ytimg.com/vi/Z_XS05HcQmQ/hqdefault.jpg"
            },
            {
                videoId: 'tTcnIYYeZI8',
                songName: 'DIDI',
                authorName: 'Khaled',
                albumArt: 'https://i.ytimg.com/vi/Z_XS05HcQmQ/hqdefault.jpg'
            },
            {
                videoId: 'Z_XS05HcQmQ',
                songName: 'Harinezumi',
                authorName: 'NCS',
                albumArt: 'https://i.ytimg.com/vi/Z_XS05HcQmQ/hqdefault.jpg'
            },
            {
                videoId: 'R83LJkP8aEM',
                songName: 'HexSleuth_Matrix Digital Rain',
                authorName: '𓋹•HexSleuth•𓃠',
                albumArt: 'https://i.ytimg.com/vi/Z_XS05HcQmQ/hqdefault.jpg'
            },
            {
                videoId: 'dmE_tE2qRqg',
                songName: 'Dig Dig Dig Maso',
                authorName: 'Aram Shaida',
                albumArt: 'https://i.ytimg.com/vi/Z_XS05HcQmQ/hqdefault.jpg'
            },
            {
                videoId: 'gw1z1d4QpWs',
                songName: 'Rang De Lal (Oye Oye)',
                authorName: 'Shashwat Sachdev',
                albumArt: 'https://i.ytimg.com/vi/Z_XS05HcQmQ/hqdefault.jpg'
            },
            {
                videoId: 'luMzKL1LJ2o',
                songName: 'Paisaa',
                authorName: 'Kushal Grumpy',
                albumArt: 'https://i.ytimg.com/vi/Z_XS05HcQmQ/hqdefault.jpg'
            },
            {
                videoId: 'Mv6jJNsi-4w',
                songName: 'Obhodro Prem',
                authorName: 'Salman Muhammed Muqtadir',
                albumArt: 'https://i.ytimg.com/vi/Z_XS05HcQmQ/hqdefault.jpg'
            },
            {
                videoId: 'IDOghyqFA8s',
                songName: 'Sajni',
                authorName: 'Jal',
                albumArt: 'https://i.ytimg.com/vi/Z_XS05HcQmQ/hqdefault.jpg'
            },
            {
                videoId: 'k-TBmwz6GB4',
                songName: 'Elefante by El Tiger, featuring Neha Khankriyal',
                authorName: 'El Tiger',
                albumArt: 'https://i.ytimg.com/vi/Z_XS05HcQmQ/hqdefault.jpg'
            },

            {
                videoId: "fV5Mpc7fzb4",
                songName: "Saat Samundar Paar",
                authorName: "Sadhana Sargam",
                albumArt: "https://i.ytimg.com/vi/Z_XS05HcQmQ/hqdefault.jpg"
            },
            {
                videoId: "0XTJdt90Yf0",
                songName: "Top Hits of Arijit & Shreya",
                authorName: "Saregama Music",
                albumArt: "https://i.ytimg.com/vi/Z_XS05HcQmQ/hqdefault.jpg"
            },
            {
                videoId: "hQx8j9jUHa4",
                songName: "Kabhi Aar Kabhi Paar (Remix) | Baby Doll Remix | Sona Mohapatra",
                authorName: "Saregama Music",
                albumArt: "https://i.ytimg.com/vi/Z_XS05HcQmQ/hqdefault.jpg"
            },
            {
                videoId: "yBahBBAHs04",
                songName: "Tu Tu Hai Wahi (Remix) DJ Aqeel, Vaishali Samant | Yeh Wada Raha | Bollywood Remix Song",
                authorName: "UMusicIndiaVEVO",
                albumArt: "https://i.ytimg.com/vi/Z_XS05HcQmQ/hqdefault.jpg"
            },
            {
                videoId: "v-0yxbNbVHc",
                songName: "Dil Mein Baji Guitar",
                authorName: "Top Songs - India",
                albumArt: "https://i.ytimg.com/vi/Z_XS05HcQmQ/hqdefault.jpg"
            },
            {
                videoId: "Gr8G_ldltDE",
                songName: "Lapalap Lollypop Lagelu | Superhit Song",
                authorName: "Wave Music",
                albumArt: "https://i.ytimg.com/vi/Z_XS05HcQmQ/hqdefault.jpg"
            },
            {
                videoId: "xI7m2wtOLL4",
                songName: "Maarela Kachaakach (Bhojpuri Stage dance video) Ka Ho Na Hoi - Bhojpuri Kachvaeen",
                authorName: "T-Series Hamaar Bhojpuri",
                albumArt: "https://i.ytimg.com/vi/Z_XS05HcQmQ/hqdefault.jpg"
            },
        ];
    }
    renderPlaylist(STATE.playlist);
}

function savePlaylist() {
    localStorage.setItem('youtubeMusicPlaylist', JSON.stringify(STATE.playlist));
}

function renderPlaylist(songsToRender) {
    if (!songList) return;
    const currentlySelected = actualSelectedVideoId || (player ? player.getVideoData?.()?.video_id : null);
    songList.innerHTML = '';
    if (!songsToRender || songsToRender.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'list-group-item text-center text-muted empty-playlist';
        empty.textContent = 'No songs in playlist. Add some using YouTube search!';
        songList.appendChild(empty);
        return;
    }
    songsToRender.forEach((song, idx) => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.dataset.video = song.videoId;
        li.dataset.img = song.albumArt;
        li.draggable = true;
        li.dataset.index = idx;
        if (song.videoId === currentlySelected) li.classList.add('selected');
        const num = document.createElement('span');
        num.className = 'song-number';
        num.textContent = `${idx + 1}.`;
        const name = document.createElement('span');
        name.className = 'song-name';
        let clean = song.songName;
        clean = clean.replace(new RegExp(`^${song.authorName}\\s*-\\s*`), '');
        clean = clean.replace(new RegExp(`\\s*-\\s*${song.authorName}$`), '');
        clean = clean.replace(new RegExp(`\\s*by\\s*${song.authorName}$`, 'i'), '');
        name.textContent = clean;
        const author = document.createElement('span');
        author.className = 'author-column';
        author.textContent = song.authorName;
        const dragHandle = document.createElement('span');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '<i class="fas fa-grip-vertical"></i>';
        const action = document.createElement('div');
        action.className = 'song-action';
        const rm = document.createElement('button');
        rm.className = 'btn btn-danger btn-sm remove-song-btn';
        rm.innerHTML = ICON_TRASH;
        rm.dataset.video = song.videoId;
        rm.addEventListener('click', (e) => {
            e.stopPropagation();
            removeSong(song.videoId);
        });
        action.appendChild(rm);
        li.appendChild(num);
        li.appendChild(name);
        li.appendChild(author);
        li.appendChild(dragHandle);
        li.appendChild(action);
        li.addEventListener('click', (e) => {
            if (e.target.closest('.drag-handle') || e.target.closest('.remove-song-btn')) return;
            document.querySelectorAll('#songList li').forEach(el => el.classList.remove('selected'));
            li.classList.add('selected');
            actualSelectedVideoId = song.videoId;
            loadNewVideo(song.videoId, song.albumArt, song);
        });
        songList.appendChild(li);
    });
}

function removeSong(videoIdToRemove) {
    let currentPlaying = null;
    try {
        if (player && typeof player.getVideoData === 'function') {
            const d = player.getVideoData();
            if (d && d.video_id) currentPlaying = d.video_id;
        }
    } catch {}
    const wasPlayingCurrent = currentPlaying === videoIdToRemove && playing;
    STATE.playlist = STATE.playlist.filter(s => s.videoId !== videoIdToRemove);
    savePlaylist();
    renderPlaylist(STATE.playlist);
    if (actualSelectedVideoId === videoIdToRemove) actualSelectedVideoId = null;
    if (wasPlayingCurrent) {
        if (STATE.playlist.length > 0) playNextSong();
        else {
            if (player && typeof player.stopVideo === 'function') player.stopVideo();
            playing = false;
            playPauseBtn.innerHTML = ICON_PLAY;
            albumArt.src = 'https://via.placeholder.com/300';
            document.querySelector("#nowPlaying .song-title").textContent = 'No Song';
            document.querySelector("#nowPlaying .author-name").textContent = '';
            progressFill.style.width = '0%';
            currentTimeEl.textContent = '0:00';
            totalTimeEl.textContent = '0:00';
            if (progressInterval) clearInterval(progressInterval);
            actualSelectedVideoId = null;
            ThemeEngine.clearDynamicPalette();
        }
    }
}

function loadNewVideo(videoId, albumArtUrl, songObject = null) {
    if (player) player.setVolume(currentVolume);
    const art = document.getElementById('albumArt');
    art.style.transition = 'opacity 0.5s';
    art.style.opacity = '0';
    if (albumArtDisplayMode !== 'video') {
        setTimeout(() => {
            art.classList.remove('rotate');
            art.style.transform = 'rotate(0deg)';
            if (albumArtUrl && isValidImageUrl(albumArtUrl)) {
                art.src = albumArtUrl;
            } else {
                art.src = 'https://via.placeholder.com/300';
            }
            art.onload = () => {
                setTimeout(() => {
                    art.style.opacity = '1';
                    if (playing && albumArtDisplayMode === 'spin') {
                        art.classList.remove('rotate-paused');
                        art.classList.add('rotate');
                    } else {
                        art.classList.remove('rotate', 'rotate-paused');
                    }
                    if (albumArtUrl && albumArtUrl !== 'https://via.placeholder.com/300') {
                        ThemeEngine.applyVibrantFromUrl(albumArtUrl);
                    } else {
                        ThemeEngine.clearDynamicPalette();
                    }
                }, 500);
            };
            art.onerror = () => {
                art.src = 'https://via.placeholder.com/300';
                ThemeEngine.clearDynamicPalette();
            };
        }, 500);
    } else {
        setTimeout(() => {
            initializeVideoPlayerInAlbumArt(videoId);
        }, 100);
        art.style.opacity = '1';
        if (albumArtUrl && albumArtUrl !== 'https://via.placeholder.com/300') {
            ThemeEngine.applyVibrantFromUrl(albumArtUrl);
        } else {
            ThemeEngine.clearDynamicPalette();
        }
    }
    const titleEl = document.querySelector("#nowPlaying .song-title");
    const authorEl = document.querySelector("#nowPlaying .author-name");
    if (songObject) {
        const sName = songObject.songName;
        const aName = songObject.authorName;
        if (sName !== lastSong) {
            titleEl.style.transition = 'opacity 0.5s';
            titleEl.style.opacity = '0';
            setTimeout(() => {
                titleEl.textContent = removeArtistFromTitle(sName, aName);
                titleEl.style.opacity = '1';
            }, 500);
            lastSong = sName;
        }
        if (aName !== lastAuthor) {
            authorEl.style.transition = 'opacity 0.5s';
            authorEl.style.opacity = '0';
            setTimeout(() => {
                authorEl.textContent = aName;
                authorEl.style.opacity = '1';
            }, 500);
            lastAuthor = aName;
        }
        loadLyricsFor(sName, aName, videoId);
    }
    if (errorTimeout) clearTimeout(errorTimeout);
    errorMessage.style.display = 'none';
    songUnavailable = false;
    if (countdownInterval) clearInterval(countdownInterval);
    if (player && typeof player.loadVideoById === 'function') {
        player.loadVideoById(videoId);
        player.setVolume(currentVolume);
        player.playVideo();
        if (albumArtDisplayMode === 'video') initializeVideoPlayerInAlbumArt(videoId);
    } else {
        playerContainer.innerHTML = `<div id="player"></div>`;
        if (window.YT && window.YT.Player) {
            player = new YT.Player('player', {
                videoId: videoId,
                playerVars: {
                    autoplay: 1,
                    controls: 0,
                    modestbranding: 1,
                    showinfo: 0,
                    rel: 0
                },
                events: {
                    onReady: (e) => {
                        e.target.setVolume(currentVolume);
                        updateVolumeUI(currentVolume);
                        if (albumArtDisplayMode === 'video') initializeVideoPlayerInAlbumArt(
                            videoId);
                        if (SB.enabled) SB.start(videoId);
                        // Start ad-block enhancements
                        startAdBlockEnhancements();
                    },
                    onStateChange: handlePlayerStateChange,
                    onError: handleVideoError
                }
            });
        } else {
            selectedVideoId = videoId;
        }
    }
    selectedVideoId = videoId;
    progressFill.style.width = '0%';
    currentTimeEl.textContent = '0:00';
    totalTimeEl.textContent = '0:00';
    playing = true;
    playPauseBtn.innerHTML = ICON_PAUSE;
    updateProgressBar();
    if (SB.enabled) SB.start(videoId);
    if (STATE.bgPlaybackEnabled) ensureBgAudioContext();
}

function handlePlayerStateChange(event) {
    const art = document.getElementById('albumArt');
    const autoPlay = autoPlayToggle && autoPlayToggle.checked;
    if (albumArtDisplayMode === 'spin') {
        if (event.data === 1) {
            if (albumArtSpinEnabled) {
                art.classList.remove('rotate-paused');
                art.classList.add('rotate');
            }
        } else if (event.data === 2 || event.data === 0) {
            if (albumArtSpinEnabled) art.classList.add('rotate-paused');
        }
    }
    if (event.data === 1 || event.data === 3) updateProgressBar();
    if (event.data === 0) {
        playing = false;
        if (albumArtSpinEnabled) art.classList.add('rotate-paused');
        if (repeatSong) {
            player.seekTo(0);
            player.playVideo();
        } else if (autoPlay) {
            playNextSong();
        } else {
            playPauseBtn.innerHTML = ICON_REVISION;
        }
    } else if (event.data === 2) {
        playPauseBtn.innerHTML = ICON_PLAY;
        playing = false;
        if (albumArtSpinEnabled) art.classList.add('rotate-paused');
    } else if (event.data === 1) {
        playPauseBtn.innerHTML = ICON_PAUSE;
        playing = true;
        if (albumArtSpinEnabled) {
            art.classList.remove('rotate-paused');
            art.classList.add('rotate');
        }
    }
}

function handleVideoError(event) {
    let countdown = 5;
    clearInterval(countdownInterval);
    errorMessage.style.transition = 'opacity 0.5s';
    errorMessage.style.opacity = '0';
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.opacity = '1';
    }, 500);
    playing = false;
    songUnavailable = true;
    if (player && player.pauseVideo) player.pauseVideo();
    playPauseBtn.innerHTML = ICON_PLAY;
    albumArt.classList.add('rotate-paused');

    function updateCountdown() {
        errorMessage.innerHTML = `⚠ Song unavailable. Skipping in ${countdown} seconds...`;
        countdown--;
        if (countdown < 0) {
            clearInterval(countdownInterval);
            errorMessage.style.opacity = '0';
            setTimeout(() => {
                errorMessage.style.display = 'none';
                if (autoPlayToggle && autoPlayToggle.checked) playNextSong();
            }, 500);
        }
    }
    countdownInterval = setInterval(updateCountdown, 1000);
    updateCountdown();
}

function updateProgressBar() {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if (!player || typeof player.getCurrentTime !== 'function' || isDragging) return;
        try {
            const cur = player.getCurrentTime();
            const dur = player.getDuration();
            if (dur > 0 && isFinite(dur) && cur >= 0 && isFinite(cur)) {
                const pct = Math.min((cur / dur) * 100, 100);
                progressFill.style.width = pct + '%';
                currentTimeEl.textContent = formatTime(cur);
                totalTimeEl.textContent = formatTime(dur);
            }
            if (player.getPlayerState() === 0) {
                clearInterval(progressInterval);
                const autoPlay = autoPlayToggle && autoPlayToggle.checked;
                if (repeatSong) {
                    player.seekTo(0);
                    player.playVideo();
                } else if (autoPlay) {
                    playNextSong();
                } else {
                    playPauseBtn
                        .innerHTML = ICON_REVISION;
                    playing = false;
                }
            }
        } catch (e) {}
    }, 1000);
}

let wasPlaying = false;
progressBar.addEventListener('mousedown', (e) => {
    if (songUnavailable) return;
    isDragging = true;
    wasPlaying = playing;
    seek(e);
});
progressBar.addEventListener('touchstart', (e) => {
    if (songUnavailable) return;
    isDragging = true;
    wasPlaying = playing;
    seek(e.touches[0]);
    e.preventDefault();
});
document.addEventListener('mousemove', (e) => {
    if (isDragging) seek(e);
});
document.addEventListener('touchmove', (e) => {
    if (isDragging) {
        seek(e.touches[0]);
        e.preventDefault();
    }
});
document.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        if (!wasPlaying && player) player
            .pauseVideo();
    }
});
document.addEventListener('touchend', () => {
    if (isDragging) {
        isDragging = false;
        if (!wasPlaying && player) player
            .pauseVideo();
    }
});

function seek(e) {
    const barWidth = progressBar.offsetWidth;
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    const clickPos = clientX - progressBar.getBoundingClientRect().left;
    const dur = player?.getDuration?.() || 0;
    if (dur > 0) {
        const seekTime = (clickPos / barWidth) * dur;
        if (player && seekTime >= 0 && seekTime <= dur) {
            player.seekTo(seekTime, true);
            if (!wasPlaying) player.pauseVideo();
            progressFill.style.width = (seekTime / dur) * 100 + '%';
        }
    }
}

function updateVolumeUI(val) {
    const container = document.querySelector('.volume-bar-container');
    if (!container || !volumeProgress || !volumeThumb) return;
    const w = container.offsetWidth;
    const thumbW = volumeThumb.offsetWidth;
    const pos = (val / 100) * (w - thumbW) + (thumbW / 2);
    volumeProgress.style.width = val + '%';
    volumeThumb.style.left = pos + 'px';
}

volumeControl.addEventListener('input', function() {
    const val = parseInt(this.value);
    currentVolume = val;
    localStorage.setItem('volumeLevel', val);
    if (player && player.setVolume) player.setVolume(val);
    updateVolumeUI(val);
});

document.querySelector('.volume-bar-container')?.addEventListener('click', function(e) {
    if (e.target === volumeControl || e.target === volumeThumb) return;
    const rect = this.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    volumeControl.value = pct;
    currentVolume = pct;
    localStorage.setItem('volumeLevel', pct);
    if (player && player.setVolume) player.setVolume(pct);
    updateVolumeUI(pct);
    volumeControl.dispatchEvent(new Event('input'));
});

volumeControl.addEventListener('wheel', function(e) {
    e.preventDefault();
    const step = e.deltaY < 0 ? 5 : -5;
    const val = Math.min(100, Math.max(0, parseInt(this.value, 10) + step));
    this.value = val;
    currentVolume = val;
    localStorage.setItem('volumeLevel', val);
    if (player) player.setVolume(val);
    updateVolumeUI(val);
});

function playPreviousSong() {
    const items = document.querySelectorAll("#songList li:not(.empty-playlist)");
    if (items.length === 0) return;
    const cur = document.querySelector("#songList li.selected");
    const idx = Array.from(items).indexOf(cur);
    const prevIdx = (idx - 1 + items.length) % items.length;
    const prev = items[prevIdx];
    if (cur) cur.classList.remove('selected');
    prev.classList.add('selected');
    const vid = prev.dataset.video;
    const img = prev.dataset.img;
    const obj = STATE.playlist.find(s => s.videoId === vid);
    actualSelectedVideoId = vid;
    loadNewVideo(vid, img, obj);
}

function playNextSong() {
    const items = document.querySelectorAll("#songList li:not(.empty-playlist)");
    if (items.length === 0) return;
    const cur = document.querySelector("#songList li.selected");
    const idx = Array.from(items).indexOf(cur);
    const nextIdx = (idx + 1) % items.length;
    const next = items[nextIdx];
    if (cur) cur.classList.remove('selected');
    next.classList.add('selected');
    const vid = next.dataset.video;
    const img = next.dataset.img;
    const obj = STATE.playlist.find(s => s.videoId === vid);
    actualSelectedVideoId = vid;
    loadNewVideo(vid, img, obj);
}

prevBtn.addEventListener('click', playPreviousSong);
nextBtn.addEventListener('click', playNextSong);
playPauseBtn.addEventListener('click', function() {
    if (songUnavailable) return;
    if (player) {
        if (playing) {
            player.pauseVideo();
            this.innerHTML = ICON_PLAY;
            playing = false;
            if (progressInterval) clearInterval(progressInterval);
            if (albumArtDisplayMode === 'spin' && albumArtSpinEnabled) albumArt.classList.add(
                'rotate-paused');
        } else {
            player.playVideo();
            this.innerHTML = ICON_PAUSE;
            playing = true;
            updateProgressBar();
            if (albumArtDisplayMode === 'spin' && albumArtSpinEnabled) {
                albumArt.classList.remove('rotate-paused');
                albumArt.classList.add('rotate');
            }
        }
    }
});

repeatBtn.addEventListener('click', function() {
    repeatSong = !repeatSong;
    this.classList.toggle('active', repeatSong);
});

albumArtDisplayToggle?.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const mode = this.dataset.mode;
        albumArtDisplayToggle.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        albumArtDisplayMode = mode;
        applyAlbumArtDisplayMode();
        updateVideoPlayerOnModeChange();
    });
});

function applyAlbumArtDisplayMode() {
    const art = document.getElementById('albumArt');
    const vidContainer = document.getElementById('videoPlayerInAlbumArt');
    if (!art || !vidContainer) return;
    document.body.classList.remove('album-art-spin-mode', 'album-art-none-mode', 'album-art-video-mode');
    const curId = player ? player.getVideoData?.()?.video_id : selectedVideoId;
    const curSong = STATE.playlist.find(s => s.videoId === curId);
    const curUrl = curSong ? curSong.albumArt : art.src;
    switch (albumArtDisplayMode) {
        case 'spin':
            document.body.classList.add('album-art-spin-mode');
            albumArtSpinEnabled = true;
            art.style.display = 'block';
            vidContainer.style.display = 'none';
            if (curSong && art.src !== curUrl) art.src = curUrl;
            if (playing) {
                art.classList.remove('rotate-paused');
                art.classList.add('rotate');
            } else art.classList.remove('rotate', 'rotate-paused');
            break;
        case 'none':
            document.body.classList.add('album-art-none-mode');
            albumArtSpinEnabled = false;
            art.style.display = 'block';
            vidContainer.style.display = 'none';
            if (curSong && art.src !== curUrl) art.src = curUrl;
            art.classList.remove('rotate', 'rotate-paused');
            break;
        case 'video':
            document.body.classList.add('album-art-video-mode');
            albumArtSpinEnabled = false;
            art.style.display = 'none';
            vidContainer.style.display = 'block';
            art.classList.remove('rotate', 'rotate-paused');
            initializeVideoPlayerInAlbumArt(curId);
            break;
    }
    localStorage.setItem('albumArtDisplayMode', albumArtDisplayMode);
    if (albumArtDisplayMode !== 'video' && curUrl && curUrl !== 'https://via.placeholder.com/300') {
        ThemeEngine.applyVibrantFromUrl(curUrl);
    } else if (albumArtDisplayMode === 'video') {
        if (curUrl && curUrl !== 'https://via.placeholder.com/300') {
            ThemeEngine.applyVibrantFromUrl(curUrl);
        } else {
            ThemeEngine.clearDynamicPalette();
        }
    } else {
        ThemeEngine.clearDynamicPalette();
    }
}

function initializeVideoPlayerInAlbumArt(videoId) {
    const container = document.getElementById('videoPlayerInAlbumArt');
    if (!container || !videoId) return;
    if (typeof YT !== 'undefined' && YT.Player) {
        const existing = container.querySelector('#player');
        if (existing && existing.id && window[existing.id]) {
            const vp = window[existing.id];
            if (vp.loadVideoById) {
                vp.loadVideoById(videoId);
                vp.setVolume(currentVolume);
            }
        } else {
            container.innerHTML = '<div id="playerInAlbumArt"></div>';
            const vp = new YT.Player('playerInAlbumArt', {
                videoId: videoId,
                playerVars: {
                    autoplay: playing ? 1 : 0,
                    controls: 0,
                    modestbranding: 1,
                    showinfo: 0,
                    rel: 0,
                    playsinline: 1
                },
                events: {
                    onReady: (e) => {
                        e.target.setVolume(currentVolume);
                        e.target.playVideo();
                    }
                }
            });
            window.playerInAlbumArt = vp;
        }
    } else {
        setTimeout(() => initializeVideoPlayerInAlbumArt(videoId), 100);
    }
}

function updateVideoPlayerOnModeChange() {
    const curId = player ? player.getVideoData?.()?.video_id : selectedVideoId;
    if (albumArtDisplayMode === 'video' && curId) {
        setTimeout(() => initializeVideoPlayerInAlbumArt(curId), 50);
    }
}

// ─── SponsorBlock ───

const SB = {
    categories: ["sponsor", "selfpromo", "interaction", "intro", "outro", "preview", "music_offtopic",
        "exclusive_access", "poi_highlight"
    ],
    actionTypes: ["skip", "mute", "full", "poi"],
    skipThreshold: [0.2, 1],
    serverEndpoint: "https://sponsor.ajay.app",
    skipTracking: true,
    highlightKey: "Enter",
    videoId: null,
    skipSegments: new Map(),
    muteSegments: new Map(),
    muteEndTime: 0,
    enabled: true,
    checkInterval: null,
    skippedSet: new Set(),
    labelsAdded: false,

    getVideoId: function() {
        try {
            if (player && typeof player.getVideoData === 'function') {
                const d = player.getVideoData();
                return d && d.video_id ? d.video_id : null;
            }
        } catch (e) {}
        return selectedVideoId || null;
    },

    fetch: function(videoId) {
        if (!videoId) return;
        const url =
            `${this.serverEndpoint}/api/skipSegments?videoID=${videoId}&categories=${JSON.stringify(this.categories)}&actionTypes=${JSON.stringify(this.actionTypes)}`;
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.responseType = "json";
        xhr.onload = () => {
            if (xhr.status === 200 && xhr.response) {
                this.processSegments(xhr.response);
            } else console
                .log("[SB.js] no segments or error", xhr.status);
        };
        xhr.onerror = () => console.error("[SB.js] fetch error");
        xhr.send();
    },

    processSegments: function(data) {
        if (!data || !Array.isArray(data)) return;
        this.skipSegments = new Map();
        this.muteSegments = new Map();
        this.skippedSet = new Set();
        data.forEach(s => {
            if (s.actionType === "skip") this.skipSegments.set(s.segment[0], {
                end: s.segment[1],
                uuid: s.UUID
            });
            else if (s.actionType === "mute") this.muteSegments.set(s.segment[0], {
                end: s.segment[1],
                uuid: s.UUID
            });
            else if (s.actionType === "full") this.createVideoLabel(s);
            else if (s.actionType === "poi") this.createPOILabel(s);
        });
        console.log(`[SB.js] Loaded ${this.skipSegments.size} skip + ${this.muteSegments.size} mute segments`);
    },

    skipOrMute: function() {
        if (!player || typeof player.getCurrentTime !== 'function') return;
        const currentTime = player.getCurrentTime();
        // FIX: use player.isMuted() instead of player.isMuted
        if (player.isMuted && typeof player.isMuted === 'function' ?
            player.isMuted() :
            false && currentTime >= this.muteEndTime) {
            player.unMute();
            this.muteEndTime = 0;
        }
        const skipEnd = this.findEndTime(currentTime, this.skipSegments);
        if (skipEnd !== null && typeof player.seekTo === 'function') {
            player.seekTo(skipEnd);
            if (window.playerInAlbumArt && typeof window.playerInAlbumArt.seekTo === 'function') {
                window.playerInAlbumArt.seekTo(skipEnd);
            }
        }
        const muteEnd = this.findEndTime(currentTime, this.muteSegments);
        if (muteEnd !== null) {
            // FIX: use player.isMuted() instead of player.isMuted
            if (typeof player.isMuted === 'function' ? !player.isMuted() : true) player.mute();
            this.muteEndTime = muteEnd;
        }
    },

    findEndTime: function(now, map) {
        let endTime = null;
        for (const startTime of map.keys()) {
            const threshold = this.skipThreshold;
            if (now + threshold[0] >= startTime && now - startTime <= threshold[1]) {
                const segment = map.get(startTime);
                endTime = segment.end;
                this.trackSkip(segment.uuid);
                map.delete(startTime);
                for (const overlapStart of map.keys()) {
                    if (endTime >= overlapStart && overlapStart >= now) {
                        const overSegment = map.get(overlapStart);
                        if (overSegment.end > endTime) endTime = overSegment.end;
                        this.trackSkip(overSegment.uuid);
                        map.delete(overlapStart);
                    }
                }
                return endTime;
            }
        }
        return null;
    },

    trackSkip: function(uuid) {
        if (!this.skipTracking) return;
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${this.serverEndpoint}/api/viewedVideoSponsorTime?UUID=${uuid}`);
        xhr.send();
    },

    createPOILabel: function(label) {
        this.createVideoLabel(label, "poi");
        const listener = (e) => {
            if (e.key === this.highlightKey) {
                if (player && typeof player.seekTo === 'function') player.seekTo(label.segment[1]);
                this.trackSkip(label.UUID);
                const el = document.querySelector("#sbjs-label-poi");
                if (el) el.style.display = "none";
                document.removeEventListener("keydown", listener);
            }
        };
        document.addEventListener("keydown", listener);
    },

    createVideoLabel: function(label, type = "full") {
        const titleEl = document.querySelector("#nowPlaying .song-title");
        if (!titleEl) {
            setTimeout(() => this.createVideoLabel(label, type), 200);
            return;
        }
        const category = label.category;
        const styles = {
            sponsor: ["#0d0", "#111", "The entire video is sponsor content"],
            selfpromo: ["#ff0", "#111", "Self-promotion"],
            exclusive_access: ["#085", "#fff", "Exclusive access"],
            poi_highlight: ["#f18", "#fff", `Press ${this.highlightKey} to skip to highlight`],
        };
        const style = styles[category] || styles.sponsor;
        const labelEl = document.createElement("span");
        labelEl.title = style[2];
        labelEl.innerText = category;
        labelEl.id = `sbjs-label-${type}`;
        labelEl.style.cssText =
            `color: ${style[1]}; background-color: ${style[0]}; display: inline-block; margin: 0 6px; padding: 0 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase;`;
        const parent = titleEl.parentNode;
        if (parent && !parent.querySelector(`#sbjs-label-${type}`)) {
            titleEl.style.display = "inline-block";
            parent.insertBefore(labelEl, titleEl.nextSibling);
        }
    },

    start: function(videoId) {
        if (!videoId) return;
        if (this.videoId === videoId && this.enabled) return;
        this.videoId = videoId;
        this.skipSegments = new Map();
        this.muteSegments = new Map();
        this.muteEndTime = 0;
        this.skippedSet = new Set();
        document.querySelectorAll('[id^="sbjs-label-"]').forEach(el => el.remove());
        if (!this.enabled) return;
        this.fetch(videoId);
        if (this.checkInterval) clearInterval(this.checkInterval);
        this.checkInterval = setInterval(() => {
            const currentVid = this.getVideoId();
            if (currentVid !== this.videoId) {
                clearInterval(this.checkInterval);
                this.checkInterval = null;
                return;
            }
            this.skipOrMute();
        }, 500);
    },

    stop: function() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        document.querySelectorAll('[id^="sbjs-label-"]').forEach(el => el.remove());
    },

    toggle: function(enabled) {
        this.enabled = enabled;
        if (enabled) {
            const vid = this.getVideoId();
            if (vid) this.start(vid);
            showToast('SponsorBlock enabled', 'success');
        } else {
            this.stop();
            showToast('SponsorBlock disabled', 'info');
        }
        localStorage.setItem('sponsorBlockEnabled', JSON.stringify(enabled));
    }
};

if (sponsorToggle) {
    sponsorToggle.addEventListener('change', function() {
        const enabled = this.checked;
        SB.enabled = enabled;
        if (enabled) {
            const vid = SB.getVideoId();
            if (vid) SB.start(vid);
            showToast('SponsorBlock enabled', 'success');
        } else {
            SB.stop();
            showToast('SponsorBlock disabled', 'info');
        }
        localStorage.setItem('sponsorBlockEnabled', JSON.stringify(enabled));
    });
}

// =============================================================
//  ADDITIONAL AD‑BLOCKING ENHANCEMENTS (from userscript)
// =============================================================

let adBlockInterval = null;
let ssapInterval = null;
let lastAdBlockState = { muted: false, rate: 1 };

function startAdBlockEnhancements() {
    stopAdBlockEnhancements();

    // Video ad fast‑forward (mute & speed up)
    adBlockInterval = setInterval(() => {
        if (!player || typeof player.getPlayerState !== 'function') return;
        try {
            const playerEl = document.getElementById('movie_player') || player?.getIframe?.()?.parentElement;
            const adShowing = playerEl && playerEl.classList.contains('ad-showing');
            if (adShowing) {
                if (player.setPlaybackRate && player.getPlaybackRate) {
                    if (player.getPlaybackRate() < 16) {
                        player.setPlaybackRate(16);
                    }
                }
                if (!lastAdBlockState.muted) {
                    if (typeof player.isMuted === 'function' && !player.isMuted()) {
                        player.mute();
                        lastAdBlockState.muted = true;
                    }
                }
            } else {
                if (lastAdBlockState.muted) {
                    if (typeof player.isMuted === 'function' && player.isMuted()) {
                        player.unMute();
                        lastAdBlockState.muted = false;
                    }
                }
                // restore playback rate if needed
                if (player.getPlaybackRate && player.getPlaybackRate() > 2) {
                    player.setPlaybackRate(1);
                }
            }
        } catch (e) {}
    }, 500);

    // SSAP auto‑skip
    ssapInterval = setInterval(() => {
        if (!player || typeof player.getStatsForNerds !== 'function') return;
        try {
            const stats = player.getStatsForNerds();
            const debugInfo = stats?.debug_info || '';
            if (debugInfo.startsWith('SSAP, AD') || debugInfo.startsWith('SSAP,AD')) {
                const progress = player.getProgressState?.();
                if (progress && progress.duration > 0) {
                    if (progress.loaded < progress.duration || progress.duration - progress.current > 1) {
                        player.seekTo?.(progress.duration);
                        showToast('⏭️ SSAP ad skipped', 'info');
                    }
                }
            }
        } catch (e) {}
    }, 2000);
}

function stopAdBlockEnhancements() {
    if (adBlockInterval) {
        clearInterval(adBlockInterval);
        adBlockInterval = null;
    }
    if (ssapInterval) {
        clearInterval(ssapInterval);
        ssapInterval = null;
    }
    // restore mute/rate if needed
    if (player && typeof player.isMuted === 'function') {
        try {
            if (player.isMuted()) player.unMute();
        } catch (e) {}
    }
    if (player && typeof player.setPlaybackRate === 'function') {
        try {
            player.setPlaybackRate(1);
        } catch (e) {}
    }
    lastAdBlockState.muted = false;
    lastAdBlockState.rate = 1;
}

// Ensure ad-block enhancements are started with the player
const origOnReady = window.onYouTubeIframeAPIReady;
window.onYouTubeIframeAPIReady = function() {
    if (origOnReady) origOnReady();
    startAdBlockEnhancements();
};

// ─── YT Search & Import ───

const searchCache = JSON.parse(localStorage.getItem('ytSearchCache') || '{}');
const CACHE_EXPIRY = 3600000;

function cacheSearchResults(term, results) {
    searchCache[term] = {
        results,
        timestamp: Date.now()
    };
    localStorage.setItem('ytSearchCache', JSON.stringify(searchCache));
}

function getCachedResults(term) {
    const cached = searchCache[term];
    if (cached && (Date.now() - cached.timestamp < CACHE_EXPIRY)) return cached.results;
    return null;
}

async function searchYouTube() {
    const term = youtubeSearchInput?.value?.trim();
    if (!term) return;
    searchResultsList.innerHTML = '';
    searchError.classList.add('d-none');
    searchResults.classList.add('d-none');
    const cached = getCachedResults(term);
    if (cached) {
        displaySearchResults(cached);
        return;
    }
    searchLoading.classList.remove('d-none');
    try {
        const data = await searchYouTubeViaPaxsenix(term);
        searchLoading.classList.add('d-none');
        if (data && data.items && data.items.length > 0) {
            cacheSearchResults(term, data);
            searchResults.classList.remove('d-none');
            displaySearchResults(data);
            return;
        }
    } catch (e) {
        console.warn('Paxsenix search failed, falling back to YouTube API:', e);
    }
    const YT_KEY = STATE.settings.ytApiKey || '';
    if (!YT_KEY || YT_KEY.length < 10) {
        searchError.innerHTML =
            `<i class="fas fa-exclamation-circle"></i> YouTube API Key not configured. Please set it in Settings.`;
        searchError.classList.remove('d-none');
        searchLoading.classList.add('d-none');
        return;
    }
    try {
        const url =
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(term)}&type=video&maxResults=10&key=${YT_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        cacheSearchResults(term, data);
        searchLoading.classList.add('d-none');
        searchResults.classList.remove('d-none');
        displaySearchResults(data);
    } catch (e) {
        searchLoading.classList.add('d-none');
        searchError.innerHTML = `<i class="fas fa-exclamation-circle"></i> Search failed: ${e.message}`;
        searchError.classList.remove('d-none');
    }
}

async function searchYouTubeViaPaxsenix(query) {
    const url = `${API_BASE}/youtube/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Search HTTP ${res.status}`);
    const data = await res.json();
    return data;
}

function displaySearchResults(data) {
    searchResults.classList.remove('d-none');
    const items = data.items || data.data || [];
    if (items && items.length > 0) {
        items.forEach(item => {
            const videoId = item.id?.videoId || item.id || item.videoId;
            const title = item.snippet?.title || item.title || item.name || 'Unknown';
            const channelTitle = item.snippet?.channelTitle || item.author || item.channel || 'Unknown';
            const thumbnail = item.snippet?.thumbnails?.high?.url || item.thumbnail || item.thumb ||
                'https://via.placeholder.com/120';
            if (!videoId) return;
            const div = document.createElement('div');
            div.className = 'list-group-item';
            div.innerHTML = `
                  <img src="${thumbnail}" alt="${title}">
                  <div class="flex-grow-1">
                    <h6>${title}</h6>
                    <p><small>${channelTitle}</small></p>
                  </div>
                  <button class="add-from-search-btn" data-video-id="${videoId}" 
                          data-song-title="${title.replace(/"/g, '&quot;')}" 
                          data-author-name="${channelTitle.replace(/"/g, '&quot;')}" 
                          data-album-art="${thumbnail}">
                    <i class="fas fa-plus"></i> Add
                  </button>
                `;
            searchResultsList.appendChild(div);
        });
        searchResultsList.querySelectorAll('.add-from-search-btn').forEach(btn => {
            btn.addEventListener('click', addSongFromSearch);
        });
    } else {
        searchResultsList.innerHTML = `<p class="text-center text-muted">No results found.</p>`;
    }
}

function addSongFromSearch(e) {
    const btn = e.currentTarget;
    const vid = btn.dataset.videoId;
    const title = btn.dataset.songTitle;
    const author = btn.dataset.authorName;
    const art = btn.dataset.albumArt;
    if (STATE.playlist.some(s => s.videoId === vid)) {
        alert('This song is already in your playlist!');
        return;
    }
    const song = {
        videoId: vid,
        songName: title,
        authorName: author,
        albumArt: art
    };
    STATE.playlist.push(song);
    savePlaylist();
    renderPlaylist(STATE.playlist);
    if (STATE.playlist.length === 1) loadNewVideo(vid, art, song);
}

youtubeSearchBtn?.addEventListener('click', searchYouTube);
youtubeSearchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchYouTube();
});

async function importPlaylistFromUrl(overrideUrl = null) {
    let input = overrideUrl || playlistImportInput.value.trim();
    if (!input) {
        showToast('Please enter a YouTube Music playlist URL or ID.', 'error');
        return;
    }
    let playlistId = input;
    const match = input.match(/[&?]list=([^&]+)/);
    if (match) playlistId = match[1];
    else if (input.includes('/playlist?list=')) {
        const p = input.split('list=')[1]?.split('&')[0];
        if (p) playlistId = p;
    }
    const YT_KEY = STATE.settings.ytApiKey || '';
    if (!YT_KEY || YT_KEY.length < 10) {
        showToast('YouTube API Key required. Set it in Settings.', 'error');
        return;
    }
    importPlaylistBtn.disabled = true;
    importPlaylistBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    try {
        const url =
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${YT_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.items || data.items.length === 0) {
            showToast('No items found in this playlist.', 'error');
            return;
        }
        let added = 0;
        for (const item of data.items) {
            const vid = item.snippet.resourceId.videoId;
            if (!vid) continue;
            if (STATE.playlist.some(s => s.videoId === vid)) continue;
            const title = item.snippet.title;
            const author = item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle || 'Unknown';
            const art = item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url ||
                'https://via.placeholder.com/300';
            STATE.playlist.push({
                videoId: vid,
                songName: title,
                authorName: author,
                albumArt: art
            });
            added++;
        }
        if (added === 0) {
            showToast('All songs already in playlist.', 'info');
        } else {
            savePlaylist();
            renderPlaylist(STATE.playlist);
            showToast(`Imported ${added} songs!`, 'success');
            if (STATE.playlist.length === added && added > 0) {
                const first = STATE.playlist[0];
                loadNewVideo(first.videoId, first.albumArt, first);
            }
        }
    } catch (e) {
        showToast('Import failed: ' + e.message, 'error');
    } finally {
        importPlaylistBtn.disabled = false;
        importPlaylistBtn.innerHTML = '<i class="fas fa-import"></i> Import';
    }
}

importPlaylistBtn?.addEventListener('click', () => importPlaylistFromUrl());

async function autoImportDefaultPlaylist() {
    const defaultUrl = 'https://music.youtube.com/playlist?list=PLw-ydWKI15cpWj-H499Ui_2UdCubVNAcK';
    if (STATE.playlist.length === 0 && !localStorage.getItem('defaultPlaylistImported')) {
        showToast('Importing default playlist...', 'info');
        if (playlistImportInput) playlistImportInput.value = defaultUrl;
        await importPlaylistFromUrl(defaultUrl);
    }
}

searchPlaylistInput?.addEventListener('input', function() {
    const term = this.value.toLowerCase();
    clearPlaylistSearchBtn?.classList.toggle('d-none', term.trim().length === 0);
    const filtered = STATE.playlist.filter(s =>
        s.songName.toLowerCase().includes(term) || s.authorName.toLowerCase().includes(term)
    );
    renderPlaylist(filtered);
});
clearPlaylistSearchBtn?.addEventListener('click', function() {
    searchPlaylistInput.value = '';
    this.classList.add('d-none');
    renderPlaylist(STATE.playlist);
    searchPlaylistInput.focus();
});

window.onYouTubeIframeAPIReady = function() {
    console.log('⬡ YouTube IFrame API ready');
    if (STATE.playlist.length === 0) return;
    let videoId = selectedVideoId;
    if (!videoId) {
        const first = STATE.playlist[0];
        videoId = first.videoId;
        selectedVideoId = videoId;
    }
    const song = STATE.playlist.find(s => s.videoId === videoId) || STATE.playlist[0];
    if (!player) {
        playerContainer.innerHTML = `<div id="player"></div>`;
        player = new YT.Player('player', {
            videoId: videoId,
            playerVars: {
                autoplay: 0,
                controls: 0,
                modestbranding: 1,
                showinfo: 0,
                rel: 0,
                fs: 0,
                iv_load_policy: 3,
                start: 0
            },
            events: {
                onReady: (e) => {
                    e.target.setVolume(currentVolume);
                    updateVolumeUI(currentVolume);
                    if (song) {
                        const art = document.getElementById('albumArt');
                        if (song.albumArt && isValidImageUrl(song.albumArt)) art.src = song
                            .albumArt;
                        const titleEl = document.querySelector("#nowPlaying .song-title");
                        const authorEl = document.querySelector("#nowPlaying .author-name");
                        if (titleEl) titleEl.textContent = removeArtistFromTitle(song.songName, song
                            .authorName);
                        if (authorEl) authorEl.textContent = song.authorName;
                        loadLyricsFor(song.songName, song.authorName, videoId);
                        if (song.albumArt && song.albumArt !== 'https://via.placeholder.com/300') {
                            ThemeEngine.applyVibrantFromUrl(song.albumArt);
                        }
                    }
                    setTimeout(updateProgressBar, 500);
                    applyAlbumArtDisplayMode();
                    if (SB.enabled) SB.start(videoId);
                    if (STATE.bgPlaybackEnabled) ensureBgAudioContext();
                    // Start ad-block enhancements
                    startAdBlockEnhancements();
                },
                onStateChange: handlePlayerStateChange,
                onError: handleVideoError
            }
        });
    } else {
        if (player.loadVideoById) {
            player.loadVideoById(videoId);
            player.setVolume(currentVolume);
        }
        if (SB.enabled) SB.start(videoId);
        if (STATE.bgPlaybackEnabled) ensureBgAudioContext();
        startAdBlockEnhancements();
    }
    renderPlaylist(STATE.playlist);
    document.querySelectorAll('#songList li').forEach(el => {
        if (el.dataset.video === videoId) el.classList.add('selected');
    });
};

// =============================================================
//  BACKGROUND PLAYBACK – Enhanced (Userscript-style)
// =============================================================

function initBackgroundPlayback() {
    const saved = localStorage.getItem('bgPlaybackEnabled');
    if (saved !== null) {
        STATE.bgPlaybackEnabled = saved === 'true';
        if (bgPlaybackToggle) bgPlaybackToggle.checked = STATE.bgPlaybackEnabled;
    }

    if (bgPlaybackToggle) {
        bgPlaybackToggle.addEventListener('change', function() {
            STATE.bgPlaybackEnabled = this.checked;
            localStorage.setItem('bgPlaybackEnabled', String(STATE.bgPlaybackEnabled));
            if (STATE.bgPlaybackEnabled) {
                enableBackgroundPlaybackEnhancement();
                showToast('Background playback enhanced – audio will keep playing when tab is hidden.',
                    'info');
            } else {
                disableBackgroundPlaybackEnhancement();
                showToast('Background playback disabled.', 'info');
            }
        });
    }

    if (STATE.bgPlaybackEnabled) {
        enableBackgroundPlaybackEnhancement();
    }
}

let bgEnhancementActive = false;
let bgEnhancementInterval = null;
let origDocumentHidden = null;
let origVisibilityState = null;
let origAddEventListener = null;

function enableBackgroundPlaybackEnhancement() {
    if (bgEnhancementActive) return;
    bgEnhancementActive = true;
    origDocumentHidden = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
    origVisibilityState = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
    try {
        Object.defineProperty(document, 'hidden', {
            get: () => false,
            configurable: true
        });
        Object.defineProperty(document, 'visibilityState', {
            get: () => 'visible',
            configurable: true
        });
        document.hasFocus = () => true;
    } catch (e) {
        console.warn('Could not override visibility properties', e);
    }
    origAddEventListener = document.addEventListener;
    document.addEventListener = function(type, listener, options) {
        if (type === 'visibilitychange') {
            const wrapped = function(e) {
                e.stopImmediatePropagation();
                e.preventDefault();
            };
            return origAddEventListener.call(this, type, wrapped, options);
        }
        return origAddEventListener.call(this, type, listener, options);
    }.bind(document);
    if (bgEnhancementInterval) clearInterval(bgEnhancementInterval);
    bgEnhancementInterval = setInterval(() => {
        if (!player || typeof player.getPlayerState !== 'function') return;
        const state = player.getPlayerState();
        if (state === 2) {
            if (player.getDuration() > 0 && player.getCurrentTime() < player.getDuration() - 1) {
                console.log('[BG Playback] Resuming video due to background enhancement');
                player.playVideo();
            }
        }
    }, 3000);
    ensureBgAudioContext();
    console.log('[BG Playback] Enhancement enabled');
}

function disableBackgroundPlaybackEnhancement() {
    if (!bgEnhancementActive) return;
    try {
        if (origDocumentHidden) {
            Object.defineProperty(document, 'hidden', origDocumentHidden);
        }
        if (origVisibilityState) {
            Object.defineProperty(document, 'visibilityState', origVisibilityState);
        }
        document.hasFocus = () => true;
        if (origAddEventListener) {
            document.addEventListener = origAddEventListener;
        }
    } catch (e) {
        console.warn('Could not restore visibility properties', e);
    }
    if (bgEnhancementInterval) {
        clearInterval(bgEnhancementInterval);
        bgEnhancementInterval = null;
    }
    bgEnhancementActive = false;
    console.log('[BG Playback] Enhancement disabled');
}

let bgAudioCtx = null;
let bgSilentBuffer = null;
let bgSilentSource = null;
let bgResumeInterval = null;

function ensureBgAudioContext() {
    if (!STATE.bgPlaybackEnabled) return;
    try {
        if (!bgAudioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            bgAudioCtx = new AudioContext();
        }
        if (bgAudioCtx.state === 'suspended') {
            bgAudioCtx.resume();
        }
        if (bgAudioCtx.state === 'running') {
            if (!bgSilentBuffer) {
                const sampleRate = bgAudioCtx.sampleRate;
                const bufferSize = Math.floor(sampleRate * 0.5);
                bgSilentBuffer = bgAudioCtx.createBuffer(1, bufferSize, sampleRate);
                const data = bgSilentBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = 0;
            }
            if (bgSilentSource) {
                try {
                    bgSilentSource.stop();
                } catch {}
                bgSilentSource = null;
            }
            bgSilentSource = bgAudioCtx.createBufferSource();
            bgSilentSource.buffer = bgSilentBuffer;
            bgSilentSource.loop = true;
            bgSilentSource.connect(bgAudioCtx.destination);
            bgSilentSource.start();
            if (bgResumeInterval) clearInterval(bgResumeInterval);
            bgResumeInterval = setInterval(() => {
                if (bgAudioCtx && bgAudioCtx.state === 'suspended') {
                    bgAudioCtx.resume();
                }
            }, 1000);
        }
    } catch (e) {
        console.warn('Background audio context error:', e);
    }
}

function stopBgAudioContext() {
    if (bgResumeInterval) {
        clearInterval(bgResumeInterval);
        bgResumeInterval = null;
    }
    if (bgSilentSource) {
        try {
            bgSilentSource.stop();
        } catch {}
        bgSilentSource = null;
    }
    if (bgAudioCtx) {
        try {
            bgAudioCtx.close();
        } catch {}
        bgAudioCtx = null;
        bgSilentBuffer = null;
    }
}

// =============================================================
//  OFFLINE MUSIC PLAYER (user's new code integrated with visualizer)
// =============================================================

// Initialize the offline audio element and load playlist
offlineAudio = document.createElement('audio');
offlineAudio.id = 'offlineAudio';
offlineAudio.style.display = 'none';
document.body.appendChild(offlineAudio);

// Load offline playlist from localStorage
loadOfflinePlaylist();

// Sync STATE.offlinePlaylist with the loaded data
let offlinePlaylist = STATE.offlinePlaylist;
let offlineCurrentSongIndex = STATE.offlineCurrentSongIndex;
let offlineIsPlaying = STATE.offlineIsPlaying;
let offlineIsRepeating = STATE.offlineIsRepeating;
let offlineIsShuffling = STATE.offlineIsShuffling;
let offlinePlayHistory = STATE.offlinePlayHistory;
let offlineShuffleQueue = STATE.offlineShuffleQueue;
let offlineShufflePos = STATE.offlineShufflePos;

if (offlineAudio) {
    offlineAudio.volume = 0.5;
    offlineAudio.addEventListener('loadedmetadata', offlineUpdateSongInfo);
    offlineAudio.addEventListener('timeupdate', offlineUpdateProgress);
    offlineAudio.addEventListener('ended', offlineHandleSongEnd);
    offlineVolumeSlider.addEventListener('input', (e) => {
        offlineAudio.volume = e.target.value / 100;
    });
    offlineFileInput.addEventListener('change', offlineHandleFileSelect);
    offlineUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        offlineUploadArea.classList.add('dragover');
    });
    offlineUploadArea.addEventListener('dragleave', () => {
        offlineUploadArea.classList.remove('dragover');
    });
    offlineUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        offlineUploadArea.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        offlineAddFilesToPlaylist(files);
    });
}

function offlineHandleFileSelect(e) {
    const files = Array.from(e.target.files);
    offlineAddFilesToPlaylist(files);
}

function offlineAddFilesToPlaylist(files) {
    const audioFiles = files.filter(file =>
        file.type.startsWith('audio/') ||
        file.name.match(/\.(mp3|wav|ogg|m4a|flac)$/i)
    );
    audioFiles.forEach(file => {
        const url = URL.createObjectURL(file);
        const song = {
            name: file.name.replace(/\.(mp3|wav|ogg|m4a|flac)$/i, ''),
            url: url,
            file: file,
            duration: '0:00'
        };
        STATE.offlinePlaylist.push(song);
        const tempAudio = new Audio(url);
        tempAudio.addEventListener('loadedmetadata', () => {
            song.duration = offlineFormatTime(tempAudio.duration);
            offlineRenderPlaylist();
            saveOfflinePlaylist();
        });
    });
    offlineRenderPlaylist();
    saveOfflinePlaylist();
    if (STATE.offlineCurrentSongIndex === -1 && STATE.offlinePlaylist.length > 0) {
        offlineLoadSong(0);
    }
    // Rebuild shuffle queue if shuffle is on
    if (STATE.offlineIsShuffling) rebuildShuffleQueue();
}

function offlineRenderPlaylist() {
    if (STATE.offlinePlaylist.length === 0) {
        offlinePlaylistItems.innerHTML =
            '<div class="offline-empty-playlist">Your playlist is empty. Add some music to get started!</div>';
        return;
    }
    const playlistHTML = STATE.offlinePlaylist.map((song, index) => `
                <div class="offline-playlist-item ${index === STATE.offlineCurrentSongIndex ? 'active' : ''}" data-index="${index}" onclick="offlineLoadSong(${index})">
                    <div class="offline-song-number">${index + 1}</div>
                    <div class="offline-song-details">
                        <div class="offline-song-name">${song.name}</div>
                        <div class="offline-song-duration">${song.duration}</div>
                    </div>
                    <button class="offline-remove-btn" data-index="${index}" onclick="offlineRemoveSong(event, ${index})">×</button>
                </div>
            `).join('');
    offlinePlaylistItems.innerHTML = playlistHTML;
}

function offlineLoadSong(index) {
    if (index < 0 || index >= STATE.offlinePlaylist.length) return;
    STATE.offlineCurrentSongIndex = index;
    const song = STATE.offlinePlaylist[index];
    offlineAudio.src = song.url;
    offlineSongTitle.textContent = song.name;
    offlineUpdateSongInfo();
    offlineUpdateTabTitle();
    offlineRenderPlaylist();
    saveOfflinePlaylist();

    // Update shuffle queue position if shuffling
    if (STATE.offlineIsShuffling) {
        // Ensure current index is in queue; rebuild if not
        if (!STATE.offlineShuffleQueue.includes(index)) {
            rebuildShuffleQueue();
        } else {
            STATE.offlineShufflePos = STATE.offlineShuffleQueue.indexOf(index);
        }
    }

    // Initialize audio context for visualizer
    initOfflineAudioContext();

    if (STATE.offlineIsPlaying) {
        offlineAudio.play();
    }
}

function offlineUpdateTabTitle() {
    if (STATE.offlineCurrentSongIndex !== -1 && STATE.offlinePlaylist[STATE.offlineCurrentSongIndex]) {
        const song = STATE.offlinePlaylist[STATE.offlineCurrentSongIndex];
        const playingStatus = STATE.offlineIsPlaying ? '▷' : '𓊕';
        document.title = `${playingStatus} ${song.name} - Music Player`;
    } else {
        document.title = '🎵 Music Player';
    }
}

function offlineTogglePlay() {
    if (STATE.offlinePlaylist.length === 0) return;
    if (STATE.offlineCurrentSongIndex === -1) {
        offlineLoadSong(0);
    }
    if (STATE.offlineIsPlaying) {
        offlineAudio.pause();
        offlinePlayPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        STATE.offlineIsPlaying = false;
        if (offlineVizActive) stopOfflineVizLoop();
    } else {
        initOfflineAudioContext();
        offlineAudio.play();
        offlinePlayPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        STATE.offlineIsPlaying = true;
        if (offlineVizActive) startOfflineVizLoop();
    }
    saveOfflinePlaylist();
    offlineUpdateTabTitle();
}

function offlineToggleRepeat() {
    STATE.offlineIsRepeating = !STATE.offlineIsRepeating;
    offlineRepeatBtn.classList.toggle('active', STATE.offlineIsRepeating);
    if (offlineAudio) {
        offlineAudio.loop = STATE.offlineIsRepeating;
    }
    saveOfflinePlaylist();
    offlineUpdateSongInfo();
}

function offlineToggleShuffle() {
    STATE.offlineIsShuffling = !STATE.offlineIsShuffling;
    offlineShuffleBtn.classList.toggle('active', STATE.offlineIsShuffling);
    if (STATE.offlineIsShuffling) {
        rebuildShuffleQueue();
    } else {
        STATE.offlineShuffleQueue = [];
        STATE.offlineShufflePos = -1;
    }
    saveOfflinePlaylist();
    offlineUpdateSongInfo();
}

function rebuildShuffleQueue() {
    const length = STATE.offlinePlaylist.length;
    if (length === 0) {
        STATE.offlineShuffleQueue = [];
        STATE.offlineShufflePos = -1;
        return;
    }
    let indices = Array.from({ length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    STATE.offlineShuffleQueue = indices;
    const cur = STATE.offlineCurrentSongIndex;
    if (cur >= 0 && cur < length) {
        const pos = STATE.offlineShuffleQueue.indexOf(cur);
        if (pos !== -1) STATE.offlineShufflePos = pos;
        else {
            STATE.offlineShufflePos = 0;
        }
    } else {
        STATE.offlineShufflePos = 0;
    }
    saveOfflinePlaylist();
}

function getShuffleNextIndex() {
    const length = STATE.offlinePlaylist.length;
    if (length === 0) return -1;
    if (STATE.offlineShuffleQueue.length === 0) rebuildShuffleQueue();
    if (STATE.offlineShufflePos === -1) STATE.offlineShufflePos = 0;
    let nextPos = STATE.offlineShufflePos + 1;
    if (nextPos >= STATE.offlineShuffleQueue.length) {
        if (STATE.offlineIsRepeating) {
            rebuildShuffleQueue();
            nextPos = 0;
        } else {
            return -1;
        }
    }
    const nextIdx = STATE.offlineShuffleQueue[nextPos];
    STATE.offlineShufflePos = nextPos;
    return nextIdx;
}

function getShufflePrevIndex() {
    const length = STATE.offlinePlaylist.length;
    if (length === 0) return -1;
    if (STATE.offlineShuffleQueue.length === 0) rebuildShuffleQueue();
    if (STATE.offlineShufflePos === -1) STATE.offlineShufflePos = 0;
    let prevPos = STATE.offlineShufflePos - 1;
    if (prevPos < 0) {
        if (STATE.offlineIsRepeating) {
            prevPos = STATE.offlineShuffleQueue.length - 1;
        } else {
            prevPos = 0;
        }
    }
    const prevIdx = STATE.offlineShuffleQueue[prevPos];
    STATE.offlineShufflePos = prevPos;
    return prevIdx;
}

function offlineGetNextShuffleIndex() {
    return getShuffleNextIndex();
}

function offlineHandleSongEnd() {
    if (STATE.offlineIsRepeating) return;
    offlineNextSong();
}

function offlinePrevSong() {
    if (STATE.offlinePlaylist.length === 0) return;
    let idx = STATE.offlineCurrentSongIndex;
    if (STATE.offlineIsShuffling) {
        const prevIdx = getShufflePrevIndex();
        if (prevIdx >= 0) idx = prevIdx;
        else {
            if (STATE.offlineShuffleQueue.length > 0) {
                idx = STATE.offlineShuffleQueue[0];
                STATE.offlineShufflePos = 0;
            } else {
                idx = 0;
            }
        }
    } else {
        idx = idx > 0 ? idx - 1 : STATE.offlinePlaylist.length - 1;
    }
    offlineLoadSong(idx);
    if (STATE.offlineIsPlaying) playOffline();
}

function offlineNextSong() {
    if (STATE.offlinePlaylist.length === 0) return;
    let idx = STATE.offlineCurrentSongIndex;
    if (STATE.offlineIsShuffling) {
        const nextIdx = getShuffleNextIndex();
        if (nextIdx >= 0) idx = nextIdx;
        else {
            showToast('End of playlist. Repeat off.', 'info');
            pauseOffline();
            return;
        }
    } else {
        idx = (idx + 1) % STATE.offlinePlaylist.length;
    }
    offlineLoadSong(idx);
    if (STATE.offlineIsPlaying) playOffline();
}

function offlineRewind15() {
    offlineAudio.currentTime = Math.max(0, offlineAudio.currentTime - 15);
}

function offlineForward15() {
    offlineAudio.currentTime = Math.min(offlineAudio.duration, offlineAudio.currentTime + 15);
}

function offlineSeekTo(e) {
    if (!offlineProgressBar) return;
    const rect = offlineProgressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    offlineAudio.currentTime = percent * offlineAudio.duration;
}

function offlineUpdateProgress() {
    if (offlineAudio.duration) {
        const percent = (offlineAudio.currentTime / offlineAudio.duration) * 100;
        offlineProgressFill.style.width = percent + '%';
        offlineCurrentTime.textContent = offlineFormatTime(offlineAudio.currentTime);
    }
}

function offlineUpdateSongInfo() {
    if (STATE.offlineCurrentSongIndex !== -1) {
        const modes = [];
        if (STATE.offlineIsRepeating) modes.push('Repeating');
        if (STATE.offlineIsShuffling) modes.push('Shuffling');
        const modeText = modes.length > 0 ? ' • ' + modes.join(' • ') : '';
        offlineSongInfo.textContent = `Track ${STATE.offlineCurrentSongIndex + 1} of ${STATE.offlinePlaylist.length}${modeText}`;
    }
    if (offlineAudio.duration) {
        offlineTotalTime.textContent = offlineFormatTime(offlineAudio.duration);
    }
}

function offlineRemoveSong(event, index) {
    event.stopPropagation();
    URL.revokeObjectURL(STATE.offlinePlaylist[index].url);
    STATE.offlinePlaylist.splice(index, 1);
    STATE.offlinePlayHistory = STATE.offlinePlayHistory.filter(i => i !== index).map(i => i > index ? i - 1 : i);
    // Update shuffle queue
    if (STATE.offlineIsShuffling) {
        // Rebuild queue since indices shifted
        rebuildShuffleQueue();
    }
    if (index === STATE.offlineCurrentSongIndex) {
        if (STATE.offlinePlaylist.length === 0) {
            STATE.offlineCurrentSongIndex = -1;
            offlineAudio.src = '';
            offlineSongTitle.textContent = 'No song selected';
            offlineSongInfo.textContent = 'Select a song to start playing';
            offlinePlayPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            STATE.offlineIsPlaying = false;
            STATE.offlinePlayHistory = [];
            STATE.offlineShuffleQueue = [];
            STATE.offlineShufflePos = -1;
            offlineUpdateTabTitle();
        } else {
            const newIndex = index >= STATE.offlinePlaylist.length ? 0 : index;
            STATE.offlineCurrentSongIndex = newIndex - 1;
            offlineLoadSong(newIndex);
        }
    } else if (index < STATE.offlineCurrentSongIndex) {
        STATE.offlineCurrentSongIndex--;
    }
    offlineRenderPlaylist();
    saveOfflinePlaylist();
}

function offlineFormatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function playOffline() {
    if (!offlineAudio.src) return;
    offlineAudio.play().then(() => {
        STATE.offlineIsPlaying = true;
        offlinePlayPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        if (offlineVizActive) startOfflineVizLoop();
        saveOfflinePlaylist();
    }).catch(() => {});
}

function pauseOffline() {
    offlineAudio.pause();
    STATE.offlineIsPlaying = false;
    offlinePlayPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    if (offlineVizActive) stopOfflineVizLoop();
    saveOfflinePlaylist();
}

function initOfflineAudioContext() {
    if (!offlineAudioContext) {
        offlineAudioContext = new(window.AudioContext || window.webkitAudioContext)();
        offlineAnalyser = offlineAudioContext.createAnalyser();
        offlineAnalyser.fftSize = 256;
        offlineAnalyser.smoothingTimeConstant = 0.7;
        const source = offlineAudioContext.createMediaElementSource(offlineAudio);
        source.connect(offlineAnalyser);
        offlineAnalyser.connect(offlineAudioContext.destination);
        applyOfflineVizDefaults();
    }
    if (offlineAudioContext.state === 'suspended') {
        offlineAudioContext.resume();
    }
}

// --- Visualizer functions (from original) ---
function applyOfflineVizDefaults() {
    const mode = offlineModeSelect ? offlineModeSelect.value : 'bars';
    offlineVizType = mode;
    let fft = 256,
        smooth = 0.7,
        sens = 1.0,
        particles = true;
    switch (mode) {
        case 'bars':
            fft = 256;
            smooth = 0.65;
            sens = 1.2;
            particles = true;
            break;
        case 'dualBars':
            fft = 512;
            smooth = 0.65;
            sens = 1.1;
            particles = true;
            break;
        case 'radialBars':
            fft = 512;
            smooth = 0.7;
            sens = 1.0;
            particles = true;
            break;
        case 'circle':
            fft = 512;
            smooth = 0.7;
            sens = 1.0;
            particles = true;
            break;
        case 'spiral':
            fft = 512;
            smooth = 0.75;
            sens = 1.2;
            particles = true;
            break;
        case 'wave':
            fft = 2048;
            smooth = 0.85;
            sens = 1.0;
            particles = false;
            break;
        case 'lissajous':
            fft = 2048;
            smooth = 0.85;
            sens = 1.0;
            particles = false;
            break;
        case 'spectrogram':
            fft = 2048;
            smooth = 0.9;
            sens = 1.2;
            particles = false;
            offlineSpectrogramRowHeight = 2;
            break;
        case 'tunnel':
            fft = 256;
            smooth = 0.7;
            sens = 1.3;
            particles = true;
            break;
        case 'particles':
            fft = 256;
            smooth = 0.65;
            sens = 1.1;
            particles = true;
            break;
        case 'webgpu':
        case 'webgpuFlow':
        case 'webgpuGrid':
        case 'webgpuCenter':
            fft = 512;
            smooth = 0.8;
            sens = 1.1;
            particles = false;
            break;
        default:
            fft = 256;
            smooth = 0.7;
            sens = 1.0;
            particles = true;
    }
    if (offlineAnalyser) {
        try { offlineAnalyser.fftSize = fft; } catch (_) {}
        offlineAnalyser.smoothingTimeConstant = smooth;
    }
    offlineSensitivity = sens;
    offlineShowParticles = particles;
    if (offlineParticlesCheck) offlineParticlesCheck.checked = particles;
    if (offlineSensitivityInput) offlineSensitivityInput.value = String(sens);
    updateOfflineStatusDisplay();
}

function setupOfflineVizControls() {
    if (!offlineModeSelect) return;
    offlineModeSelect.addEventListener('change', () => {
        offlineVizType = offlineModeSelect.value;
        applyOfflineVizDefaults();
    });
    offlineParticlesCheck.addEventListener('change', () => {
        offlineShowParticles = offlineParticlesCheck.checked;
        if (!offlineShowParticles) offlineParticles = [];
    });
    offlineSensitivityInput.addEventListener('input', () => {
        let v = parseFloat(offlineSensitivityInput.value);
        if (isNaN(v)) v = 1.0;
        v = Math.max(0.2, Math.min(3.0, v));
        offlineSensitivity = v;
    });
    offlineRandomBtn.addEventListener('click', () => {
        setOfflineRandomMode();
    });
    offlineAutoCycleCheck.addEventListener('change', () => {
        offlineAutoCycleEnabled = offlineAutoCycleCheck.checked;
        if (offlineAutoCycleEnabled) startOfflineAutoCycle();
        else stopOfflineAutoCycle();
    });
    offlineCycleInterval.addEventListener('input', () => {
        let v = parseInt(offlineCycleInterval.value, 10);
        if (isNaN(v)) v = 8;
        v = Math.max(2, Math.min(60, v));
        offlineAutoCycleSeconds = v;
        if (offlineAutoCycleEnabled) restartOfflineAutoCycle();
    });
}

function setOfflineRandomMode() {
    const modes = getAllOfflineModes();
    if (modes.length === 0) return;
    let next = offlineVizType;
    let attempts = 0;
    while (next === offlineVizType && attempts < 50) {
        next = modes[Math.floor(Math.random() * modes.length)];
        attempts++;
    }
    offlineVizType = next;
    if (offlineModeSelect) offlineModeSelect.value = next;
    applyOfflineVizDefaults();
    updateOfflineStatusDisplay();
}

function getAllOfflineModes() {
    return offlineModeSelect ? Array.from(offlineModeSelect.options).map(o => o.value) : ['bars'];
}

function startOfflineAutoCycle() {
    stopOfflineAutoCycle();
    const tick = () => {
        const modes = getAllOfflineModes();
        if (modes.length === 0) return;
        const idx = modes.indexOf(offlineVizType);
        const next = modes[(idx + 1) % modes.length];
        offlineVizType = next;
        if (offlineModeSelect) offlineModeSelect.value = next;
        applyOfflineVizDefaults();
        updateOfflineStatusDisplay();
    };
    tick();
    offlineAutoCycleTimer = setInterval(tick, offlineAutoCycleSeconds * 1000);
}

function stopOfflineAutoCycle() {
    if (offlineAutoCycleTimer) { clearInterval(offlineAutoCycleTimer);
        offlineAutoCycleTimer = null; }
}

function restartOfflineAutoCycle() {
    if (offlineAutoCycleEnabled) { stopOfflineAutoCycle();
        startOfflineAutoCycle(); }
}

function updateOfflineStatusDisplay() {
    if (offlineStatusDisplay) {
        const label = offlineModeSelect ? offlineModeSelect.options[offlineModeSelect.selectedIndex]?.text : 'Bars';
        offlineStatusDisplay.textContent = label || 'Bars';
    }
}

function toggleOfflineVisualizer() {
    offlineVizActive = !offlineVizActive;
    if (offlineVizActive) {
        offlineVizCanvas.classList.add('active');
        offlineVizControls.classList.add('visible');
        if (STATE.offlineIsPlaying) startOfflineVizLoop();
        else drawOfflineSynthetic();
        showToast('Visualizer ON', 'info');
    } else {
        offlineVizCanvas.classList.remove('active');
        offlineVizControls.classList.remove('visible');
        stopOfflineVizLoop();
        const ctx = offlineVizCanvas.getContext('2d');
        ctx.clearRect(0, 0, offlineVizCanvas.width, offlineVizCanvas.height);
        showToast('Visualizer OFF', 'info');
    }
}

function startOfflineVizLoop() {
    stopOfflineVizLoop();
    offlineVizAnimId = requestAnimationFrame(() => offlineVizLoop());
}

function stopOfflineVizLoop() {
    if (offlineVizAnimId) {
        cancelAnimationFrame(offlineVizAnimId);
        offlineVizAnimId = null;
    }
}

function offlineVizLoop() {
    if (!offlineVizActive || !offlineVizCanvas.classList.contains('active')) {
        stopOfflineVizLoop();
        return;
    }
    offlineVizAnimId = requestAnimationFrame(() => offlineVizLoop());
    drawOfflineFrame();
}

function drawOfflineFrame() {
    const ctx = offlineVizCanvas.getContext('2d');
    const w = offlineVizCanvas.width,
        h = offlineVizCanvas.height;
    ctx.clearRect(0, 0, w, h);

    let dataArray;
    if (STATE.offlineIsPlaying && offlineAnalyser) {
        dataArray = new Uint8Array(offlineAnalyser.frequencyBinCount);
        offlineAnalyser.getByteFrequencyData(dataArray);
    } else {
        dataArray = new Uint8Array(256);
        offlineSyntheticPhase += 0.02;
        for (let i = 0; i < dataArray.length; i++) {
            const t = i / dataArray.length;
            dataArray[i] = 80 + 120 * Math.sin(t * Math.PI * 6 + offlineSyntheticPhase) *
                (0.6 + 0.4 * Math.sin(offlineSyntheticPhase * 0.7 + t * 2));
        }
    }

    switch (offlineVizType) {
        case 'bars':
            drawOfflineBars(ctx, w, h, dataArray);
            break;
        case 'wave':
            drawOfflineWaveform(ctx, w, h);
            break;
        case 'circle':
            drawOfflineCircle(ctx, w, h, dataArray);
            break;
        case 'spiral':
            drawOfflineSpiral(ctx, w, h, dataArray);
            break;
        case 'particles':
            drawOfflineParticles(ctx, w, h, dataArray);
            break;
        case 'dualBars':
            drawOfflineDualBars(ctx, w, h, dataArray);
            break;
        case 'radialBars':
            drawOfflineRadialBars(ctx, w, h, dataArray);
            break;
        case 'spectrogram':
            drawOfflineSpectrogram(ctx, w, h);
            break;
        case 'lissajous':
            drawOfflineLissajous(ctx, w, h);
            break;
        case 'tunnel':
            drawOfflineTunnel(ctx, w, h, dataArray);
            break;
        case 'webgpu':
        case 'webgpuFlow':
        case 'webgpuGrid':
        case 'webgpuCenter':
            drawOfflineWebGPU(ctx, w, h, dataArray, offlineVizType);
            break;
        default:
            drawOfflineBars(ctx, w, h, dataArray);
    }

    if (offlineShowParticles && offlineVizType !== 'particles') {
        updateAndDrawOfflineParticles(ctx, w, h, dataArray);
    }
}

// ---- Offline drawing primitives (simplified) ----
function drawOfflineBars(ctx, w, h, data) {
    const count = data.length;
    const barWidth = (w / count) * 2.2;
    let x = 0;
    for (let i = 0; i < count; i++) {
        const barHeight = (data[i] / 255) * h * offlineSensitivity;
        const hue = (i / count) * 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 55%)`;
        ctx.shadowColor = `hsl(${hue}, 100%, 55%)`;
        ctx.shadowBlur = 12;
        ctx.fillRect(x, h - barHeight, barWidth, barHeight);
        ctx.shadowBlur = 0;
        x += barWidth + 1;
    }
}

function drawOfflineDualBars(ctx, w, h, data) {
    const count = data.length;
    const barWidth = (w / count) * 2.0;
    let x = 0;
    const mid = h / 2;
    for (let i = 0; i < count; i++) {
        const value = data[i] / 255;
        const barHeight = value * h * 0.42 * offlineSensitivity;
        const hue = (i / count) * 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 55%)`;
        ctx.shadowColor = `hsl(${hue}, 100%, 55%)`;
        ctx.shadowBlur = 14;
        ctx.fillRect(x, mid - barHeight, barWidth, barHeight);
        ctx.fillRect(x, mid, barWidth, barHeight);
        ctx.shadowBlur = 0;
        x += barWidth + 1;
    }
}

function drawOfflineRadialBars(ctx, w, h, data) {
    const cx = w / 2,
        cy = h / 2;
    const baseR = Math.min(cx, cy) * 0.25;
    const maxExtra = Math.min(cx, cy) * 0.55;
    const count = data.length;
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const amp = (data[i] / 255) * maxExtra * offlineSensitivity;
        const r1 = baseR,
            r2 = baseR + amp;
        const x1 = cx + Math.cos(angle) * r1,
            y1 = cy + Math.sin(angle) * r1;
        const x2 = cx + Math.cos(angle) * r2,
            y2 = cy + Math.sin(angle) * r2;
        const hue = (i / count) * 360;
        ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

function drawOfflineCircle(ctx, w, h, data) {
    const cx = w / 2,
        cy = h / 2;
    const radius = Math.min(cx, cy) * 0.75;
    const count = data.length;
    for (let i = 0; i < count; i++) {
        const amp = (data[i] / 255) * radius * 0.6 * offlineSensitivity;
        const angle = (i / count) * Math.PI * 2;
        const x1 = cx + Math.cos(angle) * radius,
            y1 = cy + Math.sin(angle) * radius;
        const x2 = cx + Math.cos(angle) * (radius + amp),
            y2 = cy + Math.sin(angle) * (radius + amp);
        const hue = (i / count) * 360;
        ctx.strokeStyle = `hsl(${hue}, 100%, 55%)`;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = `hsl(${hue}, 100%, 55%)`;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

function drawOfflineSpiral(ctx, w, h, data) {
    const cx = w / 2,
        cy = h / 2;
    const maxRadius = Math.min(cx, cy) * 0.8;
    const count = data.length;
    ctx.shadowColor = '#ff44ff';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
        const amp = (data[i] / 255) * 45 * offlineSensitivity;
        const angle = (i / count) * Math.PI * 8;
        const radius = (i / count) * maxRadius + amp;
        const x = cx + Math.cos(angle) * radius,
            y = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#ff44ff';
    ctx.lineWidth = 2.8;
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function drawOfflineWaveform(ctx, w, h) {
    if (!offlineAnalyser) return;
    const bufferLength = offlineAnalyser.fftSize;
    const data = new Uint8Array(bufferLength);
    offlineAnalyser.getByteTimeDomainData(data);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#00ffaa';
    ctx.shadowColor = '#00ffaa';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    const sliceWidth = w / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
        const v = data[i] / 128.0;
        const y = v * h / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function drawOfflineSpectrogram(ctx, w, h) {
    const rowH = Math.max(1, offlineSpectrogramRowHeight | 0);
    const imageData = ctx.getImageData(0, 0, w, h);
    ctx.putImageData(imageData, 0, -rowH);
    const bufferLength = offlineAnalyser ? offlineAnalyser.frequencyBinCount : 256;
    const freq = offlineAnalyser ? new Uint8Array(offlineAnalyser.frequencyBinCount) : new Uint8Array(256);
    if (offlineAnalyser) offlineAnalyser.getByteFrequencyData(freq);
    const yStart = h - rowH;
    for (let x = 0; x < w; x++) {
        const idx = Math.floor((x / w) * bufferLength);
        const v = (freq[idx] / 255) * offlineSensitivity;
        const brightness = 25 + Math.min(1, Math.pow(v, 0.8)) * 60;
        const hue = (idx / bufferLength) * 360;
        ctx.fillStyle = `hsl(${hue}, 100%, ${brightness}%)`;
        ctx.fillRect(x, yStart, 1, rowH);
    }
    ctx.globalAlpha = 0.03;
    ctx.fillStyle = '#000408';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
}

function drawOfflineLissajous(ctx, w, h) {
    if (!offlineAnalyser) return;
    const bufferLength = offlineAnalyser.fftSize;
    const time = new Uint8Array(bufferLength);
    offlineAnalyser.getByteTimeDomainData(time);
    const delay = Math.floor(bufferLength * 0.25);
    ctx.shadowColor = 'cyan';
    ctx.shadowBlur = 16;
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.85)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i < bufferLength - delay; i++) {
        const tx = (time[i] - 128) / 128;
        const ty = (time[i + delay] - 128) / 128;
        const x = w * (0.5 + tx * 0.42);
        const y = h * (0.5 + ty * 0.42);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function drawOfflineTunnel(ctx, w, h, data) {
    const cx = w / 2,
        cy = h / 2;
    const layers = 24;
    const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
    const now = performance.now();
    for (let i = 0; i < layers; i++) {
        const t = i / layers;
        const size = (1 - t) * Math.min(cx, cy) * 0.9;
        const wobble = Math.sin((now / 400 + i * 0.5) + avg * 12) * 12 * offlineSensitivity;
        const hue = (t * 360 + now / 60) % 360;
        ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${0.55 - t * 0.45})`;
        ctx.lineWidth = 1.8 + (1 - t) * 2;
        ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2; a += Math.PI / 28) {
            const r = size + Math.sin(a * 5 + i * 0.7) * (4 + avg * 28) + wobble;
            const x = cx + Math.cos(a) * r,
                y = cy + Math.sin(a) * r;
            if (a === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

function drawOfflineWebGPU(ctx, w, h, data, mode) {
    const cx = w / 2,
        cy = h / 2;
    const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
    const now = performance.now();
    if (mode === 'webgpu') {
        const rings = 8;
        for (let r = 0; r < rings; r++) {
            const t = r / rings;
            const radius = (0.3 + t * 0.55) * Math.min(cx, cy);
            const phase = now / 800 + r * 1.2;
            const hue = (t * 360 + now / 100) % 360;
            const thick = 2 + avg * 12;
            ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${0.3 + t * 0.5})`;
            ctx.lineWidth = thick;
            ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
            ctx.shadowBlur = 25;
            ctx.beginPath();
            const segments = 60 + Math.floor(avg * 30);
            for (let i = 0; i <= segments; i++) {
                const a = (i / segments) * Math.PI * 2 + phase;
                const rad = radius + Math.sin(a * 4 + now / 500) * (4 + avg * 18);
                const x = cx + Math.cos(a) * rad;
                const y = cy + Math.sin(a) * rad;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    } else if (mode === 'webgpuFlow') {
        const cols = 30,
            rows = 20;
        const cellW = w / cols,
            cellH = h / rows;
        const time = now / 600;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = c * cellW + cellW / 2,
                    y = r * cellH + cellH / 2;
                const idx = Math.floor((c / cols) * data.length);
                const amp = (data[idx] / 255) * offlineSensitivity;
                const angle = Math.sin(x * 0.02 + time) * 2 + Math.cos(y * 0.02 + time * 0.7) * 2 + amp * 3;
                const len = 6 + amp * 18;
                const hue = (Math.atan2(y - cy, x - cx) / Math.PI * 180 + 180 + time * 20) % 360;
                ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${0.3 + amp * 0.5})`;
                ctx.lineWidth = 1.5 + amp * 2;
                ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        }
    } else if (mode === 'webgpuGrid') {
        const cols = 32,
            rows = 20;
        const cellW = w / cols,
            cellH = h / rows;
        const time = now / 500;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx = Math.floor((c / cols) * data.length);
                const amp = (data[idx] / 255) * offlineSensitivity;
                const pulse = Math.sin(time + r * 0.5 + c * 0.3 + amp * 4) * 0.5 + 0.5;
                const size = 2 + pulse * 8 * (0.4 + amp * 0.6);
                const x = c * cellW + cellW / 2,
                    y = r * cellH + cellH / 2;
                const hue = (c / cols * 360 + time * 30) % 360;
                ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${0.3 + pulse * 0.5})`;
                ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
                ctx.shadowBlur = 12;
                ctx.fillRect(x - size / 2, y - size / 2, size, size);
                ctx.shadowBlur = 0;
            }
        }
    } else if (mode === 'webgpuCenter') {
        const count = 80;
        const time = now / 400;
        for (let i = 0; i < count; i++) {
            const t = i / count;
            const angle = t * Math.PI * 6 + time * 0.5;
            const idx = Math.floor(t * data.length);
            const amp = (data[idx] / 255) * offlineSensitivity;
            const radius = (0.1 + t * 0.7) * Math.min(cx, cy) * (0.8 + amp * 0.3);
            const x = cx + Math.cos(angle + time) * radius;
            const y = cy + Math.sin(angle + time * 0.7) * radius;
            const hue = (t * 360 + time * 40) % 360;
            const size = 2 + amp * 8;
            ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${0.2 + t * 0.5})`;
            ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        const glow = avg * 0.6;
        ctx.fillStyle = `rgba(100, 180, 255, ${glow * 0.15})`;
        ctx.shadowColor = 'rgba(100,180,255,0.3)';
        ctx.shadowBlur = 60;
        ctx.beginPath();
        ctx.arc(cx, cy, 20 + avg * 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

function drawOfflineParticles(ctx, w, h, data) {
    const cx = w / 2,
        cy = h / 2;
    for (let i = 0; i < data.length; i += 6) {
        const amp = (data[i] / 255) * offlineSensitivity;
        if (amp > 0.25) {
            const angle = Math.random() * Math.PI * 2;
            const speed = amp * 4.5 + 0.5;
            offlineParticles.push({
                x: cx + (Math.random() - 0.5) * 20,
                y: cy + (Math.random() - 0.5) * 20,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 80 + Math.random() * 60,
                maxLife: 80 + Math.random() * 60,
                hue: (i / data.length) * 360 + Math.random() * 30
            });
        }
    }
    updateAndDrawOfflineParticles(ctx, w, h, data);
}

function updateAndDrawOfflineParticles(ctx, w, h, data) {
    const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
    for (let i = offlineParticles.length - 1; i >= 0; i--) {
        const p = offlineParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.vx += (Math.random() - 0.5) * avg * 0.8 * offlineSensitivity;
        p.vy += (Math.random() - 0.5) * avg * 0.8 * offlineSensitivity;
        p.vx *= 0.995;
        p.vy *= 0.995;
        if (p.life <= 0 || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) {
            offlineParticles.splice(i, 1);
        }
    }
    while (offlineParticles.length > 350) offlineParticles.shift();
    for (const p of offlineParticles) {
        const alpha = p.life / p.maxLife;
        const size = alpha * 3.5 + 0.5;
        ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${alpha * 0.85})`;
        ctx.shadowColor = `hsl(${p.hue}, 100%, 60%)`;
        ctx.shadowBlur = size * 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

function drawOfflineSynthetic() {
    if (offlineVizActive) {
        drawOfflineFrame();
    }
}

// Set up visualizer controls
offlineVizToggleBtn.addEventListener('click', toggleOfflineVisualizer);
setupOfflineVizControls();

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true')
        return;
    const offlineSection = document.getElementById('offline-section');
    if (!offlineSection || !offlineSection.classList.contains('active')) return;
    switch (e.code) {
        case 'Space':
            e.preventDefault();
            e.stopPropagation();
            offlineTogglePlay();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            offlineRewind15();
            break;
        case 'ArrowRight':
            e.preventDefault();
            offlineForward15();
            break;
        case 'ArrowUp':
            e.preventDefault();
            offlinePrevSong();
            break;
        case 'ArrowDown':
            e.preventDefault();
            offlineNextSong();
            break;
        case 'KeyR':
            e.preventDefault();
            offlineToggleRepeat();
            break;
        case 'KeyS':
            e.preventDefault();
            offlineToggleShuffle();
            break;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true')
        return;
    const offlineSection = document.getElementById('offline-section');
    if (!offlineSection || !offlineSection.classList.contains('active')) return;
    if (e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
    }
});

// Expose global functions
window.offlinePrevSong = offlinePrevSong;
window.offlineRewind15 = offlineRewind15;
window.offlineTogglePlay = offlineTogglePlay;
window.offlineForward15 = offlineForward15;
window.offlineNextSong = offlineNextSong;
window.offlineToggleRepeat = offlineToggleRepeat;
window.offlineToggleShuffle = offlineToggleShuffle;
window.openOfflineClearConfirm = openOfflineClearConfirm;

function openOfflineClearConfirm() {
    if (STATE.offlinePlaylist.length === 0) return;
    if (confirm('Clear all offline songs? This cannot be undone.')) {
        offlineClearAllSongs();
    }
}

function offlineClearAllSongs() {
    if (STATE.offlinePlaylist.length === 0) {
        offlineRenderPlaylist();
        return;
    }
    STATE.offlinePlaylist.forEach(song => {
        if (song.url) {
            URL.revokeObjectURL(song.url);
        }
    });
    STATE.offlinePlaylist = [];
    STATE.offlineCurrentSongIndex = -1;
    STATE.offlineIsPlaying = false;
    STATE.offlinePlayHistory = [];
    STATE.offlineShuffleQueue = [];
    STATE.offlineShufflePos = -1;
    offlineAudio.pause();
    offlineAudio.src = '';
    offlinePlayPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    offlineSongTitle.textContent = 'No song selected';
    offlineSongInfo.textContent = 'Select a song to start playing';
    offlineProgressFill.style.width = '0%';
    offlineCurrentTime.textContent = '0:00';
    offlineTotalTime.textContent = '0:00';
    offlineRenderPlaylist();
    saveOfflinePlaylist();
    offlineUpdateTabTitle();
}

// =============================================================
//  IMAGE & VIDEO GENERATORS
// =============================================================

function initImageGenerator() {
    const generateBtn = document.getElementById('generateImageBtn');
    const promptInput = document.getElementById('imgPromptInput');
    const previewContainer = document.getElementById('imageGenPreviewContainer');
    const genActions = document.getElementById('genImageActions');
    const clearBtn = document.getElementById('clearGenImageBtn');
    const addToChatBtn = document.getElementById('addToChatBtn');
    const downloadBtn = document.getElementById('downloadGenImageBtn');
    let currentImageUrl = null;
    const showPreview = (url) => {
        if (previewContainer) previewContainer.innerHTML =
            `<img src="${url}" class="gen-preview-img" alt="AI Generated">`;
        if (genActions) genActions.style.display = 'flex';
        currentImageUrl = url;
    };
    const clearPreview = () => {
        if (previewContainer) previewContainer.innerHTML =
            '<i class="fas fa-image" style="font-size:2rem;display:block;margin-bottom:8px;"></i> preview';
        if (genActions) genActions.style.display = 'none';
        currentImageUrl = null;
    };
    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            const prompt = promptInput?.value?.trim() || 'abstract liquid art, neon cyberpunk';
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<span class="spinner"></span>';
            if (previewContainer) previewContainer.innerHTML =
                '<div class="text-center"><i class="fas fa-spinner fa-pulse"></i> Generating...</div>';
            try {
                const url =
                    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&seed=${Date.now()}&nologo=true`;
                const img = new Image();
                img.onload = () => showPreview(url);
                img.onerror = () => {
                    throw new Error('Failed to load image');
                };
                img.src = url;
            } catch (e) {
                showToast('Image generation failed: ' + e.message, 'error');
                clearPreview();
            } finally {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate';
            }
        });
    }
    if (clearBtn) clearBtn.addEventListener('click', clearPreview);
    if (addToChatBtn) {
        addToChatBtn.addEventListener('click', async () => {
            if (!currentImageUrl) return;
            try {
                const res = await fetch(currentImageUrl);
                const blob = await res.blob();
                const file = new File([blob], 'ai_art_' + Date.now() + '.png', {
                    type: 'image/png'
                });
                STATE.attachedFiles.push(file);
                renderFilePreview();
                showToast('AI image added to chat!', 'success');
                switchPanel('chat');
            } catch (e) {
                showToast('Failed to add image', 'error');
            }
        });
    }
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (currentImageUrl) {
                const a = document.createElement('a');
                a.href = currentImageUrl;
                a.download = 'hex_ai_' + Date.now() + '.png';
                a.click();
                showToast('Image downloaded!', 'success');
            }
        });
    }
}

function initVideoGenerator() {
    const generateBtn = document.getElementById('generateVideoBtn');
    const promptInput = document.getElementById('videoPromptInput');
    const statusDiv = document.getElementById('videoGenStatus');
    const canvas = document.getElementById('videoPreviewCanvas');
    const videoPreview = document.getElementById('videoPreview');
    const videoActions = document.getElementById('videoActions');
    const downloadBtn = document.getElementById('downloadVideoBtn');
    const clearBtn = document.getElementById('clearVideoBtn');
    let currentVideoUrl = null;
    let animationId = null;
    let mediaRecorder = null;
    let recordedChunks = [];
    const clearVideoPreview = () => {
        if (animationId) cancelAnimationFrame(animationId);
        if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        if (videoPreview) {
            videoPreview.style.display = 'none';
            videoPreview.src = '';
        }
        if (canvas) {
            canvas.style.display = 'none';
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        }
        if (statusDiv) {
            statusDiv.style.display = 'block';
            statusDiv.innerHTML = '<i class="fas fa-film"></i> preview';
        }
        if (videoActions) videoActions.style.display = 'none';
        currentVideoUrl = null;
        recordedChunks = [];
    };
    const showVideoPreview = (url) => {
        if (videoPreview) {
            videoPreview.src = url;
            videoPreview.style.display = 'block';
        }
        if (canvas) canvas.style.display = 'none';
        if (statusDiv) statusDiv.style.display = 'none';
        if (videoActions) videoActions.style.display = 'flex';
        currentVideoUrl = url;
    };
    const animateImage = (img, durationMs, fps, canvasEl, callback) => {
        const ctx = canvasEl.getContext('2d');
        const w = canvasEl.width = 512;
        const h = canvasEl.height = 512;
        const totalFrames = Math.floor((durationMs / 1000) * fps);
        let frame = 0;
        const stream = canvasEl.captureStream(fps);
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: MediaRecorder.isTypeSupported('video/webm; codecs=vp8') ? 'video/webm; codecs=vp8' : 'video/webm',
            videoBitsPerSecond: 2500000,
        });
        recordedChunks = [];
        mediaRecorder.ondataavailable = e => recordedChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, {
                type: 'video/webm'
            });
            const url = URL.createObjectURL(blob);
            if (callback) callback(url);
        };
        const drawFrame = () => {
            const progress = frame / totalFrames;
            const panX = Math.sin(progress * Math.PI) * 0.15;
            const zoom = 1.0 + progress * 0.2;
            const drawW = w / zoom,
                drawH = h / zoom;
            const x = (w - drawW) * (0.5 + panX);
            const y = (h - drawH) * 0.5;
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(img, x, y, drawW, drawH, 0, 0, w, h);
            frame++;
            if (frame < totalFrames && mediaRecorder.state === 'recording') {
                animationId = requestAnimationFrame(drawFrame);
            } else if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
            }
        };
        mediaRecorder.start();
        drawFrame();
    };
    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            const prompt = promptInput?.value?.trim() || 'neon city at night, cyberpunk, cinematic';
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<span class="spinner"></span> Generating...';
            if (statusDiv) statusDiv.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Drawing AI image...';
            if (canvas) canvas.style.display = 'none';
            if (videoPreview) videoPreview.style.display = 'none';
            if (videoActions) videoActions.style.display = 'none';
            try {
                const imgUrl =
                    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&seed=${Date.now()}&nologo=true`;
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    if (statusDiv) statusDiv.innerHTML =
                        '<i class="fas fa-spinner fa-pulse"></i> Animating...';
                    if (canvas) canvas.style.display = 'block';
                    animateImage(img, 5000, 24, canvas, (url) => showVideoPreview(url));
                    showToast('Animating scene...', 'info');
                };
                img.onerror = () => {
                    throw new Error('Image generation failed');
                };
                img.src = imgUrl;
            } catch (e) {
                showToast('Video generation failed: ' + e.message, 'error');
                clearVideoPreview();
            } finally {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate';
            }
        });
    }
    if (clearBtn) clearBtn.addEventListener('click', clearVideoPreview);
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (currentVideoUrl) {
                const a = document.createElement('a');
                a.href = currentVideoUrl;
                a.download = 'hex_video_' + Date.now() + '.webm';
                a.click();
                showToast('Video downloaded!', 'success');
            }
        });
    }
}

// =============================================================
//  THEME TOGGLE
// =============================================================

function toggleThemeMode() {
    const current = getThemePreference();
    const newTheme = current === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    document.getElementById('themeSelect').value = newTheme;
    updateThemeToggleIcon();
    showToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} mode`, 'info');
}

function updateThemeToggleIcon() {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    const isDark = document.body.classList.contains('dark');
    const icon = btn.querySelector('i');
    if (icon) {
        icon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
    }
    btn.title = isDark ? 'Current: Dark Mode' : 'Current: Light Mode';
}

// =============================================================
//  OFFLINE PLAYLIST PERSISTENCE
// =============================================================

function loadOfflinePlaylist() {
    try {
        const data = localStorage.getItem('hexai_offline_playlist');
        if (data) {
            const parsed = JSON.parse(data);
            STATE.offlinePlaylist = parsed.playlist || [];
            STATE.offlineCurrentSongIndex = parsed.currentIndex || -1;
            STATE.offlineIsPlaying = parsed.isPlaying || false;
            STATE.offlineIsRepeating = parsed.isRepeating || false;
            STATE.offlineIsShuffling = parsed.isShuffling || false;
            STATE.offlinePlayHistory = parsed.playHistory || [];
            STATE.offlineShuffleQueue = parsed.shuffleQueue || [];
            STATE.offlineShufflePos = parsed.shufflePos || -1;
        }
    } catch (e) {
        console.warn('loadOfflinePlaylist:', e);
    }
}

function saveOfflinePlaylist() {
    try {
        const data = {
            playlist: STATE.offlinePlaylist,
            currentIndex: STATE.offlineCurrentSongIndex,
            isPlaying: STATE.offlineIsPlaying,
            isRepeating: STATE.offlineIsRepeating,
            isShuffling: STATE.offlineIsShuffling,
            playHistory: STATE.offlinePlayHistory,
            shuffleQueue: STATE.offlineShuffleQueue,
            shufflePos: STATE.offlineShufflePos,
        };
        localStorage.setItem('hexai_offline_playlist', JSON.stringify(data));
    } catch (e) {
        console.warn('saveOfflinePlaylist:', e);
    }
}

// =============================================================
//  BOOT
// =============================================================

function init() {
    loadState();
    const theme = STATE.settings.theme || getThemePreference();
    applyTheme(theme);
    document.getElementById('themeSelect').value = theme;
    document.getElementById('providerSelect').value = STATE.settings.provider || 'openrouter';
    onProviderChange();

    init3DEmojiPicker();
    setupVoiceRecognition();
    updateModelBadge();
    renderChatMessages();
    setupMessageActionDelegation();

    document.getElementById('settingsOverlay').addEventListener('click', function(e) {
        if (e.target === this) toggleSettings();
    });
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === ',') {
            e.preventDefault();
            toggleSettings();
        }
    });

    loadPlaylist();
    updateVolumeUI(currentVolume);

    const spinBtn = albumArtDisplayToggle?.querySelector('[data-mode="spin"]');
    if (spinBtn) {
        albumArtDisplayToggle.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        const modeBtn = albumArtDisplayToggle.querySelector(`[data-mode="${albumArtDisplayMode}"]`);
        if (modeBtn) modeBtn.classList.add('active');
        else spinBtn.classList.add('active');
    }
    applyAlbumArtDisplayMode();

    if (autoPlayToggle) autoPlayToggle.checked = true;

    const transServiceSelect = document.getElementById('settingsTranslationServiceSelect');
    if (transServiceSelect) {
        const saved = STATE.settings.translationService || 'auto';
        transServiceSelect.value = saved;
    }
    const transTargetLang = document.getElementById('translationTargetLang');
    if (transTargetLang) {
        const savedLang = STATE.settings.translationTargetLang || 'en';
        transTargetLang.value = savedLang;
        currentLang = savedLang;
    }

    const sbEnabled = localStorage.getItem('sponsorBlockEnabled');
    if (sbEnabled !== null) {
        SB.enabled = JSON.parse(sbEnabled);
        if (sponsorToggle) sponsorToggle.checked = SB
            .enabled;
    } else {
        SB.enabled = true;
        if (sponsorToggle) sponsorToggle.checked = true;
    }

    if (typeof YT !== 'undefined' && YT.Player && !player && STATE.playlist.length > 0) {
        if (typeof window.onYouTubeIframeAPIReady === 'function') window.onYouTubeIframeAPIReady();
    }

    autoImportDefaultPlaylist();

    initImageGenerator();
    initVideoGenerator();

    // Offline player is already initialized in the global scope (the user's code runs immediately)
    // But we need to ensure the visualizer setup is complete
    // Initialize offline player specific settings
    loadOfflinePlaylist();
    if (STATE.offlinePlaylist.length > 0) {
        const idx = STATE.offlineCurrentSongIndex >= 0 && STATE.offlineCurrentSongIndex < STATE.offlinePlaylist
            .length ? STATE.offlineCurrentSongIndex : 0;
        offlineLoadSong(idx);
        if (STATE.offlineIsPlaying) playOffline();
        else pauseOffline();
        if (STATE.offlineIsShuffling) {
            offlineShuffleBtn.classList.add('active');
            rebuildShuffleQueue();
        }
        if (STATE.offlineIsRepeating) offlineRepeatBtn.classList.add('active');
    }

    // default tab
    switchMusicTab('yt');

    if (window.ThemeEngine) {
        const savedAppearance = STATE.settings.themeAppearance || localStorage.getItem('hexai_theme_appearance') ||
            'default';
        ThemeEngine.init({
            albumArtEl: document.getElementById('albumArt')
        });
        const appSel = document.getElementById('themeAppearanceSelect');
        if (appSel) {
            appSel.value = savedAppearance;
            ThemeEngine.applyThemeAppearance(savedAppearance);
        }
        ThemeEngine.syncMode();

        const currentArt = document.getElementById('albumArt');
        if (currentArt && currentArt.src && currentArt.src !== 'https://via.placeholder.com/300') {
            ThemeEngine.applyVibrantFromUrl(currentArt.src);
        }
    }

    initBackgroundPlayback();
    updateThemeToggleIcon();

    // ---- Restore karaoke state ----
    if (STATE.karaokeActive && lyricsContainer) {
        lyricsContainer.classList.add('karaoke-active');
        if (toggleKaraokeBtn) {
            toggleKaraokeBtn.classList.add('active');
            toggleKaraokeBtn.style.background = 'var(--md-primary)';
            toggleKaraokeBtn.style.color = 'var(--md-on-primary)';
            toggleKaraokeBtn.style.borderColor = 'var(--md-primary)';
        }
    }

    // ---- Attach Export / Import listeners ----
    if (exportPlaylistBtn) {
        exportPlaylistBtn.addEventListener('click', exportPlaylist);
    }
    if (importFileBtn) {
        importFileBtn.addEventListener('click', () => importFileInput.click());
    }
    if (importFileInput) {
        importFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                importPlaylist(e.target.files[0]);
            }
            e.target.value = '';
        });
    }

    console.log('⬡ HEX AI — Music Player + Karaoke + Summarizer + Advanced Offline Visualizer ready ♫');
    console.log('🎤 Karaoke mode, LRCLib search, and AI lyrics generation integrated.');
    console.log('📤 Export / Import Playlist ready.');
    console.log('🔁 Offline repeat (all) and shuffle now work correctly with queue system.');
    // Ad-block enhancements are started automatically when player is ready.
    console.log('🛡️ Ad-block enhancements (fast-forward ads & SSAP skip) enabled.');
}

document.addEventListener('DOMContentLoaded', init);

window.addEventListener('beforeunload', function() {
    saveState();
    if (STATE.progressInterval) clearInterval(STATE.progressInterval);
    if (progressInterval) clearInterval(progressInterval);
    if (syncInterval) clearInterval(syncInterval);
    if (SB.checkInterval) clearInterval(SB.checkInterval);
    stopBgAudioContext();
    disableBackgroundPlaybackEnhancement();
    stopAdBlockEnhancements();
});

window.switchMusicTab = switchMusicTab;
window.switchPanel = switchPanel;
window.toggleSettings = toggleSettings;
window.onProviderChange = onProviderChange;
window.refreshOpenRouterModels = refreshOpenRouterModels;
window.saveSettings = saveSettings;
window.toggleEmojiPicker = toggleEmojiPicker;
window.toggleVoiceInput = toggleVoiceInput;
window.handleFileAttach = handleFileAttach;
window.handleChatKey = handleChatKey;
window.sendMessage = sendMessage;
window.renderFilePreview = renderFilePreview;
window.analyzeYouTubeVideo = analyzeYouTubeVideo;
window.toggleThemeMode = toggleThemeMode;
window.updateThemeToggleIcon = updateThemeToggleIcon;
window.exportPlaylist = exportPlaylist;
window.importPlaylist = importPlaylist;

// =============================================================
//  Background Playback Userscript (Standalone)
// =============================================================
// ==UserScript==
// @name         Background Video Play Fix (Standalone)
// @namespace    https://github.com/
// @version      1.0
// @description  Forces YouTube, Vimeo, and HTML5 videos to play in the background.
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ─── 1. OVERRIDE VISIBILITY API ──────────────────────────────
    // Force the browser to report the tab as always visible.
    Object.defineProperties(document, {
        'hidden': {
            get: function() { return false; },
            configurable: true
        },
        'visibilityState': {
            get: function() { return 'visible'; },
            configurable: true
        }
    });
    document.hasFocus = function() { return true; };

    // Block all visibility change events from propagating.
    document.addEventListener('visibilitychange', function(e) {
        e.stopImmediatePropagation();
        e.preventDefault();
    }, true);

    window.addEventListener('visibilitychange', function(e) {
        e.stopImmediatePropagation();
        e.preventDefault();
    }, true);

    // ─── 2. BLOCK FULLSCREEN EVENTS (Vimeo fix) ──────────────────
    window.addEventListener('fullscreenchange', function(e) {
        e.stopImmediatePropagation();
        e.preventDefault();
    }, true);

    // ─── 3. SIMULATE USER ACTIVITY (YouTube idle fix) ─────────────
    let keyPressCount = 0;

    function sendKeyEvent(type, keyCode) {
        document.dispatchEvent(new KeyboardEvent(type, {
            bubbles: true,
            cancelable: true,
            keyCode: keyCode,
            which: keyCode
        }));
    }

    function pressAltKey() {
        sendKeyEvent('keydown', 18); // Alt key
        sendKeyEvent('keyup', 18);
        keyPressCount++;
        console.log(`[Background Play] Alt key pressed (${keyPressCount})`);
    }

    // Loop with random jitter (±10s) every ~60 seconds.
    function startKeyLoop() {
        const loop = () => {
            pressAltKey();
            const jitter = (Math.random() - 0.5) * 10000;
            const delay = Math.max(60000 + jitter, 5000);
            setTimeout(loop, delay);
        };
        setTimeout(loop, 3000); // first press after 3s
    }
    startKeyLoop();

    // ─── 4. WATCHDOG: AUTO-RESUME PAUSED VIDEOS ──────────────────
    setInterval(function() {
        // --- YouTube (if the page exposes ytPlayer) ---
        if (window.ytPlayer && typeof window.ytPlayer.getPlayerState === 'function') {
            try {
                const state = window.ytPlayer.getPlayerState();
                if (state === 2) { // 2 = paused
                    const currentTime = window.ytPlayer.getCurrentTime();
                    if (currentTime > 0.5) {
                        console.log('[Background Play] Resuming YouTube video');
                        window.ytPlayer.playVideo();
                    }
                }
            } catch (e) { /* ignore */ }
        }

        // --- Vimeo (if the page exposes vimeoPlayer) ---
        if (window.vimeoPlayer && typeof window.vimeoPlayer.getPaused === 'function') {
            try {
                window.vimeoPlayer.getPaused().then(function(paused) {
                    if (paused) {
                        window.vimeoPlayer.getCurrentTime().then(function(t) {
                            if (t > 0.5) {
                                console.log('[Background Play] Resuming Vimeo video');
                                window.vimeoPlayer.play();
                            }
                        });
                    }
                }).catch(function() { /* ignore */ });
            } catch (e) { /* ignore */ }
        }

        // --- Generic HTML5 <video> elements ---
        document.querySelectorAll('video').forEach(function(video) {
            if (video.paused && video.currentTime > 0.5 && !video.ended) {
                console.log('[Background Play] Resuming HTML5 video');
                video.play().catch(function() { /* ignore */ });
            }
        });

    }, 3000); // check every 3 seconds

    console.log('[Background Play Fix] ✅ Active – videos will continue playing in the background.');
})();

// =============================================================
//  Integrated YouTube AdBlocker + SponsorBlock (from Userscript)
// =============================================================
(function() {
    'use strict';

    /* =========================================================================
     * CONFIGURATION & CONSTANTS
     * ===================================================================== */

    const SCRIPT_NAME = 'YT-AdBlocker-SponsorBlock';
    const SCRIPT_VERSION = '1.0.0';

    const DEFAULT_FILTERS = {
        version: '1.0.0',
        updated: '2026-07-17',
        pruneKeys: [
            'adPlacements', 'adSlots', 'playerAds',
            'playerResponse.adPlacements', 'playerResponse.adSlots', 'playerResponse.playerAds',
            'adBreakHeartbeatParams', 'frameworkUpdates',
            'responseContext.adSignalsInfo',
            'playerResponse.adBreakHeartbeatParams',
            'playerResponse.auxiliaryUi.messageRenderers.upsellDialogRenderer',
            'auxiliaryUi.messageRenderers.upsellDialogRenderer',
            'promotedSparklesWebRenderer', 'promotedVideoRenderer',
            'compactPromotedVideoRenderer', 'compactPromotedItemRenderer',
            'backgroundPromoRenderer', 'statementBannerRenderer',
            'brandVideoShelfRenderer', 'brandVideoSingletonRenderer',
            'inlineAdLayoutRenderer', 'adSlotRenderer',
            'linkedInstreamAdRenderer', 'shoppingCarouselRenderer',
            'merchandiseShelfRenderer'
        ],
        setUndefined: [
            'ytInitialPlayerResponse.playerAds',
            'ytInitialPlayerResponse.adPlacements',
            'ytInitialPlayerResponse.adSlots',
            'ytInitialPlayerResponse.adBreakHeartbeatParams',
            'ytInitialPlayerResponse.auxiliaryUi.messageRenderers.upsellDialogRenderer',
            'ytInitialData.frameworkUpdates',
            'playerResponse.adPlacements'
        ],
        replaceKeys: { adPlacements: 'no_ads', adSlots: 'no_ads', playerAds: 'no_ads' },
        interceptPatterns: [
            '/youtubei/v1/player', '/youtubei/v1/get_watch',
            '/youtubei/v1/browse', '/youtubei/v1/search', '/youtubei/v1/next',
            '/youtubei/v1/guide', '/youtubei/v1/log_event',
            '/youtubei/v1/att/get', '/youtubei/v1/att/log',
            '/youtubei/v1/reel_watch_sequence', '/youtubei/v1/get_survey',
            '/youtubei/v1/player/ad_break',
            '/watch?', '/playlist?list=', '/reel_watch_sequence'
        ],
        cosmeticSelectors: [
            '#masthead-ad', '#promotion-shelf', '#shopping-timely-shelf',
            '.masthead-ad-control', '.ad-div', '.pyv-afc-ads-container',
            '.ytp-ad-progress', '.ytp-suggested-action-badge',
            'ytd-ad-slot-renderer', 'ytd-video-masthead-ad-advertiser-info-renderer',
            'ytm-promoted-sparkles-web-renderer', 'ytd-search-pyv-renderer',
            'ytd-merch-shelf-renderer', 'ad-slot-renderer', 'ytm-companion-ad-renderer',
            'ytd-statement-banner-renderer', 'ytd-enforcement-message-view-model',
            'tp-yt-paper-dialog:has(ytd-enforcement-message-view-model)',
            'ytd-rich-item-renderer:has(> #content > ytd-ad-slot-renderer)',
            '#shorts-inner-container > .ytd-shorts:has(> .ytd-reel-video-renderer > ytd-ad-slot-renderer)',
            '.ytd-watch-flexy > .ytd-watch-next-secondary-results-renderer > ytd-ad-slot-renderer',
            '.ytd-two-column-browse-results-renderer > ytd-rich-grid-renderer > #masthead-ad',
            'ytd-in-feed-ad-layout-renderer', 'ytd-banner-promo-renderer',
            'ytd-promoted-video-renderer', 'ytd-compact-promoted-video-renderer',
            'ytd-action-companion-ad-renderer', 'ytd-brand-video-shelf-renderer',
            'ytd-brand-video-singleton-renderer'
        ],
        upsellSelectors: [
            'ytd-popup-container > .ytd-popup-container > #contentWrapper > .ytd-popup-container[position-type="OPEN_POPUP_POSITION_BOTTOMLEFT"]'
        ],
        features: {
            jsonParsePrune: true,
            fetchIntercept: true,
            xhrIntercept: true,
            setUndefinedTraps: true,
            ssapAutoSkip: true,
            abnormalityBypass: true,
            domBypassPrevention: true,
            shortsAdBlock: true,
            cosmeticHiding: true,
            upsellBlock: true,
            requestBodyModify: true,
            timerNeutralization: true,
            aggressiveAntiStall: true,
            videoAdFastForward: true,
            sponsorBlock: true,
            nativeToStringMask: true,
            serviceWorkerBlock: true,
            webpackChunkHook: true
        }
    };

    const SPONSORBLOCK_API = 'https://sponsor.ajay.app/api/skipSegments';
    const SPONSORBLOCK_CATEGORIES = ['sponsor', 'selfpromo', 'interaction', 'intro', 'outro', 'preview', 'music_offtopic', 'filler'];
    const SPONSORBLOCK_TIMEOUT_MS = 10000;

    /* =========================================================================
     * STATE (adapted to use localStorage)
     * ===================================================================== */

    const state = {
        filters: null,
        features: { ...DEFAULT_FILTERS.features },
        enabled: true,
        stats: { blocked: 0, pruned: 0, ssapSkipped: 0, sponsorSkipped: 0 },
        lastFilterUpdate: 0,
        filterSource: 'built-in',
        filterIntegrity: 'built-in',
        filterError: '',
        proxiesInstalled: false,
        cosmeticStyleEl: null,
        originals: {},
        trappedRoots: new Set(),
        trapPathsByRoot: new Map(),
        engineIntervals: [],
        preProxiedNatives: [],
        overrideFailures: [],
        sponsor: {
            videoId: null,
            loadingToken: null,
            segments: [],
            video: null,
            timeupdateHandler: null,
            lastSkipEnd: -1,
            pendingVideoId: null
        }
    };

    /* =========================================================================
     * STORAGE HELPERS (using localStorage instead of GM_*)
     * ===================================================================== */

    function getSetting(key, def) {
        try {
            const val = localStorage.getItem(`ytabsb_${key}`);
            if (val === null) return def;
            return JSON.parse(val);
        } catch { return def; }
    }
    function setSetting(key, val) {
        try {
            localStorage.setItem(`ytabsb_${key}`, JSON.stringify(val));
            return true;
        } catch { return false; }
    }

    function loadState() {
        state.enabled = getSetting('enabled', true) !== false;
        state.lastFilterUpdate = Number(getSetting('filters_cache_time', 0)) || 0;
        const cached = getSetting('filters_cache', null);
        if (cached && typeof cached === 'object') {
            state.filters = cached;
            state.filterSource = 'cached';
            state.filterIntegrity = 'cached';
        } else {
            state.filters = DEFAULT_FILTERS;
            state.filterSource = 'built-in';
            state.filterIntegrity = 'built-in';
        }
        const overrides = getSetting('feature_overrides', {});
        if (overrides && typeof overrides === 'object') {
            for (const [k, v] of Object.entries(overrides)) {
                if (k in state.features) state.features[k] = !!v;
            }
        }
    }

    function saveStats() {
        try { setSetting('stats', state.stats); } catch {}
    }

    function incrementStat(name, by = 1) {
        const current = Number(state.stats[name]) || 0;
        state.stats[name] = current + by;
        saveStats();
    }

    function isEnabled() { return state.enabled !== false; }

    /* =========================================================================
     * UTILITY FUNCTIONS (adapted)
     * ===================================================================== */

    function safeOverride(obj, prop, newValue, label) {
        try {
            const current = obj[prop];
            if (typeof current === 'function') {
                const src = Function.prototype.toString.call(current);
                if (typeof src === 'string' && !src.includes('[native code]')) {
                    state.preProxiedNatives.push(label || prop);
                }
            }
        } catch {}
        try {
            obj[prop] = newValue;
            return true;
        } catch {}
        try {
            Object.defineProperty(obj, prop, { value: newValue, writable: true, configurable: true, enumerable: true });
            return true;
        } catch {}
        try {
            delete obj[prop];
            Object.defineProperty(obj, prop, { value: newValue, writable: true, configurable: true, enumerable: true });
            return true;
        } catch {
            state.overrideFailures.push(label || prop);
            return false;
        }
    }

    function registerInterval(fn, ms) {
        const id = setInterval(fn, ms);
        state.engineIntervals.push(id);
        return id;
    }

    function ensureStyleElement(id) {
        let style = document.getElementById(id);
        if (style && style.isConnected) return style;
        if (style && !style.isConnected) try { style.remove(); } catch {}
        style = document.createElement('style');
        style.id = id;
        const host = document.head || document.documentElement;
        if (host) host.appendChild(style);
        return style;
    }

    function deleteNestedKey(obj, path) {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            if (current == null || typeof current !== 'object') return false;
            current = current[keys[i]];
        }
        if (current != null && typeof current === 'object') {
            const lastKey = keys[keys.length - 1];
            if (lastKey in current) { delete current[lastKey]; return true; }
        }
        return false;
    }

    function jsonParseRaw(text) {
        const parse = state.originals.jsonParse || JSON.parse;
        return parse.call(JSON, text);
    }

    function matchesInterceptPattern(url) {
        const patterns = state.filters?.interceptPatterns || DEFAULT_FILTERS.interceptPatterns;
        return patterns.some(p => typeof p === 'string' && url.includes(p));
    }

    function pruneObject(obj, context) {
        if (!obj || typeof obj !== 'object') return false;
        let pruned = false;
        const keys = state.filters?.pruneKeys || DEFAULT_FILTERS.pruneKeys;
        for (const keyPath of keys) {
            if (deleteNestedKey(obj, keyPath)) pruned = true;
        }
        if (state.features.shortsAdBlock && Array.isArray(obj.entries)) {
            const url = typeof context === 'string' ? context : context?.url;
            if (url && /reel_watch_sequence|\/reel\b/.test(url)) {
                const before = obj.entries.length;
                obj.entries = obj.entries.filter(entry => !entry?.command?.reelWatchEndpoint?.adClientParams?.isAd);
                if (obj.entries.length !== before) pruned = true;
            }
        }
        if (pruned) incrementStat('pruned');
        return pruned;
    }

    function replaceAdKeys(text) {
        const rk = state.filters?.replaceKeys || DEFAULT_FILTERS.replaceKeys;
        let modified = text;
        for (const [key, replacement] of Object.entries(rk)) {
            const regex = new RegExp(`"${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
            modified = modified.replace(regex, `"${replacement}"`);
        }
        return modified;
    }

    function responseTextMightContainAds(text) {
        if (typeof text !== 'string') return false;
        const hintSet = new Set();
        const keys = state.filters?.pruneKeys || DEFAULT_FILTERS.pruneKeys;
        for (const path of keys) {
            const leaf = path.split('.').pop();
            if (leaf) hintSet.add(`"${leaf}"`);
        }
        for (const key of Object.keys(state.filters?.replaceKeys || DEFAULT_FILTERS.replaceKeys)) {
            hintSet.add(`"${key}"`);
        }
        return [...hintSet].some(hint => text.includes(hint));
    }

    /* =========================================================================
     * FILTER FETCHING (using fetch instead of GM_xmlhttpRequest)
     * ===================================================================== */

    function fetchFilters(force = false) {
        if (!force && state.filterSource === 'cached') return Promise.resolve(state.filters);
        const url = getSetting('filter_url', 'https://easylist.to/easylist/easylist.txt');
        return fetch(url + (url.includes('?') ? '&' : '?') + '_=' + Date.now())
            .then(resp => {
                if (!resp.ok) throw new Error('Fetch failed');
                return resp.text();
            })
            .then(text => {
                if (text.length > 5 * 1024 * 1024) throw new Error('Too large');
                const parsed = parseUBOFilterList(text);
                if (parsed) {
                    state.filters = parsed;
                    state.filterSource = 'remote';
                    state.lastFilterUpdate = Date.now();
                    state.filterIntegrity = 'remote';
                    setSetting('filters_cache', parsed);
                    setSetting('filters_cache_time', Date.now());
                    updateCosmeticCSS();
                    try { installPropertyTraps(); } catch {}
                    return parsed;
                } else {
                    return state.filters;
                }
            })
            .catch(() => state.filters);
    }

    function parseUBOFilterList(text) {
        const lines = text.split('\n');
        const cosmeticSelectors = new Set();
        const upsellSelectors = new Set();
        const setUndefined = new Set();
        const pruneKeys = new Set();
        const replaceKeys = {};
        let filterCount = 0;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('!')) continue;
            if (trimmed.startsWith('!#')) continue;

            const exMatch = trimmed.match(/^[^#]*#@#(.+)$/);
            if (exMatch) { continue; }

            const jsMatch = trimmed.match(/#\+js\(([^,)]+)(?:,\s*(.+))?\)$/);
            if (jsMatch) {
                const [, name, args] = jsMatch;
                if (name === 'set' && args) {
                    const parts = args.split(',');
                    if (parts.length >= 2 && parts[1].trim() === 'undefined') {
                        const path = parts[0].trim();
                        if (/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(path)) {
                            setUndefined.add(path);
                        }
                    }
                } else if (name === 'json-prune' || name === 'json-prune-fetch-response' || name === 'json-prune-xhr-response') {
                    if (args) {
                        const keysPart = args.split(',')[0].trim();
                        for (const key of keysPart.split(/\s+/)) {
                            const clean = key.replace(/\[-\]\./g, '');
                            if (clean && /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(clean)) {
                                pruneKeys.add(clean);
                            }
                        }
                    }
                } else if (name === 'trusted-replace-fetch-response' || name === 'trusted-replace-xhr-response') {
                    // simplistic, just collect
                }
                filterCount++;
                continue;
            }

            const cosmMatch = trimmed.match(/^([^#]*)##([^+^].*)$/);
            if (cosmMatch) {
                const selector = cosmMatch[2].trim();
                if (!selector || selector.startsWith('^')) continue;
                if (selector.includes(':style(')) continue;
                if (selector.includes('{') || selector.includes('}')) continue;
                if (selector.includes('popup-container') || selector.includes('upsell')) {
                    upsellSelectors.add(selector);
                } else {
                    cosmeticSelectors.add(selector);
                }
                filterCount++;
                continue;
            }
        }

        return {
            version: new Date().toISOString().slice(0, 10),
            updated: new Date().toISOString().slice(0, 10),
            filterCount,
            pruneKeys: [...new Set([...DEFAULT_FILTERS.pruneKeys, ...pruneKeys])],
            setUndefined: [...new Set([...DEFAULT_FILTERS.setUndefined, ...setUndefined])],
            replaceKeys: { ...DEFAULT_FILTERS.replaceKeys, ...replaceKeys },
            interceptPatterns: DEFAULT_FILTERS.interceptPatterns,
            cosmeticSelectors: [...new Set([...DEFAULT_FILTERS.cosmeticSelectors, ...cosmeticSelectors])],
            upsellSelectors: [...new Set([...DEFAULT_FILTERS.upsellSelectors, ...upsellSelectors])],
            features: { ...DEFAULT_FILTERS.features }
        };
    }

    /* =========================================================================
     * ENGINE: JSON.parse PROXY
     * ===================================================================== */

    function installJSONParseProxy() {
        const original = JSON.parse;
        state.originals.jsonParse = original;
        const proxied = new Proxy(original, {
            apply(target, thisArg, args) {
                const result = Reflect.apply(target, thisArg, args);
                try {
                    if (isEnabled() && state.features.jsonParsePrune && result && typeof result === 'object') {
                        if (pruneObject(result)) incrementStat('blocked');
                    }
                } catch {}
                return result;
            }
        });
        safeOverride(JSON, 'parse', proxied, 'JSON.parse');
    }

    /* =========================================================================
     * ENGINE: fetch() PROXY
     * ===================================================================== */

    function installFetchProxy() {
        const originalFetch = window.fetch;
        state.originals.fetch = originalFetch;
        const proxied = new Proxy(originalFetch, {
            apply(target, thisArg, args) {
                const request = args[0];
                const url = typeof request === 'string' ? request : request?.url;
                if (!isEnabled() || !state.features.fetchIntercept || !url) {
                    return Reflect.apply(target, thisArg, args);
                }
                if (!matchesInterceptPattern(url)) {
                    return Reflect.apply(target, thisArg, args);
                }
                return Reflect.apply(target, thisArg, args).then(response => {
                    if (!response || !response.ok) return response;
                    return response.clone().text().then(text => {
                        if (!text) return response;
                        if (!responseTextMightContainAds(text)) return response;
                        try {
                            const modified = replaceAdKeys(text);
                            const parse = state.originals.jsonParse || JSON.parse;
                            const obj = parse.call(JSON, modified);
                            const wasPruned = pruneObject(obj, url);
                            if (!wasPruned && modified === text) return response;
                            if (wasPruned) incrementStat('blocked');
                            let newHeaders;
                            try {
                                newHeaders = new Headers(response.headers);
                                newHeaders.delete('content-length');
                            } catch { newHeaders = response.headers; }
                            return new Response(JSON.stringify(obj), {
                                status: response.status,
                                statusText: response.statusText,
                                headers: newHeaders
                            });
                        } catch { return response; }
                    }).catch(() => response);
                });
            }
        });
        safeOverride(window, 'fetch', proxied, 'window.fetch');
    }

    /* =========================================================================
     * ENGINE: XMLHttpRequest PROXY
     * ===================================================================== */

    function installXHRProxy() {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        const proxiedOpen = function(method, url, ...rest) {
            this._ytab_url = typeof url === 'string' ? url : '';
            return originalOpen.call(this, method, url, ...rest);
        };

        const proxiedSend = function(body) {
            if (!isEnabled() || !state.features.xhrIntercept) {
                return originalSend.call(this, body);
            }
            const xhr = this;
            const url = this._ytab_url || '';
            if (!matchesInterceptPattern(url)) {
                return originalSend.call(this, body);
            }

            function interceptResponse() {
                if (xhr.readyState !== 4) return;
                try { xhr.removeEventListener('readystatechange', interceptResponse, true); } catch {}
                let text = xhr.responseText || '';
                if (!text) return;
                if (!responseTextMightContainAds(text)) return;
                try {
                    const modified = replaceAdKeys(text);
                    const parse = state.originals.jsonParse || JSON.parse;
                    const obj = parse.call(JSON, modified);
                    const wasPruned = pruneObject(obj, url);
                    if (!wasPruned && modified === text) return;
                    const newText = JSON.stringify(obj);
                    Object.defineProperty(xhr, 'responseText', { value: newText, writable: false, configurable: true });
                    Object.defineProperty(xhr, 'response', { value: newText, writable: false, configurable: true });
                    if (wasPruned) incrementStat('blocked');
                } catch {}
            }

            xhr.addEventListener('readystatechange', interceptResponse, { capture: true });
            return originalSend.call(this, body);
        };

        safeOverride(XMLHttpRequest.prototype, 'open', proxiedOpen, 'XMLHttpRequest.prototype.open');
        safeOverride(XMLHttpRequest.prototype, 'send', proxiedSend, 'XMLHttpRequest.prototype.send');
    }

    /* =========================================================================
     * ENGINE: Object.assign HOOK
     * ===================================================================== */

    function installObjectAssignHook() {
        const originalAssign = Object.assign;
        const proxied = new Proxy(originalAssign, {
            apply(target, thisArg, args) {
                const result = Reflect.apply(target, thisArg, args);
                if (isEnabled() && state.features.requestBodyModify &&
                    result && typeof result === 'object' &&
                    ('playbackContext' in result || 'contentPlaybackContext' in result)) {
                    const ctx = result.playbackContext?.contentPlaybackContext || result.contentPlaybackContext;
                    if (ctx && typeof ctx === 'object' && ctx.isInlinePlaybackNoAd !== true) {
                        ctx.isInlinePlaybackNoAd = true;
                    }
                }
                return result;
            }
        });
        safeOverride(Object, 'assign', proxied, 'Object.assign');
    }

    /* =========================================================================
     * ENGINE: PROPERTY TRAPS
     * ===================================================================== */

    function rebuildTrapPaths() {
        const paths = state.filters?.setUndefined || DEFAULT_FILTERS.setUndefined;
        const byRoot = new Map();
        for (const path of paths) {
            if (typeof path !== 'string' || !path.includes('.')) continue;
            const parts = path.split('.');
            const root = parts[0];
            if (!byRoot.has(root)) byRoot.set(root, []);
            byRoot.get(root).push(parts.slice(1));
        }
        state.trapPathsByRoot = byRoot;
    }

    function applySubPathPrunes(target, subPaths) {
        let pruned = false;
        for (const subPath of subPaths) {
            let cursor = target;
            for (let i = 0; i < subPath.length - 1; i++) {
                if (cursor && typeof cursor === 'object' && subPath[i] in cursor) {
                    cursor = cursor[subPath[i]];
                } else {
                    cursor = null;
                    break;
                }
            }
            if (cursor && typeof cursor === 'object') {
                const lastKey = subPath[subPath.length - 1];
                if (lastKey in cursor) {
                    try { delete cursor[lastKey]; } catch {}
                    pruned = true;
                }
            }
        }
        return pruned;
    }

    function installPropertyTraps() {
        rebuildTrapPaths();
        for (const rootName of state.trapPathsByRoot.keys()) {
            if (state.trappedRoots.has(rootName)) continue;
            try {
                let _value = window[rootName];
                if (isEnabled() && state.features.setUndefinedTraps && _value && typeof _value === 'object') {
                    const subPaths = state.trapPathsByRoot.get(rootName) || [];
                    if (applySubPathPrunes(_value, subPaths)) incrementStat('pruned');
                }
                Object.defineProperty(window, rootName, {
                    get() { return _value; },
                    set(newVal) {
                        if (isEnabled() && state.features.setUndefinedTraps && newVal && typeof newVal === 'object') {
                            const subPaths = state.trapPathsByRoot.get(rootName) || [];
                            if (applySubPathPrunes(newVal, subPaths)) incrementStat('pruned');
                        }
                        _value = newVal;
                    },
                    configurable: true,
                    enumerable: true
                });
                state.trappedRoots.add(rootName);
            } catch {}
        }
    }

    /* =========================================================================
     * ENGINE: Promise.prototype.then BYPASS
     * ===================================================================== */

    function installAbnormalityBypass() {
        const originalThen = Promise.prototype.then;
        const proxied = new Proxy(originalThen, {
            apply(target, thisArg, args) {
                if (!isEnabled() || !state.features.abnormalityBypass) {
                    return Reflect.apply(target, thisArg, args);
                }
                const onFulfilled = args[0];
                if (typeof onFulfilled === 'function') {
                    try {
                        const fnStr = Function.prototype.toString.call(onFulfilled);
                        if (fnStr.includes('onAbnormalityDetected')) {
                            args[0] = function() {};
                            incrementStat('blocked');
                        }
                    } catch {}
                }
                return Reflect.apply(target, thisArg, args);
            }
        });
        safeOverride(Promise.prototype, 'then', proxied, 'Promise.prototype.then');
    }

    /* =========================================================================
     * ENGINE: DOM BYPASS PREVENTION
     * ===================================================================== */

    function installDOMBypassPrevention() {
        const originalAppendChild = Node.prototype.appendChild;
        const proxied = new Proxy(originalAppendChild, {
            apply(target, thisArg, args) {
                const node = args[0];
                const result = Reflect.apply(target, thisArg, args);
                if (isEnabled() && state.features.domBypassPrevention && node instanceof HTMLIFrameElement) {
                    try {
                        const cw = node.contentWindow;
                        if (cw) {
                            try { cw.fetch = window.fetch; } catch {}
                            try { cw.XMLHttpRequest = window.XMLHttpRequest; } catch {}
                            try { if (cw.JSON) cw.JSON.parse = JSON.parse; } catch {}
                        }
                    } catch {}
                }
                return result;
            }
        });
        safeOverride(Node.prototype, 'appendChild', proxied, 'Node.prototype.appendChild');
    }

    /* =========================================================================
     * ENGINE: SSAP AUTO‑SKIP
     * ===================================================================== */

    function installSSAPAutoSkip() {
        function checkAndSkip() {
            if (!isEnabled() || !state.features.ssapAutoSkip) return;
            if (document.hidden) return;
            const player = document.getElementById('movie_player');
            if (!player || typeof player.getStatsForNerds !== 'function') return;
            try {
                const stats = player.getStatsForNerds();
                const debugInfo = stats?.debug_info || '';
                if (debugInfo.startsWith('SSAP, AD') || debugInfo.startsWith('SSAP,AD')) {
                    const progress = player.getProgressState?.();
                    if (progress && progress.duration > 0) {
                        if (progress.loaded < progress.duration || progress.duration - progress.current > 1) {
                            player.seekTo?.(progress.duration);
                            incrementStat('ssapSkipped');
                        }
                    }
                }
            } catch {}
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                checkAndSkip();
                registerInterval(checkAndSkip, 1000);
            });
        } else {
            checkAndSkip();
            registerInterval(checkAndSkip, 1000);
        }
    }

    /* =========================================================================
     * ENGINE: VIDEO AD FAST‑FORWARD
     * ===================================================================== */

    function installVideoAdFastForward() {
        let weMuted = false;
        let lastAdShowing = false;
        registerInterval(() => {
            if (!isEnabled() || !state.features.videoAdFastForward) {
                if (weMuted) {
                    const player = document.getElementById('movie_player');
                    const video = player?.querySelector('video.html5-main-video');
                    if (video && video.muted) { try { video.muted = false; } catch {} }
                    weMuted = false;
                }
                lastAdShowing = false;
                return;
            }
            if (document.hidden) return;
            const player = document.getElementById('movie_player');
            if (!player) return;
            const adShowing = player.classList.contains('ad-showing');
            const video = player.querySelector('video.html5-main-video');
            if (!video) return;
            if (adShowing) {
                try {
                    if (video.playbackRate < 16) video.playbackRate = 16;
                    if (!video.muted) {
                        video.muted = true;
                        weMuted = true;
                    }
                } catch {}
            } else if (lastAdShowing && weMuted) {
                try { video.muted = false; } catch {}
                weMuted = false;
            }
            lastAdShowing = adShowing;
        }, 500);
    }

    /* =========================================================================
     * ENGINE: TIMER NEUTRALIZATION
     * ===================================================================== */

    function installTimerNeutralization() {
        const originalSetTimeout = window.setTimeout;
        const proxied = new Proxy(originalSetTimeout, {
            apply(target, thisArg, args) {
                const fn = args[0];
                const delay = args[1];
                if (!isEnabled() || !state.features.timerNeutralization || typeof fn !== 'function' || typeof delay !== 'number') {
                    return Reflect.apply(target, thisArg, args);
                }
                if (delay >= 16000 && delay <= 18000) {
                    try {
                        const fnStr = Function.prototype.toString.call(fn);
                        if (/onAbnormal|adBlock|adblock|abnormalityDetected/.test(fnStr)) {
                            args[1] = 1;
                        } else if (fnStr.includes('[native code]') && state.features.aggressiveAntiStall && delay === 17000) {
                            args[1] = 8 + Math.floor(Math.random() * 38);
                        }
                    } catch {}
                }
                return Reflect.apply(target, thisArg, args);
            }
        });
        safeOverride(window, 'setTimeout', proxied, 'window.setTimeout');
    }

    /* =========================================================================
     * ENGINE: SERVICE WORKER BLOCK
     * ===================================================================== */

    function installServiceWorkerBlock() {
        try {
            if (!navigator.serviceWorker) return;
            const sw = navigator.serviceWorker;
            const originalRegister = sw.register;
            const proxiedRegister = new Proxy(originalRegister, {
                apply() { return Promise.resolve(undefined); }
            });
            safeOverride(sw, 'register', proxiedRegister, 'serviceWorker.register');
        } catch {}
    }

    /* =========================================================================
     * ENGINE: WEBPACK CHUNK HOOK
     * ===================================================================== */

    function installWebpackChunkHook() {
        const chunkNames = ['webpackChunk_youtube_player', 'webpackChunk_www_youtube_com', 'webpackChunkytmusic_app'];
        for (const name of chunkNames) {
            try {
                const existing = window[name];
                if (Array.isArray(existing)) {
                    wrapChunkPush(existing);
                } else {
                    let _value = existing;
                    Object.defineProperty(window, name, {
                        get() { return _value; },
                        set(v) {
                            if (Array.isArray(v)) wrapChunkPush(v);
                            _value = v;
                        },
                        configurable: true
                    });
                }
            } catch {}
        }
    }

    function wrapChunkPush(arr) {
        if (!Array.isArray(arr) || arr.__ytabWrapped) return;
        Object.defineProperty(arr, '__ytabWrapped', { value: true, writable: false });
        const originalPush = arr.push;
        const proxiedPush = new Proxy(originalPush, {
            apply(target, thisArg, args) {
                for (const chunk of args) {
                    if (!Array.isArray(chunk)) continue;
                    const modules = chunk[1];
                    if (!modules || typeof modules !== 'object') continue;
                    for (const id of Object.keys(modules)) {
                        const factory = modules[id];
                        if (typeof factory !== 'function') continue;
                        try {
                            const src = Function.prototype.toString.call(factory);
                            if (src.length < 200000 && /\b(adPlacements|adBreakHeartbeatParams|onAbnormalityDetected|getAdBlockedState|adSlots)\b/.test(src)) {
                                modules[id] = function(module) { try { module.exports = {}; } catch {} };
                                incrementStat('pruned');
                            }
                        } catch {}
                    }
                }
                return Reflect.apply(target, thisArg, args);
            }
        });
        safeOverride(arr, 'push', proxiedPush, 'webpackChunk.push');
    }

    /* =========================================================================
     * ENGINE: COSMETIC CSS (not used in this page, but kept for completeness)
     * ===================================================================== */

    function updateCosmeticCSS() {
        if (!state.cosmeticStyleEl || !state.cosmeticStyleEl.isConnected) {
            state.cosmeticStyleEl = ensureStyleElement('ytabsb-cosmetic');
        }
        if (!isEnabled() || !state.features.cosmeticHiding) {
            state.cosmeticStyleEl.textContent = '';
            return;
        }
        const selectors = state.filters?.cosmeticSelectors || DEFAULT_FILTERS.cosmeticSelectors;
        const upsell = state.features.upsellBlock ? (state.filters?.upsellSelectors || DEFAULT_FILTERS.upsellSelectors) : [];
        const all = [...selectors, ...upsell];
        if (!all.length) {
            state.cosmeticStyleEl.textContent = '';
            return;
        }
        state.cosmeticStyleEl.textContent = all.map(s => `${s} { display: none !important; }`).join('\n');
    }

    /* =========================================================================
     * ENGINE: SPONSORBLOCK (adapted to use fetch, localStorage, and integrate with page player)
     * ===================================================================== */

    async function sha256HexPrefix(str, len = 4) {
        try {
            const buf = new TextEncoder().encode(str);
            const hash = await crypto.subtle.digest('SHA-256', buf);
            const bytes = new Uint8Array(hash);
            let hex = '';
            for (let i = 0; i < bytes.length && hex.length < len; i++) {
                hex += bytes[i].toString(16).padStart(2, '0');
            }
            return hex.slice(0, len);
        } catch { return null; }
    }

    function getVideoId() {
        // Use the page's player to get video ID
        if (window.player && typeof window.player.getVideoData === 'function') {
            const d = window.player.getVideoData();
            if (d && d.video_id) return d.video_id;
        }
        return window.selectedVideoId || null;
    }

    function fetchSponsorSegments(videoId) {
        return new Promise((resolve) => {
            if (!videoId) { resolve(null); return; }
            const cats = encodeURIComponent(JSON.stringify(SPONSORBLOCK_CATEGORIES));
            const actions = encodeURIComponent(JSON.stringify(['skip', 'full']));
            fetch(`${SPONSORBLOCK_API}/${videoId.slice(0,4)}?categories=${cats}&actionTypes=${actions}`, {
                method: 'GET',
                timeout: SPONSORBLOCK_TIMEOUT_MS
            })
            .then(resp => {
                if (!resp.ok) { resolve(null); return; }
                return resp.json();
            })
            .then(data => {
                if (Array.isArray(data)) {
                    const match = data.find(entry => entry.videoID === videoId);
                    resolve(match);
                } else {
                    resolve(null);
                }
            })
            .catch(() => resolve(null));
        });
    }

    async function loadSponsorSegments(videoId) {
        if (!videoId) return;
        const s = state.sponsor;
        if (s.loadingToken && s.loadingToken !== videoId) {
            s.pendingVideoId = videoId;
            return;
        }
        if (s.videoId === videoId && !s.loadingToken) return;

        s.loadingToken = videoId;
        s.segments = [];
        s.lastSkipEnd = -1;
        try {
            const match = await fetchSponsorSegments(videoId);
            if (s.loadingToken !== videoId || getVideoId() !== videoId) return;
            if (match && Array.isArray(match.segments)) {
                const clean = [];
                for (const seg of match.segments) {
                    if (!seg || !Array.isArray(seg.segment) || seg.segment.length !== 2) continue;
                    const start = Number(seg.segment[0]);
                    const end = Number(seg.segment[1]);
                    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
                    if (seg.actionType === 'skip' || seg.actionType === 'full') {
                        clean.push({ start, end, category: seg.category, uuid: seg.UUID });
                    }
                }
                clean.sort((a,b) => a.start - b.start);
                s.segments = clean;
                s.videoId = videoId;
            }
        } finally {
            if (s.loadingToken === videoId) s.loadingToken = null;
            if (s.pendingVideoId) {
                const queued = s.pendingVideoId;
                s.pendingVideoId = null;
                setTimeout(() => loadSponsorSegments(queued), 0);
            }
        }
    }

    function attachSponsorBlockVideo() {
        const s = state.sponsor;
        const video = document.querySelector('video.html5-main-video');
        if (!video || video === s.video) return;
        if (s.video && s.timeupdateHandler) {
            try { s.video.removeEventListener('timeupdate', s.timeupdateHandler); } catch {}
        }
        s.video = video;
        const handler = function() {
            if (!isEnabled() || !state.features.sponsorBlock) return;
            if (!video.isConnected) { try { video.removeEventListener('timeupdate', handler); } catch {} return; }
            if (s.videoId !== getVideoId()) return;
            const t = video.currentTime;
            if (!Number.isFinite(t)) return;
            for (const seg of s.segments) {
                if (t < seg.start || t >= seg.end - 0.25) continue;
                if (s.lastSkipEnd >= seg.end - 0.01) continue;
                try {
                    const target = Math.min(seg.end, (video.duration || seg.end) - 0.01);
                    video.currentTime = Number.isFinite(target) && target > t ? target : seg.end;
                    s.lastSkipEnd = seg.end;
                    incrementStat('sponsorSkipped');
                    // Report view (optional)
                    try {
                        fetch(`https://sponsor.ajay.app/api/viewedVideoSponsorTime?UUID=${encodeURIComponent(seg.uuid)}`, { method: 'POST' });
                    } catch {}
                } catch {}
                return;
            }
        };
        s.timeupdateHandler = handler;
        try { video.addEventListener('timeupdate', handler); } catch {}
    }

    function onSponsorNav() {
        const vid = getVideoId();
        const s = state.sponsor;
        if (!vid) {
            s.segments = [];
            s.videoId = null;
            s.pendingVideoId = null;
            s.lastSkipEnd = -1;
            return;
        }
        if (vid !== s.videoId) {
            s.segments = [];
            s.lastSkipEnd = -1;
            loadSponsorSegments(vid);
        }
        attachSponsorBlockVideo();
    }

    function installSponsorBlock() {
        onSponsorNav();
        document.addEventListener('yt-navigate-finish', onSponsorNav);
        registerInterval(() => {
            if (!isEnabled() || !state.features.sponsorBlock) return;
            if (!state.sponsor.video || !state.sponsor.video.isConnected) {
                attachSponsorBlockVideo();
            }
            const vid = getVideoId();
            if (vid && vid !== state.sponsor.videoId && state.sponsor.loadingToken !== vid) {
                onSponsorNav();
            }
        }, 2000);
    }

    /* =========================================================================
     * ENGINE INSTALLATION
     * ===================================================================== */

    function installProxies() {
        if (state.proxiesInstalled) return;
        state.proxiesInstalled = true;

        installJSONParseProxy();
        installFetchProxy();
        installXHRProxy();
        installObjectAssignHook();
        installPropertyTraps();
        installAbnormalityBypass();
        installDOMBypassPrevention();
        installSSAPAutoSkip();
        installVideoAdFastForward();
        installTimerNeutralization();
        installServiceWorkerBlock();
        installWebpackChunkHook();
        updateCosmeticCSS();
        installSponsorBlock();
    }

    /* =========================================================================
     * INIT
     * ===================================================================== */

    loadState();
    installProxies();

    // Hook into the page's SponsorBlock toggle
    const sponsorToggle = document.getElementById('sponsorBlockToggle');
    if (sponsorToggle) {
        sponsorToggle.addEventListener('change', function() {
            state.features.sponsorBlock = this.checked;
            setSetting('feature_overrides', { sponsorBlock: this.checked });
            if (this.checked) {
                const vid = getVideoId();
                if (vid) loadSponsorSegments(vid);
                attachSponsorBlockVideo();
            } else {
                state.sponsor.segments = [];
                state.sponsor.videoId = null;
            }
        });
        // Sync initial state
        state.features.sponsorBlock = sponsorToggle.checked;
    }

    // Also sync with the page's player events
    if (window.player && typeof window.player.addEventListener === 'function') {
        window.player.addEventListener('onStateChange', function(e) {
            if (e.data === YT.PlayerState.PLAYING) {
                const vid = getVideoId();
                if (vid && state.features.sponsorBlock) {
                    loadSponsorSegments(vid);
                    attachSponsorBlockVideo();
                }
            }
        });
    }

    console.log(`[${SCRIPT_NAME}] v${SCRIPT_VERSION} loaded. Ad blocking and SponsorBlock active.`);
})();