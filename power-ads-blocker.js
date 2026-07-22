/**
 * Power Ads Blocker – Single JavaScript File
 * 
 * Features:
 * - Fetches EasyList rules (element‑hiding + domain blocking) from a CORS‑enabled mirror
 * - Registers a Service Worker to block ad/tracker domains at the network level
 * - Hides matching elements via CSS injection + MutationObserver
 * - On YouTube: replaces native player with a clean embed (no video ads)
 * - On YouTube: auto‑skips sponsor segments via SponsorBlock API
 * 
 * Usage:  <script src="power-ads-blocker.js"></script>   (place early in <head>)
 * 
 * @version 1.0.0
 * @license MIT
 */
(function () {
  'use strict';

  // ── CONFIGURATION ──────────────────────────────────────────────────
  const CONFIG = {
    // Primary EasyList source (CORS enabled on raw.githubusercontent.com)
    easylistUrl: 'https://raw.githubusercontent.com/easylist/easylist/master/easylist/easylist.txt',
    // Fallback mirrors
    mirrors: [
      'https://easylist.to/easylist/easylist.txt',                    // may not have CORS, but try
      'https://easylist-downloads.adblockplus.org/easylist.txt'        // CORS? possibly
    ],
    cacheKey: 'power-adblock-easylist-v2',
    cacheDuration: 24 * 60 * 60 * 1000,   // 24 hours
    sponsorCategories: ['sponsor', 'selfpromo', 'interaction', 'intro', 'outro', 'preview', 'filler', 'music_offtopic'],
    // Built‑in fallback selectors (used if EasyList cannot be loaded)
    fallbackSelectors: [
      '[class*="ad-"]', '[class*="-ad-"]', '[class*="_ad_"]',
      '[id*="ad-"]', '[id*="-ad-"]', '[id*="_ad_"]',
      '.adsbox', '.advertisement', '.banner-ad',
      'ins.adsbygoogle', '[data-ad-client]', '[data-ad-slot]',
      'iframe[src*="doubleclick.net"]', 'iframe[src*="adnxs.com"]',
      'iframe[src*="googlesyndication"]', '[aria-label*="advertisement"]',
      '.ad-container', '.ad-wrapper', '.google-ad', '.sponsored-content',
    ],
  };

  // ── GLOBAL STATE ──────────────────────────────────────────────────
  const STATE = {
    blockedDomains: [],
    selectors: [],
    observer: null,
    youtubeInterval: null,
    ytPlayer: null,
    adsHidden: 0,
    sponsorsSkipped: 0,
  };

  // ── LOGGING ───────────────────────────────────────────────────────
  const log = (msg, type = 'log') => console[type]('[PowerAdBlock]', msg);

  // ── HELPERS ────────────────────────────────────────────────────────
  const isYouTube = () => /(youtube\.com|youtu\.be)/i.test(location.hostname);
  const getVideoId = () => {
    const p = new URLSearchParams(location.search);
    if (p.get('v')) return p.get('v');
    const m = location.pathname.match(/\/(?:watch|embed|v|shorts)\/([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  };

  // Fetch with retry & timeout
  async function fetchWithRetry(url, retries = 3, timeoutMs = 8000) {
    for (let i = 0; i < retries; i++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (!text || text.length < 500) throw new Error('Response too short');
        return text;
      } catch (err) {
        log(`Fetch attempt ${i + 1}/${retries} failed: ${err.message}`, 'warn');
        if (i === retries - 1) throw err;
        await new Promise(r => setTimeout(r, 1500 * (i + 1)));
      }
    }
  }

  // localStorage cache
  function getCachedList() {
    try {
      const item = localStorage.getItem(CONFIG.cacheKey);
      if (!item) return null;
      const { ts, data } = JSON.parse(item);
      return (Date.now() - ts < CONFIG.cacheDuration) ? data : null;
    } catch { return null; }
  }
  function setCachedList(text) {
    try { localStorage.setItem(CONFIG.cacheKey, JSON.stringify({ ts: Date.now(), data: text })); } catch {}
  }

  // ── PARSER (EasyList → domains + selectors) ─────────────────────────
  function parseEasyList(text) {
    const domains = new Set();
    const selectors = new Set();
    const lines = text.split(/\r?\n/);
    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('!') || line.startsWith('[')) continue;
      // Cosmetic: ##selector
      if (line.includes('##') && !line.startsWith('##@')) {
        const parts = line.split('##');
        const sel = parts.slice(1).join('##').trim();
        if (sel && sel !== 'body' && sel !== 'html' && sel !== '*' && !sel.includes('{') && sel.length > 1) {
          selectors.add(sel);
        }
      }
      // Network: ||domain^
      else if (line.startsWith('||')) {
        const domainPart = line.split('^')[0].replace(/^\|\|/, '');
        if (domainPart && !domainPart.includes('*') && !domainPart.includes('?') && domainPart.includes('.') && domainPart.length > 3) {
          domains.add(domainPart.toLowerCase());
        }
      }
    }
    // Add well‑known tracker domains
    ['doubleclick.net','googlesyndication.com','googleadservices.com','adnxs.com','adsrvr.org',
     'taboola.com','outbrain.com','criteo.com','casalemedia.com','rubiconproject.com',
     'pubmatic.com','openx.net','moatads.com','adsafeprotected.com'].forEach(d => domains.add(d));
    return { domains: [...domains], selectors: [...selectors] };
  }

  // ── SERVICE WORKER ─────────────────────────────────────────────────
  async function registerServiceWorker(blockedDomains) {
    if (!('serviceWorker' in navigator)) {
      log('Service Worker not supported – domain blocking disabled.', 'warn');
      return;
    }
    // Unregister any previous SW we created
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      if (reg.active && reg.active.scriptURL.includes('power-adblock')) {
        await reg.unregister();
        log('Unregistered previous Service Worker.', 'log');
      }
    }

    const swCode = `
      const BLOCKED = ${JSON.stringify(blockedDomains)};
      const PATTERNS = [
        /doubleclick\\.net/i, /googlesyndication\\.com/i, /googleadservices\\.com/i,
        /adnxs\\.com/i, /adsrvr\\.org/i, /taboola\\.com/i, /outbrain\\.com/i,
        /criteo\\.com/i, /casalemedia\\.com/i, /rubiconproject\\.com/i,
        /pubmatic\\.com/i, /openx\\.net/i, /moatads\\.com/i, /adsafeprotected\\.com/i,
      ];
      function isBlocked(host) {
        const clean = host.replace(/^www\\./, '').toLowerCase();
        return BLOCKED.some(d => clean === d || clean.endsWith('.' + d)) ||
               PATTERNS.some(p => p.test(clean));
      }
      self.addEventListener('fetch', (e) => {
        try {
          const url = new URL(e.request.url);
          if (isBlocked(url.hostname)) {
            e.respondWith(new Response('', { status: 204, statusText: 'No Content' }));
          }
        } catch(_) {}
      });
      self.addEventListener('activate', e => e.waitUntil(clients.claim()));
      self.addEventListener('install', e => self.skipWaiting());
    `;
    const blob = new Blob([swCode], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);
    try {
      await navigator.serviceWorker.register(swUrl, { scope: '/' });
      log(`Service Worker registered – blocking ${blockedDomains.length} domains.`, 'log');
    } catch (err) {
      log(`Service Worker registration failed: ${err.message}`, 'error');
    }
    URL.revokeObjectURL(swUrl);
  }

  // ── COSMETIC FILTERING ─────────────────────────────────────────────
  function injectCosmeticRules(selectors) {
    if (!selectors.length) return;
    // Remove previous style
    const oldStyle = document.getElementById('power-adblock-cosmetic');
    if (oldStyle) oldStyle.remove();

    // Build CSS (chunked for readability)
    const style = document.createElement('style');
    style.id = 'power-adblock-cosmetic';
    const hideRule = '{display:none!important;visibility:hidden!important;height:0!important;width:0!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important;position:absolute!important;z-index:-9999!important;}';
    // Combine selectors with the same rule to keep CSS short
    const chunkSize = 250;
    for (let i = 0; i < selectors.length; i += chunkSize) {
      const chunk = selectors.slice(i, i + chunkSize).map(s => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"'));
      style.textContent += chunk.join(',') + hideRule + '\n';
    }
    (document.head || document.documentElement).appendChild(style);
    log(`Injected cosmetic rules (${selectors.length} selectors).`, 'log');

    // MutationObserver for dynamic ads
    if (STATE.observer) STATE.observer.disconnect();
    STATE.observer = new MutationObserver(mutations => {
      let shouldScan = false;
      for (const m of mutations) {
        if (m.addedNodes.length > 0) { shouldScan = true; break; }
      }
      if (!shouldScan) return;
      // Batch hide matching elements
      const scan = () => {
        for (const sel of selectors) {
          try {
            document.querySelectorAll(sel).forEach(el => {
              if (el.style.display !== 'none') {
                el.style.cssText = hideRule;
                STATE.adsHidden++;
              }
            });
          } catch {} // ignore invalid selectors
        }
      };
      if (window.requestIdleCallback) {
        requestIdleCallback(scan, { timeout: 200 });
      } else {
        setTimeout(scan, 50);
      }
    });
    STATE.observer.observe(document.documentElement, { childList: true, subtree: true });

    // Initial sweep
    setTimeout(() => {
      selectors.forEach(sel => {
        try {
          document.querySelectorAll(sel).forEach(el => {
            el.style.cssText = hideRule;
            STATE.adsHidden++;
          });
        } catch {}
      });
      log(`Initial sweep hidden ~${STATE.adsHidden} elements.`, 'log');
    }, 100);
  }

  // ── YOUTUBE SHIELD ─────────────────────────────────────────────────
  function formatTime(sec) {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2,'0')}`;
  }

  async function fetchAndSkipSponsors(videoId) {
    try {
      const cat = encodeURIComponent(JSON.stringify(CONFIG.sponsorCategories));
      const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}&categories=${cat}`;
      const resp = await fetch(url);
      if (!resp.ok) return log(`SponsorBlock API returned ${resp.status}`, 'warn');
      const segments = await resp.json();
      if (!segments || !segments.length) return;
      log(`SponsorBlock: ${segments.length} segments loaded.`, 'log');

      if (STATE.youtubeInterval) clearInterval(STATE.youtubeInterval);
      STATE.youtubeInterval = setInterval(() => {
        const player = STATE.ytPlayer;
        if (!player || typeof player.getCurrentTime !== 'function') return;
        if (getVideoId() !== videoId) {
          clearInterval(STATE.youtubeInterval);
          STATE.youtubeInterval = null;
          return;
        }
        const t = player.getCurrentTime();
        for (const seg of segments) {
          const [start, end] = seg.segment;
          if (t >= start - 0.3 && t < end - 0.1) {
            player.seekTo(end, true);
            STATE.sponsorsSkipped++;
            log(`⏭️ Skipped sponsor: ${formatTime(start)} → ${formatTime(end)}`, 'log');
            if (seg.UUID) {
              fetch(`https://sponsor.ajay.app/api/viewedVideoSponsorTime?UUID=${seg.UUID}`, { method: 'POST', mode: 'no-cors' }).catch(()=>{});
            }
            break;
          }
        }
      }, 400);
    } catch (e) {
      log(`SponsorBlock error: ${e.message}`, 'error');
    }
  }

  function replaceYouTubePlayer(videoId) {
    if (!videoId) return;
    const playerEl = document.querySelector('#movie_player, .html5-video-player, #player-container');
    if (!playerEl || document.getElementById('power-adblock-yt-embed')) return;
    log(`Replacing YouTube player for ${videoId}`, 'log');

    // Pause original video
    const origVideo = playerEl.querySelector('video');
    if (origVideo) { origVideo.pause(); origVideo.src = ''; origVideo.load(); }
    // Remove ad elements
    playerEl.querySelectorAll('.video-ads, .ytp-ad-module, .ytp-ad-image-overlay, .ytp-ad-player-overlay, .ytd-display-ad-renderer, [class*="ad-"], [id*="ad-"]').forEach(e => e.remove());
    playerEl.style.position = playerEl.style.position || 'relative';
    playerEl.style.minHeight = '360px';

    const iframe = document.createElement('iframe');
    iframe.id = 'power-adblock-yt-embed';
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&iv_load_policy=3&fs=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
    iframe.allowFullscreen = true;
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;z-index:100;pointer-events:all;background:#000;';
    iframe.title = 'Ad-Free YouTube Player';
    playerEl.appendChild(iframe);

    // Load IFrame API if needed
    if (!document.getElementById('power-adblock-yt-api')) {
      const script = document.createElement('script');
      script.id = 'power-adblock-yt-api';
      script.src = 'https://www.youtube.com/iframe_api';
      script.onload = () => initSponsorBlock(videoId);
      script.onerror = () => log('YouTube IFrame API failed to load.', 'warn');
      document.head.appendChild(script);
    } else if (window.YT && window.YT.Player) {
      initSponsorBlock(videoId);
    } else {
      const orig = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof orig === 'function') orig();
        initSponsorBlock(videoId);
      };
    }
  }

  function initSponsorBlock(videoId) {
    if (typeof YT === 'undefined' || !YT.Player) {
      setTimeout(() => initSponsorBlock(videoId), 500);
      return;
    }
    try {
      STATE.ytPlayer = new YT.Player('power-adblock-yt-embed', {
        events: {
          onReady: () => {
            log('YouTube embed ready – SponsorBlock active.', 'log');
            fetchAndSkipSponsors(videoId);
          },
          onError: e => log(`YouTube embed error: ${e.data}`, 'warn'),
        },
      });
    } catch (e) {
      log(`Failed to create YT.Player: ${e.message}`, 'error');
    }
  }

  function observeYouTubeSPA() {
    if (!isYouTube()) return;
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        if (STATE.youtubeInterval) { clearInterval(STATE.youtubeInterval); STATE.youtubeInterval = null; }
        const oldEmbed = document.getElementById('power-adblock-yt-embed');
        if (oldEmbed) oldEmbed.remove();
        const wait = setInterval(() => {
          const vid = getVideoId();
          const player = document.querySelector('#movie_player, .html5-video-player, #player-container');
          if (vid && player && !document.getElementById('power-adblock-yt-embed')) {
            clearInterval(wait);
            replaceYouTubePlayer(vid);
          }
        }, 600);
      }
    }).observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  function initYouTube() {
    if (!isYouTube()) return;
    log('YouTube detected – activating shield.', 'log');
    observeYouTubeSPA();
    const vid = getVideoId();
    const playerEl = document.querySelector('#movie_player, .html5-video-player, #player-container');
    if (vid && playerEl) {
      setTimeout(() => replaceYouTubePlayer(vid), 1000);
    } else {
      const wait = setInterval(() => {
        const v = getVideoId();
        const p = document.querySelector('#movie_player, .html5-video-player, #player-container');
        if (v && p && !document.getElementById('power-adblock-yt-embed')) {
          clearInterval(wait);
          replaceYouTubePlayer(v);
        }
      }, 700);
      setTimeout(() => clearInterval(wait), 15000);
    }
  }

  // ── MAIN INIT ──────────────────────────────────────────────────────
  async function init() {
    log('🚀 Power Ads Blocker starting...');
    let rawList = getCachedList();
    if (rawList) log('Using cached EasyList.');

    if (!rawList) {
      // Try primary + mirrors
      const allUrls = [CONFIG.easylistUrl, ...CONFIG.mirrors];
      for (const url of allUrls) {
        try {
          rawList = await fetchWithRetry(url);
          if (rawList && rawList.length > 500) {
            setCachedList(rawList);
            log(`EasyList fetched from ${url}`);
            break;
          }
        } catch (err) {
          log(`Failed: ${url}`, 'warn');
        }
      }
    }

    let domains = [], selectors = [];
    if (rawList && rawList.length > 500) {
      const parsed = parseEasyList(rawList);
      domains = parsed.domains;
      selectors = parsed.selectors;
      log(`Parsed ${domains.length} domains, ${selectors.length} selectors.`);
    } else {
      log('EasyList unavailable – using fallback selectors.', 'warn');
      selectors = [...CONFIG.fallbackSelectors];
    }

    // Store domain list for possible later use
    STATE.blockedDomains = domains;
    STATE.selectors = selectors;

    // Register Service Worker (domain blocking) – only if secure context and we have domains
    if (domains.length > 0 && window.isSecureContext && 'serviceWorker' in navigator) {
      registerServiceWorker(domains);
    } else {
      log('Skipping Service Worker (no domains or insecure context).');
    }

    // Inject cosmetic rules
    if (selectors.length > 0) injectCosmeticRules(selectors);

    // YouTube
    initYouTube();

    log('✅ Power Ads Blocker ready.');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for debugging
  window.PowerAdBlocker = {
    STATE,
    init,
    parseEasyList,
    injectCosmeticRules,
    replaceYouTubePlayer,
    fetchAndSkipSponsors,
  };
})();
