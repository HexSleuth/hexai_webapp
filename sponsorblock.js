/**
 * SponsorBlock Auto‑Skip – standalone script
 * Include with: <script src="sponsorblock.js"></script>
 * Requires: YouTube IFrame API loaded (or runs on youtube.com/watch).
 * Repository: https://sponsor.ajay.app/
 * API Docs:   https://wiki.sponsor.ajay.app/w/API_Docs
 */
(function () {
  'use strict';

  // ── Configuration ──────────────────────────────────────────────
  const API_BASE = 'https://sponsor.ajay.app/api';
  const CATEGORIES = [
    { id: 'sponsor', label: 'Sponsor', emoji: '💼' },
    { id: 'selfpromo', label: 'Self-Promo', emoji: '📣' },
    { id: 'interaction', label: 'Interaction', emoji: '👆' },
    { id: 'intro', label: 'Intro', emoji: '🎬' },
    { id: 'outro', label: 'Outro', emoji: '👋' },
    { id: 'preview', label: 'Preview', emoji: '👀' },
    { id: 'filler', label: 'Filler', emoji: '📦' },
    { id: 'music_offtopic', label: 'Music Off-Topic', emoji: '🎵' }
  ];

  // ── State ──────────────────────────────────────────────────────
  let settings = {
    autoSkip: true,
    showNotifications: true,
    categories: Object.fromEntries(CATEGORIES.map(c => [c.id, true])),
    stats: { totalSkipped: 0, totalTimeSaved: 0 }
  };
  let currentVideoId = null;
  let segments = [];
  let skippedUUIDs = new Set();
  let player = null;           // YT.Player instance
  let pendingSkip = false;
  let panelEl = null, toastEl = null;

  // ── Persistence (localStorage) ─────────────────────────────────
  function loadSettings() {
    try {
      const saved = localStorage.getItem('sponsorblock_js');
      if (saved) Object.assign(settings, JSON.parse(saved));
    } catch (_) {}
  }
  function saveSettings() {
    localStorage.setItem('sponsorblock_js', JSON.stringify(settings));
  }

  // ── Helpers ────────────────────────────────────────────────────
  const fmtTime = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  const fmtDur = s => s < 60 ? `${Math.round(s)}s` : `${Math.floor(s/60)}m ${Math.round(s%60)}s`;

  // ── UI: Floating Panel ─────────────────────────────────────────
  function createPanel() {
    if (panelEl) return;
    panelEl = document.createElement('div');
    panelEl.id = 'sb-panel';
    panelEl.innerHTML = `
      <div id="sb-header">
        <span>🎯 SponsorBlock</span>
        <span id="sb-status">idle</span>
      </div>
      <div id="sb-list"></div>
      <div id="sb-stats">
        <span>⏭ <span id="sb-skipped">0</span> skips</span>
        <span>⌛ <span id="sb-saved">0s</span> saved</span>
      </div>
      <div id="sb-controls">
        <label><input type="checkbox" id="sb-autoskip" ${settings.autoSkip ? 'checked' : ''}> Auto</label>
        <label><input type="checkbox" id="sb-notify" ${settings.showNotifications ? 'checked' : ''}> Notify</label>
      </div>
    `;
    // Styles injected via JS (no external CSS)
    const style = document.createElement('style');
    style.textContent = `
      #sb-panel {
        position: fixed; top: 70px; right: 20px; z-index: 99999;
        background: #1a1a2e; color: #e0e0e0; border-radius: 10px;
        padding: 14px; width: 280px; font-family: system-ui, sans-serif;
        box-shadow: 0 8px 30px rgba(0,0,0,0.5); font-size: 0.85rem;
        border: 1px solid #2a2a4a;
      }
      #sb-header { display:flex; justify-content:space-between; margin-bottom:8px; font-weight:bold; }
      #sb-status { font-size:0.7rem; color:#aaa; }
      #sb-list { max-height:250px; overflow-y:auto; margin-bottom:8px; }
      .sb-seg {
        display:flex; align-items:center; justify-content:space-between;
        padding:6px 8px; border-radius:6px; margin-bottom:4px;
        background:#16213e; font-size:0.75rem;
      }
      .sb-seg.skipped { opacity:0.5; border-left:3px solid #2ecc71; }
      .sb-cat { padding:2px 7px; border-radius:12px; font-weight:600; font-size:0.65rem; text-transform:uppercase; }
      .cat-sponsor{background:#e94560;color:#fff}.cat-selfpromo{background:#f39c12;color:#000}
      .cat-interaction{background:#9b59b6;color:#fff}.cat-intro{background:#3498db;color:#fff}
      .cat-outro{background:#1abc9c;color:#000}.cat-preview{background:#e67e22;color:#fff}
      .cat-filler{background:#7f8c8d;color:#fff}.cat-music_offtopic{background:#2ecc71;color:#000}
      .sb-time { margin:0 8px; white-space:nowrap; }
      .sb-btn {
        background:transparent; border:1px solid #555; color:#ddd;
        border-radius:4px; padding:2px 8px; cursor:pointer; font-size:0.7rem;
      }
      .sb-btn:hover { background:#333; }
      #sb-stats { display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:6px; }
      #sb-controls { display:flex; gap:10px; font-size:0.75rem; }
      #sb-controls label { cursor:pointer; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(panelEl);

    document.getElementById('sb-autoskip').addEventListener('change', e => {
      settings.autoSkip = e.target.checked;
      saveSettings();
    });
    document.getElementById('sb-notify').addEventListener('change', e => {
      settings.showNotifications = e.target.checked;
      saveSettings();
    });
  }

  function updatePanelStatus(text) {
    const el = document.getElementById('sb-status');
    if (el) el.textContent = text;
  }

  function renderSegments() {
    const list = document.getElementById('sb-list');
    if (!list) return;
    if (!segments.length) {
      list.innerHTML = '<div style="text-align:center;color:#888;">No sponsor segments</div>';
      return;
    }
    const sorted = [...segments].sort((a,b) => a.segment[0] - b.segment[0]);
    list.innerHTML = sorted.map(seg => {
      const [s,e] = seg.segment;
      const cat = CATEGORIES.find(c => c.id === seg.category) || { id: seg.category, label: seg.category, emoji:'🏷️' };
      const skipped = skippedUUIDs.has(seg.UUID);
      return `<div class="sb-seg ${skipped ? 'skipped' : ''}" data-uuid="${seg.UUID}">
        <span class="sb-cat cat-${seg.category}">${cat.emoji} ${cat.label}</span>
        <span class="sb-time">${fmtTime(s)} → ${fmtTime(e)}</span>
        <button class="sb-btn" data-uuid="${seg.UUID}" data-start="${s}" data-end="${e}">
          ${skipped ? '↩' : '⏭'}
        </button>
      </div>`;
    }).join('');

    list.querySelectorAll('.sb-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const uuid = btn.dataset.uuid;
        const start = +btn.dataset.start;
        const end = +btn.dataset.end;
        if (skippedUUIDs.has(uuid)) {
          // Undo
          skippedUUIDs.delete(uuid);
          if (player && player.seekTo) player.seekTo(start - 0.5, true);
          settings.stats.totalSkipped = Math.max(0, settings.stats.totalSkipped - 1);
          settings.stats.totalTimeSaved = Math.max(0, settings.stats.totalTimeSaved - (end - start));
        } else {
          // Skip
          skippedUUIDs.add(uuid);
          if (player && player.seekTo) player.seekTo(end, true);
          settings.stats.totalSkipped++;
          settings.stats.totalTimeSaved += (end - start);
          showToast(seg.category, start, end, () => {
            skippedUUIDs.delete(uuid);
            if (player) player.seekTo(start - 0.5, true);
            settings.stats.totalSkipped = Math.max(0, settings.stats.totalSkipped - 1);
            settings.stats.totalTimeSaved = Math.max(0, settings.stats.totalTimeSaved - (end - start));
            updateStats();
            renderSegments();
            saveSettings();
          });
        }
        updateStats();
        renderSegments();
        saveSettings();
      });
    });
  }

  function updateStats() {
    document.getElementById('sb-skipped').textContent = settings.stats.totalSkipped;
    document.getElementById('sb-saved').textContent = fmtDur(settings.stats.totalTimeSaved);
  }

  function showToast(catId, start, end, undoFn) {
    if (!settings.showNotifications) return;
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:100000;display:flex;flex-direction:column;gap:8px;';
      document.body.appendChild(toastEl);
    }
    const cat = CATEGORIES.find(c => c.id === catId) || { emoji:'📌', label:catId };
    const toast = document.createElement('div');
    toast.className = 'sb-toast';
    toast.style.cssText = `
      background:#1a1a2e;color:#ddd;border:1px solid #2a2a4a;border-radius:8px;
      padding:12px 18px;box-shadow:0 4px 20px rgba(0,0,0,0.4);display:flex;
      align-items:center;gap:10px;animation:sb-slidein 0.3s ease;
    `;
    toast.innerHTML = `<span>${cat.emoji}</span> <span><strong>${cat.label}</strong> skipped (${fmtTime(start)} → ${fmtTime(end)})</span>
      <button style="background:none;border:none;color:#ff6b81;cursor:pointer;font-size:0.9rem;margin-left:auto;">↩ Undo</button>`;
    toast.querySelector('button').addEventListener('click', () => {
      if (undoFn) undoFn();
      toast.remove();
    });
    toastEl.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 5000);
  }

  // ── API Fetch ──────────────────────────────────────────────────
  async function fetchSegments(videoId) {
    const enabled = Object.entries(settings.categories).filter(([,v]) => v).map(([k]) => k);
    if (!enabled.length) return [];
    const url = `${API_BASE}/skipSegments?videoID=${encodeURIComponent(videoId)}&categories=${encodeURIComponent(JSON.stringify(enabled))}`;
    const res = await fetch(url);
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`API ${res.status}`);
    return await res.json();
  }

  async function loadVideo(videoId) {
    if (videoId === currentVideoId) return;
    currentVideoId = videoId;
    segments = [];
    skippedUUIDs.clear();
    updatePanelStatus('loading…');
    try {
      segments = await fetchSegments(videoId);
      updatePanelStatus(segments.length ? `${segments.length} segments` : 'none');
      renderSegments();
      // If player already exists, start checking
      if (player && player.getCurrentTime && settings.autoSkip) autoCheck();
    } catch (err) {
      updatePanelStatus('error');
      console.error('SponsorBlock fetch error:', err);
    }
  }

  // ── Auto‑skip logic ───────────────────────────────────────────
  function autoCheck() {
    if (!player || !player.getCurrentTime || !settings.autoSkip || pendingSkip || !segments.length) return;
    const t = player.getCurrentTime();
    for (const seg of segments) {
      const [s, e] = seg.segment;
      if (t >= s - 0.1 && t < e - 0.05 && !skippedUUIDs.has(seg.UUID)) {
        skippedUUIDs.add(seg.UUID);
        pendingSkip = true;
        player.seekTo(e, true);
        settings.stats.totalSkipped++;
        settings.stats.totalTimeSaved += (e - s);
        updateStats();
        saveSettings();
        showToast(seg.category, s, e, () => {
          skippedUUIDs.delete(seg.UUID);
          if (player) player.seekTo(s - 0.5, true);
          settings.stats.totalSkipped = Math.max(0, settings.stats.totalSkipped - 1);
          settings.stats.totalTimeSaved = Math.max(0, settings.stats.totalTimeSaved - (e - s));
          updateStats();
          renderSegments();
          saveSettings();
        });
        renderSegments();
        setTimeout(() => { pendingSkip = false; }, 200);
        break;
      }
    }
  }

  // ── Player detection & hooking ─────────────────────────────────
  function hookPlayer(ytPlayer) {
    if (player === ytPlayer) return;
    player = ytPlayer;
    // Start polling for time updates (YouTube IFrame API doesn't give us continuous events)
    setInterval(autoCheck, 250);
    // Try to get video ID
    const videoData = player.getVideoData?.();
    if (videoData && videoData.video_id) {
      loadVideo(videoData.video_id);
    } else {
      // Fallback: look at page URL if on youtube.com
      const urlParams = new URLSearchParams(location.search);
      const vid = urlParams.get('v');
      if (vid) loadVideo(vid);
    }
  }

  // Watch for YT.Player instances (global YT object)
  function watchYTPlayers() {
    if (typeof YT === 'undefined' || !YT.Player) {
      // Retry until YT is loaded
      setTimeout(watchYTPlayers, 500);
      return;
    }
    // Override YT.Player constructor to hook new instances
    const OrigPlayer = YT.Player;
    YT.Player = function (...args) {
      const instance = new OrigPlayer(...args);
      hookPlayer(instance);
      return instance;
    };
    // Also check for already existing players (rare)
    if (window.yt && window.yt.player && window.yt.player.getPlayerByElement) {
      // YouTube's own page structure – not easily accessible, skip
    }
  }

  // ── Initialisation ────────────────────────────────────────────
  function init() {
    loadSettings();
    createPanel();
    updateStats();
    watchYTPlayers();

    // If we are on youtube.com/watch, also try to hook the native player
    if (location.hostname.includes('youtube.com')) {
      const videoId = new URLSearchParams(location.search).get('v');
      if (videoId) {
        // Wait a moment for the player to appear, then try to grab it
        const checkPlayer = setInterval(() => {
          const videoEl = document.querySelector('video');
          if (videoEl) {
            // Unfortunately the native YouTube player isn't a YT.Player instance accessible from JS
            // But we can still fetch segments for the video and show the panel.
            // For actual auto‑skip we would need a userscript (cross‑origin). As a plain script we can't control the video.
            // We will still fetch segments and allow manual skip via the panel.
            loadVideo(videoId);
            clearInterval(checkPlayer);
          }
        }, 1000);
        // Stop after 10 seconds
        setTimeout(() => clearInterval(checkPlayer), 10000);
      }
    }
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose a global API (optional)
  window.SponsorBlock = {
    loadVideo,
    getSegments: () => segments,
    skipSegment: (uuid) => {
      const seg = segments.find(s => s.UUID === uuid);
      if (seg && !skippedUUIDs.has(uuid) && player) {
        skippedUUIDs.add(uuid);
        player.seekTo(seg.segment[1], true);
        // update stats, etc. (simplified)
      }
    }
  };
})();