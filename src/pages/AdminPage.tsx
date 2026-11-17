import { InventoryPanel } from './InventoryPanel';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Lock,
  LogOut,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Artwork,
  ArtworkCategory,
  ArtworkVariation,
  CommissionInquiry,
  IntegrationsStatus,
  NewsletterSubscriber,
  OrderRecord,
  ShippingRate,
  VariationOptionKind,
  formatMoney,
} from '../types/shop';

interface AdminPageProps {
  onRefreshPublicCatalog: () => Promise<void>;
}

type AdminTab = 'artworks' | 'orders' | 'shipping' | 'inquiries' | 'settings';

function createEmptyArtwork(): Omit<Artwork, 'id' | 'hasOneOfAKind' | 'originalSold' | 'totalStock' | 'minPriceCents' | 'sortOrder'> {
  return {
    slug: '',
    title: '',
    category: 'painting',
    medium: 'Acrylic on stretched canvas',
    dimensionsSummary: '16 × 20 in',
    year: String(new Date().getFullYear()),
    imageUrl: '',
    description: '',
    artistNote: '',
    isFeatured: false,
    isSoldArchive: false,
    published: true,
    variations: [
      {
        label: 'Original Acrylic Painting',
        optionKind: 'original',
        size: '16 × 20 in',
        packQuantity: 1,
        isOneOfAKind: true,
        sku: `BA-NEW-${Date.now().toString().slice(-4)}`,
        priceCents: 18000,
        stock: 1,
      },
    ],
  };
}

export function AdminPage({ onRefreshPublicCatalog }: AdminPageProps) {
  const [token, setToken] = useState<string>(() => sessionStorage.getItem('balentine_admin_token') || '');
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [usingDefaultPassword, setUsingDefaultPassword] = useState(false);

  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('artworks');
  const [statusBanner, setStatusBanner] = useState('');
  const [errorBanner, setErrorBanner] = useState('');

  // Data stores
  const [adminArtworks, setAdminArtworks] = useState<Artwork[]>([]);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formCategory, setFormCategory] = useState<ArtworkCategory>('painting');
  const [formMedium, setFormMedium] = useState('');
  const [formDimensions, setFormDimensions] = useState('');
  const [formYear, setFormYear] = useState('2026');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formArtistNote, setFormArtistNote] = useState('');
  const [formFeatured, setFormFeatured] = useState(false);
  const [formSoldArchive, setFormSoldArchive] = useState(false);
  const [formPublished, setFormPublished] = useState(true);
  const [formVariations, setFormVariations] = useState<ArtworkVariation[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingArtwork, setSavingArtwork] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [inquiries, setInquiries] = useState<CommissionInquiry[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationsStatus | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const authHeaders = (tok = token): HeadersInit =>
    tok ? { Authorization: `Bearer ${tok}` } : {};

  const showSuccess = (msg: string) => {
    setErrorBanner('');
    setStatusBanner(msg);
    window.setTimeout(() => setStatusBanner(''), 4000);
  };

  const loadAdminData = async (tok: string) => {
    try {
      const [artRes, ordRes, shipRes, inqRes, intRes] = await Promise.all([
        fetch('/api/admin/artworks', { headers: authHeaders(tok) }),
        fetch('/api/admin/orders', { headers: authHeaders(tok) }),
        fetch('/api/admin/shipping-rates', { headers: authHeaders(tok) }),
        fetch('/api/admin/inquiries', { headers: authHeaders(tok) }),
        fetch('/api/admin/integrations-status', { headers: authHeaders(tok) }),
      ]);

      if (artRes.ok) {
        const list = (await artRes.json()) as Artwork[];
        setAdminArtworks(list);
        if (list.length > 0 && editingId === null) {
          populateEditor(list[0]);
        }
      }
      if (ordRes.ok) setOrders(await ordRes.json());
      if (shipRes.ok) setShippingRates(await shipRes.json());
      if (inqRes.ok) {
        const d = await inqRes.json();
        setInquiries(d.inquiries || []);
        setSubscribers(d.subscribers || []);
      }
      if (intRes.ok) setIntegrations(await intRes.json());
    } catch {
      setErrorBanner('Failed to load studio admin data.');
    }
  };

  useEffect(() => {
    fetch('/api/admin/session', { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => {
        setAuthenticated(Boolean(data.authenticated));
        setUsingDefaultPassword(Boolean(data.usingDefaultPassword));
        if (data.authenticated) {
          loadAdminData(token);
        }
      })
      .finally(() => setCheckingSession(false));
  }, []);

  const populateEditor = (art: Artwork) => {
    setEditingId(art.id);
    setConfirmDeleteId(null);
    setFormTitle(art.title);
    setFormSlug(art.slug);
    setFormCategory(art.category);
    setFormMedium(art.medium);
    setFormDimensions(art.dimensionsSummary);
    setFormYear(art.year);
    setFormImageUrl(art.imageUrl);
    setFormDescription(art.description);
    setFormArtistNote(art.artistNote || '');
    setFormFeatured(art.isFeatured);
    setFormSoldArchive(art.isSoldArchive);
    setFormPublished(art.published);
    setFormVariations(art.variations.map((v) => ({ ...v })));
  };

  const startNewArtwork = () => {
    const empty = createEmptyArtwork();
    setEditingId('new');
    setConfirmDeleteId(null);
    setFormTitle(empty.title);
    setFormSlug(empty.slug);
    setFormCategory(empty.category);
    setFormMedium(empty.medium);
    setFormDimensions(empty.dimensionsSummary);
    setFormYear(empty.year);
    setFormImageUrl(empty.imageUrl);
    setFormDescription(empty.description);
    setFormArtistNote(empty.artistNote);
    setFormFeatured(empty.isFeatured);
    setFormSoldArchive(empty.isSoldArchive);
    setFormPublished(empty.published);
    setFormVariations(empty.variations);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Incorrect password.');
        setLoggingIn(false);
        return;
      }
      sessionStorage.setItem('balentine_admin_token', data.token);
      setToken(data.token);
      setAuthenticated(true);
      setPasswordInput('');
      await loadAdminData(data.token);
    } catch {
      setLoginError('Unable to reach the server.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    sessionStorage.removeItem('balentine_admin_token');
    setToken('');
    setAuthenticated(false);
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setErrorBanner('');
    const body = new FormData();
    body.append('image', file);
    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: authHeaders(),
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || 'Image upload failed.');
      } else {
        setFormImageUrl(data.imageUrl);
        showSuccess('Artwork photograph uploaded.');
      }
    } catch {
      setErrorBanner('Image upload error.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveArtwork = async (e: FormEvent) => {
    e.preventDefault();
    setSavingArtwork(true);
    setErrorBanner('');

    const payload = {
      title: formTitle,
      slug: formSlug,
      category: formCategory,
      medium: formMedium,
      dimensionsSummary: formDimensions,
      year: formYear,
      imageUrl: formImageUrl,
      description: formDescription,
      artistNote: formArtistNote,
      isFeatured: formFeatured,
      isSoldArchive: formSoldArchive,
      published: formPublished,
      variations: formVariations,
    };

    try {
      const isNew = editingId === 'new';
      const url = isNew ? '/api/admin/artworks' : `/api/admin/artworks/${editingId}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || 'Could not save artwork.');
        setSavingArtwork(false);
        return;
      }

      await loadAdminData(token);
      await onRefreshPublicCatalog();
      populateEditor(data);
      showSuccess(`Saved "${data.title}".`);
    } catch {
      setErrorBanner('Network error while saving artwork.');
    } finally {
      setSavingArtwork(false);
    }
  };

  const handleDeleteArtwork = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/artworks/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        setErrorBanner('Could not delete artwork.');
        return;
      }
      setConfirmDeleteId(null);
      setEditingId(null);
      await loadAdminData(token);
      await onRefreshPublicCatalog();
      showSuccess('Artwork removed from catalog.');
    } catch {
      setErrorBanner('Error deleting artwork.');
    }
  };

  const handleUpdateOrder = async (
    order: OrderRecord,
    updates: {
      fulfillmentStatus: OrderRecord['fulfillmentStatus'];
      carrier: string;
      trackingNumber: string;
      sendTrackingEmail: boolean;
    }
  ) => {
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || 'Unable to update order.');
        return;
      }
      await loadAdminData(token);
      if (updates.sendTrackingEmail && data.emailResult && !data.emailResult.configured) {
        showSuccess('Order saved. Add RESEND_API_KEY in secrets to send automatic tracking emails.');
      } else {
        showSuccess(`Updated order ${order.orderNumber}.`);
      }
    } catch {
      setErrorBanner('Failed to update order.');
    }
  };

  const handleSaveShippingRates = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/shipping-rates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ rates: shippingRates }),
      });
      if (!res.ok) {
        setErrorBanner('Could not save shipping rates.');
        return;
      }
      await onRefreshPublicCatalog();
      showSuccess('Shipping rates updated.');
    } catch {
      setErrorBanner('Error updating shipping rates.');
    }
  };

  const handleInquiryStatus = async (id: number, status: CommissionInquiry['status']) => {
    await fetch(`/api/admin/inquiries/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ status }),
    });
    await loadAdminData(token);
    showSuccess('Inquiry status updated.');
  };

  const handleDownloadBackup = async () => {
    const res = await fetch('/api/admin/backup', { headers: authHeaders() });
    if (!res.ok) {
      setErrorBanner('Unable to generate backup.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `little-wild-things-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setErrorBanner('');
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorBanner(data.error || 'Could not update password.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setUsingDefaultPassword(false);
    showSuccess('Studio Admin password updated.');
  };

  if (checkingSession) {
    return (
      <div className="paper-grain mx-auto max-w-4xl px-4 py-20 text-center text-sm text-[#5B6458]">
        Checking studio session...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="paper-grain mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="rounded-xl border border-[#DDD4C4] bg-[#FBF8F1] p-7">
          <div className="flex items-center gap-2.5 text-[#24402E]">
            <Lock className="h-5 w-5" aria-hidden="true" />
            <h1 className="font-serif text-3xl font-semibold text-[#1F241E]">
              Studio Admin Login
            </h1>
          </div>
          <p className="mt-2 text-sm text-[#5B6458]">
            Sign in to upload artwork, edit prices and variations, manage inventory, and fulfill
            customer orders.
          </p>

          {usingDefaultPassword && (
            <div className="mt-4 rounded-lg border border-[#DDD4C4] bg-[#F4EFE4] p-3 text-xs leading-relaxed text-[#5B6458]">
              Starter studio password active (no <code className="text-[#1F241E]">ADMIN_PASSWORD</code> env
              secret set yet): use <strong className="text-[#1F241E]">balentine-studio</strong> and
              change it inside Settings.
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <div>
              <label htmlFor="admin-pw" className="block text-xs font-medium text-[#1F241E]">
                Studio Password
              </label>
              <input
                id="admin-pw"
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="mt-1.5 min-h-[42px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3.5 text-sm"
              />
            </div>

            {loginError && (
              <p role="alert" className="text-xs text-[#9A3412]">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="min-h-[44px] w-full rounded-lg bg-[#24402E] px-5 py-2.5 text-sm font-medium text-[#FBF8F1] hover:bg-[#1B3123] disabled:opacity-60"
            >
              {loggingIn ? 'Verifying...' : 'Enter Studio Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="paper-grain min-h-[75vh]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 border-b border-[#DDD4C4] pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium tracking-widest uppercase text-[#5E7C64]">
              Protected Workspace
            </p>
            <h1 className="mt-1 font-serif text-3xl font-semibold text-[#1F241E] sm:text-4xl">
              Little Wild Things Studio Admin
            </h1>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-[40px] items-center gap-2 self-start rounded-lg border border-[#DDD4C4] bg-[#F4EFE4] px-4 py-2 text-xs font-medium text-[#1F241E] hover:bg-[#EFE8DA]"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 flex flex-wrap gap-1.5 rounded-lg bg-[#EFE8DA] p-1">
          {(
            [
              ['artworks', `Artworks (${adminArtworks.length})`],
              ['orders', `Orders (${orders.length})`],
              ['shipping', 'Shipping Rates'],
              ['inquiries', `Commissions & Emails (${inquiries.length})`],
              ['settings', 'Setup, Backups & Password'],
            ] as Array<[AdminTab, string]>
          ).map(([tabId, label]) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setActiveTab(tabId)}
              className={`min-h-[38px] rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === tabId
                  ? 'bg-[#FBF8F1] text-[#24402E] shadow-xs'
                  : 'text-[#5B6458] hover:text-[#1F241E]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {statusBanner && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#5E7C64] bg-[#F4EFE4] px-4 py-3 text-sm text-[#24402E]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{statusBanner}</span>
          </div>
        )}
        {errorBanner && (
          <div role="alert" className="mt-4 rounded-lg bg-[#9A3412]/10 px-4 py-3 text-sm text-[#9A3412]">
            {errorBanner}
          </div>
        )}

        {/* TAB 1: Artworks & Variations */}
        {activeTab === 'artworks' && (
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-12">
              <InventoryPanel
                token={token}
                onSaved={async () => {
                  await loadAdminData(token);
                  await onRefreshPublicCatalog();
                }}
              />
            </div>
            <div className="space-y-3 lg:col-span-4">
              <button
                type="button"
                onClick={startNewArtwork}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-[#24402E] px-4 py-2 text-sm font-medium text-[#FBF8F1] hover:bg-[#1B3123]"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Artwork</span>
              </button>

              <div className="max-h-[640px] divide-y divide-[#DDD4C4] overflow-y-auto rounded-xl border border-[#DDD4C4] bg-[#FBF8F1]">
                {adminArtworks.map((art) => (
                  <button
                    key={art.id}
                    type="button"
                    onClick={() => populateEditor(art)}
                    className={`flex w-full items-center gap-3 p-3 text-left transition-colors ${
                      editingId === art.id ? 'bg-[#EFE8DA]' : 'hover:bg-[#F4EFE4]'
                    }`}
                  >
                    <img
                      src={art.imageUrl}
                      alt={art.title}
                      className="h-12 w-12 shrink-0 rounded border border-[#DDD4C4] object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#1F241E]">{art.title}</p>
                      <p className="text-xs text-[#5B6458] tabular-nums">
                        {art.category} · {art.variations.length} option{art.variations.length === 1 ? '' : 's'} · Stock {art.totalStock}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleSaveArtwork}
              className="space-y-6 rounded-xl border border-[#DDD4C4] bg-[#FBF8F1] p-6 lg:col-span-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DDD4C4] pb-4">
                <h2 className="font-serif text-2xl font-semibold text-[#1F241E]">
                  {editingId === 'new' ? 'New Artwork Listing' : `Editing: ${formTitle}`}
                </h2>
                {editingId !== 'new' && typeof editingId === 'number' && (
                  <div className="flex items-center gap-2">
                    {confirmDeleteId === editingId ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDeleteArtwork(editingId)}
                          className="rounded-lg bg-[#9A3412] px-3 py-1.5 text-xs font-medium text-white"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg border border-[#DDD4C4] px-3 py-1.5 text-xs"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(editingId)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#DDD4C4] px-3 py-1.5 text-xs text-[#9A3412] hover:bg-[#9A3412]/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Image Upload & Preview */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-center">
                <div className="sm:col-span-4">
                  <div className="aspect-[4/3] overflow-hidden rounded-lg border border-[#DDD4C4] bg-[#EFE8DA]">
                    {formImageUrl ? (
                      <img
                        src={formImageUrl}
                        alt="Artwork preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-[#5B6458]">
                        No image selected
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2.5 sm:col-span-8">
                  <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg border border-[#24402E] px-4 py-2 text-xs font-medium text-[#24402E] hover:bg-[#EFE8DA]">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploadingImage ? 'Uploading...' : 'Upload New Photo'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleImageUpload}
                      className="sr-only"
                    />
                  </label>

                  <div>
                    <label htmlFor="art-img-url" className="block text-xs font-medium text-[#5B6458]">
                      Or Image Path / URL *
                    </label>
                    <input
                      id="art-img-url"
                      type="text"
                      required
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      className="mt-1 min-h-[38px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Core Details */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-[#1F241E]">Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1F241E]">
                    Shareable URL Slug
                  </label>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="auto-generated-from-title"
                    className="mt-1 min-h-[40px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1F241E]">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ArtworkCategory)}
                    className="mt-1 min-h-[40px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3 text-sm"
                  >
                    <option value="painting">Original Painting</option>
                    <option value="aceo">ACEO Mini Card</option>
                    <option value="sticker">Stickers &amp; Prints</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1F241E]">Medium</label>
                  <input
                    type="text"
                    value={formMedium}
                    onChange={(e) => setFormMedium(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1F241E]">
                    Dimensions Summary
                  </label>
                  <input
                    type="text"
                    value={formDimensions}
                    onChange={(e) => setFormDimensions(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1F241E]">Year</label>
                  <input
                    type="text"
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="mt-1 min-h-[40px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1F241E]">Description</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 p-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1F241E]">Artist Note</label>
                <input
                  type="text"
                  value={formArtistNote}
                  onChange={(e) => setFormArtistNote(e.target.value)}
                  className="mt-1 min-h-[40px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3 text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-5 text-xs font-medium text-[#1F241E]">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formPublished}
                    onChange={(e) => setFormPublished(e.target.checked)}
                    className="h-4 w-4 accent-[#24402E]"
                  />
                  <span>Published on Store</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                    className="h-4 w-4 accent-[#24402E]"
                  />
                  <span>Featured on Homepage</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formSoldArchive}
                    onChange={(e) => setFormSoldArchive(e.target.checked)}
                    className="h-4 w-4 accent-[#24402E]"
                  />
                  <span>Move to Sold Works Archive</span>
                </label>
              </div>

              {/* Variations, Sizes, Pack Options, Prices & Stock */}
              <div className="border-t border-[#DDD4C4] pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl font-semibold text-[#1F241E]">
                    Prices, Editions &amp; Variations
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setFormVariations((prev) => [
                        ...prev,
                        {
                          label: 'Archival Print (8 × 10 in)',
                          optionKind: 'print',
                          size: '8 × 10 in',
                          packQuantity: 1,
                          isOneOfAKind: false,
                          sku: `BA-VAR-${Date.now().toString().slice(-4)}`,
                          priceCents: 2800,
                          stock: 10,
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-[#24402E] px-3 py-1.5 text-xs font-medium text-[#24402E] hover:bg-[#EFE8DA]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Variation</span>
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  {formVariations.map((v, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 gap-3 rounded-lg border border-[#DDD4C4] bg-[#F4EFE4] p-3.5 sm:grid-cols-12"
                    >
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-medium text-[#5B6458]">
                          Option Label
                        </label>
                        <input
                          type="text"
                          required
                          value={v.label}
                          onChange={(e) => {
                            const next = [...formVariations];
                            next[idx] = { ...v, label: e.target.value };
                            setFormVariations(next);
                          }}
                          className="mt-1 min-h-[36px] w-full rounded border border-[#DDD4C4] bg-[#FBF8F1] px-2.5 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-medium text-[#5B6458]">
                          Option Kind
                        </label>
                        <select
                          value={v.optionKind}
                          onChange={(e) => {
                            const next = [...formVariations];
                            next[idx] = {
                              ...v,
                              optionKind: e.target.value as VariationOptionKind,
                            };
                            setFormVariations(next);
                          }}
                          className="mt-1 min-h-[36px] w-full rounded border border-[#DDD4C4] bg-[#FBF8F1] px-2 text-xs"
                        >
                          <option value="original">Original</option>
                          <option value="print">Print Size</option>
                          <option value="sticker">Sticker / Pack</option>
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-medium text-[#5B6458]">
                          Size / Dimensions
                        </label>
                        <input
                          type="text"
                          value={v.size}
                          onChange={(e) => {
                            const next = [...formVariations];
                            next[idx] = { ...v, size: e.target.value };
                            setFormVariations(next);
                          }}
                          className="mt-1 min-h-[36px] w-full rounded border border-[#DDD4C4] bg-[#FBF8F1] px-2.5 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-medium text-[#5B6458]">
                          Price (USD $)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={(v.priceCents / 100).toFixed(2)}
                          onChange={(e) => {
                            const next = [...formVariations];
                            next[idx] = {
                              ...v,
                              priceCents: Math.round(Number(e.target.value || 0) * 100),
                            };
                            setFormVariations(next);
                          }}
                          className="mt-1 min-h-[36px] w-full rounded border border-[#DDD4C4] bg-[#FBF8F1] px-2.5 text-xs tabular-nums"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-[#5B6458]">
                          Stock
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={v.stock}
                          onChange={(e) => {
                            const next = [...formVariations];
                            next[idx] = { ...v, stock: Math.max(0, Number(e.target.value || 0)) };
                            setFormVariations(next);
                          }}
                          className="mt-1 min-h-[36px] w-full rounded border border-[#DDD4C4] bg-[#FBF8F1] px-2.5 text-xs tabular-nums"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-[#5B6458]">
                          Pack Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={v.packQuantity}
                          onChange={(e) => {
                            const next = [...formVariations];
                            next[idx] = {
                              ...v,
                              packQuantity: Math.max(1, Number(e.target.value || 1)),
                            };
                            setFormVariations(next);
                          }}
                          className="mt-1 min-h-[36px] w-full rounded border border-[#DDD4C4] bg-[#FBF8F1] px-2.5 text-xs tabular-nums"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-medium text-[#5B6458]">SKU</label>
                        <input
                          type="text"
                          value={v.sku}
                          onChange={(e) => {
                            const next = [...formVariations];
                            next[idx] = { ...v, sku: e.target.value };
                            setFormVariations(next);
                          }}
                          className="mt-1 min-h-[36px] w-full rounded border border-[#DDD4C4] bg-[#FBF8F1] px-2.5 text-xs"
                        />
                      </div>

                      <div className="flex items-end justify-between gap-2 sm:col-span-2">
                        <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#1F241E]">
                          <input
                            type="checkbox"
                            checked={v.isOneOfAKind}
                            onChange={(e) => {
                              const next = [...formVariations];
                              next[idx] = { ...v, isOneOfAKind: e.target.checked };
                              setFormVariations(next);
                            }}
                            className="h-3.5 w-3.5 accent-[#24402E]"
                          />
                          <span>1-of-1</span>
                        </label>
                        {formVariations.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setFormVariations((prev) => prev.filter((_, i) => i !== idx))
                            }
                            aria-label="Remove variation"
                            className="text-xs text-[#9A3412] hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={savingArtwork}
                className="min-h-[44px] rounded-lg bg-[#24402E] px-6 py-2.5 text-sm font-medium text-[#FBF8F1] hover:bg-[#1B3123] disabled:opacity-60"
              >
                {savingArtwork ? 'Saving...' : 'Save Artwork & Prices'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: Orders & Fulfillment */}
        {activeTab === 'orders' && (
          <div className="mt-8 space-y-5">
            {orders.length === 0 ? (
              <div className="rounded-xl border border-[#DDD4C4] bg-[#FBF8F1] p-10 text-center text-sm text-[#5B6458]">
                No orders yet. Verified Square orders will appear here with shipping details and
                tracking controls.
              </div>
            ) : (
              orders.map((order) => (
                <OrderAdminCard key={order.id} order={order} onSave={handleUpdateOrder} />
              ))
            )}
          </div>
        )}

        {/* TAB 3: Shipping Rates */}
        {activeTab === 'shipping' && (
          <form
            onSubmit={handleSaveShippingRates}
            className="mt-8 space-y-4 rounded-xl border border-[#DDD4C4] bg-[#FBF8F1] p-6"
          >
            <h2 className="font-serif text-2xl font-semibold text-[#1F241E]">
              Configurable Studio Shipping Rates
            </h2>
            <p className="text-sm text-[#5B6458]">
              Changes apply immediately to Cart calculations and the Shipping &amp; Returns page.
            </p>

            <div className="space-y-4">
              {shippingRates.map((rate, idx) => (
                <div
                  key={rate.id}
                  className="grid grid-cols-1 gap-4 rounded-lg border border-[#DDD4C4] bg-[#F4EFE4] p-4 sm:grid-cols-12"
                >
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-medium text-[#5B6458]">Rate Name</label>
                    <input
                      type="text"
                      value={rate.name}
                      onChange={(e) => {
                        const next = [...shippingRates];
                        next[idx] = { ...rate, name: e.target.value };
                        setShippingRates(next);
                      }}
                      className="mt-1 min-h-[38px] w-full rounded border border-[#DDD4C4] bg-[#FBF8F1] px-3 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#5B6458]">Flat Rate ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={(rate.flatRateCents / 100).toFixed(2)}
                      onChange={(e) => {
                        const next = [...shippingRates];
                        next[idx] = {
                          ...rate,
                          flatRateCents: Math.round(Number(e.target.value || 0) * 100),
                        };
                        setShippingRates(next);
                      }}
                      className="mt-1 min-h-[38px] w-full rounded border border-[#DDD4C4] bg-[#FBF8F1] px-3 text-sm tabular-nums"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#5B6458]">
                      Free Above ($)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={rate.freeAboveCents !== null ? (rate.freeAboveCents / 100).toFixed(0) : ''}
                      placeholder="None"
                      onChange={(e) => {
                        const next = [...shippingRates];
                        next[idx] = {
                          ...rate,
                          freeAboveCents:
                            e.target.value === '' ? null : Math.round(Number(e.target.value) * 100),
                        };
                        setShippingRates(next);
                      }}
                      className="mt-1 min-h-[38px] w-full rounded border border-[#DDD4C4] bg-[#FBF8F1] px-3 text-sm tabular-nums"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-[#5B6458]">Transit Window</label>
                    <input
                      type="text"
                      value={rate.estimatedDays}
                      onChange={(e) => {
                        const next = [...shippingRates];
                        next[idx] = { ...rate, estimatedDays: e.target.value };
                        setShippingRates(next);
                      }}
                      className="mt-1 min-h-[38px] w-full rounded border border-[#DDD4C4] bg-[#FBF8F1] px-3 text-sm"
                    />
                  </div>
                  <div className="flex items-end sm:col-span-1">
                    <label className="inline-flex min-h-[38px] items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={rate.active}
                        onChange={(e) => {
                          const next = [...shippingRates];
                          next[idx] = { ...rate, active: e.target.checked };
                          setShippingRates(next);
                        }}
                        className="h-4 w-4 accent-[#24402E]"
                      />
                      <span>On</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="min-h-[42px] rounded-lg bg-[#24402E] px-5 py-2 text-sm font-medium text-[#FBF8F1]"
            >
              Save Shipping Rates
            </button>
          </form>
        )}

        {/* TAB 4: Commissions & Email Subscribers */}
        {activeTab === 'inquiries' && (
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <h2 className="font-serif text-2xl font-semibold text-[#1F241E]">
                Custom Art Requests ({inquiries.length})
              </h2>
              {inquiries.length === 0 ? (
                <p className="rounded-xl border border-[#DDD4C4] bg-[#FBF8F1] p-6 text-sm text-[#5B6458]">
                  No commission requests submitted yet.
                </p>
              ) : (
                inquiries.map((inq) => (
                  <div
                    key={inq.id}
                    className="rounded-xl border border-[#DDD4C4] bg-[#FBF8F1] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium text-[#1F241E]">
                          {inq.subject ? `${inq.subject} — ` : ''}
                          {inq.name} · <span className="text-[#5B6458]">{inq.email}</span>
                        </h3>
                        <p className="mt-0.5 text-xs text-[#5B6458]">
                          {inq.artType} · {inq.preferredSize} · {inq.budgetRange}
                          {inq.subscribedToUpdates ? ' · Opted into email drops' : ''}
                          {inq.emailStatus ? ` · Email: ${inq.emailStatus}` : ''}
                        </p>
                      </div>
                      <select
                        value={inq.status}
                        onChange={(e) =>
                          handleInquiryStatus(inq.id, e.target.value as CommissionInquiry['status'])
                        }
                        className="min-h-[36px] rounded border border-[#DDD4C4] bg-[#F4EFE4] px-2.5 text-xs font-medium"
                      >
                        <option value="new">New</option>
                        <option value="reviewing">Reviewing</option>
                        <option value="quoted">Quoted</option>
                        <option value="completed">Completed</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-[#1F241E]">{inq.message}</p>
                  </div>
                ))
              )}
            </div>

            <div className="lg:col-span-4">
              <h2 className="font-serif text-2xl font-semibold text-[#1F241E]">
                Email Subscribers ({subscribers.length})
              </h2>
              <div className="mt-4 divide-y divide-[#DDD4C4] rounded-xl border border-[#DDD4C4] bg-[#FBF8F1]">
                {subscribers.length === 0 ? (
                  <p className="p-5 text-sm text-[#5B6458]">No email subscribers yet.</p>
                ) : (
                  subscribers.map((sub) => (
                    <div key={sub.id} className="p-3.5 text-xs">
                      <p className="font-medium text-[#1F241E]">{sub.email}</p>
                      <p className="text-[#5B6458]">
                        {sub.name ? `${sub.name} · ` : ''}
                        via {sub.source}
                        {sub.status ? ` · ${sub.status}` : ''}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Production Readiness, Backups & Password */}
        {activeTab === 'settings' && (
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-[#DDD4C4] bg-[#FBF8F1] p-6">
              <h2 className="font-serif text-2xl font-semibold text-[#1F241E]">
                External Integrations &amp; Launch Readiness
              </h2>
              <p className="text-xs leading-relaxed text-[#5B6458]">
                Unconfigured external services remain honestly flagged below and are never simulated.
              </p>

              {integrations && (
                <dl className="divide-y divide-[#DDD4C4] text-sm">
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-[#5B6458]">Database Storage</dt>
                    <dd className="font-medium text-[#24402E]">{integrations.database.engine}</dd>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-[#5B6458]">Square Checkout ({integrations.square.environment})</dt>
                    <dd
                      className={`font-medium ${
                        integrations.square.checkoutConfigured ? 'text-[#24402E]' : 'text-[#B56A3B]'
                      }`}
                    >
                      {integrations.square.checkoutConfigured
                        ? 'Configured'
                        : 'Setup Required (SQUARE_ACCESS_TOKEN & SQUARE_LOCATION_ID)'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-[#5B6458]">Square Webhook Verification</dt>
                    <dd
                      className={`font-medium ${
                        integrations.square.webhookConfigured ? 'text-[#24402E]' : 'text-[#B56A3B]'
                      }`}
                    >
                      {integrations.square.webhookConfigured
                        ? 'Configured'
                        : 'Setup Required (SQUARE_WEBHOOK_SIGNATURE_KEY)'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-[#5B6458]">Contact, Order &amp; Tracking Emails (Resend API)</dt>
                    <dd
                      className={`text-right font-medium ${
                        integrations.resendEmail.configured &&
                        integrations.resendEmail.contactNotificationEmailConfigured
                          ? 'text-[#24402E]'
                          : 'text-[#B56A3B]'
                      }`}
                    >
                      {!integrations.resendEmail.configured
                        ? 'Setup Required (RESEND_API_KEY)'
                        : !integrations.resendEmail.contactNotificationEmailConfigured
                        ? 'RESEND_API_KEY Active · Add CONTACT_NOTIFICATION_EMAIL'
                        : 'Resend API & Contact Notification Configured'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-[#5B6458]">Newsletter Double Opt-In (Resend Segments)</dt>
                    <dd
                      className={`text-right font-medium ${
                        integrations.resendEmail.configured &&
                        integrations.resendEmail.newsletterContactsConfigured &&
                        integrations.resendEmail.newsletterSegmentConfigured
                          ? 'text-[#24402E]'
                          : 'text-[#B56A3B]'
                      }`}
                    >
                      {integrations.resendEmail.configured &&
                      integrations.resendEmail.newsletterContactsConfigured &&
                      integrations.resendEmail.newsletterSegmentConfigured
                        ? 'Configured (Contacts & Segment Active)'
                        : 'Setup Required (RESEND_CONTACTS_API_KEY & RESEND_NEWSLETTER_SEGMENT_ID)'}
                    </dd>
                  </div>
                </dl>
              )}

              <div className="border-t border-[#DDD4C4] pt-4">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-[#24402E] px-4 py-2 text-sm font-medium text-[#24402E] hover:bg-[#EFE8DA]"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Catalog &amp; Orders Backup (.json)</span>
                </button>
              </div>
            </div>

            <form
              onSubmit={handleChangePassword}
              className="space-y-4 rounded-xl border border-[#DDD4C4] bg-[#FBF8F1] p-6 self-start"
            >
              <h2 className="font-serif text-2xl font-semibold text-[#1F241E]">
                Change Studio Password
              </h2>
              <div>
                <label className="block text-xs font-medium text-[#1F241E]">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1 min-h-[40px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1F241E]">
                  New Password (min 8 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 min-h-[40px] w-full rounded-lg border border-[#DDD4C4] bg-[#F4EFE4]/60 px-3 text-sm"
                />
              </div>
              <button
                type="submit"
                className="min-h-[42px] rounded-lg bg-[#24402E] px-5 py-2 text-sm font-medium text-[#FBF8F1]"
              >
                Update Password
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderAdminCard({
  order,
  onSave,
}: {
  order: OrderRecord;
  onSave: (
    order: OrderRecord,
    updates: {
      fulfillmentStatus: OrderRecord['fulfillmentStatus'];
      carrier: string;
      trackingNumber: string;
      sendTrackingEmail: boolean;
    }
  ) => Promise<void>;
}) {
  const [fulfillmentStatus, setFulfillmentStatus] = useState(order.fulfillmentStatus);
  const [carrier, setCarrier] = useState(order.carrier || 'USPS');
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [saving, setSaving] = useState(false);

  const submit = async (sendTrackingEmail: boolean) => {
    setSaving(true);
    await onSave(order, {
      fulfillmentStatus,
      carrier,
      trackingNumber,
      sendTrackingEmail,
    });
    setSaving(false);
  };

  return (
    <div className="rounded-xl border border-[#DDD4C4] bg-[#FBF8F1] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#DDD4C4] pb-4">
        <div>
          <p className="font-serif text-xl font-semibold text-[#1F241E]">
            {order.orderNumber} · {order.customerName}
          </p>
          <p className="text-xs text-[#5B6458]">
            {order.customerEmail} · Payment:{' '}
            <strong
              className={
                order.paymentStatus === 'paid' ? 'text-[#24402E]' : 'text-[#B56A3B]'
              }
            >
              {order.paymentStatus}
            </strong>
          </p>
        </div>
        <div className="text-right">
          <p className="text-base font-semibold text-[#1F241E] tabular-nums">
            {formatMoney(order.totalCents)}
          </p>
          <p className="text-xs text-[#5B6458]">{order.shippingRateName}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="text-xs text-[#5B6458] lg:col-span-5">
          <p className="font-medium text-[#1F241E]">Items &amp; Address</p>
          <ul className="mt-1 space-y-1">
            {order.items.map((item) => (
              <li key={item.id}>
                {item.title_snapshot} ({item.variation_snapshot}) ×{item.quantity}
              </li>
            ))}
          </ul>
          <p className="mt-2">
            {order.shippingAddress.line1}, {order.shippingAddress.city},{' '}
            {order.shippingAddress.state} {order.shippingAddress.postalCode}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-7">
          <div>
            <label className="block text-[11px] font-medium text-[#5B6458]">Fulfillment</label>
            <select
              value={fulfillmentStatus}
              onChange={(e) =>
                setFulfillmentStatus(e.target.value as OrderRecord['fulfillmentStatus'])
              }
              className="mt-1 min-h-[36px] w-full rounded border border-[#DDD4C4] bg-[#F4EFE4] px-2 text-xs"
            >
              <option value="unfulfilled">Unfulfilled</option>
              <option value="packed">Packed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#5B6458]">Carrier</label>
            <input
              type="text"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="mt-1 min-h-[36px] w-full rounded border border-[#DDD4C4] bg-[#F4EFE4] px-2.5 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#5B6458]">
              Tracking Number
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="9400..."
              className="mt-1 min-h-[36px] w-full rounded border border-[#DDD4C4] bg-[#F4EFE4] px-2.5 text-xs"
            />
          </div>
          <div className="flex items-end gap-2 sm:col-span-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => submit(false)}
              className="min-h-[36px] flex-1 rounded bg-[#24402E] px-3 text-xs font-medium text-[#FBF8F1]"
            >
              Save
            </button>
            <button
              type="button"
              disabled={saving || order.paymentStatus !== 'paid'}
              onClick={() => submit(true)}
              className="min-h-[36px] rounded border border-[#24402E] px-2.5 text-xs font-medium text-[#24402E] disabled:opacity-40"
              title="Only enabled for verified paid orders"
            >
              Save &amp; Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

