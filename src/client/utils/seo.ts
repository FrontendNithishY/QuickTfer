export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface SEOProps {
  title: string;
  description: string;
  canonicalPath: string;
  breadcrumbs?: BreadcrumbItem[];
  faqs?: FAQItem[];
  extraJsonLd?: Record<string, any>;
}

export function updateSEO({
  title,
  description,
  canonicalPath,
  breadcrumbs,
  faqs,
  extraJsonLd
}: SEOProps) {
  // 1. Title Tag
  document.title = title;

  // 2. Meta Description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute("content", description);
  }

  // 3. Canonical URL
  const fullUrl = `https://quicktrfr.vercel.app${canonicalPath}`;
  let canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.setAttribute("href", fullUrl);
  }

  // 4. OpenGraph
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", title);

  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute("content", description);

  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute("content", fullUrl);

  // 5. Twitter Cards
  let twTitle = document.querySelector('meta[name="twitter:title"]');
  if (twTitle) twTitle.setAttribute("content", title);

  let twDesc = document.querySelector('meta[name="twitter:description"]');
  if (twDesc) twDesc.setAttribute("content", description);

  // 6. Dynamic JSON-LD Structured Data
  const existingDynamic = document.getElementById("dynamic-seo-jsonld");
  if (existingDynamic) {
    existingDynamic.remove();
  }

  const jsonLdGraph: any[] = [];

  // WebPage Schema
  jsonLdGraph.push({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": title,
    "description": description,
    "url": fullUrl,
    "inLanguage": "en-US",
    "isPartOf": {
      "@type": "WebSite",
      "name": "QuickTrfr",
      "url": "https://quicktrfr.vercel.app"
    }
  });

  // BreadcrumbList Schema
  if (breadcrumbs && breadcrumbs.length > 0) {
    jsonLdGraph.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs.map((crumb, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "name": crumb.name,
        "item": crumb.url.startsWith("http") ? crumb.url : `https://quicktrfr.vercel.app${crumb.url}`
      }))
    });
  }

  // FAQPage Schema
  if (faqs && faqs.length > 0) {
    jsonLdGraph.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    });
  }

  if (extraJsonLd) {
    jsonLdGraph.push(extraJsonLd);
  }

  const script = document.createElement("script");
  script.id = "dynamic-seo-jsonld";
  script.type = "application/ld+json";
  script.text = JSON.stringify(jsonLdGraph);
  document.head.appendChild(script);
}
