/* ============================================================
   BIZDE – Coming Soon | app.js
   Particle canvas + Countdown + Form handling + Micro-anim
   ============================================================ */

/* ── 1. PARTICLE CANVAS ──────────────────────────────────── */
(function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [], animId;

  const COLORS = ['#6c63ff', '#ff6584', '#43e8b0'];
  const COUNT = 80;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function rand(min, max) { return Math.random() * (max - min) + min; }

  function createParticle() {
    return {
      x: rand(0, W),
      y: rand(0, H),
      r: rand(1, 2.5),
      dx: rand(-0.3, 0.3),
      dy: rand(-0.5, -0.1),
      alpha: rand(0.1, 0.6),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      twinkle: rand(0.005, 0.015),
      phase: rand(0, Math.PI * 2),
    };
  }

  function init() {
    particles = Array.from({ length: COUNT }, createParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Draw connection lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.save();
          ctx.globalAlpha = (1 - dist / 120) * 0.07;
          ctx.strokeStyle = particles[i].color;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // Draw particles
    particles.forEach(p => {
      p.phase += p.twinkle;
      const a = p.alpha * (0.6 + 0.4 * Math.sin(p.phase));

      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      p.x += p.dx;
      p.y += p.dy;

      if (p.y < -10) { p.y = H + 10; p.x = rand(0, W); }
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
    });

    animId = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { resize(); });

  resize();
  init();
  draw();
})();


/* ── 2. COUNTDOWN TIMER ──────────────────────────────────── */
(function initCountdown() {
  // Launch date: set to 60 days from now for demo purposes
  const stored = localStorage.getItem('bizde_launch_date');
  let launch;

  if (stored) {
    launch = new Date(stored);
  } else {
    launch = new Date();
    launch.setDate(launch.getDate() + 60);
    localStorage.setItem('bizde_launch_date', launch.toISOString());
  }

  const elDays    = document.getElementById('days');
  const elHours   = document.getElementById('hours');
  const elMins    = document.getElementById('minutes');
  const elSecs    = document.getElementById('seconds');

  function pad(n) { return String(n).padStart(2, '0'); }

  function animFlip(el) {
    el.classList.remove('flip');
    void el.offsetWidth; // reflow
    el.classList.add('flip');
  }

  let prevVals = { d: '', h: '', m: '', s: '' };

  function tick() {
    const now  = new Date();
    const diff = launch - now;

    if (diff <= 0) {
      elDays.textContent  = '00';
      elHours.textContent = '00';
      elMins.textContent  = '00';
      elSecs.textContent  = '00';
      return;
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000)  / 60000);
    const s = Math.floor((diff % 60000)    / 1000);

    const pd = pad(d), ph = pad(h), pm = pad(m), ps = pad(s);

    if (pd !== prevVals.d) { elDays.textContent  = pd; animFlip(elDays);  prevVals.d = pd; }
    if (ph !== prevVals.h) { elHours.textContent = ph; animFlip(elHours); prevVals.h = ph; }
    if (pm !== prevVals.m) { elMins.textContent  = pm; animFlip(elMins);  prevVals.m = pm; }
    if (ps !== prevVals.s) { elSecs.textContent  = ps; animFlip(elSecs);  prevVals.s = ps; }
  }

  tick();
  setInterval(tick, 1000);
})();


/* ── 3. EMAIL FORM ───────────────────────────────────────── */
function handleSubmit(e) {
  e.preventDefault();

  const form    = document.getElementById('notify-form');
  const btn     = document.getElementById('notify-btn');
  const btnText = document.getElementById('btn-text');
  const input   = document.getElementById('email-input');
  const note    = document.getElementById('form-note');
  const success = document.getElementById('success-msg');

  // Loading state
  btn.disabled   = true;
  btnText.textContent = 'Kaydediliyor…';

  setTimeout(() => {
    // Success state
    form.style.display    = 'none';
    note.style.display    = 'none';
    success.style.display = 'block';
    input.value = '';
    btn.disabled = false;
    btnText.textContent = 'Beni Haberdar Et';
  }, 1200);
}


/* ── 4. PARALLAX MOUSE EFFECT ────────────────────────────── */
(function initParallax() {
  const orbs = document.querySelectorAll('.orb');
  let mx = 0, my = 0;
  let cx = 0, cy = 0;

  window.addEventListener('mousemove', e => {
    mx = (e.clientX / window.innerWidth  - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function lerp(a, b, t) { return a + (b - a) * t; }

  function animate() {
    cx = lerp(cx, mx, 0.04);
    cy = lerp(cy, my, 0.04);

    orbs.forEach((orb, i) => {
      const factor = (i + 1) * 18;
      orb.style.transform = `translate(${cx * factor}px, ${cy * factor}px)`;
    });

    requestAnimationFrame(animate);
  }

  animate();
})();


/* ── 5. STAGGER PILL ANIMATION ───────────────────────────── */
(function initPillStagger() {
  const pills = document.querySelectorAll('.pill');
  pills.forEach((pill, i) => {
    pill.style.opacity  = '0';
    pill.style.transform = 'translateY(16px)';
    pill.style.transition = `opacity 0.6s ease ${0.7 + i * 0.08}s, transform 0.6s ease ${0.7 + i * 0.08}s`;

    // Trigger after small delay
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        pill.style.opacity  = '1';
        pill.style.transform = 'translateY(0)';
      });
    });
  });
})();


/* ── 6. SCROLL-REVEAL (IntersectionObserver) ─────────────── */
(function initReveal() {
  if (!('IntersectionObserver' in window)) return;

  const targets = document.querySelectorAll('.pill, .count-item');
  const io = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  targets.forEach(t => io.observe(t));
})();
