import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";

const SCRIPT = readFileSync(
  join(import.meta.dirname, "search-the-ships.user.js"),
  "utf8",
);

function setup({ url, body = "" }) {
  const dom = new JSDOM(
    `<!doctype html><html><head></head><body>${body}</body></html>`,
    { url, runScripts: "outside-only", pretendToBeVisual: true },
  );
  dom.window.fetch = () => Promise.resolve({ ok: true });
  // jsdom lacks `innerText`; the script reads it in several extractors.
  Object.defineProperty(dom.window.Element.prototype, "innerText", {
    get() {
      return this.textContent;
    },
    set(value) {
      this.textContent = value;
    },
  });
  return dom;
}

function runScript(dom, { gmConfig = false, configValues = {} } = {}) {
  const w = dom.window;
  if (gmConfig) {
    w.GM_config = function (opts) {
      w.GM_config.captured = opts;
      // Fire init asynchronously so `gmc = new GM_config(...)` has completed
      // by the time the init handler calls startScript().
      setTimeout(() => {
        if (opts.events && typeof opts.events.init === "function") {
          opts.events.init();
        }
      }, 0);
      return {
        get: (name) => (name in configValues ? configValues[name] : undefined),
        open: () => {},
      };
    };
  }
  w.eval(SCRIPT);
  return w;
}

function links(w, text) {
  return [...w.document.querySelectorAll(".sts-link")]
    .filter((a) => a.textContent === text)
    .map((a) => a.href);
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const GOODREADS = {
  url: "https://www.goodreads.com/book/show/4671-the-great-gatsby",
  body: '<div data-testid="bookTitle">The Great Gatsby (Paperback)</div>',
};

test("renders button, dropdown sections, and status dots on a goodreads book page", async () => {
  const w = runScript(setup(GOODREADS));

  const container = w.document.querySelector(".sts-container");
  assert.ok(container, "expected .sts-container to render");
  assert.equal(w.document.querySelectorAll(".sts-section-header").length, 2);
  assert.equal(w.document.querySelector(".sts-section-divider") !== null, true);

  const settings = w.document.querySelector(".sts-settings-button");
  assert.equal(settings.style.display, "none", "settings hidden without GM_config");

  const statusCount = w.document.querySelectorAll(".sts-ship-status").length;
  assert.equal(statusCount, 7, "one status dot per search site");
  await settle();
  assert.equal(
    w.document.querySelectorAll(".sts-ship-status.sts-online").length,
    7,
    "all status dots online after HEAD check resolves",
  );
});

test("constructs query-encoded search URLs from the extracted title", () => {
  const w = runScript(setup(GOODREADS));

  assert.equal(
    links(w, "All Files").find((href) => href.includes("annas-archive")),
    "https://annas-archive.gl/search?q=the+great+gatsby&page=1&sort=",
  );
  assert.equal(
    links(w, "Default Search").find((href) => href.includes("libgen.li")),
    "https://libgen.li/index.php?req=the+great+gatsby&lg_topic=libgen&open=0&view=simple&res=25&phrase=1&column=def",
  );
  assert.equal(
    links(w, "Books Forum")[0],
    "https://forum.mobilism.org/search.php?keywords=the+great+gatsby&fid[]=120&sr=topics&sf=titleonly",
  );
  assert.equal(
    links(w, "Default Search").find((href) => href.includes("audiobookbay")),
    "https://audiobookbay.lu/?s=the+great+gatsby",
  );
});

test("constructs path-encoded URLs (Z-Library) and strips the edition suffix", () => {
  const w = runScript(setup(GOODREADS));

  assert.equal(
    links(w, "EPUBs").find((href) => href.includes("z-library")),
    "https://z-library.sk/s/the%20great%20gatsby?extensions[]=EPUB",
  );
  // Known bug: the "All Files" base has a double "h" ("hhttps://"). Locked in
  // deliberately so a future fix updates this assertion too.
  assert.equal(
    links(w, "All Files").find((href) => href.includes("z-library")),
    "hhttps://z-library.sk/s/the%20great%20gatsby",
  );
});

test("does not render when the host has no title extractor match", () => {
  const w = runScript(setup({ url: "https://example.com/whatever" }));
  assert.equal(w.document.querySelector(".sts-container"), null);
});

test("does not render on a goodreads page that is not a book page", () => {
  const w = runScript(
    setup({ url: "https://www.goodreads.com/user/show/1", body: GOODREADS.body }),
  );
  assert.equal(w.document.querySelector(".sts-container"), null);
});

test("extracts titles from every supported host", () => {
  const cases = [
    {
      name: "amazon",
      url: "https://www.amazon.com/dp/123456",
      body: '<div id="wayfinding-breadcrumbs_feature_div">Books › Fiction</div><span id="productTitle">Dune</span>',
      expected: "dune",
    },
    {
      name: "thegreatestbooks",
      url: "https://thegreatestbooks.org/books/42",
      body: '<h1><a class="no-underline-link" href="/b/42">Moby Dick</a></h1>',
      expected: "moby dick",
    },
    {
      name: "tastedive",
      url: "https://tastedive.com/books/like/Dune",
      body: '<div class="sc-5b0eeb21-6 bpGMKW">The Hitchhiker\'s Guide to the Galaxy</div>',
      expected: "the hitchhiker's guide to the galaxy",
    },
    {
      name: "thestorygraph",
      url: "https://app.thestorygraph.com/books/abc123",
      body: '<div class="book-title-author-and-series"><h3>The Hobbit</h3></div>',
      expected: "the hobbit",
    },
  ];

  for (const { name, url, body, expected } of cases) {
    const w = runScript(setup({ url, body }));
    const container = w.document.querySelector(".sts-container");
    assert.ok(container, `expected button to render on ${name}`);
    const annas = links(w, "All Files").find((href) =>
      href.includes("annas-archive"),
    );
    // searchParams decodes the %27-encoded apostrophe back to "itself"
    assert.equal(
      new URL(annas).searchParams.get("q"),
      expected,
      `expected normalized title "${expected}" in URL on ${name}`,
    );
  }
});

test("normalizes accents and punctuation in the search title", () => {
  const w = runScript(
    setup({
      url: GOODREADS.url,
      body: '<div data-testid="bookTitle">Café au Lait: A Memoir</div>',
    }),
  );
  const annas = links(w, "All Files").find((href) =>
    href.includes("annas-archive"),
  );
  assert.equal(annas, "https://annas-archive.gl/search?q=cafe+au+lait+a+memoir&page=1&sort=");
});

test("renders both Mobilism entries and keeps GM_config config keys distinct", async () => {
  const dom = setup(GOODREADS);
  const w = runScript(dom, { gmConfig: true });
  await settle();

  assert.equal(links(w, "Books Forum").length, 1);
  assert.equal(links(w, "Audiobooks Forum").length, 1);

  const settings = w.document.querySelector(".sts-settings-button");
  assert.notEqual(settings.style.display, "none", "settings visible with GM_config");

  const fields = w.GM_config.captured.fields;
  assert.ok(fields.enable_Mobilism);
  assert.ok(fields.enable_Mobilism_audiobook);
  assert.equal(fields.enable_Mobilism_audiobook.label, "Mobilism (Audiobooks)");
});

test("adds a blank domain field for every search engine", async () => {
  const dom = setup(GOODREADS);
  const w = runScript(dom, { gmConfig: true });
  await settle();

  const fields = w.GM_config.captured.fields;
  for (const siteName of ["Z-Library", "Anna's Archive", "Library Genesis", "Mobilism"]) {
    const urlField = fields["url_" + siteName.replace(/[^a-zA-Z0-9]+/g, "_")];
    assert.ok(urlField, `expected domain field for ${siteName}`);
    assert.equal(urlField.type, "text");
    assert.equal(urlField.default, "", `expected blank default for ${siteName}`);
  }
  assert.ok(fields.url_Mobilism_audiobook, "audiobook Mobilism keeps its own domain key");
  assert.equal(fields.url_Mobilism_audiobook.default, "");

  // Domain fields are grouped into their own "Search Domains" section,
  // separate from the search engine checkbox sections.
  assert.deepStrictEqual(
    [...fields.url_Z_Library.section],
    ["Search Domains", "Override a search engine's domain (blank = script default)"],
  );
  assert.deepStrictEqual([...fields.enable_Z_Library.section], [
    "Search Engines (Books)",
    "Toggle which book search engines appear in the menu",
  ]);
  assert.notEqual(fields.url_Z_Library.section[0], fields.enable_Z_Library.section[0]);
});

test("shows the default domain as the placeholder on each domain field", async () => {
  const dom = setup(GOODREADS);
  const w = runScript(dom, { gmConfig: true });
  await settle();

  // Simulate GM_config's rendered inputs using its id scheme.
  for (const key of [
    "url_Z_Library",
    "url_Anna_s_Archive",
    "url_Library_Genesis",
    "url_Mobilism",
    "url_Mobilism_audiobook",
    "url_AudiobookBay",
    "url_MyAnonaMouse",
  ]) {
    const input = w.document.createElement("input");
    input.id = "SearchTheShips_field_" + key;
    w.document.body.appendChild(input);
  }

  w.GM_config.captured.events.open(w.document);

  assert.equal(
    w.document.getElementById("SearchTheShips_field_url_Z_Library").placeholder,
    "z-library.sk",
  );
  assert.equal(
    w.document.getElementById("SearchTheShips_field_url_Anna_s_Archive")
      .placeholder,
    "annas-archive.gl",
  );
  assert.equal(
    w.document.getElementById("SearchTheShips_field_url_Mobilism_audiobook")
      .placeholder,
    "forum.mobilism.org",
  );
  assert.equal(
    w.document.getElementById("SearchTheShips_field_url_AudiobookBay").placeholder,
    "audiobookbay.lu",
  );
});

test("keeps default domains when no custom domain is configured", async () => {
  const w = runScript(setup(GOODREADS), { gmConfig: true });
  await settle();

  assert.equal(
    links(w, "EPUBs").find((href) => href.includes("z-library")),
    "https://z-library.sk/s/the%20great%20gatsby?extensions[]=EPUB",
  );
  assert.equal(
    links(w, "All Files").find((href) => href.includes("z-library")),
    "hhttps://z-library.sk/s/the%20great%20gatsby",
  );
});

test("rewrites search links and the status dot to a custom domain", async () => {
  const w = runScript(setup(GOODREADS), {
    gmConfig: true,
    configValues: {
      url_Z_Library: "https://z-library.se",
      url_Library_Genesis: "libgen.is",
    },
  });
  await settle();

  // Custom domain keeps each link's path; also fixes the hhttps:// typo.
  assert.equal(
    links(w, "All Files").find((href) => href.includes("z-library")),
    "https://z-library.se/s/the%20great%20gatsby",
  );
  assert.equal(
    links(w, "EPUBs").find((href) => href.includes("z-library")),
    "https://z-library.se/s/the%20great%20gatsby?extensions[]=EPUB",
  );
  assert.equal(
    links(w, "Default Search").find((href) => href.includes("libgen")),
    "https://libgen.is/index.php?req=the+great+gatsby&lg_topic=libgen&open=0&view=simple&res=25&phrase=1&column=def",
  );

  const dotUrls = [...w.document.querySelectorAll(".sts-ship-status")].map(
    (dot) => dot.dataset.url,
  );
  assert.ok(dotUrls.includes("https://z-library.se/s/"), "status dot uses custom origin");
  assert.ok(dotUrls.includes("https://libgen.is/index.php"), "status dot uses bare-host override");
});
