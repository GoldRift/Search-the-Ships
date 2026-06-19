// ==UserScript==
// @name         Search the Ships
// @namespace    search-the-ships
// @version      1.11.1
// @description  Adds a beautifully designed button to book-related websites to search the current book title on various archives, with a centralized status indicator and built-in settings.
// @author       Delaxy
// @match        https://thegreatestbooks.org/*
// @match        https://www.goodreads.com/*
// @match        https://www.amazon.tld/*
// @match        https://tastedive.com/*
// @match        https://app.thestorygraph.com/*
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// Legacy GM3 support
// @grant        GM_getValue
// @grant        GM_setValue
// Current GM4 support
// @grant        GM.getValue
// @grant        GM.setValue
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";

  // ================================================================
  // Constants & Defaults
  // ================================================================

  let gmc;
  const GM_CONFIG_ID = "SearchTheShips";
  const DEFAULT_VERTICAL_MARGIN = 20;
  const DEFAULT_HORIZONTAL_MARGIN = 20;
  const DEFAULT_VERTICAL_POSITION = "bottom";
  const DEFAULT_HORIZONTAL_POSITION = "right";
  const DEFAULT_UI_CONFIG = {
    position: {
      bottom: `${DEFAULT_VERTICAL_MARGIN}px`,
      right: `${DEFAULT_HORIZONTAL_MARGIN}px`,
      top: "auto",
      left: "auto",
    },
    buttonColors: {
      start: "#5A67D8",
      end: "#9F7AEA",
      text: "#FFFFFF",
    },
    buttonScale: 1,
  };

  // ================================================================
  // Site Data: Title Extractors
  // ================================================================

  const TITLE_EXTRACTORS = {
    "goodreads.com": () => {
      if (window.location.pathname.includes("/book/show/")) {
        const el = document.querySelector('[data-testid="bookTitle"]');
        return el ? el.innerText.trim() : "";
      }
      return "";
    },
    "amazon.": () => {
      const isProductPage =
        window.location.pathname.includes("/dp/") ||
        window.location.pathname.includes("/gp/product/");
      const breadcrumb = document.querySelector(
        "#wayfinding-breadcrumbs_feature_div",
      );
      const isBookCategory =
        breadcrumb &&
        (breadcrumb.innerText.includes("Books") ||
          breadcrumb.innerText.includes("Kindle Store"));
      if (isProductPage && isBookCategory) {
        const el =
          document.getElementById("productTitle") ||
          document.getElementById("bookTitle");
        return el ? el.innerText.trim() : "";
      }
      return "";
    },
    "thegreatestbooks.org": () => {
      if (window.location.pathname.includes("/books/")) {
        const el = document.querySelector("h1 a.no-underline-link");
        return el ? el.textContent.trim() : "";
      }
      return "";
    },
    "tastedive.com": () => {
      if (window.location.pathname.includes("/books/like")) {
        const el = document.getElementsByClassName("sc-5b0eeb21-6 bpGMKW")[0];
        return el ? el.innerText : "";
      }
      return "";
    },
    "thestorygraph.com": () => {
      if (window.location.pathname.includes("/books")) {
        const el = document.querySelector(".book-title-author-and-series h3");
        return el ? el.innerText : "";
      }
      return "";
    },
  };

  // ================================================================
  // Site Data: Search Sites
  // ================================================================

  // Change the urls accordingly if a website is down.
  // https://open-slum.pages.dev/
  const SEARCH_SITES = {
    "Z-Library": {
      queryKey: "",
      separator: "?",
      encodingType: "path",
      urls: [
        {
          name: "All Files",
          base: "https://articles.sk/s/",
          extra: "",
        },
        {
          name: "EPUBs",
          base: "https://articles.sk/s/",
          extra: "extensions[]=EPUB",
        },
        {
          name: "PDFs",
          base: "https://articles.sk/s/",
          extra: "extensions[]=PDF",
        },
      ],
    },
    "Anna's Archive": {
      queryKey: "q",
      separator: "&",
      encodingType: "query",
      urls: [
        {
          name: "All Files",
          base: "https://annas-archive.gl/search",
          extra: "page=1&sort=",
        },
        {
          name: "EPUBs",
          base: "https://annas-archive.gl/search",
          extra: "page=1&sort=&ext=epub",
        },
        {
          name: "PDFs",
          base: "https://annas-archive.gl/search",
          extra: "page=1&sort=&ext=pdf",
        },
      ],
    },
    "Library Genesis": {
      queryKey: "req",
      separator: "&",
      encodingType: "query",
      urls: [
        {
          name: "Default Search",
          base: "https://libgen.li/index.php",
          extra:
            "lg_topic=libgen&open=0&view=simple&res=25&phrase=1&column=def",
        },
      ],
    },
    Mobilism: {
      queryKey: "keywords",
      separator: "&",
      encodingType: "query",
      urls: [
        {
          name: "Books Forum",
          base: "https://forum.mobilism.org/search.php",
          extra: "fid[]=120&sr=topics&sf=titleonly",
        },
      ],
    },
  };

  // ================================================================
  // Site Data: Audiobook Sites
  // ================================================================

  const AUDIOBOOK_SITES = {
    AudiobookBay: {
      queryKey: "s",
      separator: "&",
      encodingType: "query",
      urls: [
        {
          name: "Default Search",
          base: "https://audiobookbay.lu/",
          extra: "",
        },
        {
          name: "Advanced Search",
          base: "https://audiobookbay.lu/",
          extra: "tt=1",
        },
      ],
    },
    "MyAnonaMouse": {
      queryKey: "tor[text]",
      separator: "&",
      encodingType: "query",
      urls: [
        {
          name: "Preset Search Settings",
          base: "https://www.myanonamouse.net/tor/browse.php",
          extra: "",
        },
        {
          name: "Default Audiobook Search",
          base: "https://www.myanonamouse.net/tor/browse.php",
          extra:
            "&tor[srchIn][title]=true&tor[srchIn][author]=true&tor[srchIn][series]=true&tor[searchType]=all&tor[searchIn]=torrents&tor[cat][]=39&tor[cat][]=49&tor[cat][]=50&tor[cat][]=83&tor[cat][]=51&tor[cat][]=97&tor[cat][]=40&tor[cat][]=41&tor[cat][]=106&tor[cat][]=42&tor[cat][]=52&tor[cat][]=98&tor[cat][]=54&tor[cat][]=55&tor[cat][]=43&tor[cat][]=99&tor[cat][]=84&tor[cat][]=44&tor[cat][]=56&tor[cat][]=45&tor[cat][]=57&tor[cat][]=85&tor[cat][]=87&tor[cat][]=119&tor[cat][]=88&tor[cat][]=58&tor[cat][]=59&tor[cat][]=46&tor[cat][]=47&tor[cat][]=53&tor[cat][]=89&tor[cat][]=100&tor[cat][]=108&tor[cat][]=48&tor[cat][]=111&tor[cat][]=0&tor[browseFlagsHideVsShow]=0&tor[unit]=1&tor[sortType]=default&tor[startNumber]=0&thumbnail=true",
        },
        {
          name: "Default eBook Search",
          base: "https://www.myanonamouse.net/tor/browse.php",
          extra:
            "&tor[srchIn][title]=true&tor[srchIn][author]=true&tor[srchIn][series]=true&tor[searchType]=all&tor[searchIn]=torrents&tor[cat][]=60&tor[cat][]=71&tor[cat][]=72&tor[cat][]=90&tor[cat][]=61&tor[cat][]=73&tor[cat][]=101&tor[cat][]=62&tor[cat][]=63&tor[cat][]=107&tor[cat][]=64&tor[cat][]=74&tor[cat][]=102&tor[cat][]=76&tor[cat][]=77&tor[cat][]=65&tor[cat][]=103&tor[cat][]=115&tor[cat][]=91&tor[cat][]=66&tor[cat][]=78&tor[cat][]=67&tor[cat][]=79&tor[cat][]=80&tor[cat][]=92&tor[cat][]=118&tor[cat][]=94&tor[cat][]=120&tor[cat][]=95&tor[cat][]=81&tor[cat][]=82&tor[cat][]=68&tor[cat][]=69&tor[cat][]=75&tor[cat][]=96&tor[cat][]=104&tor[cat][]=109&tor[cat][]=70&tor[cat][]=112&tor[cat][]=0&tor[browseFlagsHideVsShow]=1&tor[unit]=1&tor[sortType]=default&tor[startNumber]=0&thumbnail=true",
        },
      ],
    },
    Mobilism: {
      queryKey: "keywords",
      separator: "&",
      encodingType: "query",
      urls: [
        {
          name: "Audiobooks Forum",
          base: "https://forum.mobilism.org/search.php",
          extra: "fid[]=124&sr=topics&sf=titleonly",
        },
      ],
    },
  };

  // ================================================================
  // State
  // ================================================================

  let scriptStarted = false;
  let audiobookConfigKeys = {};
  let UI_CONFIG = {
    position: { ...DEFAULT_UI_CONFIG.position },
    buttonColors: { ...DEFAULT_UI_CONFIG.buttonColors },
    buttonScale: DEFAULT_UI_CONFIG.buttonScale,
  };

  // ================================================================
  // Utilities
  // ================================================================

  function isTopAnchored() {
    return UI_CONFIG.position.top !== "auto";
  }

  function isLeftAnchored() {
    return UI_CONFIG.position.left !== "auto";
  }

  function siteConfigKey(siteName) {
    return "enable_" + siteName.replace(/[^a-zA-Z0-9]+/g, "_").replace(/_$/, "");
  }

  function cleanTitle(title) {
    return title
      .replace(
        /\s*\((?:Paperback|Hardcover|Kindle Edition|Audible Audio Edition)\)/g,
        "",
      )
      .trim();
  }

  function normalizeSearchTitle(title) {
    return title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}\s']/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // ================================================================
  // Configuration
  // ================================================================

  function readConfigValue(name) {
    return typeof gmc !== "undefined" && typeof gmc.get === "function"
      ? gmc.get(name)
      : undefined;
  }

  function readConfigNumber(name) {
    const value = readConfigValue(name);
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : undefined;
  }

  function isSiteEnabled(siteName, configKey) {
    const key = typeof configKey === "string" ? configKey : siteConfigKey(siteName);
    const value = readConfigValue(key);
    return value !== false && value !== "false" && value !== "no";
  }

  function syncUIConfig() {
    const verticalSelection = (
      readConfigValue("buttonVerticalPosition") ?? DEFAULT_VERTICAL_POSITION
    ).toLowerCase();
    const horizontalSelection = (
      readConfigValue("buttonHorizontalPosition") ?? DEFAULT_HORIZONTAL_POSITION
    ).toLowerCase();

    const vertical =
      verticalSelection === "top" ? "top" : DEFAULT_VERTICAL_POSITION;
    const horizontal =
      horizontalSelection === "left" ? "left" : DEFAULT_HORIZONTAL_POSITION;
    const verticalMargin =
      readConfigNumber("buttonVerticalMargin") ?? DEFAULT_VERTICAL_MARGIN;
    const horizontalMargin =
      readConfigNumber("buttonHorizontalMargin") ?? DEFAULT_HORIZONTAL_MARGIN;

    const top = vertical === "top" ? `${verticalMargin}px` : "auto";
    const bottom = vertical === "bottom" ? `${verticalMargin}px` : "auto";
    const left = horizontal === "left" ? `${horizontalMargin}px` : "auto";
    const right = horizontal === "right" ? `${horizontalMargin}px` : "auto";

    UI_CONFIG = {
      position: { top, right, bottom, left },
      buttonColors: {
        start:
          readConfigValue("buttonColorStart") ??
          DEFAULT_UI_CONFIG.buttonColors.start,
        end:
          readConfigValue("buttonColorEnd") ??
          DEFAULT_UI_CONFIG.buttonColors.end,
        text:
          readConfigValue("buttonColorText") ??
          DEFAULT_UI_CONFIG.buttonColors.text,
      },
      buttonScale:
        readConfigNumber("buttonScale") ?? DEFAULT_UI_CONFIG.buttonScale,
    };
  }

  function initializeConfig() {
    if (typeof GM_config === "undefined") {
      syncUIConfig();
      startScript();
      return;
    }

    const engineFields = {};
    let engineIdx = 0;
    for (const siteName in SEARCH_SITES) {
      const field = {
        label: siteName,
        type: "checkbox",
        default: true,
      };
      if (engineIdx === 0) {
        field.section = [
          "Search Engines (Books)",
          "Toggle which book search engines appear in the menu",
        ];
      }
      engineFields[siteConfigKey(siteName)] = field;
      engineIdx++;
    }

    audiobookConfigKeys = {};
    let audioIdx = 0;
    for (const siteName in AUDIOBOOK_SITES) {
      const baseKey = siteConfigKey(siteName);
      const isDuplicate = !!engineFields[baseKey];
      const field = {
        label: isDuplicate ? siteName + " (Audiobooks)" : siteName,
        type: "checkbox",
        default: true,
      };
      if (audioIdx === 0) {
        field.section = [
          "Search Engines (Audiobooks)",
          "Toggle which audiobook search engines appear in the menu",
        ];
      }
      // Use unique config key if site name collides with SEARCH_SITES (e.g. Mobilism in both)
      const key = isDuplicate ? baseKey + "_audiobook" : baseKey;
      audiobookConfigKeys[siteName] = key;
      engineFields[key] = field;
      audioIdx++;
    }

    gmc = new GM_config({
      id: GM_CONFIG_ID,
      title: "Search the Ships Settings",
      fields: {
        buttonVerticalPosition: {
          label: "Vertical position",
          section: [
            "Button Position",
            "Control where the search button appears on the page",
          ],
          type: "select",
          options: ["top", "bottom"],
          default: DEFAULT_VERTICAL_POSITION,
        },
        buttonHorizontalPosition: {
          label: "Horizontal position",
          type: "select",
          options: ["right", "left"],
          default: DEFAULT_HORIZONTAL_POSITION,
        },
        buttonVerticalMargin: {
          label: "Vertical margin (px)",
          type: "number",
          min: 0,
          default: DEFAULT_VERTICAL_MARGIN,
        },
        buttonHorizontalMargin: {
          label: "Horizontal margin (px)",
          type: "number",
          min: 0,
          default: DEFAULT_HORIZONTAL_MARGIN,
        },
        buttonColorStart: {
          label: "Gradient start",
          section: [
            "Button Appearance",
            "Customize colors and size of the search button",
          ],
          type: "text",
          default: DEFAULT_UI_CONFIG.buttonColors.start,
        },
        buttonColorEnd: {
          label: "Gradient end",
          type: "text",
          default: DEFAULT_UI_CONFIG.buttonColors.end,
        },
        buttonColorText: {
          label: "Text color",
          type: "text",
          default: DEFAULT_UI_CONFIG.buttonColors.text,
        },
        buttonScale: {
          label: "Button scale",
          type: "number",
          min: 0.5,
          default: 1,
        },
        ...engineFields,
      },
      events: {
        init: function () {
          syncUIConfig();
          startScript();
        },
        save: function () {
          window.location.reload();
        },
      },
    });
  }

  // ================================================================
  // URL Construction
  // ================================================================

  function constructSearchUrl(siteConfig, urlObject, bookTitle) {
    const normalizedTitle = normalizeSearchTitle(bookTitle);
    const processedTitle =
      siteConfig.encodingType === "path"
        ? normalizedTitle.replace(/ /g, "%20")
        : normalizedTitle.replace(/ /g, "+");

    let finalUrl;
    if (!siteConfig.queryKey) {
      finalUrl = `${urlObject.base}${processedTitle}`;
      if (urlObject.extra) {
        finalUrl += `${siteConfig.separator}${urlObject.extra}`;
      }
    } else {
      finalUrl = `${urlObject.base}?${siteConfig.queryKey}=${processedTitle}`;
      if (urlObject.extra) {
        finalUrl += `${siteConfig.separator}${urlObject.extra}`;
      }
    }
    return finalUrl;
  }

  // ================================================================
  // Title Extraction
  // ================================================================

  function getBookTitle() {
    const hostname = window.location.hostname;
    for (const key in TITLE_EXTRACTORS) {
      if (hostname.includes(key)) {
        const title = TITLE_EXTRACTORS[key]();
        if (title) {
          return cleanTitle(title);
        }
      }
    }
    return "";
  }

  // ================================================================
  // CSS Injection
  // ================================================================

  function computeScale(scale) {
    const round = (n) => Math.round(n * scale);
    const minRound = (n, min) => Math.max(min, Math.round(n * scale));
    return {
      pad: { top: round(12), right: round(14), bottom: round(12), left: round(18) },
      gap: round(14),
      fontSize: round(16),
      borderRadius: round(50),
      svgSize: round(20),
      settingsBtnSize: round(30),
      settingsSvgSize: round(16),
      menuOffset: round(10),
      submenuOffset: round(8),
      submenuAnchorOffset: round(6),
      statusMarginLeft: round(10),
      sectionDividerMargin: round(6),
      minWidth: minRound(220, 120),
      ddPadding: minRound(6, 4),
      sitePadV: minRound(10, 6),
      sitePadH: minRound(15, 8),
      siteFontSize: minRound(15, 12),
      linkPadV: minRound(8, 6),
      linkPadH: minRound(12, 8),
      linkFontSize: minRound(14, 12),
      statusSize: minRound(8, 6),
      sectionPadV: minRound(8, 6),
      sectionPadH: minRound(15, 10),
      sectionHeaderFontSize: minRound(12, 10),
    };
  }

  function injectCSS() {
    if (document.getElementById("sts-styles")) return;

    const scale = UI_CONFIG.buttonScale ?? 1;
    const s = computeScale(scale);
    const isTop = isTopAnchored();
    const isLeft = isLeftAnchored();

    const styles = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

      .sts-container {
        position: fixed;
        z-index: 10000;
        font-family: 'Inter', sans-serif;
        top: ${UI_CONFIG.position.top};
        right: ${UI_CONFIG.position.right};
        bottom: ${UI_CONFIG.position.bottom};
        left: ${UI_CONFIG.position.left};
      }

      .sts-button {
        background: linear-gradient(135deg, ${UI_CONFIG.buttonColors.start} 0%, ${UI_CONFIG.buttonColors.end} 100%);
        color: ${UI_CONFIG.buttonColors.text};
        padding: ${s.pad.top}px ${s.pad.right}px ${s.pad.bottom}px ${s.pad.left}px;
        border: none;
        border-radius: ${s.borderRadius}px;
        cursor: default;
        font-size: ${s.fontSize}px;
        font-weight: 600;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        transition: all 0.3s ease;
        outline: none;
        display: flex;
        align-items: center;
        gap: ${s.gap}px;
        position: relative;
        overflow: visible;
      }

      .sts-button-main {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
      }

      .sts-settings-button {
        border: none;
        background: rgba(255, 255, 255, 0.18);
        color: inherit;
        width: ${s.settingsBtnSize}px;
        height: ${s.settingsBtnSize}px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        transition: transform 0.2s ease, background-color 0.2s ease;
      }

      .sts-settings-button:hover {
        transform: scale(1.05);
        background: rgba(255, 255, 255, 0.28);
      }

      .sts-button:hover {
        transform: translateY(-3px);
        box-shadow: 0 7px 25px rgba(0, 0, 0, 0.25);
      }

      .sts-button svg {
        width: ${s.svgSize}px;
        height: ${s.svgSize}px;
        fill: currentColor;
      }

      .sts-settings-button svg {
        width: ${s.settingsSvgSize}px;
        height: ${s.settingsSvgSize}px;
      }

      .sts-dropdown {
        position: absolute;
        left: 50%;
        ${isTop
          ? `top: calc(100% + ${s.menuOffset}px);`
          : `bottom: calc(100% + ${s.menuOffset}px);`}
        background-color: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        display: none;
        z-index: 10001;
        min-width: ${s.minWidth}px;
        padding: ${s.ddPadding}px;
        box-sizing: border-box;
        opacity: 0;
        ${isTop
          ? `transform: translate(-50%, -${s.menuOffset}px);`
          : `transform: translate(-50%, ${s.menuOffset}px);`}
        transition: opacity 0.2s ease, transform 0.2s ease;
        pointer-events: none;
      }

      .sts-dropdown.sts-visible {
        display: block;
        opacity: 1;
        transform: translate(-50%, 0);
        pointer-events: auto;
      }

      .sts-site-div {
        padding: ${s.sitePadV}px ${s.sitePadH}px;
        cursor: pointer;
        font-size: ${s.siteFontSize}px;
        font-weight: 500;
        color: #333;
        transition: background-color 0.2s ease;
        border-radius: 8px;
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .sts-site-div:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }

      .sts-submenu {
        display: none;
        position: absolute;
        top: -${s.submenuAnchorOffset}px;
        ${isLeft
          ? `left: calc(100% + ${s.submenuOffset}px); right: auto;`
          : `right: calc(100% + ${s.submenuOffset}px); left: auto;`}
        background-color: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        min-width: ${s.minWidth}px;
        z-index: 10002;
        padding: ${s.ddPadding}px;
        opacity: 0;
        ${isLeft
          ? `transform: translateX(-${s.submenuOffset}px);`
          : `transform: translateX(${s.submenuOffset}px);`}
        transition: opacity 0.2s ease, transform 0.2s ease;
        pointer-events: none;
      }

      .sts-site-div:last-child > .sts-submenu {
        top: auto;
        bottom: -${s.submenuAnchorOffset}px;
      }

      .sts-submenu.sts-submenu-visible {
        display: block;
        opacity: 1;
        transform: translateX(0);
        pointer-events: auto;
      }

      .sts-link {
        display: block;
        padding: ${s.linkPadV}px ${s.linkPadH}px;
        color: #4A5568;
        text-decoration: none;
        font-size: ${s.linkFontSize}px;
        border-radius: 6px;
        transition: background-color 0.2s ease, color 0.2s ease;
      }

      .sts-link:hover {
        background-color: rgba(90, 103, 216, 0.1);
        color: #5A67D8;
      }

      .sts-ship-status {
        width: ${s.statusSize}px;
        height: ${s.statusSize}px;
        border-radius: 50%;
        display: inline-block;
        margin-left: ${s.statusMarginLeft}px;
        flex-shrink: 0;
      }

      .sts-pending {
        background-color: #9CA3AF;
      }

      .sts-online {
        background-color: #34D399;
      }

      .sts-offline {
        background-color: #F87171;
      }

      .sts-section-divider {
        height: 1px;
        background-color: rgba(0, 0, 0, 0.1);
        margin: ${s.sectionDividerMargin}px 0;
      }

      .sts-section-header {
        padding: ${s.sectionPadV}px ${s.sectionPadH}px;
        font-size: ${s.sectionHeaderFontSize}px;
        font-weight: 600;
        color: #9CA3AF;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.id = "sts-styles";
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  // ================================================================
  // DOM Construction
  // ================================================================

  function buildSiteItem(siteName, siteConfig, bookTitle) {
    const siteDiv = document.createElement("div");
    siteDiv.className = "sts-site-div";

    const nameSpan = document.createElement("span");
    nameSpan.innerText = siteName;
    siteDiv.appendChild(nameSpan);

    if (siteConfig.urls && siteConfig.urls.length > 0) {
      const statusSpan = document.createElement("span");
      statusSpan.className = "sts-ship-status sts-pending";
      statusSpan.dataset.url = siteConfig.urls[0].base;
      statusSpan.title = "Checking...";
      siteDiv.appendChild(statusSpan);

      const baseUrl = new URL(siteConfig.urls[0].base).origin;
      fetch(baseUrl, { method: "HEAD", mode: "no-cors" })
        .then(() => {
          statusSpan.classList.remove("sts-pending");
          statusSpan.classList.add("sts-online");
          statusSpan.title = "Online";
        })
        .catch(() => {
          statusSpan.classList.remove("sts-pending");
          statusSpan.classList.add("sts-offline");
          statusSpan.title = "Offline";
        });
    }

    const subMenu = document.createElement("div");
    subMenu.className = "sts-submenu";

    if (siteConfig.urls) {
      siteConfig.urls.forEach((urlObject) => {
        const finalUrl = constructSearchUrl(siteConfig, urlObject, bookTitle);
        const link = document.createElement("a");
        link.href = finalUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "sts-link";
        link.innerText = urlObject.name;
        subMenu.appendChild(link);
      });
    }

    siteDiv.appendChild(subMenu);
    return siteDiv;
  }

  function buildDropdownSection(headerText, siteMap, bookTitle, keyMap) {
    const fragment = document.createDocumentFragment();

    const header = document.createElement("div");
    header.className = "sts-section-header";
    header.innerText = headerText;
    fragment.appendChild(header);

    for (const siteName of Object.keys(siteMap)) {
      const configKey = keyMap?.[siteName] || siteConfigKey(siteName);
      if (!isSiteEnabled(siteName, configKey)) continue;
      fragment.appendChild(
        buildSiteItem(siteName, siteMap[siteName], bookTitle),
      );
    }

    return fragment;
  }

  function createDropdownMenu(bookTitle) {
    const dropdown = document.createElement("div");
    dropdown.className = "sts-dropdown";

    const enabledSearchSites = Object.keys(SEARCH_SITES).filter(isSiteEnabled);
    if (enabledSearchSites.length > 0) {
      dropdown.appendChild(
        buildDropdownSection("📚 Books", SEARCH_SITES, bookTitle),
      );
    }

    const enabledAudiobookSites = Object.keys(AUDIOBOOK_SITES).filter(
      isSiteEnabled,
    );
    if (enabledAudiobookSites.length > 0) {
      if (enabledSearchSites.length > 0) {
        const divider = document.createElement("div");
        divider.className = "sts-section-divider";
        dropdown.appendChild(divider);
      }
      dropdown.appendChild(
        buildDropdownSection("🎧 Audiobooks", AUDIOBOOK_SITES, bookTitle, audiobookConfigKeys),
      );
    }

    return dropdown;
  }

  function createButtonHTML() {
    return [
      '<span class="sts-button-main">',
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>',
      "<span>Search the Ships</span>",
      "</span>",
      '<button type="button" class="sts-settings-button" aria-label="Open Search the Ships settings" title="Open settings">',
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19.14 12.94a7.43 7.43 0 0 0 .05-.94 7.43 7.43 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.63l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.1 7.1 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.41l-.36 2.54c-.58.22-1.12.52-1.63.94l-2.39-.96a.5.5 0 0 0-.61.22L2.7 8.97a.5.5 0 0 0 .12.63l2.03 1.58a7.43 7.43 0 0 0-.05.94c0 .32.02.63.05.94l-2.03 1.58a.5.5 0 0 0-.12.63l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96c.5.4 1.05.73 1.63.94l.36 2.54a.5.5 0 0 0 .49.41h3.8a.5.5 0 0 0 .49-.41l.36-2.54c.58-.22 1.12-.52 1.63-.94l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.63l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z"/></svg>',
      "</button>",
    ].join("");
  }

  function attachEventListeners() {
    const buttonContainer = document.querySelector(".sts-container");
    const dropdown = document.querySelector(".sts-dropdown");
    let hideDropdownTimeout;

    buttonContainer.addEventListener("mouseenter", () => {
      clearTimeout(hideDropdownTimeout);
      if (!dropdown.classList.contains("sts-visible")) {
        dropdown.classList.add("sts-visible");
      }
    });

    buttonContainer.addEventListener("mouseleave", () => {
      hideDropdownTimeout = setTimeout(() => {
        dropdown.classList.remove("sts-visible");
      }, 300);
    });

    document.querySelectorAll(".sts-site-div").forEach((siteDiv) => {
      const subMenu = siteDiv.querySelector(".sts-submenu");
      let hideSubMenuTimeout;

      const show = () => {
        clearTimeout(hideSubMenuTimeout);
        document
          .querySelectorAll(".sts-submenu-visible")
          .forEach((visibleSubMenu) => {
            if (visibleSubMenu !== subMenu) {
              visibleSubMenu.classList.remove("sts-submenu-visible");
            }
          });
        subMenu.classList.add("sts-submenu-visible");
      };

      const hide = () => {
        hideSubMenuTimeout = setTimeout(() => {
          subMenu.classList.remove("sts-submenu-visible");
        }, 300);
      };

      siteDiv.addEventListener("mouseenter", show);
      siteDiv.addEventListener("mouseleave", hide);
      subMenu.addEventListener("mouseenter", show);
      subMenu.addEventListener("mouseleave", hide);
    });
  }

  function createSearchButton() {
    const bookTitle = getBookTitle();
    if (!bookTitle) return;

    injectCSS();

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "sts-container";

    const button = document.createElement("div");
    button.className = "sts-button";
    button.innerHTML = createButtonHTML();

    const settingsButton = button.querySelector(".sts-settings-button");
    if (settingsButton) {
      if (typeof gmc !== "undefined" && typeof gmc.open === "function") {
        settingsButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          gmc.open();
        });
      } else {
        settingsButton.style.display = "none";
      }
    }

    const dropdown = createDropdownMenu(bookTitle);
    button.appendChild(dropdown);

    buttonContainer.appendChild(button);
    document.body.appendChild(buttonContainer);

    attachEventListeners();
  }

  // ================================================================
  // Entry Point
  // ================================================================

  function startScript() {
    if (scriptStarted) return;
    if (!document.body) {
      window.addEventListener("DOMContentLoaded", startScript, { once: true });
      return;
    }

    scriptStarted = true;
    main();
  }

  function main() {
    createSearchButton();

    if (window.location.hostname.includes("tastedive.com")) {
      const handleTastediveNavigation = () => {
        const existingButton = document.querySelector(".sts-container");
        if (existingButton) {
          existingButton.remove();
        }
        setTimeout(createSearchButton, 500);
      };

      let oldHref = document.location.href;
      const body = document.querySelector("body");
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(() => {
          if (oldHref !== document.location.href) {
            oldHref = document.location.href;
            handleTastediveNavigation();
          }
        });
      });
      observer.observe(body, { childList: true, subtree: true });
    }
  }

  initializeConfig();
})();
