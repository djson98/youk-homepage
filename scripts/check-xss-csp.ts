import { execFile } from 'node:child_process';
import { URL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const target = new URL(process.argv[2] ?? 'https://homepage-em6.pages.dev');
const paths = [
  '/',
  '/contact',
  '/gallery',
  '/news',
  '/members',
  '/research',
  '/publications',
];
const params = ['q', 'search', 's', 'keyword', 'x'];
const payload = `<script>window.__xss_probe__=1</script><img src=x onerror="window.__xss_probe_img__=1">`;

type CurlResponse = {
  status: number;
  headers: Map<string, string>;
  body: string;
};

const curl = async (url: URL): Promise<CurlResponse> => {
  const { stdout } = await execFileAsync('curl', [
    '-sS',
    '-i',
    '--max-time',
    '15',
    '-H',
    'User-Agent: youk-xss-csp-check/1.0',
    url.toString(),
  ]);
  const separator = stdout.search(/\r?\n\r?\n/);
  const headerBlock = separator === -1 ? stdout : stdout.slice(0, separator);
  const body =
    separator === -1 ? '' : stdout.slice(separator).replace(/^\r?\n\r?\n/, '');
  const lines = headerBlock.split(/\r?\n/);
  const status = Number(lines[0]?.match(/\s(\d{3})\s/)?.[1] ?? 0);
  const headers = new Map<string, string>();

  for (const line of lines.slice(1)) {
    const index = line.indexOf(':');

    if (index === -1) {
      continue;
    }

    headers.set(
      line.slice(0, index).trim().toLowerCase(),
      line.slice(index + 1).trim()
    );
  }

  return { status, headers, body };
};

const hasUnsafeInlineInDirective = (csp: string, directive: string) => {
  const match = csp
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${directive} `));

  return match?.includes("'unsafe-inline'") ?? false;
};

const main = async () => {
  const failures: string[] = [];
  const root = await curl(target);
  const csp = root.headers.get('content-security-policy') ?? '';

  if (!csp) {
    failures.push('Missing Content-Security-Policy header');
  }

  if (hasUnsafeInlineInDirective(csp, 'script-src')) {
    failures.push("CSP script-src still allows 'unsafe-inline'");
  }

  if (hasUnsafeInlineInDirective(csp, 'style-src')) {
    failures.push("CSP style-src still allows 'unsafe-inline'");
  }

  if (!/script-src[^;]*'sha256-/.test(csp)) {
    failures.push('CSP script-src does not include SHA-256 hashes');
  }

  if (!/style-src[^;]*'sha256-/.test(csp)) {
    failures.push('CSP style-src does not include SHA-256 hashes');
  }

  for (const path of paths) {
    for (const param of params) {
      const url = new URL(path, target);
      url.searchParams.set(param, payload);

      const response = await curl(url);

      if (response.status >= 500) {
        failures.push(
          `${url.pathname}?${param}=payload returned ${response.status}`
        );
      }

      if (response.body.includes(payload)) {
        failures.push(
          `${url.pathname}?${param}=payload reflected raw script payload`
        );
      }

      if (response.body.includes('window.__xss_probe__')) {
        failures.push(
          `${url.pathname}?${param}=payload reflected script marker`
        );
      }

      if (response.body.includes('onerror="window.__xss_probe_img__=1"')) {
        failures.push(
          `${url.pathname}?${param}=payload reflected event handler marker`
        );
      }
    }
  }

  if (failures.length > 0) {
    console.error(`XSS/CSP check failed for ${target.origin}`);
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`XSS/CSP check passed for ${target.origin}`);
  console.log("- script-src/style-src do not allow 'unsafe-inline'");
  console.log('- script-src/style-src use SHA-256 hashes');
  console.log(
    `- no reflected payload found across ${paths.length * params.length} URL probes`
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
