/* ============================================================
   BIZDE – Flutter (BidzyMobile) 1:1 Complete Logic for Web
   Complete Tender Detail Page with Interactive Gallery & Logics
   ============================================================ */

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? '/v1' 
  : 'https://api.bizde.app/v1';

const DOWNLOAD_URL = 'https://bizde.app/download-app';

// DOM Elements
const appRoot = document.getElementById('app-root');
const headerBackBtn = document.getElementById('header-back-btn');
const fabAddTender = document.getElementById('fab-add-tender');
const downloadModal = document.getElementById('download-modal');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');

let globalMainPageData = null;
let heroCurrentIndex = 0;
let heroTimer = null;
let heroesList = [];

// Detail page state
let currentDetailData = null;
let currentDetailImageIndex = 0;

// ── COLOR & FORMAT HELPERS ───────────────────────────────
const parseColor = (colorHex, defaultColor = '#3B82F6') => {
  if (!colorHex) return defaultColor;
  let hex = colorHex.trim();
  if (hex.startsWith('FF') && hex.length === 8) {
    return '#' + hex.substring(2);
  }
  if (!hex.startsWith('#') && (hex.length === 6 || hex.length === 8)) {
    return '#' + (hex.length === 8 ? hex.substring(2) : hex);
  }
  return hex.startsWith('#') ? hex : defaultColor;
};

const hexToRgba = (hex, opacity = 1) => {
  let c = parseColor(hex).replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '0 ₺';
  return new Intl.NumberFormat('tr-TR', { 
    style: 'currency', 
    currency: 'TRY',
    maximumFractionDigits: 0 
  }).format(amount);
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatShortDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const calculateTimeRemaining = (deadlineStr) => {
  if (!deadlineStr) return 'Süre Belirtilmedi';
  const diff = new Date(deadlineStr) - new Date();
  if (diff <= 0) return 'Süresi Doldu';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  if (days > 0) return `${days} gün kaldı`;
  if (hours > 0) return `${hours} saat kaldı`;
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  return `${mins} dk kaldı`;
};

const getImage = (item) => {
  if (item?.companyLogo) return item.companyLogo;
  if (Array.isArray(item?.imageUrls) && item.imageUrls.length > 0) {
    return item.imageUrls[0];
  }
  if (Array.isArray(item?.images) && item.images.length > 0) {
    return item.images[0]?.url || item.images[0];
  }
  if (Array.isArray(item?.media) && item.media.length > 0) {
    return item.media[0]?.url || item.media[0];
  }
  if (item?.imageUrl) return item.imageUrl;
  return 'assets/images/bizde_logo_dark.png';
};

// Tender Type Icon & Count Rule
const getTenderTypeInfo = (type, bidCount) => {
  const t = String(type || '').trim().toLowerCase();
  
  if (t === 'bid' || t === '3' || t === 'offer' || t === 'teklif') {
    return {
      show: true,
      label: 'Teklif İlanı',
      icon: 'local_offer',
      count: bidCount !== undefined && bidCount !== null ? bidCount : 0
    };
  }
  
  if (t === 'auction' || t === '1' || t === 'açık arttırma' || t === 'acikarttirma') {
    return {
      show: true,
      label: 'Açık Arttırma',
      icon: 'gavel',
      count: bidCount !== undefined && bidCount !== null ? bidCount : 0
    };
  }
  
  return {
    show: false,
    label: 'Normal İlan',
    icon: '',
    count: null
  };
};

// ── SHIMMER SKELETON RENDERERS ───────────────────────────
const renderHomeSkeleton = () => {
  const cardSkeletons = Array(6).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-card-img shimmer"></div>
      <div class="skeleton-card-body">
        <div>
          <div class="skeleton-line title shimmer"></div>
          <div class="skeleton-line location shimmer"></div>
          <div class="skeleton-line badge shimmer"></div>
        </div>
        <div class="skeleton-card-bottom">
          <div class="skeleton-line meta shimmer"></div>
          <div class="skeleton-line price shimmer"></div>
        </div>
      </div>
    </div>
  `).join('');

  return `
    <div class="skeleton-hero shimmer"></div>
    <div class="skeleton-categories">
      ${Array(8).fill(0).map(() => `
        <div class="skeleton-cat-item">
          <div class="skeleton-cat-box shimmer"></div>
          <div class="skeleton-cat-text shimmer"></div>
        </div>
      `).join('')}
    </div>
    <div class="skeleton-section-title shimmer"></div>
    <div class="tenders-list-container">
      ${cardSkeletons}
    </div>
  `;
};

const renderDetailSkeleton = () => `
  <div class="detail-view-wrap">
    <div class="detail-hero-banner shimmer" style="background: #1e293b;"></div>
    <div class="detail-body">
      <div class="skeleton-line badge shimmer" style="width: 120px; height: 28px; margin-bottom: 14px; border-radius: 24px;"></div>
      <div class="skeleton-line title shimmer" style="width: 70%; height: 26px; margin-bottom: 12px;"></div>
      <div class="skeleton-line location shimmer" style="width: 40%; height: 16px; margin-bottom: 24px;"></div>
      <div class="detail-stats-grid">
        <div class="detail-stat-card shimmer" style="height: 64px;"></div>
        <div class="detail-stat-card shimmer" style="height: 64px;"></div>
        <div class="detail-stat-card shimmer" style="height: 64px;"></div>
      </div>
      <div class="detail-tabs-card shimmer" style="height: 180px; margin-top: 20px;"></div>
    </div>
  </div>
`;

// ── MODAL LOGIC ──────────────────────────────────────────
window.openDownloadModal = (actionName = '') => {
  if (actionName && actionName !== 'Uygulamayı İndir') {
    modalTitle.textContent = `${actionName} için İndirin`;
    modalDesc.textContent = `${actionName} işlemini gerçekleştirmek ve tüm fırsatlara erişmek için Bizde uygulamasını indirin.`;
  } else {
    modalTitle.textContent = 'Bizde Mobil Uygulaması';
    modalDesc.textContent = 'İlanları incelemek, hızlı teklif almak ve güvenle alım satım yapmak için uygulamamızı indirin.';
  }
  downloadModal.style.display = 'flex';
};

window.closeDownloadModal = (e) => {
  if (!e || e.target === downloadModal || e.target.classList.contains('modal-close-btn')) {
    downloadModal.style.display = 'none';
  }
};

// ── 1. API FETCHING ──────────────────────────────────────
const fetchMainPage = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/main-page`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error('Anasayfa verileri alınamadı.');
    const json = await res.json();
    return json.data || json;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

const fetchTenderDetail = async (id) => {
  try {
    const res = await fetch(`${API_BASE_URL}/tenders/${id}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error('İlan detayı alınamadı.');
    const json = await res.json();
    return json.data || json;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// ── 2. HERO CAROUSEL SLIDER (Flutter 1:1) ─────────────────
window.setHeroSlide = (index) => {
  if (heroesList.length === 0) return;
  heroCurrentIndex = (index + heroesList.length) % heroesList.length;
  
  const track = document.getElementById('hero-slider-track');
  if (track) {
    track.style.transform = `translateX(-${heroCurrentIndex * 100}%)`;
  }
  
  document.querySelectorAll('.hero-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === heroCurrentIndex);
  });

  resetHeroTimer();
};

const resetHeroTimer = () => {
  if (heroTimer) clearTimeout(heroTimer);
  if (heroesList.length <= 1) return;
  
  const currentHero = heroesList[heroCurrentIndex];
  const rawInterval = currentHero?.passInterval || 4;
  const interval = (rawInterval > 0 && rawInterval < 100) ? rawInterval * 1000 : 4000;

  heroTimer = setTimeout(() => {
    window.setHeroSlide(heroCurrentIndex + 1);
  }, interval);
};

const renderHeroCarousel = (heroes) => {
  if (!heroes || heroes.length === 0) return '';
  heroesList = heroes;
  heroCurrentIndex = 0;

  let slidesHtml = '';
  heroes.forEach((hero) => {
    const bgImg = hero.imageUrl || hero.image || '';
    const title = hero.title || '';
    const subTitle = hero.subTitle || '';
    const buttonTitle = hero.buttonTitle || '';

    slidesHtml += `
      <div class="hero-slide-item" style="background-image: url('${bgImg}');" onclick="openDownloadModal('${title}')">
        <div class="hero-gradient-overlay">
          <div class="hero-content-row">
            <div class="hero-text-col">
              ${subTitle ? `<span class="hero-subtitle-pill">${subTitle}</span>` : ''}
              <div class="hero-title-text">${title}</div>
            </div>
            ${buttonTitle ? `<button class="hero-btn-pill">${buttonTitle}</button>` : ''}
          </div>
        </div>
      </div>
    `;
  });

  let dotsHtml = '';
  heroes.forEach((_, index) => {
    dotsHtml += `<span class="hero-dot ${index === 0 ? 'active' : ''}" onclick="event.stopPropagation(); setHeroSlide(${index});"></span>`;
  });

  setTimeout(resetHeroTimer, 100);

  return `
    <div class="hero-carousel-wrap">
      <div class="hero-slider-track" id="hero-slider-track">
        ${slidesHtml}
      </div>
      <div class="hero-dots-container">
        ${dotsHtml}
      </div>
    </div>
  `;
};

// ── 3. CATEGORIES RENDERER (Flutter 1:1) ─────────────────
const renderCategories = (categories) => {
  if (!categories || categories.length === 0) return '';

  let html = `
    <div class="categories-header-wrap">
      <div class="categories-title-wrap">
        <span class="categories-accent-bar"></span>
        <h2 class="categories-title">Kategoriler</h2>
      </div>
      <button class="categories-see-all-btn" onclick="openDownloadModal('Tüm Kategoriler')">
        <span class="material-symbols-rounded" style="font-size: 15px; margin-right: 2px;">grid_view</span>
        Tümünü Gör
      </button>
    </div>
    <div class="categories-scroll-list">
  `;

  categories.forEach(cat => {
    const rawColor = parseColor(cat.color, '#3B82F6');
    const bgColor = hexToRgba(rawColor, 0.12);
    const borderColor = hexToRgba(rawColor, 0.2);
    const shadowColor = hexToRgba(rawColor, 0.15);
    const logoUrl = cat.logo || cat.imageUrl || 'assets/images/bizde_logo_dark.png';

    html += `
      <div class="category-card-item" onclick="openDownloadModal('Kategori: ${cat.name}')">
        <div class="category-icon-box" style="background-color: ${bgColor}; border: 1px solid ${borderColor}; box-shadow: 0 4px 10px ${shadowColor};">
          <img src="${logoUrl}" alt="${cat.name}" loading="lazy" />
        </div>
        <span class="category-name-text">${cat.name}</span>
      </div>
    `;
  });

  // End card: 'Tümü'
  html += `
      <div class="category-card-item" onclick="openDownloadModal('Tüm Kategoriler')">
        <div class="category-icon-box" style="background-color: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.2); box-shadow: 0 4px 10px rgba(59, 130, 246, 0.15);">
          <span class="material-symbols-rounded" style="font-size: 28px; color: #3B82F6;">grid_view</span>
        </div>
        <span class="category-name-text">Tümü</span>
      </div>
    </div>
  `;

  return html;
};

// ── 4. HORIZONTAL TENDER CARD (Exact Spacing & Hierarchy) ──
const renderTenderCard = (tender) => {
  const imgUrl = getImage(tender);
  const title = tender.title || 'İlan Başlığı';
  const location = tender.location || tender.cityName || 'Türkiye';
  const price = formatCurrency(tender.budget || tender.currentPrice || tender.price || 0);
  
  // Category Details Extraction
  const catObj = tender.categoryDetail || tender.categoryDetails || tender.category || {};
  const categoryTitle = catObj.title || tender.categoryTitle || 'Genel';
  const rawCatColor = parseColor(catObj.color || tender.categoryColor, '#3B82F6');
  const catBg = hexToRgba(rawCatColor, 0.12);
  const catBorder = hexToRgba(rawCatColor, 0.25);
  
  const expireTime = tender.expireTimeString || 'Aktif';
  const typeInfo = getTenderTypeInfo(tender.type, tender.bidCount);

  return `
    <div class="tender-card" onclick="window.location.hash = '#/tender/${tender.id}'">
      <div class="tender-card-image-wrap">
        <img src="${imgUrl}" alt="${title}" loading="lazy" />
      </div>
      <div class="tender-card-content">
        <div>
          <h3 class="tender-card-title">${title}</h3>
          <div class="tender-card-location">
            <span class="material-symbols-rounded" style="font-size: 13px; color: rgba(241, 245, 249, 0.45);">location_on</span>
            <span>${location}</span>
          </div>
          <div class="tender-card-category-badge" style="background-color: ${catBg}; border: 1px solid ${catBorder}; color: ${rawCatColor};">
            ${categoryTitle}
          </div>
        </div>
        
        <div class="tender-card-bottom-row">
          <div class="tender-card-meta-stats">
            <div class="tender-stat-entry">
              <span class="material-symbols-rounded" style="font-size: 13px; color: rgba(241, 245, 249, 0.5);">access_time</span>
              <span>${expireTime}</span>
            </div>
            ${typeInfo.show ? `
              <div class="tender-stat-entry">
                <span class="material-symbols-rounded" style="font-size: 13px; color: rgba(241, 245, 249, 0.5);">${typeInfo.icon}</span>
                <span>${typeInfo.count}</span>
              </div>
            ` : ''}
          </div>
          <div class="tender-price-tag">${price}</div>
        </div>
      </div>
    </div>
  `;
};

// Section Header Helper (Flutter 1:1 with Material Icons)
const renderSectionHeader = (title, iconName, iconColor) => {
  const bg = hexToRgba(iconColor, 0.12);
  return `
    <div class="section-header-box">
      <div class="section-header-left">
        <div class="section-icon-container" style="background-color: ${bg}; color: ${iconColor};">
          <span class="material-symbols-rounded" style="font-size: 18px;">${iconName}</span>
        </div>
        <h2 class="section-header-title">${title}</h2>
      </div>
      <button class="section-all-link" onclick="openDownloadModal('${title}')">
        <span>Tümü</span>
        <span class="material-symbols-rounded" style="font-size: 11px; margin-left: 2px;">arrow_forward_ios</span>
      </button>
    </div>
  `;
};

// ── 5. HOMEPAGE VIEW ─────────────────────────────────────
const renderHome = async () => {
  headerBackBtn.style.display = 'none';
  fabAddTender.style.display = 'flex';

  if (!globalMainPageData) {
    appRoot.innerHTML = renderHomeSkeleton();
  }

  try {
    if (!globalMainPageData) {
      globalMainPageData = await fetchMainPage();
    }
    
    const { 
      heroes = [], 
      categories = [], 
      lastAddedTenders = [], 
      hypeTenders = [], 
      discountedTenders = [] 
    } = globalMainPageData;

    let html = '';

    // 1. Hero Carousel Banner
    if (heroes.length > 0) {
      html += renderHeroCarousel(heroes);
    }

    // 2. Categories Horizontal Scroll
    if (categories.length > 0) {
      html += renderCategories(categories);
    }

    const recentList = lastAddedTenders;
    const hypeList = hypeTenders.length > 0 ? hypeTenders : lastAddedTenders;
    const discountedList = discountedTenders.length > 0 ? discountedTenders : lastAddedTenders;

    // 3. Son Eklenenler (Icons.new_releases_rounded)
    if (recentList.length > 0) {
      html += renderSectionHeader('Son Eklenenler', 'new_releases', '#3B82F6');
      html += `<div class="tenders-list-container">${recentList.map(renderTenderCard).join('')}</div>`;
    }

    // 4. En Çok Tıklananlar (Icons.local_fire_department_rounded)
    if (hypeList.length > 0) {
      html += renderSectionHeader('En Çok Tıklananlar', 'local_fire_department', '#F59E0B');
      html += `<div class="tenders-list-container">${hypeList.map(renderTenderCard).join('')}</div>`;
    }

    // 5. Fiyatı Düşenler (Icons.trending_down_rounded)
    if (discountedList.length > 0) {
      html += renderSectionHeader('Fiyatı Düşenler', 'trending_down', '#EF4444');
      html += `<div class="tenders-list-container">${discountedList.map(renderTenderCard).join('')}</div>`;
    }

    if (!html) {
      html = `<div class="empty-state"><p>Şu an aktif ilan bulunmuyor.</p></div>`;
    }

    appRoot.innerHTML = html;
  } catch (err) {
    appRoot.innerHTML = `
      <div class="error-state">
        <h3>Veriler Yüklenemedi</h3>
        <p>${err.message}</p>
        <button onclick="globalMainPageData=null; renderHome();" class="modal-btn-download" style="max-width: 200px; margin-top: 16px;">Tekrar Dene</button>
      </div>
    `;
  }
};

// ── 6. DETAIL VIEW & IMAGE GALLERY CONTROLLERS ───────────
window.setDetailImage = (index) => {
  if (!currentDetailData) return;
  const images = currentDetailData.imageUrls || [];
  if (images.length === 0) return;
  
  currentDetailImageIndex = (index + images.length) % images.length;
  
  const mainImg = document.getElementById('detail-main-img');
  if (mainImg) {
    mainImg.src = images[currentDetailImageIndex];
  }
  
  const counter = document.getElementById('detail-img-counter');
  if (counter) {
    counter.textContent = `${currentDetailImageIndex + 1} / ${images.length}`;
  }
  
  document.querySelectorAll('.detail-thumb-item').forEach((thumb, i) => {
    thumb.classList.toggle('active', i === currentDetailImageIndex);
  });
};

window.nextDetailImage = () => window.setDetailImage(currentDetailImageIndex + 1);
window.prevDetailImage = () => window.setDetailImage(currentDetailImageIndex - 1);

window.switchDetailTab = (tabName) => {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-content-pane').forEach(pane => {
    pane.style.display = 'none';
  });
  const activePane = document.getElementById(`tab-${tabName}-pane`);
  if (activePane) {
    activePane.style.display = 'block';
  }
};

window.copyShareLink = () => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(window.location.href);
    alert('İlan bağlantısı panoya kopyalandı!');
  }
};

const renderDetail = async (id) => {
  if (heroTimer) clearTimeout(heroTimer);
  headerBackBtn.style.display = 'flex';
  fabAddTender.style.display = 'none';

  appRoot.innerHTML = renderDetailSkeleton();
  window.scrollTo(0, 0);

  try {
    const detail = await fetchTenderDetail(id);
    currentDetailData = detail;
    currentDetailImageIndex = 0;

    const images = (Array.isArray(detail.imageUrls) && detail.imageUrls.length > 0)
      ? detail.imageUrls
      : [getImage(detail)];

    const title = detail.title || 'İlan Başlığı';
    
    // Breadcrumb & Category Info
    const breadcrumb = detail.categoryBreadcrumb || [];
    const mainCategory = breadcrumb.length > 0 ? breadcrumb[0] : (detail.categoryDetail || detail.category || {});
    const categoryTitle = mainCategory.title || detail.categoryTitle || 'Genel';
    const rawCatColor = parseColor(mainCategory.color, '#3B82F6');
    const catBg = hexToRgba(rawCatColor, 0.15);
    const catBorder = hexToRgba(rawCatColor, 0.3);

    // Location & Type
    const location = detail.location || detail.cityName || 'Türkiye';
    const typeInfo = getTenderTypeInfo(detail.type, detail.bidCount);
    
    // Pricing & Deadlines
    const budget = detail.budget || detail.currentPrice || detail.price || 0;
    const priceFormatted = formatCurrency(budget);
    const minBidFormatted = detail.minBidPrice ? formatCurrency(detail.minBidPrice) : null;
    const timeRemaining = calculateTimeRemaining(detail.deadline);
    const deadlineFormatted = detail.deadline ? formatDate(detail.deadline) : '-';
    const createdAtFormatted = detail.createdAt ? formatDate(detail.createdAt) : '-';
    const bidCount = detail.bidCount !== undefined && detail.bidCount !== null ? detail.bidCount : 0;

    // Seller Info
    const userName = detail.userName || 'Bizde Kullanıcısı';
    const userCompany = detail.userCompany || 'Bireysel Satıcı';
    const userAvatar = detail.userAvatar;
    const initialLetter = userName.charAt(0).toUpperCase();
    const rankText = detail.userRank?.userRank || '4.8 (12)';

    // Description & Detail Key-Values
    const description = detail.description || 'Bu ilan için detaylı açıklama belirtilmemiş.';
    const detailInfo = detail.detailInfo || [];

    // Thumbnail strip HTML
    let thumbsHtml = '';
    if (images.length > 1) {
      thumbsHtml = `
        <div class="detail-thumbs-scroll">
          ${images.map((img, idx) => `
            <div class="detail-thumb-item ${idx === 0 ? 'active' : ''}" onclick="setDetailImage(${idx})">
              <img src="${img}" alt="Thumb ${idx + 1}" loading="lazy" />
            </div>
          `).join('')}
        </div>
      `;
    }

    // Breadcrumb pills HTML
    let breadcrumbHtml = '';
    if (breadcrumb.length > 0) {
      breadcrumbHtml = `
        <div class="detail-breadcrumb-bar">
          ${breadcrumb.map((b, i) => `
            <span class="detail-breadcrumb-pill" onclick="openDownloadModal('Kategori: ${b.title}')">
              ${b.title}
            </span>
            ${i < breadcrumb.length - 1 ? '<span class="detail-breadcrumb-sep">/</span>' : ''}
          `).join('')}
        </div>
      `;
    }

    appRoot.innerHTML = `
      <div class="detail-view-wrap">
        <!-- 1. Interactive Image Slider (Flutter 1:1) -->
        <div class="detail-gallery-container">
          <div class="detail-hero-banner">
            <img src="${images[0]}" alt="${title}" id="detail-main-img" class="detail-hero-img" />
            
            <div class="detail-nav-actions">
              <button class="detail-circle-btn" onclick="window.location.hash = '#/'" title="Geri">
                <span class="material-symbols-rounded" style="font-size: 20px;">arrow_back_ios_new</span>
              </button>
              <button class="detail-circle-btn" onclick="copyShareLink()" title="Paylaş">
                <span class="material-symbols-rounded" style="font-size: 20px;">share</span>
              </button>
            </div>

            ${images.length > 1 ? `
              <button class="gallery-arrow-btn left" onclick="prevDetailImage()" title="Önceki">
                <span class="material-symbols-rounded" style="font-size: 24px;">chevron_left</span>
              </button>
              <button class="gallery-arrow-btn right" onclick="nextDetailImage()" title="Sonraki">
                <span class="material-symbols-rounded" style="font-size: 24px;">chevron_right</span>
              </button>
              <div class="gallery-counter-pill" id="detail-img-counter">1 / ${images.length}</div>
            ` : ''}
          </div>

          ${thumbsHtml}
        </div>

        <!-- 2. Detail Body -->
        <div class="detail-body">
          ${breadcrumbHtml}

          <div class="detail-header-meta">
            <span class="detail-cat-pill" style="background-color: ${catBg}; border: 1px solid ${catBorder}; color: ${rawCatColor};">
              ${categoryTitle}
            </span>
            <span class="detail-type-badge ${detail.type || 'Bid'}">
              <span class="material-symbols-rounded" style="font-size: 14px; margin-right: 4px;">
                ${typeInfo.icon || 'info'}
              </span>
              ${typeInfo.label}
            </span>
          </div>

          <h1 class="detail-main-title">${title}</h1>
          
          <div class="detail-location-row">
            <span class="material-symbols-rounded" style="font-size: 16px; color: var(--primary);">location_on</span>
            <span>${location}</span>
          </div>

          <!-- 3. Stat Cards Grid (Flutter 1:1) -->
          <div class="detail-stats-grid">
            <div class="detail-stat-card">
              <div class="detail-stat-label-wrap">
                <span class="material-symbols-rounded stat-green" style="font-size: 16px;">payments</span>
                <span>Fiyat / Bütçe</span>
              </div>
              <div class="detail-stat-value stat-green">${priceFormatted}</div>
              ${minBidFormatted ? `<div class="detail-stat-sub">Min: ${minBidFormatted}</div>` : ''}
            </div>

            <div class="detail-stat-card">
              <div class="detail-stat-label-wrap">
                <span class="material-symbols-rounded stat-blue" style="font-size: 16px;">${typeInfo.icon || 'gavel'}</span>
                <span>Teklif Durumu</span>
              </div>
              <div class="detail-stat-value stat-blue">${bidCount} Teklif</div>
              <div class="detail-stat-sub">${typeInfo.label}</div>
            </div>

            <div class="detail-stat-card">
              <div class="detail-stat-label-wrap">
                <span class="material-symbols-rounded stat-orange" style="font-size: 16px;">schedule</span>
                <span>Kalan Süre</span>
              </div>
              <div class="detail-stat-value stat-orange">${timeRemaining}</div>
              <div class="detail-stat-sub">${formatShortDate(detail.deadline)}</div>
            </div>
          </div>

          <!-- 4. Tabs Section (Açıklama / Özellikler / İlan Detayları) -->
          <div class="detail-tabs-card">
            <div class="tabs-nav-bar">
              <button class="tab-btn active" data-tab="desc" onclick="switchDetailTab('desc')">
                <span class="material-symbols-rounded" style="font-size: 16px;">description</span>
                Açıklama
              </button>
              ${detailInfo.length > 0 ? `
                <button class="tab-btn" data-tab="attr" onclick="switchDetailTab('attr')">
                  <span class="material-symbols-rounded" style="font-size: 16px;">list_alt</span>
                  Özellikler
                </button>
              ` : ''}
              <button class="tab-btn" data-tab="info" onclick="switchDetailTab('info')">
                <span class="material-symbols-rounded" style="font-size: 16px;">info</span>
                İlan Bilgileri
              </button>
            </div>

            <!-- Tab 1: Açıklama -->
            <div id="tab-desc-pane" class="tab-content-pane" style="display: block;">
              <p class="detail-desc-text">${description}</p>
            </div>

            <!-- Tab 2: Özellikler (Key-Value) -->
            ${detailInfo.length > 0 ? `
              <div id="tab-attr-pane" class="tab-content-pane" style="display: none;">
                <table class="attributes-table">
                  ${detailInfo.map(item => `
                    <tr>
                      <td class="attr-key">${item.key || item.title || 'Özellik'}</td>
                      <td class="attr-val">${item.value || item.val || '-'}</td>
                    </tr>
                  `).join('')}
                </table>
              </div>
            ` : ''}

            <!-- Tab 3: İlan Bilgileri -->
            <div id="tab-info-pane" class="tab-content-pane" style="display: none;">
              <table class="attributes-table">
                <tr>
                  <td class="attr-key">İlan No</td>
                  <td class="attr-val">${detail.id.substring(0, 8).toUpperCase()}</td>
                </tr>
                <tr>
                  <td class="attr-key">İlan Tarihi</td>
                  <td class="attr-val">${createdAtFormatted}</td>
                </tr>
                <tr>
                  <td class="attr-key">Bitiş Tarihi</td>
                  <td class="attr-val">${deadlineFormatted}</td>
                </tr>
                <tr>
                  <td class="attr-key">İlan Türü</td>
                  <td class="attr-val">${typeInfo.label}</td>
                </tr>
                <tr>
                  <td class="attr-key">Konum</td>
                  <td class="attr-val">${location}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- 5. Seller Info Card (Flutter 1:1) -->
          <div class="seller-card" onclick="openDownloadModal('Satıcı Profili')">
            <div class="seller-header-row">
              <span class="seller-header-title">İlan Sahibi</span>
              <div class="seller-rank-badge">
                <span class="material-symbols-rounded" style="font-size: 16px; color: var(--warning);">star</span>
                <span>${rankText}</span>
              </div>
            </div>
            <div class="seller-profile-row">
              <div class="seller-avatar">
                ${userAvatar ? `<img src="${userAvatar}" alt="${userName}" />` : `<span>${initialLetter}</span>`}
              </div>
              <div class="seller-info">
                <div class="seller-name-row">
                  <span class="seller-name">${userName}</span>
                  <span class="material-symbols-rounded verified-icon" title="Doğrulanmış Hesap">verified</span>
                </div>
                <div class="seller-company">${userCompany}</div>
              </div>
              <div class="seller-arrow">
                <span class="material-symbols-rounded" style="font-size: 16px; color: var(--text-muted);">arrow_forward_ios</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 6. Sticky Bottom Action Bar (Flutter 1:1) -->
        <div class="bottom-action-bar">
          <div class="bottom-action-container">
            <button class="btn-action-outline" onclick="openDownloadModal('Satıcıyı Arama')">
              <span class="material-symbols-rounded" style="font-size: 18px;">call</span>
              Ara
            </button>
            <button class="btn-action-outline" onclick="openDownloadModal('Mesaj Gönderme')">
              <span class="material-symbols-rounded" style="font-size: 18px;">chat</span>
              Mesaj
            </button>
            <button class="btn-action-primary" onclick="openDownloadModal('Teklif Verme')">
              <span class="material-symbols-rounded" style="font-size: 18px;">${typeInfo.icon || 'gavel'}</span>
              Teklif Ver
            </button>
          </div>
        </div>
      </div>
    `;

    window.scrollTo(0, 0);
  } catch (err) {
    appRoot.innerHTML = `
      <div class="error-state">
        <h3>İlan Detayı Yüklenemedi</h3>
        <p>${err.message}</p>
        <button onclick="window.location.hash = '#/'" class="modal-btn-download" style="max-width: 200px; margin-top: 16px;">İlanlara Dön</button>
      </div>
    `;
  }
};

// ── 7. ROUTER ────────────────────────────────────────────
const router = () => {
  const hash = window.location.hash || '#/';
  
  if (hash === '#/' || hash === '') {
    renderHome();
  } else if (hash.startsWith('#/tender/')) {
    const id = hash.split('/')[2];
    renderDetail(id);
  } else {
    window.location.hash = '#/';
  }
};

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);

// Logo click -> Home
document.getElementById('logo-link').addEventListener('click', (e) => {
  e.preventDefault();
  window.location.hash = '#/';
});
