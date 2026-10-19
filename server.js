import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve, sep, extname } from 'node:path';

const root = resolve(import.meta.dirname);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.c': 'text/plain', '.pdf': 'application/pdf' };
const port = Number(process.env.PORT || 4173);

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = resolve(join(root, pathname === '/' ? 'index.html' : pathname.slice(1)));
  if (file !== root && !file.startsWith(root + sep)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  try {
    if (!(await stat(file)).isFile()) throw new Error('Not a file');
    const contents = await readFile(file);
    response.writeHead(200, { 'Content-Type': `${types[extname(file)] || 'application/octet-stream'}; charset=utf-8` });
    response.end(contents);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, () => console.log(`PhishGuard running at http://localhost:${port}`));
