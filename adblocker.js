/**
 * ============================================================================
 *  Universal AdBlocker – Host Blocking + Element Hiding + YouTube Bypass +
 *  SponsorBlock Mute (No Skip) – Full Single‑File Solution
 * ============================================================================
 */
(function() {
    "use strict";

    // ========================================================================
    //  1. CONFIGURATION (Editable)
    // ========================================================================
    const CONFIG = {
        // Network host blocking (intercepts fetch/XHR and removes blocked resources)
        enableHostBlocking: true,

        // Fetch the latest StevenBlack hosts list (needs internet)
        useRemoteHosts: false,  // Set to true to fetch ~80,000 ad domains
        remoteHostsUrl: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts',

        // DOM element hiding (EasyList selectors)
        enableElementHiding: true,

        // YouTube specific
        replaceYouTubePlayer: true,
        removeYouTubePopups: true,

        // SponsorBlock (mute sponsors, no skip)
        muteSponsors: true,
        // Categories to mute (matches sb.js defaults)
        sponsorCategories: [
            "sponsor", "selfpromo", "interaction", "intro",
            "outro", "preview", "music_offtopic", "exclusive_access", "poi_highlight"
        ],

        // Debug logs
        debug: true
    };

    // ========================================================================
    //  2. HOST LIST (Network Blocking)
    // ========================================================================
    let blockedHosts = new Set([
        // Major ad networks
        'doubleclick.net', 'googleadservices.com', 'googlesyndication.com',
        'adsense.com', 'adnxs.com', 'pubmatic.com', 'openx.net',
        'rubiconproject.com', 'criteo.com', 'taboola.com', 'outbrain.com',
        'amazon-adsystem.com', 'scorecardresearch.com', 'exelator.com',
        'adsafeprotected.com', 'moatads.com', 'adserver.com', 'adtech.com',
        'adzerk.net', 'appnexus.com', 'bidswitch.net', 'casalemedia.com',
        'contextweb.com', 'cpxinteractive.com', 'doubleverify.com',
        'everesttech.net', 'indexww.com', 'media.net', 'sovrn.com',
        'turn.com', 'yieldmanager.com', 'ads.youtube.com', 'googleads.g.doubleclick.net',
        'adservice.google.com', 'pagead2.googlesyndication.com',
        'static.adsafeprotected.com', 'tpc.googlesyndication.com',
        'securepubads.g.doubleclick.net', 'partner.googleadservices.com',
        'ad.doubleclick.net', 'adclick.g.doubleclick.net', 'google.com/ads',
        // Tracking / analytics that serve ads
        'googletagmanager.com', 'google-analytics.com', 'facebook.com/tr',
        'connect.facebook.net', 'bing.com', 'mc.yandex.ru',
        // Outbrain / Taboola
        'odb.outbrain.com', 'widgets.outbrain.com',
        'cdn.taboola.com', 'api.taboola.com',
        // Popunders / interstitials
        'popads.net', 'popunder.net', 'popupads.com'
    ]);

    // Fetch remote host list if enabled
    if (CONFIG.useRemoteHosts) {
        fetch(CONFIG.remoteHostsUrl)
            .then(res => res.text())
            .then(text => {
                text.split('\n').forEach(line => {
                    const parts = line.trim().split(/\s+/);
                    if (line.startsWith('#') || parts.length < 2) return;
                    const host = parts[1];
                    if (host && host.includes('.') && !host.startsWith('0.0.0.0')) {
                        blockedHosts.add(host);
                    }
                });
                if (CONFIG.debug) console.log(`[AdBlocker] Loaded ${blockedHosts.size} remote hosts`);
            })
            .catch(e => console.warn('[AdBlocker] Could not fetch remote hosts, using built-in list.'));
    }

    // Helper: check if URL matches any blocked host
    function isBlockedHost(url) {
        if (!url || typeof url !== 'string') return false;
        try {
            const hostname = new URL(url).hostname;
            for (const host of blockedHosts) {
                if (hostname === host || hostname.endsWith('.' + host)) {
                    return true;
                }
            }
        } catch (e) { /* ignore invalid URLs */ }
        return false;
    }

    // ========================================================================
    //  3. NETWORK INTERCEPTORS (Host Blocking)
    // ========================================================================
    if (CONFIG.enableHostBlocking) {
        // ---- Block fetch() ----
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            if (isBlockedHost(url)) {
                console.log('[AdBlocker] Blocked fetch request to:', url);
                return Promise.reject(new Error('Blocked by adblocker'));
            }
            return originalFetch.call(this, url, options);
        };

        // ---- Block XMLHttpRequest ----
        const XHR = XMLHttpRequest;
        const originalOpen = XHR.prototype.open;
        XHR.prototype.open = function(method, url, async, user, password) {
            if (isBlockedHost(url)) {
                console.log('[AdBlocker] Blocked XHR request to:', url);
                return; // abort silently
            }
            return originalOpen.call(this, method, url, async, user, password);
        };

        // ---- Block resource tags (script, img, iframe, link, etc.) ----
        function removeBlockedResources() {
            const tags = ['script', 'img', 'iframe', 'link', 'embed', 'object'];
            tags.forEach(tag => {
                const attr = (tag === 'link') ? 'href' : 'src';
                document.querySelectorAll(`${tag}[${attr}]`).forEach(el => {
                    const url = el.getAttribute(attr);
                    if (isBlockedHost(url)) {
                        el.remove();
                        console.log(`[AdBlocker] Removed blocked ${tag} with URL:`, url);
                    }
                });
            });
        }

        // Run regularly to catch new resources
        const resourceObserver = new MutationObserver(() => {
            clearTimeout(resourceObserver._timer);
            resourceObserver._timer = setTimeout(removeBlockedResources, 300);
        });
        resourceObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    }

    // ========================================================================
    //  4. DOM ELEMENT HIDING (EasyList Selectors)
    // ========================================================================
    const AD_SELECTORS = [
        // General
        '#adcontainer', '#adframe', '#advertisement', '#adsense',
        '.ad-banner', '.ad-box', '.ad-container', '.ad-wrapper',
        '.adsbygoogle', '.google-ads', '.sponsored', '.sponsored-link',

        // YouTube
        'ytd-ad-slot-renderer', 'ytd-in-feed-ad-layout-renderer',
        'ytd-banner-promo-renderer', 'ytd-video-masthead-ad-v3-renderer',
        'ytd-display-ad-renderer', 'ytd-action-companion-ad-renderer',
        'ytd-promoted-sparkles-web-renderer', 'ytd-statement-banner-renderer',
        'yt-mealbar-promo-renderer', 'yt-about-this-ad-renderer',
        '#player-ads', '#masthead-ad', '#panels',

        // Common third‑party
        '.ad-placement', '.ad-unit', '.advertisement-box',
        '.ad-slot', '.ad-banner-container', '.ad-leaderboard',
        '.ad-rectangle', '.ad-skyscraper', '.ad-300x250'
    ];

    function removeAds() {
        if (!CONFIG.enableElementHiding) return;
        let removed = 0;
        AD_SELECTORS.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                if (el.parentNode) {
                    el.parentNode.removeChild(el);
                    removed++;
                }
            });
        });
        if (removed > 0 && CONFIG.debug) console.log(`[AdBlocker] Removed ${removed} ad elements`);
    }

    // Run on load and watch for changes
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', removeAds);
    } else {
        removeAds();
    }

    const domObserver = new MutationObserver(() => {
        clearTimeout(domObserver._timer);
        domObserver._timer = setTimeout(removeAds, 200);
    });
    domObserver.observe(document.documentElement, {
        childList: true, subtree: true, attributes: true,
        attributeFilter: ['class', 'id', 'style']
    });

    // ========================================================================
    //  5. YOUTUBE‑SPECIFIC BLOCKING
    // ========================================================================
    function isYouTube() {
        return window.location.hostname.includes('youtube.com');
    }

    // Remove anti‑adblock popup
    function removeYouTubePopup() {
        if (!CONFIG.removeYouTubePopups) return;
        const popup = document.querySelector('tp-yt-iron-overlay-backdrop, ytd-enforcement-message-view-model, #error-screen');
        if (popup) {
            popup.remove();
            const video = document.querySelector('video');
            if (video && video.paused) video.play();
            if (CONFIG.debug) console.log('[AdBlocker] Removed YouTube popup');
        }
    }

    // Replace native player with nocookie iframe (ad‑free)
    function replaceYouTubePlayer() {
        if (!CONFIG.replaceYouTubePlayer) return;
        const player = document.querySelector('.html5-video-player');
        if (!player) return;
        if (player.querySelector('iframe[src*="youtube-nocookie.com"]')) return;

        const videoId = new URLSearchParams(window.location.search).get('v');
        if (!videoId) return;

        const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`;
        const iframe = document.createElement('iframe');
        iframe.src = embedUrl;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        iframe.style.cssText = 'width:100%; height:100%; position:absolute; top:0; left:0; z-index:9999;';
        player.appendChild(iframe);

        // Mute/remove the original video to prevent double audio
        const nativeVideo = document.querySelector('video');
        if (nativeVideo) nativeVideo.muted = true;

        if (CONFIG.debug) console.log('[AdBlocker] Replaced player with ad‑free embed');
    }

    // Periodic YouTube cleanup
    function youtubeCleanup() {
        if (!isYouTube()) return;
        removeYouTubePopup();
        replaceYouTubePlayer();
        // Also remove page ads (Extra) using DOM removal
        document.querySelectorAll('ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer').forEach(el => el.remove());
    }

    if (isYouTube()) {
        setInterval(youtubeCleanup, 1000);
        document.addEventListener('yt-navigate-start', () => setTimeout(youtubeCleanup, 500));
    }

    // ========================================================================
    //  6. SPONSORBLOCK – MUTE (NOT SKIP) SPONSOR SEGMENTS
    // ========================================================================
    let sponsorSegments = [];
    let sponsorVideoId = null;
    let muteStart = 0, muteEnd = 0;
    let videoElement = null;

    async function fetchSponsorSegments(videoId) {
        const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${encodeURIComponent(videoId)}&categories=${JSON.stringify(CONFIG.sponsorCategories)}`;
        try {
            const res = await fetch(url);
            if (res.status === 404) return [];
            if (!res.ok) throw new Error(res.status);
            const data = await res.json();
            return data.filter(s => s.actionType === 'skip' || s.actionType === 'mute');
        } catch (e) {
            if (CONFIG.debug) console.debug('[AdBlocker] SponsorBlock error:', e);
            return [];
        }
    }

    function checkSponsorMute() {
        if (!videoElement || !CONFIG.muteSponsors) return;
        const t = videoElement.currentTime;

        // If currently muted and passed the end, unmute
        if (videoElement.muted && t >= muteEnd) {
            videoElement.muted = false;
            muteStart = 0; muteEnd = 0;
            return;
        }

        // Check if we are inside any sponsor segment
        for (const seg of sponsorSegments) {
            const [start, end] = seg.segment;
            if (t >= start && t < end) {
                if (!videoElement.muted) {
                    videoElement.muted = true;
                    muteStart = start; muteEnd = end;
                    if (CONFIG.debug) console.log(`[AdBlocker] Muted sponsor segment (${start}s → ${end}s)`);
                }
                return;
            }
        }
    }

    function initSponsorBlock(videoId) {
        if (videoId === sponsorVideoId) return;
        sponsorVideoId = videoId;
        sponsorSegments = [];
        videoElement = document.querySelector('video');
        if (!videoElement) return;

        fetchSponsorSegments(videoId).then(seg => {
            sponsorSegments = seg;
            if (CONFIG.debug) console.log(`[AdBlocker] Loaded ${seg.length} sponsor segments`);
        });

        videoElement.addEventListener('timeupdate', checkSponsorMute);
    }

    // Watch for video changes on YouTube
    if (isYouTube()) {
        const vidWatcher = new MutationObserver(() => {
            const vid = new URLSearchParams(window.location.search).get('v');
            if (vid) initSponsorBlock(vid);
        });
        vidWatcher.observe(document, { subtree: true, childList: true });
        const initial = new URLSearchParams(window.location.search).get('v');
        if (initial) initSponsorBlock(initial);
    }

    // ========================================================================
    //  7. CONFIGURATION PAGE (Optional – for GitHub Pages)
    //     If you have a config page at /sb.js/config, this will load.
    // ========================================================================
    if (window.location.href.includes('mchangrh.github.io/sb.js/config')) {
        const placeholder = document.getElementById('placeholder');
        const config = document.getElementById('config');
        if (placeholder) placeholder.style.display = 'none';
        if (config) config.style.display = 'block';

        // (You can expand this to load/save settings using localStorage)
        console.log('[AdBlocker] Config page loaded – set your preferences.');
    }

    // ========================================================================
    //  STARTUP LOG
    // ========================================================================
    console.log('[AdBlocker] Active – Blocks hosts, removes ad elements, bypasses YouTube, mutes sponsors (no skip).');
})();
