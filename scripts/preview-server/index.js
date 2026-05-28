/**
 * Block Preview Server
 *
 * Local server that:
 * 1. Automatically discovers all blocks in the project
 * 2. Reads their _block.json and generates EDS HTML from the "mock" section
 * 3. Serves interactive preview pages with the real decorate()
 * 4. Hot reload via Vite when a block's JS/CSS changes
 * 5. Auto-refresh the dashboard when a new block is added
 *
 * Usage: npm run preview → http://localhost:5175
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import {
  generateBlockHTML,
  getMockForVariant,
  getVariants,
} from './html-generator.js';

const ROOT = resolve(process.cwd());
const BLOCKS_DIR = join(ROOT, 'blocks');
const PORT = 5175;

// ── Utilities ──────────────────────────────────────────────────────────────

function discoverBlocks() {
  try {
    return readdirSync(BLOCKS_DIR)
      .filter((name) => {
        try {
          return statSync(join(BLOCKS_DIR, name)).isDirectory();
        } catch {
          return false;
        }
      })
      .map((name) => {
        const jsonPath = join(BLOCKS_DIR, name, `_${name}.json`);
        try {
          const raw = readFileSync(jsonPath, 'utf-8');
          const json = JSON.parse(raw);
          return { name, json, jsonPath };
        } catch {
          // Block without _block.json — include it but without schema
          return { name, json: {}, jsonPath: null };
        }
      })
      .filter((b) => b !== null);
  } catch {
    return [];
  }
}

function getBlockStatus(block) {
  const { json } = block;
  if (!json.eds && !json.mock) return 'no-json';
  if (!json.eds) return 'no-schema';
  if (!json.mock) return 'no-mock';
  return 'ready';
}

// ── HTML templates ───────────────────────────────────────────────────────────

function renderDashboard(blocks) {
  const ready = blocks.filter((b) => getBlockStatus(b) === 'ready');
  const notReady = blocks.filter((b) => getBlockStatus(b) !== 'ready');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Block Preview — Ohio Natural Gas</title>
  <link rel="stylesheet" href="/styles/styles.css">
  <link rel="stylesheet" href="/styles/tokens.css">
  <style>
    * { box-sizing: border-box }
    body {
      background: var(--color-surface, #f5f5f5);
      font-family: var(--font-sans, system-ui, sans-serif);
      margin: 0;
    }
    .header {
      background: var(--color-secondary, #003087);
      color: white;
      padding: 1.5rem 2rem;
    }
    .header h1 { font-size: 1.5rem; margin: 0 0 0.25rem; color: white }
    .header p { font-size: 0.875rem; margin: 0; opacity: 0.7 }
    .content { padding: 2rem;     max-width: 1200px;
    margin: 0 auto; }
    .section-title {
      color: var(--color-text-muted, #666);
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      margin: 0 0 0.75rem;
      text-transform: uppercase;
    }
    .grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      margin-bottom: 2rem;
    }
    .card {
      background: white;
      border: 1px solid var(--color-border, #e0e0e0);
      border-radius: 8px;
      color: inherit;
      display: block;
      padding: 1.25rem;
      text-decoration: none;
      transition: box-shadow 0.15s, transform 0.15s;
    }
    .card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); transform: translateY(-1px) }
    .card.disabled { opacity: 0.45; pointer-events: none }
    .card h2 { font-size: 0.9375rem; margin: 0 0 0.2rem }
    .card p { color: var(--color-text-muted, #666); font-size: 0.8125rem; margin: 0 0 0.75rem }
    .badges { display: flex; flex-wrap: wrap; gap: 0.375rem }
    .badge {
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
    }
    .b-structure { background: #F3E5F5; color: #6A1B9A }
    .b-ready     { background: #E8F5E9; color: #2E7D32 }
    .b-warn      { background: #FFF8E1; color: #E65100 }
    .b-error     { background: #FFEBEE; color: #C62828 }
    .b-variants  { background: #E3F2FD; color: #1565C0 }
    .warning-box {
      background: #FFF8E1;
      border-left: 4px solid #E65100;
      border-radius: 4px;
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
      padding: 0.75rem 1rem;
    }
    .warning-box code {
      background: rgba(0,0,0,0.06);
      border-radius: 3px;
      padding: 1px 4px;
    }
    kbd {
      background: #f0f0f0;
      border: 1px solid #ccc;
      border-radius: 3px;
      font-size: 11px;
      padding: 1px 5px;
    }
    code {
      background: rgba(0,0,0,0.2);
      border-radius: 3px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="content">
      <h1>⚡ Block Preview</h1>
      <p>
        Ohio Natural Gas &mdash;
        ${ready.length} blocks ready · ${notReady.length} not configured ·
        auto-generated from <code>_block.json</code>
      </p>
    </div>
  </div>

  <div class="content">

    ${
      notReady.length > 0
        ? `
    <div class="warning-box">
      <strong>⚠ ${notReady.length} block(s) without preview</strong> —
      Add the <code>"mock"</code> section to their <code>_block.json</code>
      to enable them.
    </div>`
        : ''
    }

    ${
      ready.length > 0
        ? `
    <p class="section-title">Ready for preview</p>
    <div class="grid">
      ${ready
        .map((block) => {
          const variants = getVariants(block.json.mock);
          const structure = block.json.eds?.structure ?? '—';
          return `<a class="card" href="/preview/${block.name}">
          <h2>${block.name}</h2>
          <p>${structure} block</p>
          <div class="badges">
            <span class="badge b-structure">${structure}</span>
            <span class="badge b-ready">✓ ready</span>
            ${variants.length > 1 ? `<span class="badge b-variants">${variants.length} variants</span>` : ''}
          </div>
        </a>`;
        })
        .join('\n      ')}
    </div>`
        : ''
    }

    ${
      notReady.length > 0
        ? `
    <p class="section-title">Not configured</p>
    <div class="grid">
      ${notReady
        .map((block) => {
          const status = getBlockStatus(block);
          const statusLabel =
            {
              'no-json': 'no _block.json',
              'no-schema': 'no eds section',
              'no-mock': 'no mock section',
            }[status] ?? 'incomplete';
          return `<div class="card disabled">
          <h2>${block.name}</h2>
          <p>&nbsp;</p>
          <div class="badges">
            <span class="badge b-warn">${statusLabel}</span>
          </div>
        </div>`;
        })
        .join('\n      ')}
    </div>`
        : ''
    }

    <p style="color:var(--color-text-muted,#999);font-size:0.75rem;margin-top:2rem">
      <kbd>?mock=true</kbd> is applied automatically on React blocks ·
      This page refreshes automatically when new blocks are added.
    </p>

  </div>

  <script>
    // Auto-refresh every 3s to detect new blocks
    let lastCount = ${blocks.length}
    setInterval(async () => {
      try {
        const res = await fetch('/api/blocks')
        const data = await res.json()
        if (data.length !== lastCount) location.reload()
        lastCount = data.length
      } catch {}
    }, 3000)
  </script>
</body>
</html>`;
}

/**
 * Generates a minimal EDS-style container page for the sidekick-library
 * block renderer. The renderer fetches this URL, replaces <main> with the
 * selected block HTML, then renders the result in an iframe.
 *
 * The page also works when visited directly in the browser: it shows the
 * block's default variant with all EDS styles and scripts applied.
 *
 * Note: the renderer rewrites relative href="/" and src="/" to absolute URLs
 * before setting srcdoc, so relative paths here work fine.
 */
function renderContainerPage(blockName, blockHTML) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${blockName}</title>
  <link rel="stylesheet" href="/styles/tokens.css">
  <link rel="stylesheet" href="/styles/styles.css">
  <link rel="stylesheet" href="/styles/lazy-styles.css">
  <link rel="stylesheet" href="/blocks/${blockName}/${blockName}.css">
  <!-- Required by @vitejs/plugin-react in dev mode -->
  <script type="module">
    import RefreshRuntime from '/@react-refresh'
    RefreshRuntime.injectIntoGlobalHook(window)
    window.$RefreshReg$ = () => {}
    window.$RefreshSig$ = () => () => {}
    window.__vite_plugin_react_preamble_installed__ = true
  </script>
</head>
<body>
  <header></header>
  <main>
    <div>
      ${blockHTML}
    </div>
  </main>
  <footer></footer>

  <script>window.__PREVIEW_SERVER = true</script>
  <script type="module">
    // Force ?mock=true so React blocks use their internal mock data
    const url = new URL(window.location)
    if (!url.searchParams.has('mock')) {
      url.searchParams.set('mock', 'true')
      window.history.replaceState({}, '', url)
    }

    // Decorate the block using the same approach as the preview page
    const blockEl = document.querySelector('[data-block-name="${blockName}"]')
    if (blockEl) {
      try {
        const mod = await import('/blocks/${blockName}/${blockName}.js')
        if (typeof mod.default === 'function') {
          await mod.default(blockEl)
        }
      } catch (err) {
        console.error('[Sidekick] Error in decorate():', err)
        blockEl.insertAdjacentHTML('beforebegin',
          '<div style="background:#FFEBEE;border-left:4px solid #C62828;padding:1rem;font-family:monospace;font-size:0.75rem">' +
          '<strong>Error en decorate()</strong><pre>' + err.message + '</pre></div>'
        )
      }
    }
  </script>
</body>
</html>`;
}

function renderPreviewPage(block, variant, mockData) {
  const { name, json } = block;
  const variants = getVariants(json.mock);
  const structure = json.eds?.structure ?? '?';

  // Inject special meta tags if the mock defines them (e.g. my-account)
  const metaTags = mockData?._meta
    ? Object.entries(mockData._meta)
        .map(([k, v]) => `<meta name="${k}" content="${v}">`)
        .join('\n  ')
    : '';

  // Additional query params from the mock (e.g. ?error=true for my-account)
  const extraParams = mockData?._queryParams
    ? Object.entries(mockData._queryParams)
        .map(([k, v]) => `'${k}', '${v}'`)
        .join('; ')
    : null;

  const blockHTML = generateBlockHTML(name, json.eds, mockData);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}${variant !== 'default' ? ` · ${variant}` : ''} — Block Preview</title>
  ${metaTags}
  <link rel="stylesheet" href="/styles/tokens.css">
  <link rel="stylesheet" href="/styles/styles.css">
  <link rel="stylesheet" href="/styles/lazy-styles.css">
  <link rel="stylesheet" href="/blocks/${name}/${name}.css">
  <!-- React refresh preamble — required by @vitejs/plugin-react in dev mode -->
  <script type="module">
    import RefreshRuntime from '/@react-refresh'
    RefreshRuntime.injectIntoGlobalHook(window)
    window.$RefreshReg$ = () => {}
    window.$RefreshSig$ = () => () => {}
    window.__vite_plugin_react_preamble_installed__ = true
  </script>
  <style>
    * { box-sizing: border-box }
    body { font-family: var(--font-sans, system-ui); margin: 0 }

    .toolbar {
      align-items: center;
      background: #0f172a;
      color: #94a3b8;
      display: flex;
      font-family: monospace;
      font-size: 12px;
      gap: 1rem;
      padding: 0 1rem;
      height: 40px;
      position: sticky;
      top: 0;
      z-index: 9999;
    }
    .toolbar a {
      color: #64748b;
      text-decoration: none;
    }
    .toolbar a:hover { color: #e2e8f0 }
    .toolbar strong { color: #e2e8f0 }
    .toolbar-sep { color: #334155 }

    .toolbar select {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 4px;
      color: #94a3b8;
      font-family: monospace;
      font-size: 11px;
      padding: 3px 6px;
    }
    .toolbar select:focus { outline: none; border-color: #3b82f6 }

    .viewport-btns { display: flex; gap: 4px; margin-left: auto }
    .viewport-btns button {
      background: transparent;
      border: 1px solid #334155;
      border-radius: 4px;
      color: #64748b;
      cursor: pointer;
      font-size: 11px;
      padding: 3px 10px;
      transition: all 0.1s;
    }
    .viewport-btns button:hover { border-color: #475569; color: #94a3b8 }
    .viewport-btns button.active {
      background: #1e293b;
      border-color: #475569;
      color: #e2e8f0;
    }

    .preview-wrap {
      margin: 0 auto;
      min-height: calc(100vh - 40px);
      padding: 2rem;
      transition: max-width 0.3s ease;
    }
    .preview-wrap.viewport-desktop { max-width: 100% }
    .preview-wrap.viewport-tablet  { max-width: 768px }
    .preview-wrap.viewport-mobile  { max-width: 390px }

    .preview-label {
      color: #999;
      font-family: monospace;
      font-size: 11px;
      margin-bottom: 0.5rem;
    }

    .error-card {
      background: #FFEBEE;
      border-left: 4px solid #C62828;
      border-radius: 4px;
      color: #C62828;
      font-family: monospace;
      margin-bottom: 1rem;
      padding: 1rem;
    }
    .error-card pre {
      font-size: 0.75rem;
      margin: 0.5rem 0 0;
      overflow-x: auto;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>

  <div class="toolbar">
    <a href="/">← Dashboard</a>
    <span class="toolbar-sep">|</span>
    <strong>${name}</strong>
    <span class="toolbar-sep">·</span>
    <span>${structure}</span>

    ${
      variants.length > 1
        ? `
    <select id="variant-select" onchange="changeVariant(this.value)">
      ${variants
        .map(
          (v) => `
      <option value="${v.id}" ${v.id === variant ? 'selected' : ''}>${v.label}</option>`,
        )
        .join('')}
    </select>`
        : ''
    }

    <div class="viewport-btns">
      <button id="btn-desktop" class="active" onclick="setViewport('desktop')">
        🖥 Desktop
      </button>
      <button id="btn-tablet" onclick="setViewport('tablet')">
        📱 Tablet
      </button>
      <button id="btn-mobile" onclick="setViewport('mobile')">
        📲 Mobile
      </button>
    </div>
  </div>

  <div class="preview-wrap viewport-desktop" id="preview-wrap">
    <p class="preview-label">
      blocks/${name}/${name}.js · decorate() · ${variant}
    </p>
    ${
      name === 'header'
        ? `<header><div class="nav-wrapper">${blockHTML}</div></header>`
        : name === 'footer'
          ? `<footer>${blockHTML}</footer>`
          : `<div class="section">${blockHTML}</div>`
    }
  </div>

  <script>window.__PREVIEW_SERVER = true</script>
  <script type="module">
    // ── URL params ────────────────────────────────────────────────────────
    const url = new URL(window.location)

    // Force ?mock=true for React blocks
    if (!url.searchParams.has('mock')) {
      url.searchParams.set('mock', 'true')
    }

    // Apply additional query params from the mock (e.g. ?error=true)
    ${
      extraParams
        ? extraParams
            .split('; ')
            .map((p) => {
              const [k, v] = p.split(', ');
              return `url.searchParams.set(${k}, ${v})`;
            })
            .join('\n    ')
        : ''
    }

    window.history.replaceState({}, '', url)

    // ── Cargar y ejecutar el decorate() real del bloque ───────────────────
    const blockEl = document.querySelector('[data-block-name="${name}"]')

    if (blockEl) {
      try {
        const isDev = true // Vite is always in dev mode here
        let mod

        // Try importing the JS directly (Vite resolves it in dev)
        // If it fails, fall back to the compiled bundle
        try {
          mod = await import('/blocks/${name}/${name}.js')
        } catch (importErr) {
          console.warn('[Preview] Fallback a bundle:', importErr.message)
          mod = await import('/blocks/${name}/${name}.bundle.js')
        }

        if (typeof mod.default === 'function') {
          await mod.default(blockEl)
          console.log('[Preview] ✓ ${name} decorated successfully')
        } else {
          console.warn('[Preview] Module does not export a default function')
        }
      } catch (err) {
        console.error('[Preview] Error in decorate():', err)
        blockEl.insertAdjacentHTML('beforebegin', \`
          <div class="error-card">
            <strong>Error en decorate()</strong>
            <pre>\${err.message}\\n\\n\${err.stack}</pre>
          </div>
        \`)
      }
    } else {
      console.warn('[Preview] Block element not found in the DOM')
    }

    // ── Viewport switcher ─────────────────────────────────────────────────
    window.setViewport = (size) => {
      const wrap = document.getElementById('preview-wrap')
      wrap.className = 'preview-wrap viewport-' + size
      document.querySelectorAll('.viewport-btns button').forEach((btn) => {
        btn.classList.toggle('active', btn.id === 'btn-' + size)
      })
      // Persist in sessionStorage
      sessionStorage.setItem('preview-viewport', size)
    }

    // Restore viewport from previous session
    const savedViewport = sessionStorage.getItem('preview-viewport')
    if (savedViewport) setViewport(savedViewport)

    // ── Cambio de variante ────────────────────────────────────────────────
    window.changeVariant = (variantId) => {
      const url = new URL(window.location)
      url.searchParams.set('variant', variantId)
      window.location.href = url.toString()
    }
  </script>
</body>
</html>`;
}

// ── Express app ──────────────────────────────────────────────────────────────

async function start() {
  const app = express();

  // Vite plugin: resolve *.bundle.js → *.jsx at analysis time.
  // Bundles are produced by `vite build`; in preview mode we redirect to the
  // source .jsx so Vite transforms it on-the-fly.
  const resolveBundleToJsx = {
    name: 'preview:resolve-bundle-to-jsx',
    resolveId(source, importer) {
      if (source.endsWith('.bundle.js')) {
        const jsxSource = source.replace(/\.bundle\.js$/, '.jsx');
        return this.resolve(jsxSource, importer, { skipSelf: true });
      }
    },
  };

  // Vite como middleware — sirve JS/CSS con HMR
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
    root: ROOT,
    logLevel: 'warn',
    plugins: [resolveBundleToJsx],
  });

  // Serve config page fixtures for local testing.
  // In production the EDS CDN serves these .plain.html pages.
  app.get('/config/:name\\.plain\\.html', (req, res) => {
    const fixturePath = join(
      ROOT,
      'tests/local/assets/config',
      `${req.params.name}.html`,
    );

    try {
      const html = readFileSync(fixturePath, 'utf-8');
      res.type('html').send(html);
    } catch {
      res.status(404).send(`Config fixture not found: ${req.params.name}`);
    }
  });

  app.use(vite.middlewares);

  // Static files (CSS, images, .plain.html fragments, etc.)
  // Vite in custom mode does not serve static HTML — Express handles it directly
  app.use(express.static(ROOT));

  // API: block list (used by the dashboard for auto-refresh)
  app.get('/api/blocks', (req, res) => {
    const blocks = discoverBlocks();
    res.json(
      blocks.map(({ name, json }) => ({
        name,
        status: getBlockStatus({ name, json }),
        structure: json.eds?.structure ?? null,
        variants: getVariants(json.mock),
      })),
    );
  });

  // ── Sidekick Library ─────────────────────────────────────────────────────
  // library.json — index of all ready blocks (fetched by <sidekick-library>).
  // The component expects { data: [...] } at the top level (not nested under "blocks").
  app.get('/tools/sidekick/library.json', (req, res) => {
    const blocks = discoverBlocks().filter(
      (b) => getBlockStatus(b) === 'ready',
    );
    res.json({
      data: blocks.map(({ name }) => ({
        name: name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        path: `/tools/sidekick/blocks/${name}`,
      })),
    });
  });

  // Block content pages — <sidekick-library> appends .plain.html to each path.
  // Returns raw EDS table HTML (one section per mock variant).
  app.get('/tools/sidekick/blocks/:blockName.plain.html', (req, res) => {
    const { blockName } = req.params;
    const blocks = discoverBlocks();
    const block = blocks.find((b) => b.name === blockName);

    if (!block) {
      res.status(404).send('');
      return;
    }

    const variants = getVariants(block.json.mock);
    const sections = variants
      .map(({ id, label }) => {
        const mockData = getMockForVariant(block.json.mock, id);
        const html = generateBlockHTML(blockName, block.json.eds, mockData);
        return `<div>\n  <!-- ${label} -->\n  ${html}\n</div>`;
      })
      .join('\n');

    // The sidekick-library plugin looks for sections as direct <div> children
    // of <body> (body.querySelectorAll(":scope > div")). Do NOT wrap in <main>.
    res.type('text/html').send(sections);
  });

  // Block container page — fetched by the sidekick-library block renderer as a
  // wrapper HTML document. It replaces <main> content with the block HTML and
  // renders it inside an iframe. Requires <header>, <main>, and <footer>.
  // Also works when visited directly: shows the block's default variant.
  app.get('/tools/sidekick/blocks/:blockName', (req, res) => {
    const { blockName } = req.params;
    const blocks = discoverBlocks();
    const block = blocks.find((b) => b.name === blockName);

    if (!block) {
      res
        .status(404)
        .send(
          `<html><body><p>Block "${blockName}" not found.</p></body></html>`,
        );
      return;
    }

    const mockData = getMockForVariant(block.json.mock, 'default');
    const blockHTML = generateBlockHTML(blockName, block.json.eds, mockData);
    res.type('text/html').send(renderContainerPage(blockName, blockHTML));
  });

  // Dashboard
  app.get('/', (req, res) => {
    const blocks = discoverBlocks();
    res.send(renderDashboard(blocks));
  });

  // Preview a block
  app.get('/preview/:blockName', (req, res) => {
    const { blockName } = req.params;
    const variant = req.query.variant ?? 'default';

    const blocks = discoverBlocks();
    const block = blocks.find((b) => b.name === blockName);

    if (!block) {
      res.status(404).send(`
        <h1>Bloque no encontrado</h1>
        <p>No existe blocks/${blockName}/_${blockName}.json</p>
        <a href="/">← Volver al dashboard</a>
      `);
      return;
    }

    const mockData = getMockForVariant(block.json.mock, variant);
    res.send(renderPreviewPage(block, variant, mockData));
  });

  app.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║  ⚡ Block Preview Server                  ║
  ║                                          ║
  ║  http://localhost:${PORT}                ║
  ║                                          ║
  ║  Dashboard:  /                           ║
  ║  Preview:    /preview/<block-name>       ║
  ║  API:        /api/blocks                 ║
  ║  SK Library: /tools/sidekick/library.html║
  ╚══════════════════════════════════════════╝
    `);
  });
}

start().catch((err) => {
  console.error('Error iniciando el servidor:', err);
  process.exit(1);
});
