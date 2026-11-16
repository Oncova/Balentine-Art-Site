import { useState } from 'react';
import { Menu, ShoppingBag, X } from 'lucide-react';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  bagCount: number;
  onOpenBag: () => void;
}

const NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Gallery', path: '/gallery' },
  { label: 'Sold Works', path: '/sold' },
  { label: 'About', path: '/about' },
  { label: 'Commissions', path: '/commissions' },
];

export function Navbar({ currentPath, onNavigate, bagCount, onOpenBag }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLink = (path: string) => {
    setMobileOpen(false);
    onNavigate(path);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#DDD4C4] bg-[#FBF8F1]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleLink('/');
          }}
          className="font-serif text-2xl font-semibold tracking-tight text-[#24402E] whitespace-nowrap shrink-0"
        >
          Little Wild Things
        </a>

        {/* Zone 2: Clean Single-Line Text Navigation Links */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Primary navigation">
          {NAV_LINKS.map((link) => {
            const active =
              link.path === '/'
                ? currentPath === '/'
                : currentPath.startsWith(link.path);
            return (
              <a
                key={link.path}
                href={link.path}
                onClick={(e) => {
                  e.preventDefault();
                  handleLink(link.path);
                }}
                className={`relative py-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 ${
                  active
                    ? 'text-[#24402E] underline decoration-[#B56A3B] decoration-2 underline-offset-4'
                    : 'text-[#5B6458] hover:text-[#1F241E] hover:underline hover:decoration-[#DDD4C4] hover:underline-offset-4'
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action (Shopping Bag) + Mobile Menu Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenBag}
            aria-label={`Open shopping bag with ${bagCount} item${bagCount === 1 ? '' : 's'}`}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#24402E] px-4 py-2 text-sm font-medium text-[#FBF8F1] transition-colors duration-150 hover:bg-[#1B3123] whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            <span className="tabular-nums">Bag ({bagCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#DDD4C4] text-[#1F241E] md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Mobile Drawer */}
      {mobileOpen && (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-[#DDD4C4] bg-[#FBF8F1] px-4 py-3 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const active =
                link.path === '/' ? currentPath === '/' : currentPath.startsWith(link.path);
              return (
                <a
                  key={link.path}
                  href={link.path}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLink(link.path);
                  }}
                  className={`flex min-h-[44px] items-center rounded-lg px-3 text-base font-medium ${
                    active ? 'bg-[#EFE8DA] text-[#24402E]' : 'text-[#1F241E] hover:bg-[#F4EFE4]'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
            <a
              href="/policies"
              onClick={(e) => {
                e.preventDefault();
                handleLink('/policies');
              }}
              className="flex min-h-[44px] items-center rounded-lg px-3 text-base font-medium text-[#5B6458] hover:bg-[#F4EFE4]"
            >
              Shipping &amp; Returns
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
