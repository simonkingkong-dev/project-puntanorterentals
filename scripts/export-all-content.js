const fs = require('fs').promises;
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'export_all_code.txt');

// items to export (folders or individual files, relative to project root)
const TO_EXPORT = [
  '.bolt',
  'app',
  '.vscode',
  'components',
  'hooks',
  'lib',
  'node_modules',
  '.env.local',
  '.eslintrc.json',
  'components.json',
  'middleware.ts',
  'next-env.d.ts',
  'next.config.js',
  'package-lock.json',
  'package.json',
  'postcss.config.js',
  'README.md',
  'tailwind.config.ts',
  'tsconfig.json',
];

const SKIP_DIRS = new Set(['.next', 'node_modules', '.git']);
const FILE_EXTS_TEXT = null; // null -> include all files (will try to read as utf8)

function normalizeSegment(seg) {
  if (/^\(.+\)$/.test(seg)) return null; // route group
  let m;
  if (m = seg.match(/^\[\[\.\.\.(.+)\]\]$/)) return `:${m[1]}*`;
  if (m = seg.match(/^\[\.\.\.(.+)\]$/)) return `:${m[1]}*`;
  if (m = seg.match(/^\[(.+)\]$/)) return `:${m[1]}`;
  return seg;
}
function fileIsPage(fname) {
  return /^page\.(tsx|ts|jsx|js|mdx)$/.test(fname);
}
function fileIsRoute(fname) {
  return /^route\.(ts|js)$/.test(fname);
}

async function walkDir(dir) {
  const out = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        out.push(...await walkDir(full));
      } else {
        out.push(full);
      }
    }
  } catch (err) {
    // ignore nonexistent dirs
  }
  return out;
}

function toRoute(appRoot, file) {
  const rel = path.relative(appRoot, file).split(path.sep);
  const fname = rel[rel.length - 1];
  if (!(fileIsPage(fname) || fileIsRoute(fname))) return null;
  const routeParts = rel.slice(0, -1);
  const segs = routeParts
    .map(s => normalizeSegment(s))
    .filter(Boolean);
  const route = '/' + segs.join('/');
  return route === '/' ? '/' : route;
}

async function readFileSafe(file) {
  try {
    const content = await fs.readFile(file, 'utf8');
    return { ok: true, content };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

(async () => {
  const outLines = [];
  outLines.push(`Export generated: ${new Date().toISOString()}`);
  outLines.push('');

  // 1) Handle app routes specially: collect page.* and route.* and include content
  const appDir = path.join(ROOT, 'app');
  const appFiles = await walkDir(appDir);
  const routeMap = new Map(); // route -> Set(files)

  for (const f of appFiles) {
    const route = toRoute(appDir, f);
    if (!route) continue;
    const rel = path.relative(ROOT, f).replace(/\\/g, '/');
    if (!routeMap.has(route)) routeMap.set(route, new Set());
    routeMap.get(route).add(rel);
  }

  if (routeMap.size > 0) {
    outLines.push('--- App routes and files ---');
    const sortedRoutes = Array.from(routeMap.keys()).sort();
    for (const route of sortedRoutes) {
      outLines.push(`Route: ${route}`);
      const files = Array.from(routeMap.get(route)).sort();
      for (const f of files) {
        outLines.push(`File: ${f}`);
        const full = path.join(ROOT, f);
        const r = await readFileSafe(full);
        if (r.ok) {
          outLines.push('---code-start---');
          outLines.push(r.content);
          outLines.push('---code-end---');
        } else {
          outLines.push(`(Could not read file: ${r.error})`);
        }
        outLines.push('');
      }
      outLines.push(''); // spacer between routes
    }
    outLines.push('');
  }

  // 2) Export all requested folders/files (including app again, but we will skip files already added)
  outLines.push('--- All specified files and folders ---');

  const alreadyAdded = new Set();
  for (const set of routeMap.values()) for (const p of set) alreadyAdded.add(p);

  for (const item of TO_EXPORT) {
    const abs = path.join(ROOT, item);
    try {
      const stat = await fs.stat(abs);
      if (stat.isDirectory()) {
        outLines.push(`Folder: ${item}`);
        const files = await walkDir(abs);
        files.sort();
        for (const f of files) {
          const rel = path.relative(ROOT, f).replace(/\\/g, '/');
          if (alreadyAdded.has(rel)) continue; // skip duplicates already included in routes section
          outLines.push(`File: ${rel}`);
          const r = await readFileSafe(f);
          if (r.ok) {
            outLines.push('---code-start---');
            outLines.push(r.content);
            outLines.push('---code-end---');
          } else {
            outLines.push(`(Could not read file: ${r.error})`);
          }
          outLines.push('');
        }
      } else if (stat.isFile()) {
        const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
        if (alreadyAdded.has(rel)) continue;
        outLines.push(`File: ${rel}`);
        const r = await readFileSafe(abs);
        if (r.ok) {
          outLines.push('---code-start---');
          outLines.push(r.content);
          outLines.push('---code-end---');
        } else {
          outLines.push(`(Could not read file: ${r.error})`);
        }
        outLines.push('');
      }
    } catch (err) {
      outLines.push(`(Missing: ${item})`);
      outLines.push('');
    }
  }

  // Final write
  try {
    await fs.writeFile(OUTPUT, outLines.join('\n'), 'utf8');
    console.log('Export completed:', OUTPUT);
  } catch (e) {
    console.error('Failed to write output:', e);
    process.exit(1);
  }
})();