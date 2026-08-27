# Bizde Cloudflare Edge Worker (GEO & SEO 200 OK Router)

Bu Cloudflare Worker, `bizde.app` üzerindeki tek sayfa uygulama (SPA) rotalarını ve AI arama botlarını (Googlebot, GPTBot, PerplexityBot, ClaudeBot vb.) Edge üzerinde yönetir.

## Özellikler
1. **HTTP 200 OK SPA Routing**: `/tender/:id` gibi derin linklere doğrudan gelen isteklerde GitHub Pages'in 404 dönmesini engeller ve 200 OK ile `index.html` döner.
2. **AI & Arama Motoru Edge SSR**: Googlebot veya GPTBot `/tender/123` sayfasına girdiğinde:
   - `api.bizde.app/v1/tenders/123` API'sinden ilan başlığını, fiyatını, açıklamasını ve fotoğraflarını çeker.
   - HTML `<head>` içindeki `<title>`, Open Graph, Twitter kartları ve `Schema.org Product` JSON-LD'sini dinamik olarak doldurur.
   - `<body>` içerisine botların JS çalıştırmadan anında indeksleyebileceği anlamsal HTML metnini (`<h1>`, fiyat, özellikler tablosu) enjekte eder.
3. **Statik Dosya Passthrough**: CSS, JS, fontlar, görseller, `robots.txt`, `sitemap.xml`, `llms.txt` ve `help/` gibi statik sayfaları doğrudan origin'e iletir.

---

## Dağıtım Seçenekleri

### Seçenek 1: Cloudflare Dashboard Üzerinden (En Kolay)
1. [Cloudflare Dashboard](https://dash.cloudflare.com)'a giriş yapın.
2. **Workers & Pages** > **Create Application** > **Create Worker** adımlarını izleyin.
3. Worker adını `bizde-edge-worker` yapın ve **Deploy**'a tıklayın.
4. **Edit Code** diyerek `cloudflare/worker.js` içeriğini kopyalayıp yapıştırın ve **Save and Deploy** yapın.
5. **Websites** > `bizde.app` > **Workers Routes** sekmesine gidin:
   - **Add Route**: `   `
   - **Worker**: `bizde-edge-worker` seçin ve kaydedin.

### Seçenek 2: Wrangler CLI ile
```bash
cd cloudflare
npx wrangler login
npx wrangler deploy
```
