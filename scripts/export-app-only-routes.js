const fs = require('fs').promises;
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'app');
const OUTPUT = path.resolve(__dirname, '..', 'app_routes.txt');
const FILE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mdx', '.css', '.scss', '.module.css', '.module.scss'];

function normalizeSegment(seg) {
  if (/^\(.+\)$/.test(seg)) return null;
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

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '.next' || e.name === 'node_modules') continue;
      files = files.concat(await walk(full));
    } else {
      if (FILE_EXTS.includes(path.extname(e.name))) files.push(full);
    }
  }
  return files;
}

function toRoute(root, file) {
  const rel = path.relative(root, file).split(path.sep);
  const fname = rel[rel.length - 1];

  if (!(fileIsPage(fname) || fileIsRoute(fname))) return null;

  const routeParts = rel.slice(0, -1);
  const segs = routeParts
    .map(s => normalizeSegment(s))
    .filter(Boolean);

  const route = '/' + segs.join('/');
  return route === '/' ? '/' : route;
}

(async () => {
  try {
    const files = await walk(ROOT);
    const routeMap = new Map(); // route -> Set of file paths

    for (const f of files) {
      const route = toRoute(ROOT, f);
      if (!route) continue;
      const relPath = path.relative(path.resolve(__dirname, '..'), f).replace(/\\/g, '/');
      if (!routeMap.has(route)) routeMap.set(route, new Set());
      routeMap.get(route).add(relPath);
    }

    const sortedRoutes = Array.from(routeMap.keys()).sort((a, b) => a.localeCompare(b));
    const outLines = [];

    for (const route of sortedRoutes) {
      const filesSet = routeMap.get(route);
      const filesArr = Array.from(filesSet).sort();
      // Si quieres una sola línea por ruta con todos los archivos:
      outLines.push(`${route} -> ${filesArr.join(', ')}`);
      // Si prefieres múltiples líneas por ruta, reemplaza la línea anterior por:
      // outLines.push(`Route: ${route}`);
      // filesArr.forEach(p => outLines.push(`  - ${p}`));
    }

    await fs.writeFile(OUTPUT, outLines.join('\n'), 'utf8');
    console.log('Routes exported with files to:', OUTPUT);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();