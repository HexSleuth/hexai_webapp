// ==UserScript==
// @name         SponsorBlock Hidden Auto-Skip
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Silently fetches and auto‑skips sponsor segments. No UI.
// @author       You
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @match        https://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const API_BASE = 'https://sponsor.ajay.app/api';
    const CATEGORIES = ['sponsor', 'selfpromo', 'interaction', 'intro', 'outro', 'preview', 'filler', 'music_offtopic'];

    let currentVideoId = null;
    let segments = [];
    let skippedUUIDs = new Set();
    let pendingSkip = false;
    let videoElement = null;

    // ── Helpers ─────────────────────────────────
    function extractVideoIdFromURL() {
        const p = new URLSearchParams(location.search);
        if (p.get('v')) return p.get('v');
        // youtu.be
        if (location.hostname === 'youtu.be') return location.pathname.slice(1);
        return null;
    }

    // ── API Fetch ───────────────────────────────
    async function fetchSegments(videoId) {
        const catParam = encodeURIComponent(JSON.stringify(CATEGORIES));
        const url = `${API_BASE}/skipSegments?videoID=${encodeURIComponent(videoId)}&categories=${catParam}`;
        try {
            const res = await fetch(url);
            if (res.status === 404) return [];
            if (!res.ok) throw new Error(res.status);
            return await res.json();
        } catch (e) {
            console.debug('[SponsorBlock] fetch error:', e);
            return [];
        }
    }

    // ── Video element detection ─────────────────
    function findVideoElement() {
        return document.querySelector('video');
    }

    // ── Auto‑skip loop ──────────────────────────
    function checkAndSkip() {
        if (!videoElement || pendingSkip || !segments.length) return;
        const t = videoElement.currentTime;
        for (const seg of segments) {
            const [start, end] = seg.segment;
            if (t >= start - 0.1 && t < end - 0.05 && !skippedUUIDs.has(seg.UUID)) {
                skippedUUIDs.add(seg.UUID);
                pendingSkip = true;
                videoElement.currentTime = end;
                // Unset pending after a short delay to avoid re‑trigger during the seek
                setTimeout(() => { pendingSkip = false; }, 200);
                break;
            }
        }
    }

    // ── Main watch loop ─────────────────────────
    function startMonitor() {
        setInterval(() => {
            const newVideoId = extractVideoIdFromURL();
            if (newVideoId && newVideoId !== currentVideoId) {
                currentVideoId = newVideoId;
                segments = [];
                skippedUUIDs.clear();
                // Fetch segments for the new video
                fetchSegments(newVideoId).then(segs => {
                    segments = segs;
                });
            }
            // Update video element reference (YouTube can swap it)
            const v = findVideoElement();
            if (v && v !== videoElement) {
                videoElement = v;
                // Remove old listeners to be safe, then add timeupdate listener
                // We'll rely on the interval instead of event to avoid duplicates,
                // but we can use timeupdate for faster response.
                videoElement.addEventListener('timeupdate', checkAndSkip);
            }
            // Manual check every interval
            checkAndSkip();
        }, 500);
    }

    // ── Initialise ──────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startMonitor);
    } else {
        startMonitor();
    }
})();
