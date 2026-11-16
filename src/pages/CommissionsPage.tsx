import { FormEvent, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { BotanicalCornerVine } from '../components/BotanicalDecor';

export function CommissionsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [artType, setArtType] = useState('Original Acrylic Painting');
  const [preferredSize, setPreferredSize] = useState('16 × 20 in Canvas');
  const [budgetRange, setBudgetRange] = useState('$150 – $300');
  const [message, setMessage] = useState('');
  const [subscribeToUpdates, setSubscribeToUpdates] = useState(false);
  const [website, setWebsite] = useState('');
  const [formLoadedAt, setFormLoadedAt] = useState(() => Date.now());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedResult, setSubmittedResult] = useState<{
    inquiryId: number;
    subscribedToUpdates: boolean;
    emailResult?: {
      configured: boolean;
      contactNotificationEmailConfigured?: boolean;
      provider: string;
      studioNotified: boolean;
      customerConfirmed: boolean;
      status: string;
    };
  } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          subject,
          artType,
          preferredSize,
          budgetRange,
          message,
          subscribeToUpdates,
          website,
          formLoadedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not submit your request.');
        setSubmitting(false);
        return;
      }

      setSubmittedResult({
        inquiryId: data.inquiryId,
        subscribedToUpdates: data.subscribedToUpdates,
        emailResult: data.emailResult,
      });
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setWebsite('');
      setFormLoadedAt(Date.now());
    } catch {
      setError('Network error while sending your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="paper-grain relative overflow-hidden">
      <BotanicalCornerVine className="absolute -right-8 top-0 h-44 w-52 opacity-50 hidden md:block" flip />

      <div className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-xs font-medium tracking-widest uppercase text-[#5E7C64]">
          Contact &amp; Custom Art Requests
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold text-[#1F241E] sm:text-5xl">
          Commission a Piece or Say Hello
        </h1>
        <p className="mt-3 max-w-2xl text-base text-[#5B6458]">
          Looking for a specific painting, custom pet or wildlife ACEO card, or sticker illustration?
          Share your vision below and Jorja will follow up with timeline and pricing notes.
        </p>

        {submittedResult ? (
          <div className="mt-8 rounded-xl border border-[#5E7C64] bg-[#F4EFE4] p-8">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#24402E]" aria-hidden="true" />
              <div>
                <h2 className="font-serif text-2xl font-semibold text-[#1F241E]">
                  Art Request Received (#{submittedResult.inquiryId})
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#5B6458]">
                  Thank you for reaching out to Little Wild Things. Your note is saved in the studio
                  inbox and Jorja will reply by email soon.
                </p>
                {submittedResult.emailResult?.customerConfirmed && (
                  <p className="mt-2 text-xs font-medium text-[#24402E]">
                    A confirmation copy has been sent to your email address.
                  </p>
                )}
                {submittedResult.subscribedToUpdates && (
                  <p className="mt-2 text-xs font-medium text-[#24402E]">
                    You are also signed up for email notifications on new art drops and studio updates.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setSubmittedResult(null)}
                  className="mt-5 min-h-[40px] rounded-lg border border-[#24402E] px-4 py-2 text-sm font-medium text-[#24402E] hover:bg-[#EFE8DA]"
                >
                  Send Another Note
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-6 rounded-xl border border-[#DDD4C4] bg-[#FBF8F1] p-6 sm:p-8"
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="inq-name" className="block text-xs font-medium text-[#1F241E]">
                  Your Name *
                </label>
                <input
                  id="inq-name"
                  type="text"
                  required
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Clara Vance"
                  className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3.5 text-sm text-[#1F241E]"
                />
              </div>

              <div>
                <label htmlFor="inq-email" className="block text-xs font-medium text-[#1F241E]">
                  Email Address *
                </label>
                <input
                  id="inq-email"
                  type="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="clara@example.com"
                  className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3.5 text-sm text-[#1F241E]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="inq-subject" className="block text-xs font-medium text-[#1F241E]">
                Subject *
              </label>
              <input
                id="inq-subject"
                type="text"
                required
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Custom wildlife painting, ACEO card request, or general question"
                className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3.5 text-sm text-[#1F241E]"
              />
            </div>

            {/* Honeypot field for spam bots */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
            >
              <label htmlFor="inq-website">Website</label>
              <input
                id="inq-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <label htmlFor="inq-type" className="block text-xs font-medium text-[#1F241E]">
                  Artwork Type
                </label>
                <select
                  id="inq-type"
                  value={artType}
                  onChange={(e) => setArtType(e.target.value)}
                  className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3 text-sm text-[#1F241E]"
                >
                  <option>Original Acrylic Painting</option>
                  <option>Custom ACEO Mini Art Card (2.5 × 3.5 in)</option>
                  <option>Custom Ink / Sticker Illustration</option>
                  <option>Print / General Studio Question</option>
                </select>
              </div>

              <div>
                <label htmlFor="inq-size" className="block text-xs font-medium text-[#1F241E]">
                  Preferred Size
                </label>
                <select
                  id="inq-size"
                  value={preferredSize}
                  onChange={(e) => setPreferredSize(e.target.value)}
                  className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3 text-sm text-[#1F241E]"
                >
                  <option>2.5 × 3.5 in ACEO Card</option>
                  <option>8 × 10 in Canvas / Print</option>
                  <option>14 × 18 in Canvas</option>
                  <option>16 × 20 in Canvas</option>
                  <option>18 × 24 in or Larger</option>
                  <option>Flexible / Open to Advice</option>
                </select>
              </div>

              <div>
                <label htmlFor="inq-budget" className="block text-xs font-medium text-[#1F241E]">
                  Estimated Budget
                </label>
                <select
                  id="inq-budget"
                  value={budgetRange}
                  onChange={(e) => setBudgetRange(e.target.value)}
                  className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3 text-sm text-[#1F241E]"
                >
                  <option>Under $50 (ACEO / Sticker)</option>
                  <option>$50 – $150</option>
                  <option>$150 – $300</option>
                  <option>$300+</option>
                  <option>Open / Let’s Discuss</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="inq-message" className="block text-xs font-medium text-[#1F241E]">
                Tell Jorja what you have in mind *
              </label>
              <textarea
                id="inq-message"
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your subject idea (for example, a pet portrait, favorite bird, botanical colors, or gift deadline)..."
                className="mt-1.5 w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 p-3.5 text-sm text-[#1F241E]"
              />
            </div>

            {/* Optional Email Notifications Checkbox */}
            <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/70 p-4">
              <input
                type="checkbox"
                checked={subscribeToUpdates}
                onChange={(e) => setSubscribeToUpdates(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#DDD4C4] accent-[#24402E]"
              />
              <span className="text-sm text-[#1F241E]">
                Sign me up for email notifications about studio updates, new paintings, ACEO releases, and sticker drops. <span className="text-[#5B6458]">(Optional)</span>
              </span>
            </label>

            {error && (
              <p role="alert" className="rounded-lg bg-[#9A3412]/10 px-4 py-2.5 text-sm text-[#9A3412]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] rounded-lg bg-[#24402E] px-6 py-3 text-sm font-medium text-[#FBF8F1] transition-colors hover:bg-[#1B3123] disabled:opacity-60"
            >
              {submitting ? 'Sending Request...' : 'Send Art Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
