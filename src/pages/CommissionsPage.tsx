import { FormEvent, useState } from 'react';
import { CheckCircle2, Clock3, HeartHandshake, Mail, Palette } from 'lucide-react';
import { BotanicalCornerVine } from '../components/BotanicalDecor';

const fieldClass = 'mt-1.5 min-h-[44px] w-full rounded-xl border border-[#DDD4C4] bg-[#FFFDF8] px-3.5 py-2.5 text-sm text-[#1F241E] outline-[#5E7C64]';

export function CommissionsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Custom artwork request');
  const [artType, setArtType] = useState('Original Acrylic Painting');
  const [preferredSize, setPreferredSize] = useState('16 × 20 in Canvas');
  const [budgetRange, setBudgetRange] = useState('$150 – $300');
  const [message, setMessage] = useState('');
  const [requestType, setRequestType] = useState<'commission' | 'general'>('commission');
  const [timeline, setTimeline] = useState('Flexible — Jorja can recommend a timeline');
  const [neededBy, setNeededBy] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [subscribeToUpdates, setSubscribeToUpdates] = useState(false);
  const [website, setWebsite] = useState('');
  const [formLoadedAt, setFormLoadedAt] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedResult, setSubmittedResult] = useState<null | { inquiryId: number; customerConfirmed: boolean }>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('');
    try {
      if (referenceUrl.trim() && !/^https:\/\/[^\s<>"']+$/i.test(referenceUrl.trim())) {
        throw new Error('Please enter a secure https:// reference-image link or leave it blank.');
      }
      // The existing contact API already saves and emails these fields. Include requested
      // timeline in the message so Jorja sees it without any changes to Resend templates.
      const studioMessage = requestType === 'commission'
        ? `CUSTOM ARTWORK QUOTE REQUEST\nRequested timeline: ${timeline}\nDesired completion date: ${neededBy || 'Not specified'}\nReference image: ${referenceUrl.trim() || 'None provided'}\n\nProject details:\n${message}`
        : message;
      const r = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject,
          artType: requestType === 'commission' ? artType : 'General Studio Question',
          preferredSize: requestType === 'commission' ? preferredSize : 'Not applicable',
          budgetRange: requestType === 'commission' ? budgetRange : 'Not applicable',
          message: studioMessage, subscribeToUpdates, website, formLoadedAt }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Could not send your request.');
      setSubmittedResult({ inquiryId: data.inquiryId, customerConfirmed: Boolean(data.emailResult?.customerConfirmed) });
      setName(''); setEmail(''); setMessage(''); setReferenceUrl(''); setWebsite('');
      setNeededBy(''); setFormLoadedAt(Date.now());
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not send your request.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="paper-grain relative min-h-[75vh] overflow-hidden">
      <BotanicalCornerVine className="pointer-events-none absolute -right-8 top-0 hidden h-44 w-52 opacity-40 md:block" flip />
      <div className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5E7C64]">Made just for you • Little Wild Things</p>
        <h1 className="mt-2 font-serif text-4xl text-[#1F241E] sm:text-5xl">Dream up something a little wild</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#5B6458]">
          A pet portrait, a favorite bird, botanical illustration, original painting, or special gift?
          Tell Jorja what you imagine. She'll review your idea and provide a price, timeline,
          and shipping quote before any payment is requested.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[#D5DEC8] bg-[#F0F3E8] p-4"><Palette className="h-5 w-5 text-[#24402E]" /><p className="mt-2 text-sm font-semibold text-[#24402E]">1. Share your idea</p><p className="mt-1 text-xs leading-5 text-[#5B6458]">Describe the subject, size and budget.</p></div>
          <div className="rounded-xl border border-[#D5DEC8] bg-[#F0F3E8] p-4"><Clock3 className="h-5 w-5 text-[#24402E]" /><p className="mt-2 text-sm font-semibold text-[#24402E]">2. Get a studio timeline</p><p className="mt-1 text-xs leading-5 text-[#5B6458]">Custom work takes longer than in-stock orders. Jorja confirms timing before you pay.</p></div>
          <div className="rounded-xl border border-[#D5DEC8] bg-[#F0F3E8] p-4"><HeartHandshake className="h-5 w-5 text-[#24402E]" /><p className="mt-2 text-sm font-semibold text-[#24402E]">3. Approve your quote</p><p className="mt-1 text-xs leading-5 text-[#5B6458]">Jorja will explain the payment and delivery arrangements.</p></div>
        </div>

        {submittedResult ? (
          <div className="mt-8 rounded-2xl border border-[#A7B799] bg-[#F2F4EA] p-7 sm:p-9">
            <CheckCircle2 className="h-8 w-8 text-[#24402E]" />
            <h2 className="mt-3 font-serif text-3xl text-[#24402E]">Your idea is on its way to the studio!</h2>
            <p className="mt-2 text-sm leading-7 text-[#4F5B4C]">Request #{submittedResult.inquiryId} has been saved. Jorja will review it and reply with the next steps. You have <strong>not been charged</strong>.</p>
            {submittedResult.customerConfirmed && <p className="mt-2 text-sm text-[#24402E]">A copy was sent to your email.</p>}
            <button type="button" onClick={() => setSubmittedResult(null)} className="mt-6 rounded-xl border border-[#24402E] px-5 py-3 text-sm font-semibold text-[#24402E]">Send another request</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6 rounded-2xl border border-[#DDD4C4] bg-[#FBF8F1] p-5 sm:p-8">
            <fieldset>
              <legend className="text-sm font-semibold text-[#24402E]">What can we help with?</legend>
              <div className="mt-2 flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#D5CDBE] bg-white px-4 py-3 text-sm">
                  <input type="radio" checked={requestType === 'commission'} onChange={() => {setRequestType('commission');setSubject('Custom artwork request');}} className="accent-[#24402E]" /> Special artwork request
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#D5CDBE] bg-white px-4 py-3 text-sm">
                  <input type="radio" checked={requestType === 'general'} onChange={() => {setRequestType('general');setSubject('General studio question');}} className="accent-[#24402E]" /> General question
                </label>
              </div>
            </fieldset>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium">Your name *<input required maxLength={120} type="text" value={name} onChange={e => setName(e.target.value)} className={fieldClass} /></label>
              <label className="block text-sm font-medium">Email address *<input required maxLength={254} type="email" value={email} onChange={e => setEmail(e.target.value)} className={fieldClass} /></label>
            </div>
            <label className="block text-sm font-medium">Subject *<input required maxLength={200} value={subject} onChange={e => setSubject(e.target.value)} className={fieldClass} /></label>
            <div className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
              <label htmlFor="inquiry-website">Website</label><input id="inquiry-website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
            </div>
            {requestType === 'commission' && <>
              <div className="grid gap-5 sm:grid-cols-3">
                <label className="block text-sm font-medium">Artwork type<select value={artType} onChange={e => setArtType(e.target.value)} className={fieldClass}>
                  <option>Original Acrylic Painting</option><option>Custom ACEO Mini Art Card (2.5 × 3.5 in)</option><option>Custom Ink / Sticker Illustration</option><option>Custom Art Print</option><option>Other / Not Sure</option>
                </select></label>
                <label className="block text-sm font-medium">Preferred size<select value={preferredSize} onChange={e => setPreferredSize(e.target.value)} className={fieldClass}>
                  <option>2.5 × 3.5 in ACEO Card</option><option>5 × 7 in</option><option>8 × 10 in</option><option>11 × 14 in</option><option>14 × 18 in Canvas</option><option>16 × 20 in Canvas</option><option>18 × 24 in or larger</option><option>Not sure — need advice</option>
                </select></label>
                <label className="block text-sm font-medium">Budget range<select value={budgetRange} onChange={e => setBudgetRange(e.target.value)} className={fieldClass}>
                  <option>Under $50 (mini art / stickers)</option><option>$50 – $150</option><option>$150 – $300</option><option>$300+</option><option>Open to a quote</option>
                </select></label>
              </div>
              <div className="rounded-xl border border-[#D6DEC9] bg-[#F2F4EB] p-4 sm:p-5">
                <h2 className="font-serif text-xl text-[#24402E]">When would you like it?</h2>
                <p className="mt-1 text-xs leading-6 text-[#5B6458]">These are your preferences, not guaranteed turnaround times. Custom production begins only after Jorja accepts the project and confirms a schedule.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium">Preferred timeline<select value={timeline} onChange={e => setTimeline(e.target.value)} className={fieldClass}>
                    <option>Flexible — Jorja can recommend a timeline</option><option>Within 2 weeks (request only)</option><option>Within 1 month (request only)</option><option>Within 2 months (request only)</option><option>For a specific occasion</option>
                  </select></label>
                  <label className="block text-sm font-medium">Needed by (optional)<input type="date" value={neededBy} min={new Date().toISOString().slice(0,10)} onChange={e => setNeededBy(e.target.value)} className={fieldClass} /></label>
                </div>
              </div>
              <label className="block text-sm font-medium">Reference photo link (optional)<input type="url" value={referenceUrl} onChange={e => setReferenceUrl(e.target.value)} placeholder="https://..." className={fieldClass}/><span className="mt-1 block text-xs text-[#5B6458]">You can also share photos with Jorja when she replies by email.</span></label>
            </>}
            <label className="block text-sm font-medium">{requestType === 'commission' ? 'Tell Jorja what you have in mind *' : 'Your message *'}
              <textarea rows={5} required minLength={5} value={message} onChange={e => setMessage(e.target.value)} maxLength={4000} placeholder="What would you love Jorja to create? Any colors, pets, wildlife, gift ideas, or details?" className={`${fieldClass} min-h-[136px]`} />
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#F4EFE4] p-4 text-sm leading-6">
              <input type="checkbox" checked={subscribeToUpdates} onChange={e => setSubscribeToUpdates(e.target.checked)} className="mt-1 accent-[#24402E]" />
              Also send me Little Wild Things studio updates and new art releases (optional).
            </label>
            <div className="flex items-start gap-2 text-xs text-[#5B6458]"><Mail className="mt-0.5 h-4 w-4 shrink-0" /> This sends a request, not a purchase. No payment is taken until you accept Jorja's quote.</div>
            {error && <p role="alert" className="rounded-xl bg-[#FBECE4] p-3 text-sm text-[#9A3412]">{error}</p>}
            <button type="submit" disabled={submitting} className="min-h-[48px] w-full rounded-xl bg-[#24402E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1B3123] disabled:opacity-60">{submitting ? 'Sending your request...' : requestType === 'commission' ? 'Request a custom art quote' : 'Send message'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
