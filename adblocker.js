// ==UserScript==
// @name         Power Ad Blocker (EasyList + YouTube + SponsorBlock)
// @namespace    https://yourdomain.com
// @version      2.0
// @description  Blocks ads using EasyList, bypasses YouTube ad detection, removes popups, and skips sponsors.
// @author       You
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @match        https://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      easylist.to
// @connect      sponsor.ajay.app
// ==/UserScript==

(function() {
    'use strict';

    // ─── CONFIGURATION ──────────────────────────────────────────────
    const CONFIG = {
        enableEasyList: true,           // Block general ads with EasyList
        enableYouTubeBypass: true,      // Replace YouTube player with no-ad iframe
        enableSponsorBlock: true,       // Auto-skip sponsor segments
        enablePopupRemoval: true,       // Remove "Ad blocker detected" popups
        enableUpdateCheck: true,        // Check for script updates (optional)
        debug: true,
    };

    // ─── 1. EASYLIST ELEMENT HIDING ─────────────────────────────────
    // Download and apply EasyList rules (from build-adblocker.js)
    let adSelectors = [];

    function fetchEasyList(callback) {
        if (!CONFIG.enableEasyList) return callback();
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://easylist.to/easylist/easylist.txt',
            onload: function(response) {
                const text = response.responseText;
                const lines = text.split(/\r?\n/);
                const selectors = [];
                for (let line of lines) {
                    line = line.trim();
                    if (!line || line.startsWith('!') || line.startsWith('[Adblock') || line.startsWith('#')) continue;
                    if (line.startsWith('##') && !line.startsWith('##@')) {
                        let sel = line.slice(2);
                        if (sel === 'body' || sel === 'html' || sel === '*') continue;
                        selectors.push(sel);
                    }
                }
                adSelectors = selectors;
                log(`EasyList loaded: ${selectors.length} selectors`);
                callback();
            },
            onerror: function() {
                log('Failed to fetch EasyList, using fallback (empty)');
                callback();
            }
        });
    }

    function removeAdElements() {
        if (!CONFIG.enableEasyList || adSelectors.length === 0) return;
        let removed = 0;
        adSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                if (el.parentNode) {
                    el.parentNode.removeChild(el);
                    removed++;
                }
            });
        });
        if (removed > 0) log(`Removed ${removed} ad elements via EasyList`);
    }

    // ─── 2. YOUTUBE AD BYPASS (iframe replacement) ────────────────
    let isVideoPlayerModified = false;
    let currentVideoId = null;
    let videoElement = null;

    function extractVideoId() {
        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.search);
        if (params.has('v')) return params.get('v');
        if (url.hostname === 'youtu.be') return url.pathname.slice(1);
        return null;
    }

    function replacePlayerWithEmbed() {
        if (!CONFIG.enableYouTubeBypass) return;
        if (window.location.href.includes('shorts')) return; // skip shorts
        const videoId = extractVideoId();
        if (!videoId || videoId === currentVideoId) return;

        currentVideoId = videoId;
        log(`Replacing player for video ${videoId}`);

        // Remove existing iframes (from previous replacements)
        document.querySelectorAll('.html5-video-player iframe').forEach(iframe => iframe.remove());

        const player = document.querySelector('.html5-video-player');
        if (!player) return;

        // Build embed URL (no ads)
        const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`;

        const iframe = document.createElement('iframe');
        iframe.src = embedUrl;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.zIndex = '9999';
        iframe.style.pointerEvents = 'all';
        player.appendChild(iframe);
        isVideoPlayerModified = true;
    }

    function clearAllPlayers() {
        document.querySelectorAll('.html5-video-player iframe').forEach(iframe => iframe.remove());
        isVideoPlayerModified = false;
    }

    // ─── 3. SPONSORBLOCK AUTO‑SKIP ──────────────────────────────────
    const API_BASE = 'https://sponsor.ajay.app/api';
    const CATEGORIES = ['sponsor', 'selfpromo', 'interaction', 'intro', 'outro', 'preview', 'filler', 'music_offtopic'];
    let segments = [];
    let skippedUUIDs = new Set();
    let pendingSkip = false;

    function fetchSponsorSegments(videoId) {
        if (!CONFIG.enableSponsorBlock) return;
        const catParam = encodeURIComponent(JSON.stringify(CATEGORIES));
        const url = `${API_BASE}/skipSegments?videoID=${encodeURIComponent(videoId)}&categories=${catParam}`;
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function(resp) {
                if (resp.status === 404) { segments = []; return; }
                if (resp.status !== 200) return;
                try {
                    segments = JSON.parse(resp.responseText);
                    log(`SponsorBlock: ${segments.length} segments loaded`);
                } catch(e) {
                    log('SponsorBlock parse error', e);
                }
            }
        });
    }

    function checkAndSkip() {
        if (!CONFIG.enableSponsorBlock) return;
        if (!videoElement || pendingSkip || segments.length === 0) return;
        const t = videoElement.currentTime;
        for (const seg of segments) {
            const [start, end] = seg.segment;
            if (t >= start - 0.1 && t < end - 0.05 && !skippedUUIDs.has(seg.UUID)) {
                skippedUUIDs.add(seg.UUID);
                pendingSkip = true;
                videoElement.currentTime = end;
                setTimeout(() => { pendingSkip = false; }, 200);
                log(`Skipped sponsor segment (${start}s → ${end}s)`);
                break;
            }
        }
    }

    // ─── 4. POPUP REMOVER ────────────────────────────────────────────
    function removePopup() {
        if (!CONFIG.enablePopupRemoval) return;
        const modal = document.querySelector('tp-yt-iron-overlay-backdrop');
        const popup = document.querySelector('.style-scope ytd-enforcement-message-view-model');
        const dismissBtn = document.getElementById('dismiss-button');

        if (modal) {
            modal.removeAttribute('opened');
            modal.remove();
        }
        if (popup) {
            if (dismissBtn) dismissBtn.click();
            popup.remove();
            // Resume video if paused
            const video = document.querySelector('video');
            if (video && video.paused) video.play();
            log('Popup removed');
        }
    }

    // ─── 5. UPDATE CHECK (optional) ─────────────────────────────────
    function checkForUpdate() {
        if (!CONFIG.enableUpdateCheck) return;
        const scriptUrl = 'https://raw.githubusercontent.com/YourRepo/your-script/main/script.user.js';
        GM_xmlhttpRequest({
            method: 'GET',
            url: scriptUrl,
            onload: function(resp) {
                const data = resp.responseText;
                const match = data.match(/@version\s+(\d+\.\d+)/);
                if (!match) return;
                const remoteVersion = parseFloat(match[1]);
                const localVersion = parseFloat(GM_info.script.version);
                if (remoteVersion > localVersion) {
                    log(`Update available: ${remoteVersion} (current: ${localVersion})`);
                    // Show a nice popup (you can use SweetAlert2 if you want)
                    if (confirm('A new version is available. Update now?')) {
                        window.location.href = scriptUrl;
                    }
                }
            }
        });
    }

    // ─── 6. MAIN LOOP & OBSERVERS ──────────────────────────────────
    function log(msg, level = 'info') {
        if (!CONFIG.debug) return;
        const prefix = '[PowerAdBlocker]';
        console[level](`${prefix} ${msg}`);
    }

    function init() {
        // Load EasyList first
        fetchEasyList(() => {
            removeAdElements();
        });

        // YouTube specific setup
        if (window.location.href.includes('youtube.com/watch')) {
            replacePlayerWithEmbed();
            fetchSponsorSegments(currentVideoId);
        }

        // Start periodic tasks
        setInterval(() => {
            // Re-run ad removal for dynamic content
            if (CONFIG.enableEasyList) removeAdElements();

            // Remove popups
            if (CONFIG.enablePopupRemoval) removePopup();

            // YouTube player replacement (if page changed)
            if (window.location.href.includes('youtube.com/watch')) {
                const newId = extractVideoId();
                if (newId !== currentVideoId) {
                    clearAllPlayers();
                    replacePlayerWithEmbed();
                    if (newId) fetchSponsorSegments(newId);
                }
            }
        }, 2000);

        // Monitor video element for SponsorBlock time updates
        const monitorVideo = () => {
            const v = document.querySelector('video');
            if (v && v !== videoElement) {
                videoElement = v;
                videoElement.addEventListener('timeupdate', checkAndSkip);
                log('Video element attached');
            }
        };
        setInterval(monitorVideo, 500);

        // Update check (once)
        checkForUpdate();

        // MutationObserver for ad removal (faster than setInterval)
        if (CONFIG.enableEasyList) {
            const observer = new MutationObserver(() => {
                clearTimeout(observer._timer);
                observer._timer = setTimeout(removeAdElements, 300);
            });
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'id']
            });
        }

        log('Power Ad Blocker started');
    }

    // ─── START ──────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
