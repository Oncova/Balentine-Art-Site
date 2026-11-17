import { useEffect, useState } from 'react';

type StockStatus = {
  totalVariationCount: number;
  overOne: Array<{ artwork: string; label: string; available: number }>;
  frogReady: boolean;
  sushiReady: boolean;
};

interface InventoryPanelProps {
  token: string;
  onSaved: () => Promise<void>;
}

export function InventoryPanel({ token, onSaved }: InventoryPanelProps) {
  const [stock, setStock] = useState<StockStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [frogPrice, setFrogPrice] = useState('22.00');
  const [sushiPrice, setSushiPrice] = useState('44.00');

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/inventory-tools', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load inventory.');
      setStock(data as StockStatus);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load inventory.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, [token]);

  async function save(action: 'cap' | 'frog' | 'sushi') {
    const amount = Number(action === 'frog' ? frogPrice : sushiPrice);
    if (action !== 'cap' && (!Number.isFinite(amount) || amount < 1 || amount > 1000)) {
      setError('Enter a set or card price between $1 and $1,000.');
      return;
    }
    const prompt = action === 'cap'
      ? 'Set every currently available variation to a maximum of one? This does not link sticker multipacks to individual stickers.'
      : action === 'frog'
        ? `Create four individual frog ACEOs at $${amount.toFixed(2)} each, sharing stock with their complete set?`
        : `Create a sushi pair at $${amount.toFixed(2)} total, sharing stock with the two original cards?`;
    if (!window.confirm(prompt)) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = action === 'cap' ? undefined : {
        kind: action, priceCents: Math.round(amount * 100),
      };
      const res = await fetch(
        action === 'cap' ? '/api/admin/inventory-cap-one' : '/api/admin/inventory-create-set',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            ...(payload ? { 'Content-Type': 'application/json' } : {}),
          },
          body: payload ? JSON.stringify(payload) : undefined,
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save.');
      await onSaved();
      await refresh();
      setSuccess(data.detail || (action === 'cap'
        ? `${data.changed ?? 0} inventory quantities updated.`
        : 'ACEO options created successfully.'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#D3DCCB] bg-[#EFF3E9] p-5 sm:p-6" aria-label="Quick stock setup">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5E7C64]">Quick setup</p>
          <h2 className="mt-1 font-serif text-2xl text-[#24402E]">Inventory &amp; ACEO sets</h2>
          <p className="mt-2 text-sm text-[#5B6458]">Everything here saves directly from Studio Admin. No extra page or login needed.</p>
        </div>
        <button type="button" disabled={saving || loading} onClick={() => void refresh()}
          className="min-h-10 rounded-lg border border-[#B6C6AA] bg-white px-4 text-sm text-[#24402E] disabled:opacity-50">
          Refresh inventory
        </button>
      </div>
      {loading && <p className="mt-4 text-sm text-[#5B6458]">Checking saved quantities…</p>}
      {stock && <p className="mt-4 rounded-lg bg-white p-3 text-sm text-[#24402E]">
        <strong>{stock.totalVariationCount} product options</strong> · {stock.overOne.length} still have more than 1 available.
        {stock.overOne.length > 0 && <span className="mt-1 block text-xs text-[#5B6458]">For example: {stock.overOne.slice(0, 3).map(x => `${x.artwork}: ${x.available}`).join(' · ')}</span>}
      </p>}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#DDD4C4] bg-[#FFFDF8] p-4">
          <h3 className="font-serif text-xl text-[#24402E]">1. Available stock</h3>
          <p className="mt-2 text-sm text-[#5B6458]">Limit each currently available item to 1. Already sold-out items stay at 0, and previous orders are preserved.</p>
          <button type="button" disabled={saving || loading || !stock || stock.overOne.length === 0}
            onClick={() => void save('cap')}
            className="mt-4 min-h-10 rounded-lg bg-[#24402E] px-5 text-sm font-medium text-white disabled:opacity-40">
            {stock && stock.overOne.length === 0 ? 'Already limited to 1 ✓' : 'Limit stock to 1'}
          </button>
        </div>
        <div className="rounded-xl border border-[#DDD4C4] bg-[#FFFDF8] p-4">
          <h3 className="font-serif text-xl text-[#24402E]">2. ACEOs — singles &amp; sets</h3>
          <p className="mt-2 text-sm text-[#5B6458]">Individual cards and their sets share the same physical stock.</p>
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <label className="text-xs text-[#24402E]">Frog ACEO ($ per card)
              <input type="number" min="1" max="1000" step="0.01" value={frogPrice} onChange={e => setFrogPrice(e.target.value)}
                className="mt-1 block min-h-10 w-32 rounded-lg border border-[#DDD4C4] bg-white px-3 text-sm" />
            </label>
            <button type="button" disabled={saving || loading || !stock || stock.frogReady} onClick={() => void save('frog')}
              className="min-h-10 rounded-lg bg-[#24402E] px-4 text-xs font-semibold text-white disabled:opacity-40">
              {stock?.frogReady ? 'Frog set linked ✓' : 'Create frog singles'}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <label className="text-xs text-[#24402E]">Sushi set ($ both cards)
              <input type="number" min="1" max="1000" step="0.01" value={sushiPrice} onChange={e => setSushiPrice(e.target.value)}
                className="mt-1 block min-h-10 w-32 rounded-lg border border-[#DDD4C4] bg-white px-3 text-sm" />
            </label>
            <button type="button" disabled={saving || loading || !stock || stock.sushiReady} onClick={() => void save('sushi')}
              className="min-h-10 rounded-lg bg-[#24402E] px-4 text-xs font-semibold text-white disabled:opacity-40">
              {stock?.sushiReady ? 'Sushi pair linked ✓' : 'Create sushi set'}
            </button>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-[#5B6458]">Sticker singles and sticker multipacks are not yet linked. Check those separately before selling for real.</p>
      {success && <p role="status" className="mt-3 rounded-lg border border-[#B6C6AA] bg-white p-3 text-sm text-[#24402E]">{success}</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-[#F9E8DF] p-3 text-sm text-[#9A3412]">{error}</p>}
    </section>
  );
}
