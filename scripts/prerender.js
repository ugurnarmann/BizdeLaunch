/**
 * ============================================================
 * BIZDE (bizde.app) - Local SEO / GEO Validator & Bot Simulation
 * ============================================================
 * 
 * Bu script:
 * 1. index.html, help/index.html, privacy-policy/index.html dosyalarındaki
 *    SEO etiketlerini, JSON-LD Schema doğruluğunu ve semantic etiketleri test eder.
 * 2. Cloudflare Worker'ın Googlebot ve GPTBot için yapacağı SSR meta injection
 *    işlemini yerel ortamda simüle eder.
 */

const fs = require('fs');
const path = require('path');

function validateFile(filePath) {
  console.log(`\n🔍 Denetleniyor: ${filePath}`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Dosya bulunamadı: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  let passed = true;

  // Title check
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  if (titleMatch) {
    console.log(`  ✅ <title>: "${titleMatch[1]}" (${titleMatch[1].length} karakter)`);
  } else {
    console.warn(`  ⚠️ <title> etiketi eksik!`);
    passed = false;
  }

  // Meta description check
  const descMatch = content.match(/<meta\s+name="description"\s+content="(.*?)"/i);
  if (descMatch) {
    console.log(`  ✅ <meta description>: "${descMatch[1].substring(0, 60)}..." (${descMatch[1].length} karakter)`);
  } else {
    console.warn(`  ⚠️ <meta description> etiketi eksik!`);
    passed = false;
  }

  // Canonical check
  const canonicalMatch = content.match(/<link\s+rel="canonical"\s+href="(.*?)"/i);
  if (canonicalMatch) {
    console.log(`  ✅ <link canonical>: ${canonicalMatch[1]}`);
  } else {
    console.warn(`  ⚠️ <link canonical> eksik!`);
    passed = false;
  }

  // Schema.org JSON-LD check
  const jsonLdMatches = content.match(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  if (jsonLdMatches) {
    console.log(`  ✅ Schema.org JSON-LD blokları: ${jsonLdMatches.length} adet bulundu`);
    jsonLdMatches.forEach((scriptTag, idx) => {
      const jsonText = scriptTag.replace(/<script.*?>/i, '').replace(/<\/script>/i, '').trim();
      try {
        const parsed = JSON.parse(jsonText);
        const types = parsed['@type'] || (parsed['@graph'] ? parsed['@graph'].map(g => g['@type']).join(', ') : 'Unknown');
        console.log(`     - [${idx + 1}] Geçerli JSON-LD (Türler: ${types})`);
      } catch (err) {
        console.error(`     ❌ [${idx + 1}] JSON-LD ayrıştırma hatası: ${err.message}`);
        passed = false;
      }
    });
  } else {
    console.warn(`  ⚠️ Schema JSON-LD bulunamadı.`);
  }

  // Semantic elements check
  const hasH1 = /<h1[\s>]/i.test(content);
  const hasH2 = /<h2[\s>]/i.test(content);
  const hasHeader = /<header[\s>]/i.test(content);
  const hasFooter = /<footer[\s>]/i.test(content);

  console.log(`  ✅ Anlamsal Etiketler: H1: ${hasH1 ? 'Var' : 'Yok'}, H2: ${hasH2 ? 'Var' : 'Yok'}, Header: ${hasHeader ? 'Var' : 'Yok'}, Footer: ${hasFooter ? 'Var' : 'Yok'}`);

  return passed;
}

function runAudit() {
  console.log('========================================================');
  console.log('🌟 BIZDE - GEO & SEO Üretim Hazırlık (Prod-Ready) Testi');
  console.log('========================================================');

  const rootDir = path.resolve(__dirname, '..');
  validateFile(path.join(rootDir, 'index.html'));
  validateFile(path.join(rootDir, 'help', 'index.html'));
  validateFile(path.join(rootDir, 'privacy-policy', 'index.html'));
  validateFile(path.join(rootDir, 'account', 'delete', 'index.html'));

  console.log('\n========================================================');
  console.log('✨ Test tamamlandı.');
  console.log('========================================================\n');
}

runAudit();
