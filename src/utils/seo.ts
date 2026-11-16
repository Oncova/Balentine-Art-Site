export interface SeoMetadataInput {
  title: string;
  description: string;
  imageUrl?: string;
  jsonLd?: Record<string, unknown>;
}

function setMetaTag(attrName: 'name' | 'property', key: string, value: string) {
  let el = document.querySelector(`meta[${attrName}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

export function updatePageSeo({ title, description, imageUrl, jsonLd }: SeoMetadataInput) {
  document.title = title;
  setMetaTag('name', 'description', description);
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:url', window.location.origin + window.location.pathname);
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', description);

  if (imageUrl) {
    const absImage = imageUrl.startsWith('http')
      ? imageUrl
      : `${window.location.origin}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    setMetaTag('property', 'og:image', absImage);
    setMetaTag('name', 'twitter:image', absImage);
  }

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', window.location.origin + window.location.pathname);

  if (jsonLd) {
    let script = document.getElementById('balentine-jsonld');
    if (!script) {
      script = document.createElement('script');
      script.id = 'balentine-jsonld';
      script.setAttribute('type', 'application/ld+json');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);
  }
}
