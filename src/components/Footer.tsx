import { FormEvent, useState } from 'react';
import { BotanicalCornerVine, StudioCatCompanion } from './BotanicalDecor';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [formLoadedAt] = useState(() => Date.now());
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus('submitting');
    setFeedback('');

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          website: honeypot,
          formLoadedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setFeedback(data.error || 'Could not subscribe.');
        return;
      }
      setStatus('done');
      setEmail('');
      setFeedback(
        data.message || 'One little step left! Check your inbox to confirm your subscription. 🌿'
      );
    } catch {
      setStatus('error');
      setFeedback('Network error. Please try again.');
    }
  };

  return (
    <footer className="relative overflow-hidden border-t border-[#DDD4C4] bg-[#F4EFE4]">
      <BotanicalCornerVine className="absolute -bottom-4 -left-4 h-36 w-44 opacity-70" />

      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:items-start">
          <div className="md:col-span-5">
            <h2 className="font-serif text-2xl font-semibold text-[#24402E]">Little Wild Things</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[#5B6458]">
              Original woodland acrylic paintings, 2.5 × 3.5 in ACEO mini art cards, and hand-drawn
              botanical and cat stickers by Jorja.
            </p>

            <form onSubmit={handleSubscribe} className="mt-5 max-w-sm">
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="footer-newsletter-website">Leave empty</label>
                <input
                  id="footer-newsletter-website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>
              <label htmlFor="footer-newsletter-email" className="block text-xs font-medium text-[#1F241E]">
                Studio notes &amp; new art drops
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id="footer-newsletter-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="min-h-[40px] flex-1 rounded-lg border border-[#DDD4C4] bg-[#FBF8F1] px-3 text-sm text-[#1F241E] placeholder:text-[#5B6458]/70"
                />
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="min-h-[40px] rounded-lg bg-[#24402E] px-4 text-sm font-medium text-[#FBF8F1] transition-colors hover:bg-[#1B3123] disabled:opacity-60 whitespace-nowrap"
                >
                  {status === 'submitting' ? 'Sending...' : 'Subscribe'}
                </button>
              </div>
              {feedback && (
                <p
                  role={status === 'error' ? 'alert' : 'status'}
                  className={`mt-1.5 text-xs ${
                    status === 'error' ? 'text-[#9A3412]' : 'text-[#24402E]'
                  }`}
                >
                  {feedback}
                </p>
              )}
            </form>
          </div>

          <div className="grid grid-cols-2 gap-6 text-sm md:col-span-4">
            <div>
              <h3 className="font-medium text-[#1F241E]">Explore</h3>
              <ul className="mt-3 space-y-2 text-[#5B6458]">
                <li>
                  <a
                    href="/gallery"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate('/gallery');
                    }}
                    className="hover:text-[#24402E] hover:underline"
                  >
                    Artwork Gallery
                  </a>
                </li>
                <li>
                  <a
                    href="/sold"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate('/sold');
                    }}
                    className="hover:text-[#24402E] hover:underline"
                  >
                    Sold Works
                  </a>
                </li>
                <li>
                  <a
                    href="/about"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate('/about');
                    }}
                    className="hover:text-[#24402E] hover:underline"
                  >
                    About the Artist
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-[#1F241E]">Collector Care</h3>
              <ul className="mt-3 space-y-2 text-[#5B6458]">
                <li>
                  <a
                    href="/commissions"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate('/commissions');
                    }}
                    className="hover:text-[#24402E] hover:underline"
                  >
                    Custom Requests
                  </a>
                </li>
                <li>
                  <a
                    href="/policies"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate('/policies');
                    }}
                    className="hover:text-[#24402E] hover:underline"
                  >
                    Shipping &amp; Returns
                  </a>
                </li>
                <li>
                  <a
                    href="/checkout"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate('/checkout');
                    }}
                    className="hover:text-[#24402E] hover:underline"
                  >
                    Checkout
                  </a>
                </li>
                <li>
                  <a
                    href="/admin"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate('/admin');
                    }}
                    className="hover:text-[#24402E] hover:underline"
                  >
                    Studio Admin
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-start md:col-span-3 md:items-end justify-between">
            <StudioCatCompanion />
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-[#DDD4C4] pt-6 text-xs text-[#5B6458] sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Little Wild Things · All original artwork rights reserved.</p>
          <p>Handcrafted woodland art &amp; archival prints</p>
        </div>
      </div>
    </footer>
  );
}
