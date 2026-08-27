/**
 * ============================================================
 * BIZDE (bizde.app) - Cloudflare Worker
 * Edge Routing, SPA 200 OK Fallback & AI / Search Bot SSR Meta Injection
 * ============================================================
 * 
 * Bu worker:
 * 1. Statik dosyaları (assets, css, js, sitemap, robots, llms.txt vb.) doğrudan origin'e iletir.
 * 2. SPA rotalarında (/tender/:id gibi) normal kullanıcılar için 200 OK ile index.html döner.
 * 3. Arama motorları ve AI botları (Googlebot, GPTBot, PerplexityBot, ClaudeBot vb.) geldiğinde
 *    https://api.bizde.app/v1/tenders/:id API'sinden ilan verilerini çekerek <head> içindeki
 *    meta etiketlerini, Open Graph, Twitter kartlarını ve Schema.org Product JSON-LD'sini
 *    sunucu tarafında dinamik doldurup HTTP 200 OK ile döner.
 */

// Tanınan Arama Motoru ve AI Bot User-Agent Listesi
const CRAWLER_USER_AGENTS = [
  'googlebot',
  'googleother',
  'google-extended',
  'gptbot',
  'chatgpt-user',
  'perplexitybot',
  'claudebot',
  'claude-web',
  'anthropic-ai',
  'applebot',
  'applebot-extended',
  'bingbot',
  'yandexbot',
  'duckduckbot',
  'baiduspider',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'telegrambot',
  'discordbot',
  'slackbot',
  'bytespider',
  'ccbot',
  'diffbot'
];

const API_BASE_URL = 'https://api.bizde.app/v1';

function isCrawler(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return CRAWLER_USER_AGENTS.some(crawler => ua.includes(crawler));
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCurrency(amount) {
  if (amount === undefined || amount === null) return '0 ₺';
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0
    }).format(amount);
  } catch (e) {
    return `${amount} ₺`;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const userAgent = request.headers.get('user-agent') || '';

    // 1. Statik Dosyalar & Doğrudan Dizinler (Origin'den fetch edilir)
    const isStaticFile = /\.(js|css|png|jpg|jpeg|gif|svg|ico|json|webmanifest|txt|xml|woff|woff2|ttf|map)$/i.test(pathname);
    const isStaticDirectory = pathname.startsWith('/help') || 
                              pathname.startsWith('/privacy-policy') || 
                              pathname.startsWith('/account') || 
                              pathname.startsWith('/.well-known');

    if (isStaticFile || isStaticDirectory) {
      return fetch(request);
    }

    // 2. İlan Detay Sayfası (/tender/:id)
    const tenderMatch = pathname.match(/^\/tender\/([a-zA-Z0-9_-]+)/);

    if (tenderMatch) {
      const tenderId = tenderMatch[1];

      // Origin'den ana index.html'i al
      const originIndexUrl = new URL('/', url.origin);
      const originResponse = await fetch(originIndexUrl.toString(), {
        headers: request.headers
      });

      let html = await originResponse.text();

      // Bot ise API'den dinamik veriyi çekip <head> ve <body> içerisine enjekte et
      if (isCrawler(userAgent)) {
        try {
          const apiResponse = await fetch(`${API_BASE_URL}/tenders/${tenderId}`, {
            headers: { 'Accept': 'application/json' }
          });

          if (apiResponse.ok) {
            const apiJson = await apiResponse.json();
            const detail = apiJson.data || apiJson;

            const title = detail.title || 'Bizde İlanı';
            const rawDescription = detail.description || 'Türkiye\'nin ilan, teklif ve açık arttırma platformu Bizde.';
            const cleanDesc = rawDescription.replace(/<[^>]*>?/gm, '').trim();
            const price = detail.budget || 0;
            const priceFormatted = formatCurrency(price);
            const location = detail.location || [detail.city, detail.district].filter(Boolean).join(', ') || 'Türkiye';
            const pageUrl = `https://bizde.app/tender/${tenderId}`;
            
            // Görseller
            let images = [];
            if (Array.isArray(detail.images)) {
              images = detail.images.map(img => typeof img === 'string' ? img : img.url).filter(Boolean);
            } else if (Array.isArray(detail.imageUrls)) {
              images = detail.imageUrls;
            } else if (detail.imageUrl) {
              images = [detail.imageUrl];
            }
            if (images.length === 0) {
              images = ['https://cdn.bizde.app/images/category-images/app_logos/bizde_logo_dark_mode.png'];
            }
            const primaryImage = images[0];

            const pageTitle = `${title} - ${priceFormatted} (${location}) | Bizde`;
            const metaDesc = `${title} - ${priceFormatted}. ${cleanDesc.substring(0, 150)}... ${location} konumunda Bizde'de hemen inceleyin veya teklif verin.`;

            // Satıcı Bilgisi
            const sellerName = detail.user?.name || detail.userName || 'Bizde Kullanıcısı';

            // Kategori Bilgisi
            let categoryName = detail.categoryTitle || 'Genel';
            if (Array.isArray(detail.categories) && detail.categories.length > 0) {
              categoryName = detail.categories.map(c => c.title || c.name).filter(Boolean).join(' > ');
            }

            // JSON-LD Product Schema
            const productSchema = {
              "@context": "https://schema.org",
              "@type": "Product",
              "name": title,
              "description": cleanDesc.substring(0, 350),
              "image": images,
              "category": categoryName,
              "url": pageUrl,
              "offers": {
                "@type": "Offer",
                "price": price,
                "priceCurrency": "TRY",
                "availability": "https://schema.org/InStock",
                "url": pageUrl,
                "seller": {
                  "@type": "Person",
                  "name": sellerName
                }
              }
            };

            // HTML Meta Tag Replacements
            html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);
            html = html.replace(/<meta\s+name="title"\s+content=".*?"\s*\/?>/i, `<meta name="title" content="${escapeHtml(pageTitle)}" />`);
            html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i, `<meta name="description" content="${escapeHtml(metaDesc)}" />`);
            html = html.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i, `<link rel="canonical" href="${pageUrl}" />`);
            
            // Open Graph Replacements
            html = html.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i, `<meta property="og:title" content="${escapeHtml(pageTitle)}" />`);
            html = html.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i, `<meta property="og:description" content="${escapeHtml(metaDesc)}" />`);
            html = html.replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/i, `<meta property="og:url" content="${pageUrl}" />`);
            html = html.replace(/<meta\s+property="og:image"\s+content=".*?"\s*\/?>/i, `<meta property="og:image" content="${primaryImage}" />`);

            // Twitter Replacements
            html = html.replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:title" content="${escapeHtml(pageTitle)}" />`);
            html = html.replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:description" content="${escapeHtml(metaDesc)}" />`);
            html = html.replace(/<meta\s+name="twitter:image"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:image" content="${primaryImage}" />`);
            html = html.replace(/<meta\s+name="twitter:url"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:url" content="${pageUrl}" />`);

            // Inject Product Schema inside <head>
            const schemaTag = `<script type="application/ld+json" id="server-tender-jsonld">${JSON.stringify(productSchema)}</script>`;
            html = html.replace('</head>', `  ${schemaTag}\n</head>`);

            // Özellikler Tablosu (detailInfo)
            const detailInfo = Array.isArray(detail.detailInfo) ? detail.detailInfo : [];
            let detailInfoHtml = '';
            if (detailInfo.length > 0) {
              detailInfoHtml = `
                <h3>İlan Özellikleri</h3>
                <ul>
                  ${detailInfo.map(item => `<li><strong>${escapeHtml(item.detailName || item.key || 'Özellik')}:</strong> ${escapeHtml(item.detailValue || item.value || '-')}</li>`).join('\n')}
                </ul>
              `;
            }

            // Semantic HTML Body Injection (AI Botlarının JS çalıştırmadan tüm içeriği okuyabilmesi için)
            const botContent = `
              <article class="server-rendered-tender" style="max-width: 900px; margin: 20px auto; padding: 24px; font-family: sans-serif; background: #0B1120; color: #F1F5F9; border-radius: 12px;">
                <nav aria-label="Kategori Yolu" style="font-size: 14px; color: #94A3B8; margin-bottom: 12px;">
                  <a href="https://bizde.app/" style="color: #38BDF8;">Bizde Anasayfa</a> &gt; <span>${escapeHtml(categoryName)}</span>
                </nav>
                <h1 style="font-size: 26px; color: #FFFFFF; margin-bottom: 8px;">${escapeHtml(title)}</h1>
                <div style="font-size: 22px; font-weight: 700; color: #38BDF8; margin-bottom: 16px;">${escapeHtml(priceFormatted)}</div>
                <p style="color: #94A3B8; margin-bottom: 16px;">📍 <strong>Konum:</strong> ${escapeHtml(location)} | 👤 <strong>Satıcı:</strong> ${escapeHtml(sellerName)}</p>
                <div style="margin-bottom: 24px;">
                  <img src="${primaryImage}" alt="${escapeHtml(title)}" style="max-width: 100%; height: auto; border-radius: 8px; max-height: 500px; object-fit: cover;" />
                </div>
                <h3>Açıklama</h3>
                <p style="line-height: 1.6; color: #CBD5E1; white-space: pre-line;">${escapeHtml(cleanDesc)}</p>
                ${detailInfoHtml}
                <hr style="border: 0; border-top: 1px solid #334155; margin: 24px 0;" />
                <p><a href="https://bizde.app/download-app" style="display: inline-block; background: #2563EB; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">Bu İlana Teklif Ver / Uygulamayı İndir</a></p>
              </article>
            `;

            // Initial shimmer skeleton önüne bot içeriğini ekle
            html = html.replace('<!-- Initial Shimmer Skeleton -->', botContent + '\n      <!-- Initial Shimmer Skeleton -->');
          }
        } catch (apiErr) {
          console.error('API Error during Bot SSR injection:', apiErr);
        }
      }

      // 200 OK yanıtı ile dön
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=UTF-8',
          'Cache-Control': isCrawler(userAgent) ? 'public, max-age=300' : 'no-cache',
          'X-Handled-By': 'Bizde-Edge-Worker'
        }
      });
    }

    // 3. Genel SPA Fallback: Diğer tüm GET isteklerinde index.html'i 200 OK ile döndür
    if (request.method === 'GET') {
      const originIndexUrl = new URL('/', url.origin);
      const response = await fetch(originIndexUrl.toString(), {
        headers: request.headers
      });

      const html = await response.text();
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=UTF-8',
          'Cache-Control': 'no-cache',
          'X-Handled-By': 'Bizde-Edge-Worker'
        }
      });
    }

    // Diğer metodlar için origin'e ilet
    return fetch(request);
  }
};
