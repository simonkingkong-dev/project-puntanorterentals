const fs = require('fs').promises;
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'app');
const OUTPUT = path.resolve(__dirname, '..', 'app_routes_and_code.txt');
const FILE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mdx'];

function normalizeSegment(seg) {
  // Remove route group parentheses: (group) -> ignore group
  seg = seg.replace(/^\(|\)$/g, '');
  // catch-all [...slug] -> :slug*
  let m;
  if (m = seg.match(/^\[\.\.\.(.+)\]$/)) return `:${m[1]}*`;
  // optional catch-all [[...slug]] -> :slug* (treated same)
  if (m = seg.match(/^\[\[\.\.\.(.+)\]\]$/)) return `:${m[1]}*`;
  // dynamic [id] -> :id
  if (m = seg.match(/^\[(.+)\]$/)) return `:${m[1]}`;
  return seg;
}

function fileIsPage(fname) {
  return /^page\.(tsx|ts|jsx|js|mdx)$/.test(fname);
}
function fileIsRoute(fname) {
  return /^route\.(ts|js)$/.test(fname);
}
function fileIsLayout(fname) {
  return /^layout\.(tsx|ts|jsx|js)$/.test(fname);
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // skip build/output and node_modules
      if (e.name === '.next' || e.name === 'node_modules') continue;
      files = files.concat(await walk(full));
    } else if (FILE_EXTS.includes(path.extname(e.name))) files.push(full);
  }
  return files;
}

function toRoute(root, file) {
  const rel = path.relative(root, file).split(path.sep);
  const fname = rel[rel.length - 1];
  let routeParts;
  if (fileIsPage(fname) || fileIsRoute(fname)) {
    routeParts = rel.slice(0, -1);
  } else if (fileIsLayout(fname) || fname.startsWith('loading') || fname.startsWith('not-found')) {
    // layout/loading/not-found affect parent route -- include as note
    routeParts = rel.slice(0, -1);
  } else {
    // other files (components) — show path under app but not a route
    return null;
  }

  // convert segments
  const segs = routeParts
    .filter(Boolean)
    .map(s => {
      // ignore group parentheses like (admin)
      if (/^\(.+\)$/.test(s)) return null;
      return normalizeSegment(s);
    })
    .filter(Boolean);

  const route = '/' + segs.join('/');
  return route === '/' ? '/' : route;
}

(async () => {
  try {
    const files = await walk(ROOT);
    const outLines = [];
    for (const f of files) {
      const route = toRoute(ROOT, f);
      if (!route) continue;
      const code = await fs.readFile(f, 'utf8');
      outLines.push('---');
      outLines.push(`Route: ${route}`);
      outLines.push(`File: ${path.relative(path.resolve(__dirname, '..'), f)}`);
      outLines.push('');
      outLines.push(code);
      outLines.push('');
    }
    await fs.writeFile(OUTPUT, outLines.join('\n'), 'utf8');
    console.log('Export completed:', OUTPUT);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();