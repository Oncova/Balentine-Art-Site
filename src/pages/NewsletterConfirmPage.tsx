import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Leaf } from 'lucide-react';
import { BotanicalCornerVine } from '../components/BotanicalDecor';

interface NewsletterConfirmPageProps {
  onNavigate: (path: string) => void;
}

type ConfirmState =
  | { status: 'verifying' }
  | { status: 'confirmed'; message: string; email?: string }
  | { status: 'error'; code?: string; message: string };

export function NewsletterConfirmPage({ onNavigate }: NewsletterConfirmPageProps) {
  const [state, setState] = useState<ConfirmState>({ status: 'verifying' });
  const attemptedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = (params.get('token') || '').trim();

    if (!token) {
      setState({
        status: 'error',
        code: 'INVALID_TOKEN',
        message: 'This confirmation link is incomplete or missing a verification token.',
      });
      return;
    }

    if (attemptedTokenRef.current === token) {
      return;
    }
    attemptedTokenRef.current = token;

    let cancelled = false;
    fetch('/api/newsletter/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (res.ok && data.confirmed) {
          setState({
            status: 'confirmed',
            email: data.email,
            message:
              data.message || "You're on the list! Welcome to our little creative corner. 🌿",
          });
          return;
        }

        setState({
          status: 'error',
          code: data.code,
          message:
            data.error ||
            'We could not confirm your subscription with this link. Please try subscribing again.',
        });
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            status: 'error',
            code: 'NETWORK_ERROR',
            message: 'Unable to connect to the studio right now. Please refresh and try again.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="paper-grain relative overflow-hidden py-16 sm:py-24">
      <BotanicalCornerVine className="pointer-events-none absolute -top-4 -right-4 h-44 w-52 opacity-50" />

      <div className="relative mx-auto max-w-xl px-4 sm:px-6">
        <div className="rounded-2xl border border-[#DDD4C4] bg-[#FBF8F1] p-8 text-center shadow-xs sm:p-10">
          {state.status === 'verifying' && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EFE8DA] text-[#24402E]">
                <Leaf className="h-6 w-6 animate-pulse" aria-hidden="true" />
              </div>
              <p className="mt-5 text-xs font-medium tracking-widest uppercase text-[#5E7C64]">
                Studio Updates
              </p>
              <h1 className="mt-2 font-serif text-3xl font-semibold text-[#1F241E]">
                Confirming your email...
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[#5B6458]">
                Just a moment while we verify your invitation link.
              </p>
            </>
          )}

          {state.status === 'confirmed' && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EFE8DA] text-[#24402E]">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="mt-5 text-xs font-medium tracking-widest uppercase text-[#5E7C64]">
                Subscription Confirmed
              </p>
              <h1 className="mt-2 font-serif text-3xl font-semibold text-[#24402E]">
                {state.message}
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-[#5B6458]">
                {state.email ? (
                  <>
                    <strong className="font-medium text-[#1F241E]">{state.email}</strong> has been
                    added to Jorja’s studio notes and new art drops list.
                  </>
                ) : (
                  'Your email has been added to Jorja’s studio notes and new art drops list.'
                )}
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('/gallery')}
                  className="min-h-[42px] rounded-lg bg-[#24402E] px-5 py-2 text-sm font-medium text-[#FBF8F1] transition-colors hover:bg-[#1B3123]"
                >
                  Browse Artwork Gallery
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/')}
                  className="min-h-[42px] rounded-lg border border-[#DDD4C4] bg-[#F4EFE4] px-5 py-2 text-sm font-medium text-[#1F241E] transition-colors hover:bg-[#EFE8DA]"
                >
                  Return Home
                </button>
              </div>
            </>
          )}

          {state.status === 'error' && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#9A3412]/10 text-[#9A3412]">
                <AlertCircle className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="mt-5 text-xs font-medium tracking-widest uppercase text-[#9A3412]">
                {state.code === 'EXPIRED_TOKEN'
                  ? 'Link Expired'
                  : state.code === 'ALREADY_USED'
                  ? 'Link Already Used'
                  : 'Confirmation Unavailable'}
              </p>
              <h1 className="mt-2 font-serif text-3xl font-semibold text-[#1F241E]">
                {state.code === 'EXPIRED_TOKEN'
                  ? 'This verification link expired'
                  : state.code === 'ALREADY_USED'
                  ? 'Already confirmed or used'
                  : 'Unable to confirm link'}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[#5B6458]">{state.message}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('/')}
                  className="min-h-[42px] rounded-lg bg-[#24402E] px-5 py-2 text-sm font-medium text-[#FBF8F1] transition-colors hover:bg-[#1B3123]"
                >
                  Go to Studio Home
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/gallery')}
                  className="min-h-[42px] rounded-lg border border-[#DDD4C4] bg-[#F4EFE4] px-5 py-2 text-sm font-medium text-[#1F241E] transition-colors hover:bg-[#EFE8DA]"
                >
                  Explore Gallery
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
