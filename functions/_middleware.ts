const BLOCKED_METHODS = new Set(['OPTIONS', 'TRACE', 'TRACK']);
const BLOCKED_WORDPRESS_PATHS = [
  '/wp-admin',
  '/wp-content',
  '/wp-includes',
  '/xmlrpc.php',
  '/wp-login.php',
];

type PagesMiddlewareContext = {
  request: Request;
  next: () => Promise<Response>;
};

export const onRequest = async ({ request, next }: PagesMiddlewareContext) => {
  const method = request.method.toUpperCase();
  const url = new URL(request.url);
  const fullPath = `${url.pathname}${url.search}`.toLowerCase();

  if (BLOCKED_METHODS.has(method)) {
    return new Response(null, {
      status: 405,
      headers: {
        Allow: 'GET, HEAD',
        'Cache-Control': 'no-store',
      },
    });
  }

  if (BLOCKED_WORDPRESS_PATHS.some((path) => fullPath.includes(path))) {
    return new Response('Not found', {
      status: 404,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  const response = await next();
  const headers = new Headers(response.headers);

  headers.delete('Via');
  headers.delete('Forwarded');
  headers.delete('X-Forwarded-For');
  headers.delete('X-Forwarded-Host');
  headers.delete('X-Forwarded-Proto');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
