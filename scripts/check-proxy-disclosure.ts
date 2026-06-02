import { execFile } from 'node:child_process';
import { URL } from 'node:url';
import { promisify } from 'node:util';

type ProbeResult = {
  method: string;
  path: string;
  status: number;
  proxyHeaders: Record<string, string>;
};

const DEFAULT_PATHS = [
  '/',
  '/contact',
  '/contact/',
  '/gallery',
  '/gallery/',
  '/news',
  '/news/',
  '/members',
  '/members/',
  '/research',
  '/research/',
  '/publications',
  '/publications/',
];

const BLOCKED_METHODS = ['OPTIONS', 'TRACE', 'TRACK'];
const PROXY_HEADERS = [
  'via',
  'forwarded',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-real-ip',
];

const target = new URL(process.argv[2] ?? 'https://homepage-em6.pages.dev');
const paths = process.argv.slice(3);
const testPaths = paths.length > 0 ? paths : DEFAULT_PATHS;
const execFileAsync = promisify(execFile);

const request = async (method: string, path: string): Promise<ProbeResult> => {
  const url = new URL(path, target);
  const { stdout } = await execFileAsync('curl', [
    '-sS',
    '-i',
    '--max-time',
    '15',
    '-X',
    method,
    '-H',
    'Max-Forwards: 0',
    '-H',
    'User-Agent: youk-proxy-disclosure-check/1.0',
    url.toString(),
  ]);
  const headerBlock = stdout.split(/\r?\n\r?\n/)[0] ?? '';
  const lines = headerBlock.split(/\r?\n/);
  const status = Number(lines[0]?.match(/\s(\d{3})\s/)?.[1] ?? 0);
  const headers = new Map<string, string>();

  for (const line of lines.slice(1)) {
    const separator = line.indexOf(':');

    if (separator === -1) {
      continue;
    }

    headers.set(
      line.slice(0, separator).trim().toLowerCase(),
      line.slice(separator + 1).trim()
    );
  }

  const proxyHeaders = Object.fromEntries(
    PROXY_HEADERS.flatMap((header) => {
      const value = headers.get(header);

      return value ? [[header, value]] : [];
    })
  );

  return {
    method,
    path,
    status,
    proxyHeaders,
  };
};

const isBlocked = (status: number) =>
  status === 405 || status === 403 || status === 501 || status === 505;

const main = async () => {
  const failures: string[] = [];

  for (const path of testPaths) {
    const getResult = await request('GET', path);

    if (Object.keys(getResult.proxyHeaders).length > 0) {
      failures.push(
        `${path} GET exposes proxy headers: ${JSON.stringify(getResult.proxyHeaders)}`
      );
    }

    for (const method of BLOCKED_METHODS) {
      const result = await request(method, path);

      if (!isBlocked(result.status)) {
        failures.push(
          `${path} ${method} returned ${result.status}, expected blocked`
        );
      }

      if (Object.keys(result.proxyHeaders).length > 0) {
        failures.push(
          `${path} ${method} exposes proxy headers: ${JSON.stringify(result.proxyHeaders)}`
        );
      }
    }
  }

  if (failures.length > 0) {
    console.error(`Proxy disclosure check failed for ${target.origin}`);
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `Proxy disclosure check passed for ${target.origin} (${testPaths.length} paths)`
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
