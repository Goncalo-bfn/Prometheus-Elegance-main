/**
 * Prometheus Elegance — Servidor Node.js 100% Nativo (Sem dependências npm)
 * Pronto para rodar na nuvem (Render, Railway, Glitch) ou localmente.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'products.json');
const DEFAULT_DATA_FILE = path.join(__dirname, 'data', 'products.json');
const useDatabase = process.env.CATALOG_STORAGE === 'supabase';
const isProduction = process.env.NODE_ENV === 'production' ||
  process.env.RENDER === 'true' ||
  process.env.RENDER === '1';
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const adminUsername = process.env.ADMIN_USERNAME || 'Yan';
const adminPassword = process.env.ADMIN_PASSWORD || (isProduction ? '' : '7519');
const adminSessionSecret = process.env.ADMIN_SESSION_SECRET || (isProduction ? '' : 'local-development-session-secret');
const requireSecureAdminConfig = isProduction || useDatabase;
const ADMIN_COOKIE = 'prometheus_admin_session';
const ADMIN_SESSION_TTL = 12 * 60 * 60;

if (requireSecureAdminConfig && (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET)) {
  throw new Error('Configure ADMIN_PASSWORD e ADMIN_SESSION_SECRET nas variáveis privadas do serviço.');
}
if (requireSecureAdminConfig &&
    (process.env.ADMIN_PASSWORD.length < 12 || process.env.ADMIN_SESSION_SECRET.length < 32)) {
  throw new Error('ADMIN_PASSWORD deve ter ao menos 12 caracteres e ADMIN_SESSION_SECRET ao menos 32.');
}
if (useDatabase && (!supabaseUrl || !supabaseKey)) {
  throw new Error('CATALOG_STORAGE=supabase exige a URL do projeto e uma chave secreta do Supabase.');
}

if (useDatabase) {
  const parsedSupabaseUrl = new URL(supabaseUrl);
  if (parsedSupabaseUrl.protocol !== 'https:') {
    throw new Error('SUPABASE_URL deve usar HTTPS.');
  }
} else {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.copyFileSync(DEFAULT_DATA_FILE, DATA_FILE);
  }
}

const supabaseCatalogUrl = useDatabase
  ? new URL('/rest/v1/catalog', supabaseUrl)
  : null;
const usesLegacySupabaseKey = useDatabase && !supabaseKey.startsWith('sb_secret_');

async function requestCatalogFromDatabase(method, body) {
  const url = new URL(supabaseCatalogUrl);
  if (method === 'GET') {
    url.searchParams.set('id', 'eq.1');
    url.searchParams.set('select', 'products');
  } else {
    url.searchParams.set('on_conflict', 'id');
  }

  const response = await fetch(url, {
    method,
    headers: {
      apikey: supabaseKey,
      'Content-Type': 'application/json',
      ...(usesLegacySupabaseKey ? { Authorization: `Bearer ${supabaseKey}` } : {}),
      ...(method === 'POST' && body.id === 1
        ? { Prefer: body.seed ? 'return=minimal' : 'resolution=merge-duplicates,return=minimal' }
        : {}),
    },
    ...(body ? { body: JSON.stringify({ id: body.id, products: body.products }) } : {}),
  });

  if (!response.ok) {
    const details = await response.text();
    const error = new Error(`Supabase respondeu ${response.status}: ${details}`);
    error.status = response.status;
    throw error;
  }

  if (method === 'GET') {
    let rows;
    try {
      rows = await response.json();
    } catch {
      throw new Error('Supabase retornou uma resposta inválida ao ler o catálogo.');
    }

    if (!Array.isArray(rows)) {
      throw new Error('Supabase retornou um formato inesperado ao ler o catálogo.');
    }
    return rows;
  }

  return null;
}

async function getCatalog() {
  if (!useDatabase) {
    return fs.promises.readFile(DATA_FILE, 'utf8');
  }

  const rows = await requestCatalogFromDatabase('GET');
  if (rows.length > 0) {
    if (rows.length !== 1 || !Array.isArray(rows[0].products)) {
      throw new Error('A tabela public.catalog precisa conter uma única linha id=1 com products do tipo jsonb em formato de lista.');
    }
    return JSON.stringify(rows[0].products);
  }

  const defaults = JSON.parse(await fs.promises.readFile(DEFAULT_DATA_FILE, 'utf8'));
  try {
    await requestCatalogFromDatabase('POST', { id: 1, products: defaults, seed: true });
    return JSON.stringify(defaults);
  } catch (error) {
    if (error.status !== 409) {
      throw error;
    }

    const latestRows = await requestCatalogFromDatabase('GET');
    if (latestRows.length === 1 && Array.isArray(latestRows[0].products)) {
      return JSON.stringify(latestRows[0].products);
    }
    throw error;
  }
}

async function saveCatalog(products) {
  const serialized = JSON.stringify(products, null, 2);
  if (useDatabase) {
    await requestCatalogFromDatabase('POST', { id: 1, products });
    return;
  }

  await fs.promises.writeFile(DATA_FILE, serialized, 'utf8');
}

function signAdminSession(expiresAt) {
  const payload = Buffer.from(JSON.stringify({ expiresAt })).toString('base64url');
  const signature = crypto.createHmac('sha256', adminSessionSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function hasValidAdminSession(req) {
  const cookies = (req.headers.cookie || '').split(';');
  const sessionCookie = cookies.find((cookie) => cookie.trim().startsWith(`${ADMIN_COOKIE}=`));
  if (!sessionCookie) return false;

  const token = sessionCookie.trim().slice(ADMIN_COOKIE.length + 1);
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expectedSignature = crypto.createHmac('sha256', adminSessionSecret).update(payload).digest();
  let actualSignature;
  try {
    actualSignature = Buffer.from(signature, 'base64url');
  } catch {
    return false;
  }
  if (actualSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(actualSignature, expectedSignature)) {
    return false;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number.isInteger(session.expiresAt) && session.expiresAt > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function sendJson(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error('Corpo da requisição excede o limite de 10 MB.'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function secureCookieAttributes() {
  return `Path=/; HttpOnly; SameSite=Strict${requireSecureAdminConfig ? '; Secure' : ''}`;
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

  if (pathname === '/api/admin/session' && req.method === 'GET') {
    const authenticated = hasValidAdminSession(req);
    sendJson(res, authenticated ? 200 : 401, { authenticated });
    return;
  }

  if (pathname === '/api/admin/login' && req.method === 'POST') {
    readRequestBody(req)
      .then((body) => {
        let credentials;
        try {
          credentials = JSON.parse(body);
        } catch {
          sendJson(res, 400, { error: 'Dados de login inválidos.' });
          return;
        }

        const usernameMatches = typeof credentials.username === 'string' &&
          credentials.username.toLowerCase() === adminUsername.toLowerCase();
        const passwordMatches = typeof credentials.password === 'string' &&
          crypto.timingSafeEqual(
            crypto.createHash('sha256').update(credentials.password).digest(),
            crypto.createHash('sha256').update(adminPassword).digest(),
          );

        if (!usernameMatches || !passwordMatches) {
          sendJson(res, 401, { error: 'Usuário ou senha incorretos.' });
          return;
        }

        const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL;
        const cookie = `${ADMIN_COOKIE}=${signAdminSession(expiresAt)}; ${secureCookieAttributes()}; Max-Age=${ADMIN_SESSION_TTL}`;
        sendJson(res, 200, { authenticated: true }, { 'Set-Cookie': cookie });
      })
      .catch((err) => {
        console.error('Erro ao processar login administrativo:', err);
        sendJson(res, 400, { error: 'Não foi possível processar o login.' });
      });
    return;
  }

  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    const cookie = `${ADMIN_COOKIE}=; ${secureCookieAttributes()}; Max-Age=0`;
    sendJson(res, 200, { authenticated: false }, { 'Set-Cookie': cookie });
    return;
  }

  // --------------------------------------------------------------------------
  // API: Obter produtos
  // --------------------------------------------------------------------------
  if (pathname === '/api/products' && req.method === 'GET') {
    getCatalog()
      .then((data) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(data);
      })
      .catch((err) => {
        console.error('Erro ao ler catálogo:', err);
        sendJson(res, 500, { error: 'Erro ao ler produtos. Consulte os logs do servidor para detalhes.' });
      });
    return;
  }

  // --------------------------------------------------------------------------
  // API: Salvar produtos (atualização pelo admin)
  // --------------------------------------------------------------------------
  if (pathname === '/api/products' && req.method === 'POST') {
    if (!hasValidAdminSession(req)) {
      sendJson(res, 401, { error: 'Faça login para alterar o catálogo.' });
      return;
    }

    readRequestBody(req)
      .then((body) => {
        try {
          const parsed = JSON.parse(body);
          if (Array.isArray(parsed)) {
            saveCatalog(parsed)
              .then(() => {
                sendJson(res, 200, { success: true, count: parsed.length });
              })
              .catch((err) => {
                console.error('Erro ao salvar catálogo:', err);
                sendJson(res, 500, { error: 'Erro ao salvar produtos. Consulte os logs do servidor para detalhes.' });
              });
            return;
          }
        } catch (e) {
          sendJson(res, 400, { error: 'Formato JSON inválido' });
          return;
        }

        sendJson(res, 400, { error: 'Dados inválidos' });
      })
      .catch((err) => {
        console.error('Erro ao processar alteração do catálogo:', err);
        sendJson(res, 400, { error: 'Não foi possível processar os produtos.' });
      });
    return;
  }

  // --------------------------------------------------------------------------
  // Servir arquivos estáticos (HTML, CSS, JS, Imagens)
  // --------------------------------------------------------------------------
  const staticPath = pathname === '/'
    ? 'index.html'
    : `${pathname.replace(/^\/+/, '')}${pathname.endsWith('/') ? 'index.html' : ''}`;
  const filePath = path.join(__dirname, staticPath);

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
  console.log(` Armazenamento:  ${useDatabase ? 'Supabase' : 'arquivo local'}`);
  console.log(` Acesso à Loja:  http://localhost:${PORT}`);
  console.log(` Acesso Admin:   http://localhost:${PORT}/admin.html`);
  console.log(`======================================================\n`);
});
