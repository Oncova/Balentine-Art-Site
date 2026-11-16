import { useCallback, useEffect, useState } from 'react';
import {
  Artwork,
  ArtworkCategory,
  ArtworkVariation,
  CartItem,
  ShippingRate,
} from './types/shop';
import { updatePageSeo } from './utils/seo';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { HomePage } from './pages/HomePage';
import { GalleryPage } from './pages/GalleryPage';
import { SoldWorksPage } from './pages/SoldWorksPage';
import { ArtworkDetailPage } from './pages/ArtworkDetailPage';
import { AboutPage } from './pages/AboutPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { CommissionsPage } from './pages/CommissionsPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AdminPage } from './pages/AdminPage';
import { NewsletterConfirmPage } from './pages/NewsletterConfirmPage';

const BAG_STORAGE_KEY = 'balentine_art_bag_v1';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const [selectedCategory, setSelectedCategory] = useState<'all' | ArtworkCategory>('all');

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState('');

  const [bagOpen, setBagOpen] = useState(false);
  const [bagItems, setBagItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(BAG_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(bagItems));
    } catch {
      // Ignore storage quota errors
    }
  }, [bagItems]);

  const fetchCatalog = useCallback(async () => {
    try {
      const [artRes, shipRes] = await Promise.all([
        fetch('/api/artworks'),
        fetch('/api/shipping-rates'),
      ]);
      if (artRes.ok) {
        const data = (await artRes.json()) as Artwork[];
        setArtworks(data);
        setCatalogError('');
      } else {
        setCatalogError('Unable to load studio artwork catalog.');
      }
      if (shipRes.ok) {
        setShippingRates((await shipRes.json()) as ShippingRate[]);
      }
    } catch {
      setCatalogError('Unable to connect to the studio catalog.');
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname || '/');
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Sync dynamic SEO & Schema.org tags per route
  useEffect(() => {
    if (currentPath.startsWith('/art/')) {
      const slug = currentPath.replace('/art/', '').split('?')[0];
      const art = artworks.find((a) => a.slug === slug);
      if (art) {
        updatePageSeo({
          title: `${art.title} – Little Wild Things`,
          description: art.description.slice(0, 155),
          imageUrl: art.imageUrl,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'VisualArtwork',
            name: art.title,
            artMedium: art.medium,
            description: art.description,
            creator: { '@type': 'Person', name: 'Jorja' },
            offers: art.variations.map((v) => ({
              '@type': 'Offer',
              price: (v.priceCents / 100).toFixed(2),
              priceCurrency: 'USD',
              availability:
                v.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            })),
          },
        });
        return;
      }
    }

    const routeSeo: Record<string, { title: string; description: string }> = {
      '/': {
        title: 'Little Wild Things – Woodland Artist Studio, Paintings & ACEOs',
        description:
          'Explore Little Wild Things by Jorja: one-of-a-kind acrylic paintings, 2.5x3.5 ACEO mini art cards, botanical & cat stickers, and custom commissions.',
      },
      '/gallery': {
        title: 'Artwork Gallery – Little Wild Things',
        description:
          'Browse original wildlife paintings, hand-painted ACEO mini cards, and weatherproof botanical & cat stickers by Jorja.',
      },
      '/sold': {
        title: 'Sold Works Archive – Little Wild Things',
        description:
          'View collected one-of-a-kind paintings and past editions from Little Wild Things, or request a similar custom piece.',
      },
      '/about': {
        title: 'About Jorja – Little Wild Things',
        description:
          'Step inside Jorja’s woodland studio and learn how her wetland acrylics, ACEO cards, and ink stickers are created.',
      },
      '/policies': {
        title: 'Shipping & Return Policies – Little Wild Things',
        description:
          'View studio shipping rates, archival packaging care, transit windows, and return policies at Little Wild Things.',
      },
      '/commissions': {
        title: 'Contact & Custom Art Requests – Little Wild Things',
        description:
          'Request a custom painting, ACEO card, or illustration from Jorja and join email notifications for new art drops.',
      },
      '/checkout': {
        title: 'Checkout – Little Wild Things',
        description: 'Complete your Little Wild Things purchase securely with verified Square payment.',
      },
      '/admin': {
        title: 'Studio Admin – Little Wild Things',
        description: 'Protected studio dashboard for managing Little Wild Things listings and orders.',
      },
      '/newsletter/confirm': {
        title: 'Confirm Studio Subscription – Little Wild Things',
        description: 'Confirm your email subscription for Little Wild Things studio notes and new art drops.',
      },
    };

    const meta = routeSeo[currentPath] || routeSeo['/'];
    updatePageSeo(meta);
  }, [currentPath, artworks]);

  const handleAddToBag = (
    artwork: Artwork,
    variation: ArtworkVariation,
    quantity: number
  ) => {
    if (!variation.id || variation.stock <= 0) return;

    setBagItems((prev) => {
      const existing = prev.find((i) => i.variationId === variation.id);
      if (existing) {
        const nextQty = Math.min(variation.stock, existing.quantity + quantity);
        return prev.map((i) =>
          i.variationId === variation.id ? { ...i, quantity: nextQty, maxStock: variation.stock } : i
        );
      }
      return [
        ...prev,
        {
          artworkId: artwork.id,
          slug: artwork.slug,
          title: artwork.title,
          category: artwork.category,
          imageUrl: artwork.imageUrl,
          variationId: variation.id!,
          variationLabel: variation.label,
          optionKind: variation.optionKind,
          size: variation.size,
          isOneOfAKind: variation.isOneOfAKind,
          unitPriceCents: variation.priceCents,
          maxStock: variation.stock,
          quantity: Math.min(variation.stock, quantity),
        },
      ];
    });
    setBagOpen(true);
  };

  const handleUpdateQty = (variationId: number, quantity: number) => {
    setBagItems((prev) =>
      prev.map((i) =>
        i.variationId === variationId
          ? { ...i, quantity: Math.max(1, Math.min(i.maxStock, quantity)) }
          : i
      )
    );
  };

  const handleRemoveItem = (variationId: number) => {
    setBagItems((prev) => prev.filter((i) => i.variationId !== variationId));
  };

  const totalBagCount = bagItems.reduce((sum, i) => sum + i.quantity, 0);

  const renderMainView = () => {
    if (catalogError && currentPath !== '/admin' && currentPath !== '/commissions') {
      return (
        <div className="paper-grain mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="font-serif text-2xl text-[#1F241E]">{catalogError}</p>
          <button
            type="button"
            onClick={fetchCatalog}
            className="mt-4 rounded-lg bg-[#24402E] px-5 py-2 text-sm font-medium text-[#FBF8F1]"
          >
            Retry
          </button>
        </div>
      );
    }

    if (currentPath === '/') {
      return (
        <HomePage
          artworks={artworks}
          onNavigate={navigate}
          onSelectCategory={setSelectedCategory}
        />
      );
    }

    if (currentPath === '/gallery') {
      return (
        <GalleryPage
          artworks={artworks}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onNavigate={navigate}
        />
      );
    }

    if (currentPath === '/sold') {
      return <SoldWorksPage artworks={artworks} onNavigate={navigate} />;
    }

    if (currentPath.startsWith('/art/')) {
      const slug = currentPath.replace('/art/', '').split('?')[0];
      const match = artworks.find((a) => a.slug === slug);
      return (
        <ArtworkDetailPage
          artwork={match}
          loading={loadingCatalog}
          onNavigate={navigate}
          onAddToBag={handleAddToBag}
        />
      );
    }

    if (currentPath === '/about') {
      return <AboutPage onNavigate={navigate} />;
    }

    if (currentPath === '/policies') {
      return <PoliciesPage shippingRates={shippingRates} onNavigate={navigate} />;
    }

    if (currentPath === '/commissions') {
      return <CommissionsPage />;
    }

    if (currentPath === '/checkout') {
      return (
        <CheckoutPage
          items={bagItems}
          onClearBag={() => setBagItems([])}
          onRefreshArtworks={fetchCatalog}
          onNavigate={navigate}
        />
      );
    }

    if (currentPath === '/admin') {
      return <AdminPage onRefreshPublicCatalog={fetchCatalog} />;
    }

    if (currentPath === '/newsletter/confirm') {
      return <NewsletterConfirmPage onNavigate={navigate} />;
    }

    return (
      <HomePage
        artworks={artworks}
        onNavigate={navigate}
        onSelectCategory={setSelectedCategory}
      />
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FBF8F1] text-[#1F241E]">
      <Navbar
        currentPath={currentPath}
        onNavigate={navigate}
        bagCount={totalBagCount}
        onOpenBag={() => setBagOpen(true)}
      />

      <main className="flex-1">{renderMainView()}</main>

      <Footer onNavigate={navigate} />

      <CartDrawer
        open={bagOpen}
        onClose={() => setBagOpen(false)}
        items={bagItems}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onCheckout={() => {
          setBagOpen(false);
          navigate('/checkout');
        }}
      />
    </div>
  );
}
