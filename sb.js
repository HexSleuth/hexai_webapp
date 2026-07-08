/* sb.js – SponsorBlock for standard web pages */
/* Uses data from https://sponsor.ajay.app/ */

// ===== SETTINGS =====
const categories = ["sponsor","selfpromo","interaction","intro","outro","preview","music_offtopic","exclusive_access","poi_highlight"];
const actionTypes = ["skip","mute","full","poi"];
const skipThreshold = [0.2, 1];
const serverEndpoint = "https://sponsor.ajay.app";
const skipTracking = true;
const highlightKey = "Enter";

// ===== SCRIPT =====
const VERSION = "1.3.2";
let video, videoID, muteEndTime;
let skipSegments = new Map();
let muteSegments = new Map();

const getVideoID = () => new URL(window.location.href).searchParams.get("v");

function getJSON(url, callback) {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", url);
  xhr.responseType = "json";
  xhr.onload = () => xhr.status === 200 ? callback(null, xhr.response) : callback(xhr.status);
  xhr.send();
}

const trackSkip = uuid => {
  if (!skipTracking) return;
  const xhr = new XMLHttpRequest();
  xhr.open("POST", `${serverEndpoint}/api/viewedVideoSponsorTime?UUID=${uuid}`);
  xhr.send();
};

function fetchSegments(videoID) {
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
  const now = video.currentTime;
  if (video.muted && now >= muteEndTime) {
    video.muted = false;
    muteEndTime = 0;
  }
  const skipEnd = findEndTime(now, skipSegments);
  if (skipEnd) video.currentTime = skipEnd;
  const muteEnd = findEndTime(now, muteSegments);
  if (muteEnd) {
    video.muted = true;
    muteEndTime = muteEnd;
  }
}

function findEndTime(now, map) {
  for (const start of map.keys()) {
    if (now + skipThreshold[0] >= start && now - start <= skipThreshold[1]) {
      const segment = map.get(start);
      let end = segment.end;
      trackSkip(segment.uuid);
      map.delete(start);
      for (const overlapStart of map.keys()) {
        if (end >= overlapStart && overlapStart >= now) {
          const overSeg = map.get(overlapStart);
          end = overSeg.end;
          trackSkip(overSeg.uuid);
          map.delete(overlapStart);
        }
      }
      return end;
    }
  }
  return null;
}

function createPOILabel(poiLabel) {
  createVideoLabel(poiLabel, "poi");
  const listener = e => {
    if (e.key === highlightKey) {
      video.currentTime = poiLabel.segment[1];
      trackSkip(poiLabel.UUID);
      document.querySelector("#sbjs-label-poi").style.display = "none";
      document.removeEventListener("keydown", listener);
    }
  };
  document.addEventListener("keydown", listener);
}

function createVideoLabel(videoLabel, type = "full") {
  const title = document.querySelector("#title h1, h1.title.ytd-video-primary-info-renderer");
  if (!title) {
    setTimeout(createVideoLabel, 200, videoLabel);
    return;
  }
  const category = videoLabel.category;
  const fvString = cat => `The entire video is ${cat} and is too tightly integrated to be able to separate`;
  const styles = {
    sponsor: ["#0d0", "#111", fvString("sponsor")],
    selfpromo: ["#ff0", "#111", fvString("selfpromo")],
    exclusive_access: ["#085", "#fff", "This video showcases a product, service or location that they've received free or subsidized access to"],
    poi_highlight: ["#f18", "#fff", `Press ${highlightKey} to skip to the highlight`]
  };
  const style = styles[category] || ["#888", "#fff", category];
  const label = document.createElement("span");
  label.title = style[2];
  label.innerText = category;
  label.id = `sbjs-label-${type}`;
  label.style = `color: ${style[1]}; background-color: ${style[0]}; display: flex; margin: 0 5px;`;
  title.style = "display: flex;";
  title.prepend(label);
}

const reset = () => {
  video = undefined; videoID = undefined; muteEndTime = 0;
  skipSegments = new Map(); muteSegments = new Map();
};

function setup() {
  if (videoID === getVideoID()) return;
  console.log(`SB.js ${VERSION} Loaded`);
  if (document.querySelector("#previewbar")) {
    console.log("[SB.js] Extension Present, Exiting");
    return;
  }
  video = document.querySelector("video");
  videoID = getVideoID();
  if (!video) return console.log("[SB.js] no video");
  fetchSegments(videoID);
  video.addEventListener("timeupdate", skipOrMute);
}

document.addEventListener("yt-navigate-start", reset);
document.addEventListener("yt-navigate-finish", setup);
setup();