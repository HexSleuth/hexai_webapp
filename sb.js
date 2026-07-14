// ==UserScript==
// @name         sb.js configurable userscript
// @description  SponsorBlock userscript with config support for GitHub Pages
// @namespace    mchang.name
// @homepage     https://github.com/mchangrh/sb.js
// @icon         https://mchangrh.github.io/sb.js/icon.png
// @version      1.3.2
// @license      LGPL-3.0-or-later
// @match        https://www.youtube.com/watch*
// @match        https://mchangrh.github.io/sb.js/config
// @connect      sponsor.ajay.app
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    // Configuration with GitHub Pages support
    const getJSONSetting = (key, fallback) => {
        try {
            return JSON.parse(GM_getValue(key, fallback));
        } catch (e) {
            return JSON.parse(fallback);
        }
    };

    // Default settings
    const categories = getJSONSetting("categories", `["sponsor","selfpromo","interaction","intro","outro","preview","music_offtopic","exclusive_access","poi_highlight"]`);
    const actionTypes = getJSONSetting("actionTypes", `["skip","mute","full","poi"]`);
    const skipThreshold = getJSONSetting("skipThreshold", `[0.2,1]`);
    const serverEndpoint = GM_getValue("serverEndpoint", "https://sponsor.ajay.app");
    const skipTracking = GM_getValue("skipTracking", true);
    const highlightKey = GM_getValue("highlightKey", "Enter");

    const VERSION = "1.3.2";

    // Initial setup
    let video, videoID, muteEndTime;
    let skipSegments = new Map();
    let muteSegments = new Map();

    // Helper functions
    const getVideoID = () => new URL(window.location.href).searchParams.get("v");

    function getJSON(url, callback) {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.responseType = "json";
        xhr.onload = () => xhr.status == 200 ? callback(null, xhr.response) : callback(xhr.status);
        xhr.send();
    }

    const trackSkip = uuid => {
        if (!skipTracking) return;
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${serverEndpoint}/api/viewedVideoSponsorTime?UUID=${uuid}`);
        xhr.send();
    };

    function fetch(videoID) {
        const url = `${serverEndpoint}/api/skipSegments?videoID=${videoID}&categories=${JSON.stringify(categories)}&actionTypes=${JSON.stringify(actionTypes)}`;
        const convertSegment = s => [s.segment[0], { end: s.segment[1], uuid: s.UUID }];
        
        getJSON(url, (err, data) => {
            if (err) return console.error("[SB.js]", "error fetching segments", err);
            data.forEach(s => {
                if (s.actionType === "skip") skipSegments.set(...convertSegment(s));
                else if (s.actionType === "mute") muteSegments.set(...convertSegment(s));
                else if (s.actionType === "full") createVideoLabel(s);
                else if (s.actionType === "poi") createPOILabel(s);
            });
            console.log("[SB.js] Loaded Segments");
        });
    }

    function skipOrMute() {
        const currentTime = video.currentTime;
        
        if (video.muted && currentTime >= muteEndTime) {
            video.muted = false;
            muteEndTime = 0;
        }

        const skipEnd = findEndTime(currentTime, skipSegments);
        if (skipEnd) video.currentTime = skipEnd;

        const muteEnd = findEndTime(currentTime, muteSegments);
        if (muteEnd) {
            video.muted = true;
            muteEndTime = muteEnd;
        }
    }

    function findEndTime(now, map) {
        let endTime;
        for (const startTime of map.keys()) {
            if (now + skipThreshold[0] >= startTime && now - startTime <= skipThreshold[1]) {
                const segment = map.get(startTime);
                endTime = segment.end;
                trackSkip(segment.uuid);
                map.delete(startTime);

                for (const overlapStart of map.keys()) {
                    if (endTime >= overlapStart && overlapStart >= now) {
                        const overSegment = map.get(overlapStart);
                        endTime = overSegment.end;
                        trackSkip(overSegment.uuid);
                        map.delete(overlapStart);
                    }
                }
                return endTime;
            }
        }
        return endTime;
    }

    function createPOILabel(poiLabel) {
        createVideoLabel(poiLabel, "poi");
        const poi_listener = e => {
            if (e.key === highlightKey) {
                video.currentTime = poiLabel.segment[1];
                trackSkip(poiLabel.UUID);
                document.querySelector("#sbjs-label-poi").style.display = "none";
                document.removeEventListener("keydown", poi_listener);
            }
        };
        document.addEventListener("keydown", poi_listener);
    }

    function createVideoLabel(videoLabel, type = "full") {
        const title = document.querySelector("#title h1, h1.title.ytd-video-primary-info-renderer");
        if (!title) {
            setTimeout(createVideoLabel, 200, videoLabel);
            return;
        }

        const category = videoLabel.category;
        const fvString = category => `The entire video is ${category} and is too tightly integrated to be able to separate`;
        
        const styles = {
            sponsor: ["#0d0", "#111", fvString("sponsor")],
            selfpromo: ["#ff0", "#111", fvString("selfpromo")],
            exclusive_access: ["#085", "#fff", "This video showcases a product, service or location that they've received free or subsidized access to"],
            poi_highlight: ["#f18", "#fff", `Press ${highlightKey} to skip to the highlight`],
        };

        const style = styles[category];
        if (!style) return;

        const label = document.createElement("span");
        label.title = style[2];
        label.innerText = category;
        label.id = `sbjs-label-${type}`;
        label.style = `color: ${style[1]}; background-color: ${style[0]}; display: flex; margin: 0 5px; padding: 0 5px; border-radius: 3px;`;
        
        title.style = "display: flex; align-items: center;";
        title.prepend(label);
    }

    const reset = () => {
        video = undefined;
        videoID = undefined;
        muteEndTime = 0;
        skipSegments = new Map();
        muteSegments = new Map();
    };

    function setup() {
        if (videoID === getVideoID()) return;
        
        console.log(`@mchangrh/SB.js ${VERSION} Loaded`);
        console.log(`Uses SponsorBlock data licensed under CC BY-NC-SA 4.0 from https://sponsor.ajay.app/`);
        
        if (document.querySelector("#previewbar")) {
            console.log("[SB.js] Extension Present, Exiting");
            return;
        }

        video = document.querySelector("video");
        videoID = getVideoID();
        fetch(videoID);
        
        if (!video) {
            console.log("[SB.js] no video");
            return;
        }
        
        video.addEventListener("timeupdate", skipOrMute);
    }

    // GitHub Pages Config Page Support
    function setupConfigPage() {
        const placeholder = document.getElementById("placeholder");
        const config = document.getElementById("config");
        
        if (placeholder) placeholder.style.display = "none";
        if (config) config.style.display = "block";

        const categoryInput = document.getElementById("categories");
        const actionTypesInput = document.getElementById("actionTypes");
        const skipThresholdStart = document.getElementById("skipThresholdStart");
        const skipThresholdEnd = document.getElementById("skipThresholdEnd");
        const serverEndpointInput = document.getElementById("serverEndpoint");
        const highlightKeyInput = document.getElementById("highlightKey");
        const submitButton = document.getElementById("submit");

        if (!categoryInput || !submitButton) return;

        const setHtml = (elem, value) => elem.value = value;
        const prettyPrint = obj => JSON.stringify(obj, null, 2);
        const rinseJSON = obj => JSON.stringify(JSON.parse(obj));
        
        const setValue = (key, value, defaultValue) => {
            if (value !== defaultValue) GM_setValue(key, value);
        };

        setHtml(categoryInput, prettyPrint(categories));
        setHtml(actionTypesInput, prettyPrint(actionTypes));
        setHtml(skipThresholdStart, skipThreshold[0]);
        setHtml(skipThresholdEnd, skipThreshold[1]);
        setHtml(serverEndpointInput, serverEndpoint);
        setHtml(highlightKeyInput, highlightKey);

        submitButton.addEventListener("click", () => {
            setValue("categories", rinseJSON(categoryInput.value), JSON.stringify(categories));
            setValue("actionTypes", rinseJSON(actionTypesInput.value), JSON.stringify(actionTypes));
            setValue("skipThreshold", JSON.stringify([skipThresholdStart.value, skipThresholdEnd.value]), JSON.stringify(skipThreshold));
            setValue("serverEndpoint", serverEndpointInput.value, serverEndpoint);
            setValue("highlightKey", highlightKeyInput.value, highlightKey);
            alert("Settings saved! Refresh YouTube to apply changes.");
        });
    }

    // Event listeners
    document.addEventListener("yt-navigate-start", reset);
    document.addEventListener("yt-navigate-finish", setup);
    
    // Initial setup
    if (window.location.href.includes("youtube.com/watch")) {
        setup();
    } else if (window.location.href.includes("mchangrh.github.io/sb.js/config")) {
        setupConfigPage();
    }
})();
