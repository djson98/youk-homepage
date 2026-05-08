import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  HiMenu,
  HiX,
  HiOutlineMoon,
  HiOutlineSun,
  HiOutlineSearch,
} from 'react-icons/hi';

export interface NavItem {
  href: string;
  label: string;
}

export interface NavBarProps {
  brandName: string;
  brandHref?: string;
  brandLogo?: string;
  items: NavItem[];
  /** Server-rendered active path (Astro.url.pathname). */
  activePath?: string;
}

const NavBar: React.FC<NavBarProps> = ({
  brandName,
  brandHref = '/',
  brandLogo,
  items,
  activePath = '/',
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Resolve active item from current URL path. Prefer the deepest matching prefix.
  const resolvedActiveHref = React.useMemo(() => {
    const pathname = (activePath || '/').replace(/\/$/, '') || '/';
    const match = items.find((item) => {
      if (item.href === '/') return pathname === '/';
      return pathname === item.href || pathname.startsWith(item.href + '/');
    });
    return match?.href ?? '';
  }, [activePath, items]);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop || document.body.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setScrollProgress(total > 0 ? (scrolled / total) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const dark = document.documentElement.classList.contains('dark');
    setIsDark(dark);
  }, []);

  const toggleDark = () => {
    const nowDark = document.documentElement.classList.toggle('dark');
    setIsDark(nowDark);
    try {
      localStorage.setItem('theme', nowDark ? 'dark' : 'light');
    } catch {
      /* ignore storage errors */
    }
  };

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent('youk:search:open'));
  };

  return (
    <nav
      className="dark:bg-page/95 border-default/50 fixed top-0 right-0 left-0 z-50 border-b bg-white/95 backdrop-blur-sm transition-all duration-300"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="absolute top-0 right-0 left-0 h-0.5 bg-transparent">
        <div
          className="bg-accent h-full transition-[width] duration-100 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-12 md:py-5">
        <a
          href={brandHref}
          className="mr-6 flex items-center rounded focus:outline-none md:mr-12"
        >
          {brandLogo && (
            <img
              src={brandLogo}
              alt={`${brandName} Logo`}
              className="mr-2 h-6 w-auto md:h-8"
            />
          )}
          <span className="text-primary hover:text-accent overflow-hidden text-sm font-light whitespace-nowrap transition-colors duration-300 md:text-base">
            {brandName}
          </span>
        </a>

        {/* Desktop menu (xl+) */}
        <div className="hidden items-center space-x-4 xl:flex" role="menubar">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`rounded-lg px-6 py-3 text-lg font-light transition-colors duration-300 focus:outline-none ${
                resolvedActiveHref === item.href
                  ? 'text-accent'
                  : 'text-muted hover:text-accent'
              }`}
              role="menuitem"
              aria-current={
                resolvedActiveHref === item.href ? 'page' : undefined
              }
            >
              {item.label}
            </a>
          ))}
          <button
            type="button"
            onClick={openSearch}
            className="text-muted hover:text-primary hover:bg-surface-subtle rounded-lg p-2.5 transition-colors duration-200"
            aria-label="Open site search (press / or ⌘K)"
            title="Search (/ or ⌘K)"
          >
            <HiOutlineSearch className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={toggleDark}
            className="text-muted hover:text-primary hover:bg-surface-subtle rounded-lg p-2.5 transition-colors duration-200"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <HiOutlineSun className="h-5 w-5" />
            ) : (
              <HiOutlineMoon className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile / tablet (< xl): search + theme toggle + hamburger */}
        <div className="flex items-center gap-1 xl:hidden">
          <button
            type="button"
            onClick={openSearch}
            className="text-muted hover:text-primary hover:bg-surface-subtle rounded-lg p-2 transition-colors duration-200"
            aria-label="Open site search"
          >
            <HiOutlineSearch className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={toggleDark}
            className="text-muted hover:text-primary hover:bg-surface-subtle rounded-lg p-2 transition-colors duration-200"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <HiOutlineSun className="h-6 w-6" />
            ) : (
              <HiOutlineMoon className="h-6 w-6" />
            )}
          </button>
          <button
            className="text-muted hover:bg-surface-subtle hover:text-primary rounded-lg p-2 transition-colors duration-200"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <HiX className="h-6 w-6" />
            ) : (
              <HiMenu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile / tablet expanding menu */}
      <div
        className={`dark:bg-page/95 overflow-hidden bg-white/95 backdrop-blur-sm transition-all duration-300 ease-in-out xl:hidden ${
          isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-1 px-4 py-3 md:space-y-2 md:px-6 md:py-4">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-base font-light transition-colors duration-300 md:px-4 md:py-3 ${
                resolvedActiveHref === item.href
                  ? 'text-accent bg-accent-muted'
                  : 'text-muted hover:text-accent'
              }`}
              onClick={() => setIsMenuOpen(false)}
              role="menuitem"
              aria-current={
                resolvedActiveHref === item.href ? 'page' : undefined
              }
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
