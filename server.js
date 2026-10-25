/**
 * Prometheus Elegance — Servidor Node.js 100% Nativo (Sem dependências npm)
 * Pronto para rodar na nuvem (Render, Railway, Glitch) ou localmente.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'products.json');
const DEFAULT_DATA_FILE = path.join(__dirname, 'data', 'products.json');
const useDatabase = process.env.CATALOG_STORAGE === 'supabase';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (Boolean(supabaseUrl) !== Boolean(supabaseKey)) {
  throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY juntos.');
}
if (useDatabase && (!supabaseUrl || !supabaseKey)) {
  throw new Error('CATALOG_STORAGE=supabase exige SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
}

if (!useDatabase) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.copyFileSync(DEFAULT_DATA_FILE, DATA_FILE);
  }
}

const supabaseCatalogUrl = useDatabase
  ? new URL('/rest/v1/catalog', supabaseUrl)
  : null;

async function requestCatalogFromDatabase(method, body) {
  const url = new URL(supabaseCatalogUrl);
  if (method === 'GET') {
    url.search = 'id=eq.1&select=products';
  }

  const response = await fetch(url, {
    method,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      ...(method === 'POST' ? { Prefer: 'resolution=merge-duplicates,return=minimal' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase respondeu ${response.status}: ${details}`);
  }

  return method === 'GET' ? response.json() : null;
}

async function getCatalog() {
  if (!useDatabase) {
    return fs.promises.readFile(DATA_FILE, 'utf8');
  }

  const rows = await requestCatalogFromDatabase('GET');
  if (rows.length > 0) {
    return JSON.stringify(rows[0].products);
  }

  const defaults = JSON.parse(await fs.promises.readFile(DEFAULT_DATA_FILE, 'utf8'));
  await requestCatalogFromDatabase('POST', { id: 1, products: defaults });
  return JSON.stringify(defaults);
}

async function saveCatalog(products) {
  const serialized = JSON.stringify(products, null, 2);
  if (useDatabase) {
    await requestCatalogFromDatabase('POST', { id: 1, products });
    return;
  }

  await fs.promises.writeFile(DATA_FILE, serialized, 'utf8');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  // CORS Básico
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // --------------------------------------------------------------------------
  // API: Obter produtos
  // --------------------------------------------------------------------------
  if (pathname === '/api/products' && req.method === 'GET') {
    getCatalog()
      .then((data) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
      })
      .catch((err) => {
        console.error('Erro ao ler catálogo:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro ao ler produtos' }));
      });
    return;
  }

  // --------------------------------------------------------------------------
  // API: Salvar produtos (atualização pelo admin)
  // --------------------------------------------------------------------------
  if (pathname === '/api/products' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (Array.isArray(parsed)) {
          saveCatalog(parsed)
            .then(() => {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, count: parsed.length }));
            })
            .catch((err) => {
              console.error('Erro ao salvar catálogo:', err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Erro ao salvar produtos' }));
            });
          return;
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Formato JSON inválido' }));
        return;
      }

      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Dados inválidos' }));
    });
    return;
  }

  // --------------------------------------------------------------------------
  // Servir arquivos estáticos (HTML, CSS, JS, Imagens)
  // --------------------------------------------------------------------------
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 — Página não encontrada');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(` Prometeus Elegance — Servidor Ativo!`);
  console.log(` Acesso à Loja:  http://localhost:${PORT}`);
  console.log(` Acesso Admin:   http://localhost:${PORT}/admin.html`);
  console.log(`======================================================\n`);
});
