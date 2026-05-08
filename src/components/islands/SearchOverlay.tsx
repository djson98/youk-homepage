import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HiOutlineSearch, HiX } from 'react-icons/hi';

/**
 * Pagefind result shape — matches the public API surface we use.
 * We type it loosely because Pagefind ships its own types only as a built file.
 */
interface PagefindSubResult {
  title?: string;
  url?: string;
  excerpt?: string;
}

interface PagefindResultData {
  url: string;
  raw_url?: string;
  excerpt: string;
  meta: { title?: string; image?: string; [key: string]: unknown };
  sub_results?: PagefindSubResult[];
}

interface PagefindResult {
  id: string;
  data: () => Promise<PagefindResultData>;
}

interface PagefindSearchResponse {
  results: PagefindResult[];
}

interface PagefindAPI {
  search: (term: string) => Promise<PagefindSearchResponse>;
  init?: () => Promise<void>;
  options?: (opts: Record<string, unknown>) => Promise<void>;
}

/** Trigger button (lives in the navbar). */
interface SearchTriggerProps {
  className?: string;
  ariaLabel?: string;
}

const OPEN_EVENT = 'youk:search:open';

export const SearchTrigger: React.FC<SearchTriggerProps> = ({
  className = '',
  ariaLabel = 'Open site search',
}) => {
  const open = () => {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT));
  };
  return (
    <button
      type="button"
      onClick={open}
      className={className}
      aria-label={ariaLabel}
    >
      <HiOutlineSearch className="h-5 w-5" />
    </button>
  );
};

interface ResolvedResult {
  id: string;
  url: string;
  title: string;
  excerpt: string;
}

const SearchOverlay: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResolvedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pagefindRef = useRef<PagefindAPI | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  const loadPagefind = useCallback(async () => {
    if (pagefindRef.current) return pagefindRef.current;
    try {
      // Pagefind drops its bundle into /pagefind/ at build time. In dev (no build)
      // the file 404s — we surface a friendly hint instead of crashing.
      // We hide the path from TS/Vite static analysis since the module only
      // exists at runtime on the deployed site.
      const path = '/pagefind/pagefind.js';
      const mod = (await import(/* @vite-ignore */ path)) as PagefindAPI;
      if (mod.init) await mod.init();
      pagefindRef.current = mod;
      return mod;
    } catch (err) {
      console.warn('[search] failed to load pagefind', err);
      setError(
        'Search index is only available on the production build (`bun run build`).'
      );
      return null;
    }
  }, []);

  // Open / close handlers (custom event from trigger + keyboard shortcuts).
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen as EventListener);
    return () =>
      window.removeEventListener(OPEN_EVENT, onOpen as EventListener);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (!open && e.key === '/' && !inEditable) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (open && e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Lock body scroll while open + focus input + lazy-load pagefind.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    void loadPagefind();
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open, loadPagefind]);

  // Run search whenever query changes; ignore stale responses.
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setActiveIndex(0);
      return;
    }
    let cancelled = false;
    const id = ++requestIdRef.current;
    setLoading(true);
    (async () => {
      const pf = await loadPagefind();
      if (!pf || cancelled) return;
      try {
        const search = await pf.search(trimmed);
        if (cancelled || id !== requestIdRef.current) return;
        const top = search.results.slice(0, 8);
        const data = await Promise.all(top.map((r) => r.data()));
        if (cancelled || id !== requestIdRef.current) return;
        const mapped: ResolvedResult[] = data.map((d, i) => ({
          id: top[i].id,
          url: d.url,
          title: d.meta?.title || d.url,
          excerpt: d.excerpt,
        }));
        setResults(mapped);
        setActiveIndex(0);
      } catch (err) {
        console.warn('[search] query failed', err);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled && id === requestIdRef.current) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, open, loadPagefind]);

  const onResultsKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!results.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + results.length) % results.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = results[activeIndex];
        if (target) window.location.href = target.url;
      }
    },
    [results, activeIndex]
  );

  const hint = useMemo(() => {
    if (error) return error;
    if (loading) return 'Searching…';
    if (query.trim() && !results.length) return 'No matches found.';
    if (!query.trim()) return 'Type to search posts, members, publications…';
    return null;
  }, [error, loading, query, results.length]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Site search"
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[10vh]"
    >
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="border-default bg-surface relative w-full max-w-2xl overflow-hidden rounded-xl border shadow-2xl">
        <div className="border-default flex items-center gap-3 border-b px-4 py-3">
          <HiOutlineSearch className="text-muted-subtle h-5 w-5" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onResultsKey}
            placeholder="Search the site"
            className="text-primary placeholder:text-muted-subtle flex-1 bg-transparent text-base focus:outline-none"
            aria-label="Search query"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="border-default text-muted-subtle hidden rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
            ESC
          </kbd>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-muted hover:text-primary p-1"
            aria-label="Close"
          >
            <HiX className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {results.length > 0 ? (
            <ul role="listbox" className="divide-border-muted divide-y">
              {results.map((r, idx) => (
                <li key={r.id}>
                  <a
                    href={r.url}
                    role="option"
                    aria-selected={idx === activeIndex}
                    className={`block px-4 py-3 transition-colors ${
                      idx === activeIndex
                        ? 'bg-accent-muted'
                        : 'hover:bg-surface-muted'
                    }`}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <div className="text-primary text-sm leading-snug font-medium">
                      {r.title}
                    </div>
                    <div
                      className="text-muted [&_mark]:text-primary mt-1 line-clamp-2 text-xs leading-relaxed [&_mark]:rounded-sm [&_mark]:bg-yellow-200 [&_mark]:px-0.5 [&_mark]:dark:bg-yellow-500/30"
                      dangerouslySetInnerHTML={{ __html: r.excerpt }}
                    />
                    <div className="text-muted-subtle mt-1 truncate text-[11px]">
                      {r.url}
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-muted px-4 py-8 text-center text-sm">
              {hint}
            </div>
          )}
        </div>

        <div className="border-default text-muted-subtle flex items-center justify-between gap-3 border-t px-4 py-2 text-[11px]">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="border-default rounded border px-1 py-0.5 font-mono">
                ↑↓
              </kbd>{' '}
              navigate
            </span>
            <span>
              <kbd className="border-default rounded border px-1 py-0.5 font-mono">
                ↵
              </kbd>{' '}
              open
            </span>
          </div>
          <div>
            <kbd className="border-default rounded border px-1 py-0.5 font-mono">
              /
            </kbd>{' '}
            or{' '}
            <kbd className="border-default rounded border px-1 py-0.5 font-mono">
              ⌘K
            </kbd>{' '}
            to open
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;
