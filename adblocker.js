// ==UserScript==
// @name         Unified Ad Blocker (Video & Music) - No Skip
// @namespace    https://yourdomain.com
// @version      3.0
// @description  Blocks ads on YouTube Video & Music. Removes popups, hides banners, and mutes ad overlays. No timeline skipping.
// @author       You
// @match        https://www.youtube.com/watch*
// @match        https://music.youtube.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      easylist.to
// ==/UserScript==

(function() {
    'use strict';

    // ─── CONFIGURATION ──────────────────────────────────────────────
    const CONFIG = {
        enableEasyList: true,        // Hide banners using EasyList
        enablePopupRemoval: true,    // Remove "Ad blocker detected" popups
        enableVideoBypass: true,     // Replace player with no-ad iframe (YouTube Video)
        enableMusicBlock: true,      // Mute and hide ad overlays (YouTube Music)
        debug: true,
    };

    // ─── LOGGING ────────────────────────────────────────────────────
    function log(msg, level = 'info') {
        if (!CONFIG.debug) return;
        console[level](`[UniversalBlocker] ${msg}`);
    }

    // ─── 1. EASYLIST LOADER (Banner Ads) ──────────────────────────
    let adSelectors = [];
    let easyListLoaded = false;

    function fetchEasyList(callback) {
        if (!CONFIG.enableEasyList) return callback();
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://easylist.to/easylist/easylist.txt',
            onload: function(resp) {
                const lines = resp.responseText.split(/\r?\n/);
                const selectors = [];
                for (let line of lines) {
                    line = line.trim();
                    if (!line || line.startsWith('!') || line.startsWith('[Adblock')) continue;
                    if (line.startsWith('##') && !line.startsWith('##@')) {
                        let sel = line.slice(2);
                        if (sel === 'body' || sel === 'html' || sel === '*') continue;
                        selectors.push(sel);
                    }
                }
                adSelectors = selectors;
                easyListLoaded = true;
                log(`EasyList loaded: ${selectors.length} selectors`);
                callback();
            },
            onerror: function() {
                log('EasyList fetch failed, using fallback', 'warn');
                easyListLoaded = true;
                callback();
            }
        });
    }

    function hideBannerAds() {
        if (!CONFIG.enableEasyList || !easyListLoaded || adSelectors.length === 0) return;
        let removed = 0;
        adSelectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                if (el.parentNode) {
                    el.parentNode.removeChild(el);
                    removed++;
                }
            });
        });
        if (removed > 0) log(`Removed ${removed} banner ad elements`);
    }

    // ─── 2. POPUP REMOVER (Ad Blocker Detected) ──────────────────
    function removePopups() {
        if (!CONFIG.enablePopupRemoval) return;
        const selectors = [
            'tp-yt-iron-overlay-backdrop',
            'ytd-enforcement-message-view-model',
            'ytd-modal-with-title-and-button-renderer',
            'ytmusic-modal-renderer',
            'ytmusic-panel-renderer',
            '[role="dialog"][aria-label*="ad blocker"]',
            '#dismiss-button'
        ];
        let removed = false;
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                if (el.parentNode) {
                    el.parentNode.removeChild(el);
                    removed = true;
                }
            });
        });
        if (removed) {
            log('Ad blocker popup removed');
            const video = document.querySelector('video');
            if (video && video.paused) video.play();
        }
    }

    // ─── 3. VIDEO PAGE HANDLER (YouTube Watch) ────────────────────
    function extractVideoId() {
        const url = new URL(window.location.href);
        if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('?')[0];
        const params = new URLSearchParams(url.search);
        return params.get('v') || null;
    }

    let videoPlayerReplaced = false;

    function handleVideoPage() {
        if (!CONFIG.enableVideoBypass) return;
        if (window.location.href.includes('shorts')) return; // Skip shorts
        if (videoPlayerReplaced) return;

        const player = document.querySelector('#movie_player, #player-container, .html5-video-player');
        if (!player) return;

        const videoId = extractVideoId();
        if (!videoId) return;

        // Prevent infinite replacement
        if (player.querySelector('iframe[data-adblocker="true"]')) {
            videoPlayerReplaced = true;
            return;
        }

        log(`Replacing player for video ${videoId} (no skip hack)`);

        // Build clean embed URL (no ads, no tracking)
        const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`;

        const iframe = document.createElement('iframe');
        iframe.src = embedUrl;
        iframe.dataset.adblocker = 'true';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.zIndex = '9999';
        iframe.style.pointerEvents = 'all';

        // Hide native video to avoid conflicts
        const nativeVideo = player.querySelector('video');
        if (nativeVideo) nativeVideo.style.display = 'none';

        player.appendChild(iframe);
        videoPlayerReplaced = true;
        log('Video player replaced with clean embed.');
    }

    // ─── 4. MUSIC PAGE HANDLER (Mute + Hide Ads) ──────────────────
    let musicAdMuted = false;

    function handleMusicPage() {
        if (!CONFIG.enableMusicBlock) return;

        const player = document.querySelector('#player, .ytmusic-player-page');
        const video = document.querySelector('video');
        if (!player || !video) return;

        // Detect if an ad is showing (without using currentTime)
        const isAd = player.classList.contains('ad-showing') ||
                     !!document.querySelector('ytmusic-ad-preview-renderer, .ytmusic-ad-preview-renderer, ytmusic-ad-skip-renderer');

        if (isAd) {
            // Remove the ad overlay entirely (blocks visual ad)
            const adOverlay = document.querySelector('ytmusic-ad-preview-renderer, .ytmusic-ad-preview-renderer');
            if (adOverlay) adOverlay.remove();

            // Remove skip button (we don't use it)
            const skipBtn = document.querySelector('ytmusic-ad-skip-renderer, #skip-button');
            if (skipBtn) skipBtn.remove();

            // Mute the audio (blocks auditory ad) – no skip used
            if (!video.muted) {
                video.muted = true;
                musicAdMuted = true;
                log('Ad detected – muted audio and removed overlay (no skip).');
            }
        } else {
            // Unmute when ad ends
            if (video.muted && musicAdMuted) {
                video.muted = false;
                musicAdMuted = false;
                log('Ad ended – unmuted audio.');
            }
        }
    }

    // ─── 5. MONITORING & OBSERVERS ──────────────────────────────────
    function isVideoPage() {
        return window.location.hostname === 'www.youtube.com' && window.location.pathname.startsWith('/watch');
    }

    function isMusicPage() {
        return window.location.hostname === 'music.youtube.com';
    }

    function init() {
        // Load EasyList
        fetchEasyList(() => hideBannerAds());

        log('Unified Ad Blocker started.');

        // Periodic checks (every 1.5s)
        setInterval(() => {
            hideBannerAds();
            removePopups();

            if (isVideoPage()) {
                handleVideoPage();
            } else if (isMusicPage()) {
                handleMusicPage();
            }
        }, 1500);

        // MutationObserver for dynamic content (faster reaction)
        const observer = new MutationObserver(() => {
            setTimeout(() => {
                hideBannerAds();
                removePopups();
                if (isVideoPage()) handleVideoPage();
                if (isMusicPage()) handleMusicPage();
            }, 300);
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });

        // Handle SPA navigation (YT Video & Music)
        document.addEventListener('yt-navigate-start', () => {
            if (isVideoPage()) videoPlayerReplaced = false;
            if (isMusicPage()) musicAdMuted = false;
        });

        document.addEventListener('yt-navigate-finish', () => {
            setTimeout(() => {
                if (isVideoPage()) handleVideoPage();
                if (isMusicPage()) handleMusicPage();
                removePopups();
            }, 500);
        });
    }

    // ─── START ──────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
