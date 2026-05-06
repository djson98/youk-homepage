import * as React from 'react';
import { useEffect, useState } from 'react';
import { HiMenu, HiX, HiOutlineMoon, HiOutlineSun } from 'react-icons/hi';

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

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-page/95 backdrop-blur-sm border-b border-default/50 transition-all duration-300"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-transparent">
        <div
          className="h-full bg-accent transition-[width] duration-100 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
      <div className="w-full max-w-7xl mx-auto flex justify-between items-center px-4 md:px-12 py-3 md:py-5">
        <a
          href={brandHref}
          className="flex items-center mr-6 md:mr-12 focus:outline-none rounded"
        >
          {brandLogo && (
            <img
              src={brandLogo}
              alt={`${brandName} Logo`}
              className="h-6 md:h-8 w-auto mr-2"
            />
          )}
          <span className="text-sm md:text-base font-light text-primary hover:text-accent transition-colors duration-300 whitespace-nowrap overflow-hidden">
            {brandName}
          </span>
        </a>

        {/* Desktop menu (xl+) */}
        <div className="hidden xl:flex items-center space-x-4" role="menubar">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`px-6 py-3 rounded-lg text-lg font-light focus:outline-none transition-colors duration-300 ${
                resolvedActiveHref === item.href
                  ? 'text-accent'
                  : 'text-muted hover:text-accent'
              }`}
              role="menuitem"
              aria-current={resolvedActiveHref === item.href ? 'page' : undefined}
            >
              {item.label}
            </a>
          ))}
          <button
            type="button"
            onClick={toggleDark}
            className="p-2.5 rounded-lg text-muted hover:text-primary hover:bg-surface-subtle transition-colors duration-200"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <HiOutlineSun className="w-5 h-5" />
            ) : (
              <HiOutlineMoon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile / tablet (< xl): theme toggle + hamburger */}
        <div className="flex xl:hidden items-center gap-1">
          <button
            type="button"
            onClick={toggleDark}
            className="p-2 rounded-lg text-muted hover:text-primary hover:bg-surface-subtle transition-colors duration-200"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <HiOutlineSun className="w-6 h-6" />
            ) : (
              <HiOutlineMoon className="w-6 h-6" />
            )}
          </button>
          <button
            className="p-2 rounded-lg text-muted hover:bg-surface-subtle hover:text-primary transition-colors duration-200"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <HiX className="w-6 h-6" />
            ) : (
              <HiMenu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile / tablet expanding menu */}
      <div
        className={`xl:hidden bg-white/95 dark:bg-page/95 backdrop-blur-sm overflow-hidden transition-all duration-300 ease-in-out ${
          isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 md:px-6 py-3 md:py-4 space-y-1 md:space-y-2">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`block px-3 md:px-4 py-2 md:py-3 rounded-lg text-base font-light transition-colors duration-300 ${
                resolvedActiveHref === item.href
                  ? 'text-accent bg-accent-muted'
                  : 'text-muted hover:text-accent'
              }`}
              onClick={() => setIsMenuOpen(false)}
              role="menuitem"
              aria-current={resolvedActiveHref === item.href ? 'page' : undefined}
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
