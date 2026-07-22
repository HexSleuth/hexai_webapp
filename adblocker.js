/**
 * Power Ads Blocker – GitHub Pages Single‑File Edition
 * 
 * • Fetches latest EasyList rules (element‑hiding + domain blocking)
 * • Registers a Service Worker to block ad/tracker domains
 * • Hides matching elements via CSS + MutationObserver
 * • On YouTube: replaces the native player with a clean embed (no video ads)
 * • On YouTube: auto‑skips sponsor segments via SponsorBlock API
 * 
 * Usage: <script src="adsblocker.js"></script> (place early in <head>)
 */
(async function () {
  'use strict';

  // ── CONFIGURATION ──────────────────────────────────────────────────
  const EASYLIST_URL = 'https://easylist.to/easylist/easylist.txt';
  const CACHE_KEY = 'adblock-easylist';
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  const SPONSOR_CATEGORIES = [
    'sponsor', 'selfpromo', 'interaction', 'intro', 'outro',
    'preview', 'filler', 'music_offtopic'
  ];

  // Built‑in fallback selectors (used if EasyList cannot be fetched)
  const FALLBACK_SELECTORS = [
    '[class*="ad-"]', '[class*="-ad-"]', '[class*="_ad_"]',
    '[id*="ad-"]',   '[id*="-ad-"]',   '[id*="_ad_"]',
    '.adsbox', '.advertisement', '.banner-ad',
    'ins.adsbygoogle', '[data-ad-client]', '[data-ad-slot]',
    'iframe[src*="doubleclick.net"]', 'iframe[src*="adnxs.com"]'
  ];

  // ── HELPERS ────────────────────────────────────────────────────────
  const log = (...args) => console.log('[AdBlocker]', ...args);

  // Fetch with timeout + retry
  async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }

  // localStorage cache
  function getCachedList() {
    try {
      const item = localStorage.getItem(CACHE_KEY);
      if (!item) return null;
      const { timestamp, data } = JSON.parse(item);
      return (Date.now() - timestamp < CACHE_DURATION) ? data : null;
    } catch { return null; }
  }
  function setCachedList(list) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: list })); } catch {}
  }

  // ── PARSER (EasyList → domains + selectors) ─────────────────────────
  function parseEasyList(text) {
    const domains = new Set();
    const selectors = [];

    for (let line of text.split(/\r?\n/)) {
      line = line.trim();
      if (!line || line.startsWith('!') || line.startsWith('[')) continue;

      // Cosmetic rules: ##selector
      if (line.startsWith('##') && !line.startsWith('##@')) {
        const sel = line.slice(2);
        if (sel && sel !== 'body' && sel !== 'html' && sel !== '*') {
          selectors.push(sel);
        }
        continue;
      }

      // Network blocking: ||domain^
      if (line.startsWith('||')) {
        const domainPart = line.split('^')[0].replace(/^\|\|/, '');
        if (domainPart && !domainPart.includes('*') && !domainPart.startsWith('/')) {
          domains.add(domainPart.toLowerCase());
        }
      }
    }
    return { domains: [...domains], selectors };
  }

  // ── SERVICE WORKER (network‑level domain blocking) ─────────────────
  async function registerServiceWorker(blockedDomains) {
    if (!('serviceWorker' in navigator)) {
      log('Service Worker not supported – domain blocking disabled.');
      return;
    }

    const swCode = `
const BLOCKED = ${JSON.stringify(blockedDomains)};
self.addEventListener('fetch', (event) => {
  const host = new URL(event.request.url).hostname.replace(/^www\\./, '');
  if (BLOCKED.some(d => host === d || host.endsWith('.' + d))) {
    event.respondWith(new Response('', { status: 204, statusText: 'No Content' }));
  }
});
self.addEventListener('activate', event => event.waitUntil(clients.claim()));
    `;

    const blob = new Blob([swCode], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);

    try {
      const reg = await navigator.serviceWorker.register(swUrl, { scope: '/' });
      log('Service Worker registered – blocking ' + blockedDomains.length + ' domains.');
      URL.revokeObjectURL(swUrl);
    } catch (err) {
      log('Service Worker registration failed:', err);
    }
  }

  // ── COSMETIC HIDING ────────────────────────────────────────────────
  function injectCosmeticRules(selectors) {
    if (!selectors.length) return;

    const css = selectors.map(s => `${s}{display:none!important;}`).join('\n');
    const style = document.createElement('style');
    style.id = 'adblock-cosmetic';
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);

    // MutationObserver for dynamic ads
    const observer = new MutationObserver(() => {
      selectors.forEach(sel => {
        try {
          document.querySelectorAll(sel).forEach(el => el.remove());
        } catch {}
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    log('Cosmetic rules injected (' + selectors.length + ' selectors).');
  }

  // ── YOUTUBE: EMBED + SPONSORBLOCK ─────────────────────────────────
  function isYouTube() { return location.hostname.includes('youtube.com'); }
  function getVideoId() { return new URLSearchParams(location.search).get('v'); }

  function replaceYouTubePlayer(videoId) {
    if (!videoId) return;
    const player = document.querySelector('.html5-video-player');
    if (!player) return;

    // Clean existing content
    player.querySelectorAll('video').forEach(v => v.remove());
    player.querySelectorAll('.video-ads, .ytp-ad-module').forEach(a => a.remove());

    // Create clean iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'yt-adblock-embed';
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;z-index:10;pointer-events:all;';

    player.innerHTML = '';
    player.appendChild(iframe);
    log('YouTube player replaced with ad‑free embed.');

    // Load YouTube iframe API if needed
    if (!window.YT) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }

    // When API ready, enable SponsorBlock
    function initSponsorBlock() {
      if (typeof YT === 'undefined' || !YT.Player) {
        setTimeout(initSponsorBlock, 300);
        return;
      }
      window._ytPlayer = new YT.Player('yt-adblock-embed', {
        events: {
          onReady: () => {
            log('YouTube embed ready – SponsorBlock active.');
            fetchAndSkipSponsors(videoId);
          }
        }
      });
    }

    if (window.YT && window.YT.Player) initSponsorBlock();
    else window.onYouTubeIframeAPIReady = initSponsorBlock;
  }

  async function fetchAndSkipSponsors(videoId) {
    try {
      const cat = encodeURIComponent(JSON.stringify(SPONSOR_CATEGORIES));
      const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}&categories=${cat}`;
      const resp = await fetch(url);
      if (!resp.ok) return;
      const segments = await resp.json();
      if (!segments.length) return;

      log(`SponsorBlock: ${segments.length} segments loaded.`);
      // Loop that checks and skips every 300ms
      const interval = setInterval(() => {
        if (!window._ytPlayer || !window._ytPlayer.getCurrentTime) return;
        const t = window._ytPlayer.getCurrentTime();
        for (const seg of segments) {
          const [start, end] = seg.segment;
          if (t >= start - 0.1 && t < end - 0.05) {
            window._ytPlayer.seekTo(end, true);
            // Optional: track skip (uncomment to send view)
            // fetch(`https://sponsor.ajay.app/api/viewedVideoSponsorTime?UUID=${seg.UUID}`, { method: 'POST' });
            break;
          }
        }
        // Stop loop when video ID changes (new navigation)
        if (getVideoId() !== videoId) {
          clearInterval(interval);
        }
      }, 300);
    } catch (e) {
      log('SponsorBlock fetch error:', e);
    }
  }

  // Watch for YouTube’s SPA navigation
  function observeYouTubeNavigation() {
    if (!isYouTube()) return;
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        // Wait for new player
        const wait = setInterval(() => {
          const vid = getVideoId();
          const player = document.querySelector('.html5-video-player');
          if (vid && player) {
            clearInterval(wait);
            replaceYouTubePlayer(vid);
          }
        }, 500);
      }
    }).observe(document, { subtree: true, childList: true });
  }

  function initYouTube() {
    if (!isYouTube()) return;
    observeYouTubeNavigation();
    const vid = getVideoId();
    if (vid && document.querySelector('.html5-video-player')) {
      replaceYouTubePlayer(vid);
    } else {
      const wait = setInterval(() => {
        const v = getVideoId();
        if (v && document.querySelector('.html5-video-player')) {
          clearInterval(wait);
          replaceYouTubePlayer(v);
        }
      }, 500);
    }
  }

  // ── INITIALIZATION ──────────────────────────────────────────────────
  async function init() {
    log('Starting...');

    // 1. Get EasyList (cached or live)
    let raw = getCachedList();
    if (!raw) {
      try {
        raw = await fetchWithRetry(EASYLIST_URL);
        setCachedList(raw);
      } catch (err) {
        log('EasyList fetch failed – using built‑in fallback.');
        injectCosmeticRules(FALLBACK_SELECTORS);
      }
    } else {
      log('Using cached EasyList.');
    }

    // 2. Parse and apply rules
    if (raw) {
      const { domains, selectors } = parseEasyList(raw);
      log(`Parsed: ${domains.length} domains, ${selectors.length} selectors`);

      // Network blocking via Service Worker
      if (domains.length) registerServiceWorker(domains);

      // Cosmetic hiding
      const allSelectors = [...new Set([...selectors, ...FALLBACK_SELECTORS])];
      injectCosmeticRules(allSelectors);
    }

    // 3. YouTube special handling
    initYouTube();

    log('Ready – ads and sponsors disabled.');
  }

  // Run as soon as possible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
