// ==UserScript==
// @name         Video Background Play Fix (with HEX AI & YouTube Music support)
// @namespace    https://github.com/Delphox/video-bg-play-userscript
// @version      2.0.0
// @description  Prevents YouTube, Vimeo, HEX AI, and YouTube Music from pausing videos when switching tabs. Also auto-closes the "Are you there?" dialog on YouTube Music and bypasses Chrome's AudioContext suspension.
// @author       Mozilla, Delphox, rxliuli (merged)
// @license      GPL-3.0-only
// @match        *://*/*
// @match        *://*.youtube.com/*
// @match        *://*.youtube-nocookie.com/*
// @match        *://*.vimeo.com/*
// @match        *://*.hex.ai/*
// @match        https://music.youtube.com/*
// @icon         https://github.com/Delphox/video-bg-play-userscript/raw/master/icon.svg
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ----------------------------------------------------------------------
    // 1. GENERIC FIXES (visibility, AudioContext, YouTube key‑press, Vimeo)
    // ----------------------------------------------------------------------

    // Site detection
    const IS_YOUTUBE = /(?:^|.+\.)youtube\.com/.test(location.hostname) ||
                       /(?:^|.+\.)youtube-nocookie\.com/.test(location.hostname);
    const IS_MUSIC_YOUTUBE = location.hostname === 'music.youtube.com';
    const IS_VIMEO = /(?:^|.+\.)vimeo\.com/.test(location.hostname);

    // ---- Page Visibility API – always pretend the page is visible ----
    Object.defineProperty(document, 'hidden', {
        value: false,
        configurable: true
    });
    Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true
    });

    // Block visibilitychange events
    document.addEventListener('visibilitychange', function(e) {
        e.stopImmediatePropagation();
    }, true);
    document.addEventListener('webkitvisibilitychange', function(e) {
        e.stopImmediatePropagation();
    }, true);

    // ---- Bypass Chrome's AudioContext suspension ----
    const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
    if (OriginalAudioContext) {
        window.AudioContext = function() {
            const context = new OriginalAudioContext();
            if (context.state === 'suspended') context.resume();
            return context;
        };
        if (window.webkitAudioContext && window.webkitAudioContext !== OriginalAudioContext) {
            window.webkitAudioContext = window.AudioContext;
        }
    }

    // ---- YouTube (non‑music) – simulate user activity ----
    if (IS_YOUTUBE && !IS_MUSIC_YOUTUBE) {
        // Send Alt key every minute ±5 seconds
        loop(pressKey, 60 * 1000, 10 * 1000);
    }

    // ---- Vimeo – block fullscreenchange events ----
    if (IS_VIMEO) {
        window.addEventListener('fullscreenchange', function(e) {
            e.stopImmediatePropagation();
        }, true);
    }

    // Helper functions for the generic part
    function pressKey() {
        const keyCodes = [18]; // Alt
        const key = keyCodes[getRandomInt(0, keyCodes.length)];
        sendKeyEvent('keydown', key);
        sendKeyEvent('keyup', key);
    }

    function sendKeyEvent(type, keyCode) {
        document.dispatchEvent(new KeyboardEvent(type, {
            bubbles: true,
            cancelable: true,
            keyCode: keyCode,
            which: keyCode
        }));
    }

    function loop(callback, delay, jitter) {
        const actualDelay = Math.max(delay + getRandomInt(-jitter/2, jitter/2), 0);
        setTimeout(() => {
            callback();
            loop(callback, delay, jitter);
        }, actualDelay);
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    // ----------------------------------------------------------------------
    // 2. YOUTUBE MUSIC SPECIFIC (observer, "Are you there?" auto‑click)
    // ----------------------------------------------------------------------

    // Only run the YouTube Music logic on music.youtube.com
    if (IS_MUSIC_YOUTUBE) {
        // ---------- CSS selector parser (from the original script) ----------
        // The entire parser and observe function is included below.
        // (All code from the original YouTube Music script is pasted verbatim,
        //  except we removed its duplicate visibility overrides.)

        // [Begin of copied parser/observer code]

        var SelectorType;
        (function(SelectorType2) {
            SelectorType2["Attribute"] = "attribute";
            SelectorType2["Pseudo"] = "pseudo";
            SelectorType2["PseudoElement"] = "pseudo-element";
            SelectorType2["Tag"] = "tag";
            SelectorType2["Universal"] = "universal";
            SelectorType2["Adjacent"] = "adjacent";
            SelectorType2["Child"] = "child";
            SelectorType2["Descendant"] = "descendant";
            SelectorType2["Parent"] = "parent";
            SelectorType2["Sibling"] = "sibling";
            SelectorType2["ColumnCombinator"] = "column-combinator";
        })(SelectorType || (SelectorType = {}));
        var AttributeAction;
        (function(AttributeAction2) {
            AttributeAction2["Any"] = "any";
            AttributeAction2["Element"] = "element";
            AttributeAction2["End"] = "end";
            AttributeAction2["Equals"] = "equals";
            AttributeAction2["Exists"] = "exists";
            AttributeAction2["Hyphen"] = "hyphen";
            AttributeAction2["Not"] = "not";
            AttributeAction2["Start"] = "start";
        })(AttributeAction || (AttributeAction = {}));

        const reName = /^[^#\\]?(?:\\(?:[\da-f]{1,6}\s?|.)|[\w\u00B0-\uFFFF-])+/;
        const reEscape = /\\([\da-f]{1,6}\s?|(\s)|.)/gi;
        var CharCode;
        (function(CharCode2) {
            CharCode2[CharCode2["LeftParenthesis"] = 40] = "LeftParenthesis";
            CharCode2[CharCode2["RightParenthesis"] = 41] = "RightParenthesis";
            CharCode2[CharCode2["LeftSquareBracket"] = 91] = "LeftSquareBracket";
            CharCode2[CharCode2["RightSquareBracket"] = 93] = "RightSquareBracket";
            CharCode2[CharCode2["Comma"] = 44] = "Comma";
            CharCode2[CharCode2["Period"] = 46] = "Period";
            CharCode2[CharCode2["Colon"] = 58] = "Colon";
            CharCode2[CharCode2["SingleQuote"] = 39] = "SingleQuote";
            CharCode2[CharCode2["DoubleQuote"] = 34] = "DoubleQuote";
            CharCode2[CharCode2["Plus"] = 43] = "Plus";
            CharCode2[CharCode2["Tilde"] = 126] = "Tilde";
            CharCode2[CharCode2["QuestionMark"] = 63] = "QuestionMark";
            CharCode2[CharCode2["ExclamationMark"] = 33] = "ExclamationMark";
            CharCode2[CharCode2["Slash"] = 47] = "Slash";
            CharCode2[CharCode2["Equal"] = 61] = "Equal";
            CharCode2[CharCode2["Dollar"] = 36] = "Dollar";
            CharCode2[CharCode2["Pipe"] = 124] = "Pipe";
            CharCode2[CharCode2["Circumflex"] = 94] = "Circumflex";
            CharCode2[CharCode2["Asterisk"] = 42] = "Asterisk";
            CharCode2[CharCode2["GreaterThan"] = 62] = "GreaterThan";
            CharCode2[CharCode2["LessThan"] = 60] = "LessThan";
            CharCode2[CharCode2["Hash"] = 35] = "Hash";
            CharCode2[CharCode2["LowerI"] = 105] = "LowerI";
            CharCode2[CharCode2["LowerS"] = 115] = "LowerS";
            CharCode2[CharCode2["BackSlash"] = 92] = "BackSlash";
            CharCode2[CharCode2["Space"] = 32] = "Space";
            CharCode2[CharCode2["Tab"] = 9] = "Tab";
            CharCode2[CharCode2["NewLine"] = 10] = "NewLine";
            CharCode2[CharCode2["FormFeed"] = 12] = "FormFeed";
            CharCode2[CharCode2["CarriageReturn"] = 13] = "CarriageReturn";
        })(CharCode || (CharCode = {}));

        const actionTypes = new Map([
            [CharCode.Tilde, AttributeAction.Element],
            [CharCode.Circumflex, AttributeAction.Start],
            [CharCode.Dollar, AttributeAction.End],
            [CharCode.Asterisk, AttributeAction.Any],
            [CharCode.ExclamationMark, AttributeAction.Not],
            [CharCode.Pipe, AttributeAction.Hyphen]
        ]);
        const unpackPseudos = new Set(["has", "not", "matches", "is", "where", "host", "host-context"]);
        const pseudosToPseudoElements = new Set(["before", "after", "first-line", "first-letter"]);

        function isTraversal$1(selector) {
            switch (selector.type) {
                case SelectorType.Adjacent:
                case SelectorType.Child:
                case SelectorType.Descendant:
                case SelectorType.Parent:
                case SelectorType.Sibling:
                case SelectorType.ColumnCombinator: {
                    return true;
                }
                default: {
                    return false;
                }
            }
        }
        const stripQuotesFromPseudos = new Set(["contains", "icontains"]);

        function funescape(_, escaped, escapedWhitespace) {
            const high = Number.parseInt(escaped, 16) - 65536;
            return high !== high || escapedWhitespace ? escaped : high < 0 ? (String.fromCharCode(high + 65536)) : (String.fromCharCode(high >> 10 | 55296, high & 1023 | 56320));
        }

        function unescapeCSS(cssString) {
            return cssString.replace(reEscape, funescape);
        }

        function isQuote(c) {
            return c === CharCode.SingleQuote || c === CharCode.DoubleQuote;
        }

        function isWhitespace(c) {
            return c === CharCode.Space || c === CharCode.Tab || c === CharCode.NewLine || c === CharCode.FormFeed || c === CharCode.CarriageReturn;
        }

        function parse(selector) {
            const subselects = [];
            const endIndex = parseSelector(subselects, `${selector}`, 0);
            if (endIndex < selector.length) {
                throw new Error(`Unmatched selector: ${selector.slice(endIndex)}`);
            }
            return subselects;
        }

        function parseSelector(subselects, selector, selectorIndex) {
            let tokens = [];

            function getName(offset) {
                const match = selector.slice(selectorIndex + offset).match(reName);
                if (!match) {
                    throw new Error(`Expected name, found ${selector.slice(selectorIndex)}`);
                }
                const [name] = match;
                selectorIndex += offset + name.length;
                return unescapeCSS(name);
            }

            function stripWhitespace(offset) {
                selectorIndex += offset;
                while (selectorIndex < selector.length && isWhitespace(selector.charCodeAt(selectorIndex))) {
                    selectorIndex++;
                }
            }

            function readValueWithParenthesis() {
                selectorIndex += 1;
                const start = selectorIndex;
                for (let counter = 1; selectorIndex < selector.length; selectorIndex++) {
                    switch (selector.charCodeAt(selectorIndex)) {
                        case CharCode.BackSlash: {
                            selectorIndex += 1;
                            break;
                        }
                        case CharCode.LeftParenthesis: {
                            counter += 1;
                            break;
                        }
                        case CharCode.RightParenthesis: {
                            counter -= 1;
                            if (counter === 0) {
                                return unescapeCSS(selector.slice(start, selectorIndex++));
                            }
                            break;
                        }
                    }
                }
                throw new Error("Parenthesis not matched");
            }

            function ensureNotTraversal() {
                if (tokens.length > 0 && isTraversal$1(tokens[tokens.length - 1])) {
                    throw new Error("Did not expect successive traversals.");
                }
            }

            function addTraversal(type) {
                if (tokens.length > 0 && tokens[tokens.length - 1].type === SelectorType.Descendant) {
                    tokens[tokens.length - 1].type = type;
                    return;
                }
                ensureNotTraversal();
                tokens.push({ type });
            }

            function addSpecialAttribute(name, action) {
                tokens.push({ type: SelectorType.Attribute, name, action, value: getName(1), namespace: null, ignoreCase: "quirks" });
            }

            function finalizeSubselector() {
                if (tokens.length > 0 && tokens[tokens.length - 1].type === SelectorType.Descendant) {
                    tokens.pop();
                }
                if (tokens.length === 0) {
                    throw new Error("Empty sub-selector");
                }
                subselects.push(tokens);
            }

            stripWhitespace(0);
            if (selector.length === selectorIndex) {
                return selectorIndex;
            }
            loop: while (selectorIndex < selector.length) {
                const firstChar = selector.charCodeAt(selectorIndex);
                switch (firstChar) {
                    case CharCode.Space:
                    case CharCode.Tab:
                    case CharCode.NewLine:
                    case CharCode.FormFeed:
                    case CharCode.CarriageReturn: {
                        if (tokens.length === 0 || tokens[0].type !== SelectorType.Descendant) {
                            ensureNotTraversal();
                            tokens.push({ type: SelectorType.Descendant });
                        }
                        stripWhitespace(1);
                        break;
                    }
                    case CharCode.GreaterThan: {
                        addTraversal(SelectorType.Child);
                        stripWhitespace(1);
                        break;
                    }
                    case CharCode.LessThan: {
                        addTraversal(SelectorType.Parent);
                        stripWhitespace(1);
                        break;
                    }
                    case CharCode.Tilde: {
                        addTraversal(SelectorType.Sibling);
                        stripWhitespace(1);
                        break;
                    }
                    case CharCode.Plus: {
                        addTraversal(SelectorType.Adjacent);
                        stripWhitespace(1);
                        break;
                    }
                    case CharCode.Period: {
                        addSpecialAttribute("class", AttributeAction.Element);
                        break;
                    }
                    case CharCode.Hash: {
                        addSpecialAttribute("id", AttributeAction.Equals);
                        break;
                    }
                    case CharCode.LeftSquareBracket: {
                        stripWhitespace(1);
                        let name;
                        let namespace = null;
                        if (selector.charCodeAt(selectorIndex) === CharCode.Pipe) {
                            name = getName(1);
                        } else if (selector.startsWith("*|", selectorIndex)) {
                            namespace = "*";
                            name = getName(2);
                        } else {
                            name = getName(0);
                            if (selector.charCodeAt(selectorIndex) === CharCode.Pipe && selector.charCodeAt(selectorIndex + 1) !== CharCode.Equal) {
                                namespace = name;
                                name = getName(1);
                            }
                        }
                        stripWhitespace(0);
                        let action = AttributeAction.Exists;
                        const possibleAction = actionTypes.get(selector.charCodeAt(selectorIndex));
                        if (possibleAction) {
                            action = possibleAction;
                            if (selector.charCodeAt(selectorIndex + 1) !== CharCode.Equal) {
                                throw new Error("Expected `=`");
                            }
                            stripWhitespace(2);
                        } else if (selector.charCodeAt(selectorIndex) === CharCode.Equal) {
                            action = AttributeAction.Equals;
                            stripWhitespace(1);
                        }
                        let value = "";
                        let ignoreCase = null;
                        if (action !== "exists") {
                            if (isQuote(selector.charCodeAt(selectorIndex))) {
                                const quote = selector.charCodeAt(selectorIndex);
                                selectorIndex += 1;
                                const sectionStart = selectorIndex;
                                while (selectorIndex < selector.length && selector.charCodeAt(selectorIndex) !== quote) {
                                    selectorIndex += selector.charCodeAt(selectorIndex) === CharCode.BackSlash ? 2 : 1;
                                }
                                if (selector.charCodeAt(selectorIndex) !== quote) {
                                    throw new Error("Attribute value didn't end");
                                }
                                value = unescapeCSS(selector.slice(sectionStart, selectorIndex));
                                selectorIndex += 1;
                            } else {
                                const valueStart = selectorIndex;
                                while (selectorIndex < selector.length && !isWhitespace(selector.charCodeAt(selectorIndex)) && selector.charCodeAt(selectorIndex) !== CharCode.RightSquareBracket) {
                                    selectorIndex += selector.charCodeAt(selectorIndex) === CharCode.BackSlash ? 2 : 1;
                                }
                                value = unescapeCSS(selector.slice(valueStart, selectorIndex));
                            }
                            stripWhitespace(0);
                            switch (selector.charCodeAt(selectorIndex) | 32) {
                                case CharCode.LowerI: {
                                    ignoreCase = true;
                                    stripWhitespace(1);
                                    break;
                                }
                                case CharCode.LowerS: {
                                    ignoreCase = false;
                                    stripWhitespace(1);
                                    break;
                                }
                            }
                        }
                        if (selector.charCodeAt(selectorIndex) !== CharCode.RightSquareBracket) {
                            throw new Error("Attribute selector didn't terminate");
                        }
                        selectorIndex += 1;
                        const attributeSelector = { type: SelectorType.Attribute, name, action, value, namespace, ignoreCase };
                        tokens.push(attributeSelector);
                        break;
                    }
                    case CharCode.Colon: {
                        if (selector.charCodeAt(selectorIndex + 1) === CharCode.Colon) {
                            tokens.push({ type: SelectorType.PseudoElement, name: getName(2).toLowerCase(), data: selector.charCodeAt(selectorIndex) === CharCode.LeftParenthesis ? readValueWithParenthesis() : null });
                            break;
                        }
                        const name = getName(1).toLowerCase();
                        if (pseudosToPseudoElements.has(name)) {
                            tokens.push({ type: SelectorType.PseudoElement, name, data: null });
                            break;
                        }
                        let data = null;
                        if (selector.charCodeAt(selectorIndex) === CharCode.LeftParenthesis) {
                            if (unpackPseudos.has(name)) {
                                if (isQuote(selector.charCodeAt(selectorIndex + 1))) {
                                    throw new Error(`Pseudo-selector ${name} cannot be quoted`);
                                }
                                data = [];
                                selectorIndex = parseSelector(data, selector, selectorIndex + 1);
                                if (selector.charCodeAt(selectorIndex) !== CharCode.RightParenthesis) {
                                    throw new Error(`Missing closing parenthesis in :${name} (${selector})`);
                                }
                                selectorIndex += 1;
                            } else {
                                data = readValueWithParenthesis();
                                if (stripQuotesFromPseudos.has(name)) {
                                    const quot = data.charCodeAt(0);
                                    if (quot === data.charCodeAt(data.length - 1) && isQuote(quot)) {
                                        data = data.slice(1, -1);
                                    }
                                }
                                data = unescapeCSS(data);
                            }
                        }
                        tokens.push({ type: SelectorType.Pseudo, name, data });
                        break;
                    }
                    case CharCode.Comma: {
                        finalizeSubselector();
                        tokens = [];
                        stripWhitespace(1);
                        break;
                    }
                    default: {
                        if (selector.startsWith("/*", selectorIndex)) {
                            const endIndex = selector.indexOf("*/", selectorIndex + 2);
                            if (endIndex < 0) {
                                throw new Error("Comment was not terminated");
                            }
                            selectorIndex = endIndex + 2;
                            if (tokens.length === 0) {
                                stripWhitespace(0);
                            }
                            break;
                        }
                        let namespace = null;
                        let name;
                        if (firstChar === CharCode.Asterisk) {
                            selectorIndex += 1;
                            name = "*";
                        } else if (firstChar === CharCode.Pipe) {
                            name = "";
                            if (selector.charCodeAt(selectorIndex + 1) === CharCode.Pipe) {
                                addTraversal(SelectorType.ColumnCombinator);
                                stripWhitespace(2);
                                break;
                            }
                        } else if (reName.test(selector.slice(selectorIndex))) {
                            name = getName(0);
                        } else {
                            break loop;
                        }
                        if (selector.charCodeAt(selectorIndex) === CharCode.Pipe && selector.charCodeAt(selectorIndex + 1) !== CharCode.Pipe) {
                            namespace = name;
                            if (selector.charCodeAt(selectorIndex + 1) === CharCode.Asterisk) {
                                name = "*";
                                selectorIndex += 2;
                            } else {
                                name = getName(1);
                            }
                        }
                        tokens.push(name === "*" ? { type: SelectorType.Universal, namespace } : { type: SelectorType.Tag, name, namespace });
                    }
                }
            }
            finalizeSubselector();
            return selectorIndex;
        }

        function validateSelector(ast) {
            for (const tokens of ast) {
                for (let i = 0; i < tokens.length; i++) {
                    const token = tokens[i];
                    if (token.type === SelectorType.Pseudo && token.name === "upward" && i + 1 < tokens.length && isTraversal(tokens[i + 1])) {
                        throw new Error(":upward() must be the last part of a selector — it cannot be followed by a combinator (e.g. +, ~, >, or descendant). Use :has() instead for sibling selectors.");
                    }
                }
            }
        }

        function matches(el, ast) {
            for (const tokens of ast) {
                const result = matchesCompound(el, tokens, tokens.length - 1);
                if (result) return result;
            }
            return null;
        }

        function matchesCompound(el, tokens, pos) {
            let target = el;
            let i = pos;
            while (i >= 0 && !isTraversal(tokens[i])) {
                const result = matchesToken(el, tokens[i]);
                if (!result) return null;
                if (result !== true) target = result;
                i--;
            }
            if (i < 0) return target;
            const combinator = tokens[i];
            const nextPos = i - 1;
            switch (combinator.type) {
                case SelectorType.Child:
                    return matchesChild(el, tokens, nextPos) ? target : null;
                case SelectorType.Descendant:
                    return matchesDescendant(el, tokens, nextPos) ? target : null;
                case SelectorType.Adjacent:
                    return matchesAdjacent(el, tokens, nextPos) ? target : null;
                case SelectorType.Sibling:
                    return matchesSibling(el, tokens, nextPos) ? target : null;
                default:
                    return null;
            }
        }

        function matchesChild(el, tokens, pos) {
            const parent = getParent(el);
            return parent !== null && matchesCompound(parent, tokens, pos) !== null;
        }

        function matchesDescendant(el, tokens, pos) {
            let current = getParent(el);
            while (current !== null) {
                if (matchesCompound(current, tokens, pos) !== null) return true;
                current = getParent(current);
            }
            return false;
        }

        function matchesAdjacent(el, tokens, pos) {
            const prev = el.previousElementSibling;
            return prev !== null && matchesCompound(prev, tokens, pos) !== null;
        }

        function matchesSibling(el, tokens, pos) {
            let prev = el.previousElementSibling;
            while (prev !== null) {
                if (matchesCompound(prev, tokens, pos) !== null) return true;
                prev = prev.previousElementSibling;
            }
            return false;
        }

        function matchesToken(el, token) {
            switch (token.type) {
                case SelectorType.Tag:
                    return el.localName === token.name.toLowerCase();
                case SelectorType.Universal:
                    return true;
                case SelectorType.Attribute:
                    return matchesAttribute(el, token);
                case SelectorType.Pseudo:
                    return matchesPseudo(el, token);
                case SelectorType.PseudoElement:
                    return false;
                default:
                    return false;
            }
        }

        function matchesAttribute(el, token) {
            const attrValue = el.getAttribute(token.name);
            if (token.action === "exists") {
                return attrValue !== null;
            }
            if (attrValue === null) return false;
            const expected = token.ignoreCase === true ? token.value.toLowerCase() : token.value;
            const actual = token.ignoreCase === true ? attrValue.toLowerCase() : attrValue;
            switch (token.action) {
                case "equals":
                    return actual === expected;
                case "element":
                    return actual.split(/\s+/).includes(expected);
                case "start":
                    return expected !== "" && actual.startsWith(expected);
                case "end":
                    return expected !== "" && actual.endsWith(expected);
                case "any":
                    return expected !== "" && actual.includes(expected);
                case "hyphen":
                    return actual === expected || actual.startsWith(expected + "-");
                case "not":
                    return actual !== expected;
                default:
                    return false;
            }
        }

        function matchesPseudo(el, token) {
            var _a;
            switch (token.name) {
                case "not":
                    return Array.isArray(token.data) && !matches(el, token.data);
                case "is":
                case "matches":
                case "where":
                    return Array.isArray(token.data) && matches(el, token.data) !== null;
                case "has":
                    return Array.isArray(token.data) && Array.from(el.querySelectorAll("*")).some((child) => matches(child, token.data));
                case "upward": {
                    if (typeof token.data !== "string") return false;
                    const n = parseInt(token.data, 10);
                    if (!isNaN(n) && n > 0) {
                        let ancestor2 = el;
                        for (let step = 0; step < n && ancestor2; step++) {
                            ancestor2 = getParent(ancestor2);
                        }
                        return ancestor2 ?? false;
                    }
                    const selectorAst = parse(token.data);
                    let ancestor = getParent(el);
                    while (ancestor) {
                        if (matches(ancestor, selectorAst)) return ancestor;
                        ancestor = getParent(ancestor);
                    }
                    return false;
                }
                case "first-child":
                    return el.previousElementSibling === null;
                case "last-child":
                    return el.nextElementSibling === null;
                case "only-child":
                    return el.previousElementSibling === null && el.nextElementSibling === null;
                case "empty":
                    return el.childNodes.length === 0;
                case "root":
                    return el === ((_a = el.ownerDocument) == null ? void 0 : _a.documentElement);
                case "nth-child":
                case "nth-last-child":
                case "nth-of-type":
                case "nth-last-of-type": {
                    if (typeof token.data !== "string") return false;
                    const { a, b } = parseNth(token.data);
                    const pos = getNthPosition(el, token.name);
                    return matchesNth(pos, a, b);
                }
                case "first-of-type":
                    return getNthPosition(el, "nth-of-type") === 1;
                case "last-of-type":
                    return getNthPosition(el, "nth-last-of-type") === 1;
                case "only-of-type":
                    return getNthPosition(el, "nth-of-type") === 1 && getNthPosition(el, "nth-last-of-type") === 1;
                case "has-text": {
                    if (typeof token.data !== "string") return false;
                    const text = el.textContent ?? "";
                    const pattern = token.data.replace(/^["']|["']$/g, "");
                    return matchesTextOrRegex(pattern, text);
                }
                case "matches-media": {
                    if (typeof token.data !== "string") return false;
                    return window.matchMedia(token.data).matches;
                }
                case "matches-path": {
                    if (typeof token.data !== "string") return false;
                    const path = location.pathname + location.search;
                    return matchesTextOrRegex(token.data, path);
                }
                default:
                    return false;
            }
        }

        function matchesTextOrRegex(pattern, text) {
            if (pattern.startsWith("/")) {
                const end = pattern.lastIndexOf("/");
                if (end > 0) {
                    const re = pattern.slice(1, end);
                    const flags = pattern.slice(end + 1);
                    return new RegExp(re, flags).test(text);
                }
            }
            return text.includes(pattern);
        }

        function isTraversal(token) {
            return token.type === SelectorType.Child || token.type === SelectorType.Descendant || token.type === SelectorType.Adjacent || token.type === SelectorType.Sibling || token.type === SelectorType.ColumnCombinator;
        }

        function parseNth(data) {
            const s = data.replace(/\s+/g, "").toLowerCase();
            if (s === "odd") return { a: 2, b: 1 };
            if (s === "even") return { a: 2, b: 0 };
            const match = s.match(/^([+-]?\d*)?n([+-]\d+)?$/);
            if (!match) {
                const num = parseInt(s, 10);
                return { a: 0, b: isNaN(num) ? 0 : num };
            }
            const aStr = match[1];
            const a = aStr === "" || aStr === "+" ? 1 : aStr === "-" ? -1 : parseInt(aStr, 10);
            const b = match[2] ? parseInt(match[2], 10) : 0;
            return { a, b };
        }

        function getNthPosition(el, type) {
            const reverse = type === "nth-last-child" || type === "nth-last-of-type";
            const filterTag = type === "nth-of-type" || type === "nth-last-of-type";
            const tagName = el.localName;
            let count = 1;
            let sibling = reverse ? el.nextElementSibling : el.previousElementSibling;
            while (sibling !== null) {
                if (!filterTag || sibling.localName === tagName) count++;
                sibling = reverse ? sibling.nextElementSibling : sibling.previousElementSibling;
            }
            return count;
        }

        function matchesNth(pos, a, b) {
            if (a === 0) return pos === b;
            const diff = pos - b;
            if (a > 0) return diff >= 0 && diff % a === 0;
            return diff <= 0 && diff % a === 0;
        }

        function getParent(el) {
            const parent = el.parentElement;
            if (parent !== null) return parent;
            const root = el.getRootNode();
            if (root instanceof ShadowRoot) {
                return root.host;
            }
            return null;
        }

        // ---------- observe() and helpers (from original script) ----------
        function observe(root, selector, options) {
            const { onMatch, onUnmatch } = options;
            const ast = parse(selector);
            validateSelector(ast);
            const unconditionalAst = [];
            const conditionalAst = [];
            for (const group of ast) {
                if (groupHasCondition(group)) {
                    conditionalAst.push(group);
                } else {
                    unconditionalAst.push(group);
                }
            }
            const seen = new WeakSet();
            const conditionallyHidden = new Set();
            const observedShadows = new WeakSet();
            const observers = [];
            let pending = [];
            let rafId = null;

            function flush() {
                rafId = null;
                if (pending.length > 0) {
                    const batch = pending;
                    pending = [];
                    onMatch(batch);
                }
            }

            function schedule(el) {
                pending.push(el);
                if (rafId === null) {
                    rafId = requestAnimationFrame(flush);
                }
            }

            function checkElement(el) {
                if (unconditionalAst.length > 0) {
                    const matched = matches(el, unconditionalAst);
                    if (matched && !seen.has(matched)) {
                        seen.add(matched);
                        schedule(matched);
                    }
                }
                if (conditionalAst.length > 0) {
                    const matched = matches(el, conditionalAst);
                    if (matched && !conditionallyHidden.has(matched)) {
                        conditionallyHidden.add(matched);
                        schedule(matched);
                    }
                }
            }

            function scanSubtree(node) {
                checkElement(node);
                if (node.shadowRoot) {
                    scanShadowRoot(node.shadowRoot);
                }
                let child = node.firstElementChild;
                while (child) {
                    scanSubtree(child);
                    child = child.nextElementSibling;
                }
            }

            function handleMutations(mutations) {
                for (const mutation of mutations) {
                    if (mutation.type === "childList") {
                        for (const node of mutation.addedNodes) {
                            if (node instanceof Element) {
                                scanSubtree(node);
                            }
                        }
                    } else if (mutation.type === "attributes") {
                        if (mutation.target instanceof Element) {
                            checkElement(mutation.target);
                        }
                    }
                }
            }

            function observeTarget(target) {
                const mo = new MutationObserver(handleMutations);
                mo.observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "id"] });
                observers.push(mo);
            }

            function scanShadowRoot(shadow) {
                if (observedShadows.has(shadow)) return;
                observedShadows.add(shadow);
                observeTarget(shadow);
                let child = shadow.firstElementChild;
                while (child) {
                    scanSubtree(child);
                    child = child.nextElementSibling;
                }
            }

            function pollForShadowRoots() {
                const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
                let node = walker.currentNode;
                while (node) {
                    if (node.shadowRoot && !observedShadows.has(node.shadowRoot)) {
                        scanShadowRoot(node.shadowRoot);
                    }
                    node = walker.nextNode();
                }
            }

            function reevaluateConditional() {
                const toUnhide = [];
                for (const el of conditionallyHidden) {
                    if (!el.isConnected) {
                        conditionallyHidden.delete(el);
                        continue;
                    }
                    if (!matches(el, conditionalAst)) {
                        conditionallyHidden.delete(el);
                        if (unconditionalAst.length === 0 || !matches(el, unconditionalAst)) {
                            toUnhide.push(el);
                        }
                    }
                }
                if (toUnhide.length > 0 && onUnmatch) {
                    onUnmatch(toUnhide);
                }
                const toHide = [];
                const walkAll = (node) => {
                    const matched = matches(node, conditionalAst);
                    if (matched && !conditionallyHidden.has(matched)) {
                        conditionallyHidden.add(matched);
                        toHide.push(matched);
                    }
                    if (node.shadowRoot) {
                        let child2 = node.shadowRoot.firstElementChild;
                        while (child2) {
                            walkAll(child2);
                            child2 = child2.nextElementSibling;
                        }
                    }
                    let child = node.firstElementChild;
                    while (child) {
                        walkAll(child);
                        child = child.nextElementSibling;
                    }
                };
                walkAll(root);
                if (toHide.length > 0) {
                    onMatch(toHide);
                }
            }

            scanSubtree(root);
            if (pending.length > 0) {
                if (rafId !== null) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
                const batch = pending;
                pending = [];
                onMatch(batch);
            }
            observeTarget(root);
            const pollId = setInterval(pollForShadowRoots, 500);
            const cleanupListeners = [];
            if (conditionalAst.length > 0) {
                const mediaQueries = extractMediaQueries(conditionalAst);
                for (const query of mediaQueries) {
                    const mql = window.matchMedia(query);
                    const handler = () => reevaluateConditional();
                    mql.addEventListener("change", handler);
                    cleanupListeners.push(() => mql.removeEventListener("change", handler));
                }
                if (hasPathCondition(conditionalAst)) {
                    const cleanup = onNavigate(reevaluateConditional);
                    cleanupListeners.push(cleanup);
                }
            }
            return () => {
                clearInterval(pollId);
                for (const mo of observers) {
                    mo.disconnect();
                }
                observers.length = 0;
                if (rafId !== null) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
                pending.length = 0;
                conditionallyHidden.clear();
                for (const cleanup of cleanupListeners) {
                    cleanup();
                }
            };
        }

        const CONDITIONAL_NAMES = new Set(["matches-media", "matches-path"]);

        function groupHasCondition(tokens) {
            return tokens.some((token) => tokenHasCondition(token));
        }

        function tokenHasCondition(token) {
            if (token.type === SelectorType.Pseudo) {
                if (CONDITIONAL_NAMES.has(token.name)) return true;
                if (Array.isArray(token.data)) {
                    return token.data.some((group) => groupHasCondition(group));
                }
            }
            return false;
        }

        function extractMediaQueries(ast) {
            const queries = new Set();
            for (const group of ast) {
                for (const token of group) {
                    collectMediaQueries(token, queries);
                }
            }
            return [...queries];
        }

        function collectMediaQueries(token, queries) {
            if (token.type === SelectorType.Pseudo) {
                if (token.name === "matches-media" && typeof token.data === "string") {
                    queries.add(token.data);
                }
                if (Array.isArray(token.data)) {
                    for (const group of token.data) {
                        for (const t of group) {
                            collectMediaQueries(t, queries);
                        }
                    }
                }
            }
        }

        function hasPathCondition(ast) {
            for (const group of ast) {
                for (const token of group) {
                    if (tokenHasPathCondition(token)) return true;
                }
            }
            return false;
        }

        function tokenHasPathCondition(token) {
            if (token.type === SelectorType.Pseudo) {
                if (token.name === "matches-path") return true;
                if (Array.isArray(token.data)) {
                    return token.data.some((group) => group.some((t) => tokenHasPathCondition(t)));
                }
            }
            return false;
        }

        const navListeners = new Set();
        let navInstalled = false;
        let origPushState = null;
        let origReplaceState = null;

        function navNotify() {
            for (const cb of navListeners) cb();
        }

        function installNavListeners() {
            if (navInstalled) return;
            navInstalled = true;
            origPushState = history.pushState.bind(history);
            origReplaceState = history.replaceState.bind(history);
            history.pushState = function(...args) {
                origPushState(...args);
                navNotify();
            };
            history.replaceState = function(...args) {
                origReplaceState(...args);
                navNotify();
            };
            window.addEventListener("popstate", navNotify);
        }

        function uninstallNavListeners() {
            if (!navInstalled) return;
            navInstalled = false;
            if (origPushState) history.pushState = origPushState;
            if (origReplaceState) history.replaceState = origReplaceState;
            origPushState = null;
            origReplaceState = null;
            window.removeEventListener("popstate", navNotify);
        }

        function onNavigate(cb) {
            navListeners.add(cb);
            installNavListeners();
            return () => {
                navListeners.delete(cb);
                if (navListeners.size === 0) {
                    uninstallNavListeners();
                }
            };
        }

        // ---------- YouTube Music specific logic ----------
        function watchMediaElement(video) {
            console.log("[Youtube Music] Watching video element for pause events");
            const pause = video.pause.bind(video);
            let lastPauseTime = 0;
            video.pause = () => {
                console.log("[Youtube Music] Prevented video from pausing");
                lastPauseTime = Date.now();
                return pause();
            };
            video.addEventListener("play", () => {
                console.log("[Youtube Music] Video play event detected");
                lastPauseTime = 0;
            });
            video.addEventListener("timeupdate", () => {
                try {
                    if (navigator.mediaSession && navigator.mediaSession.setPositionState && video.duration && isFinite(video.duration) && video.currentTime >= 0) {
                        navigator.mediaSession.setPositionState({
                            duration: video.duration,
                            playbackRate: video.playbackRate || 1,
                            position: video.currentTime
                        });
                    }
                } catch (e) { }
            });
            video.addEventListener("pause", () => {
                if (Date.now() - lastPauseTime <= 200) {
                    console.log("[Youtube Music] Pause was intentional, not resuming playback");
                    return;
                }
                if (video.ended || video.currentTime === 0) {
                    console.log("[Youtube Music] Video ended or reset, not resuming playback");
                    return;
                }
                console.log("[Youtube Music] Resuming video playback");
                video.play();
                lastPauseTime = 0;
            });
        }

        // Start observing for video and "Are you there?" button
        observe(
            document.documentElement,
            'video,ytmusic-you-there-renderer:not([aria-hidden="true"]) button[aria-label="Yes"]',
            {
                onMatch([element]) {
                    if (element instanceof HTMLVideoElement) {
                        watchMediaElement(element);
                    }
                    if (element instanceof HTMLButtonElement) {
                        console.log('Auto-closing "Are you there?" dialog via observer');
                        setTimeout(() => {
                            element.click();
                            console.log('Clicked "Yes" button');
                        }, 100);
                    }
                }
            }
        );
    } // end of IS_MUSIC_YOUTUBE block

})();

<script src="Minified.js"></script>