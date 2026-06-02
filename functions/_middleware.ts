const BLOCKED_METHODS = new Set(['OPTIONS', 'TRACE', 'TRACK']);

type PagesMiddlewareContext = {
  request: Request;
  next: () => Promise<Response>;
};

export const onRequest = async ({ request, next }: PagesMiddlewareContext) => {
  const method = request.method.toUpperCase();

  if (BLOCKED_METHODS.has(method)) {
    return new Response(null, {
      status: 405,
      headers: {
        Allow: 'GET, HEAD',
        'Cache-Control': 'no-store',
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
