// Configuración: cambia este número por el de tu WhatsApp en formato internacional, p.ej. 57 para Colombia
const WHATSAPP_NUMBER = "573106352840"; // Número actualizado

let i18n = null;
let toursCache = null; // caché de tours para re-renderizar al cambiar idioma

async function loadI18n(){
  try{
    const res = await fetch('i18n/i18n.json', { cache: 'no-store' });
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    if(!data.es || !data.en) throw new Error('Formato i18n inválido');
    i18n = data;
  }catch(err){
    console.warn('No se pudo cargar i18n.json. Verifica que el archivo exista y que uses un servidor local si es necesario.', err);
    i18n = { es: {}, en: {} }; // fallback mínimo sin duplicar contenidos
  }
}

function setLanguage(lang){
  const dict = (i18n && i18n[lang]) || {};
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if(dict[key]){
      el.textContent = dict[key];
    }
  });
  const label = document.getElementById('langLabel');
  if(label) label.textContent = lang.toUpperCase();
  localStorage.setItem('aproz-lang', lang);
}

function getCurrentLang(){
  return localStorage.getItem('aproz-lang') || 'es';
}

function buildWhatsLink(message){
  const text = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

function updateWhatsLinks(){
  const lang = getCurrentLang();
  const hi = lang === 'en' ? 'Hello! I want more information' : '¡Hola! Quiero más información';
  const suffix = ' - APROZOBOQ';

  document.querySelectorAll('.btn-whats').forEach(btn => {
    const tour = btn.getAttribute('data-tour') || btn.previousElementSibling?.textContent?.trim() || 'Servicio/Tour';
    const msg = `${hi} sobre: ${tour}${suffix}`;
    btn.setAttribute('href', buildWhatsLink(msg));
  });
  const contact = document.getElementById('contactWhats');
  if(contact){
    contact.setAttribute('href', buildWhatsLink(`${hi}${suffix}`));
  }
  const float = document.getElementById('floatWhats');
  if(float){
    float.setAttribute('href', buildWhatsLink(`${hi}${suffix}`));
  }
  const socialWhats = document.getElementById('socialWhats');
  if(socialWhats){
    socialWhats.setAttribute('href', buildWhatsLink(`${hi}${suffix}`));
  }
}

function initCardsInteractions(){
  if(window.__cardsDelegated) return; // evitar registros múltiples
  window.__cardsDelegated = true;

  // Delegación: controlar aperturas/cierres en cualquier .card (incluye las dinámicas)
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if(card){
      // no interferir con el botón de WhatsApp
      if(e.target.closest('.btn-whats')) return;
      // permitir toggle sólo cuando se pulsa la tarjeta misma o el área de imagen/carrusel
      const toggleArea = e.target.closest('.card-media') || e.target === card;
      if(toggleArea){
        card.classList.toggle('active');
      }
      return; // no cerrar si se hizo click dentro de una card
    }
    // Cerrar todas si se hace click fuera
    document.querySelectorAll('.card.active').forEach(c => c.classList.remove('active'));
  });

  // Accesibilidad con teclado: Enter/Espacio sobre la card
  document.addEventListener('keydown', (e) => {
    const card = e.target.closest && e.target.closest('.card');
    if(card && (e.key === 'Enter' || e.key === ' ')){
      e.preventDefault();
      card.classList.toggle('active');
    }
  });
}

function initLangToggle(){
  const btn = document.getElementById('langToggle');
  if(!btn) return;
  btn.addEventListener('click', () => {
    const next = getCurrentLang() === 'es' ? 'en' : 'es';
    setLanguage(next);
  renderToursGrid();
  updateWhatsLinks();
  });
}

function initYear(){
  const y = document.getElementById('year');
  if(y) y.textContent = new Date().getFullYear();
}

async function loadTours(){
  try{
    const res = await fetch('data/tours.json', { cache: 'no-store' });
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }catch(err){
    console.warn('No se pudo cargar data/tours.json:', err);
    return [];
  }
}

function getLang(){ return getCurrentLang(); }

function renderTourCard(tour){
  const lang = getLang();
  const title = tour.title?.[lang] || tour.name || 'Tour';
  const desc = tour.desc?.[lang] || '';
  const first = tour.images?.[0] || 'img/icon/LOGO.png';
  const slides = (tour.images || []).map((src, idx) => `<img src="${src}" alt="${title} ${idx+1}">`).join('');
  const dots = (tour.images || []).map((_, idx) => `<span class="dot ${idx===0?'active':''}" data-index="${idx}"></span>`).join('');
  const btnText = lang === 'en' ? 'Contact us' : 'Contáctanos';
  const ariaBtn = lang === 'en' ? 'Contact via WhatsApp' : 'Contactar por WhatsApp';
  return `
  <article class="card" tabindex="0" aria-label="${title}">
    <div class="card-media" style="--bg:url('${first}')">
      <div class="card-carousel">
        <div class="slides"><div class="track">${slides}</div></div>
        <div class="dots">${dots}</div>
      </div>
    </div>
    <div class="overlay">
      <h3 class="card-title">${title}</h3>
      <p class="card-desc">${desc}</p>
      <a class="btn-whats" data-tour="${title}" href="#" target="_blank" rel="noopener" aria-label="${ariaBtn}">${btnText}</a>
    </div>
  </article>`;
}

function hydrateCarousels(root){
  root.querySelectorAll('.card').forEach(card => {
    const track = card.querySelector('.slides .track');
    const slides = card.querySelectorAll('.slides img');
    const dots = card.querySelectorAll('.dot');
    let current = 0;
    let timerId = null;
    const intervalMs = 4500;
    const update = ()=>{
      const offset = -current * 100;
      if(track) track.style.transform = `translateY(${offset}%)`;
      dots.forEach((d,idx)=> d.classList.toggle('active', idx===current));
    };
    const stopAuto = ()=>{ if(timerId){ clearInterval(timerId); timerId=null; }};
    const startAuto = ()=>{
      stopAuto();
      if(slides.length <= 1) return;
      timerId = setInterval(()=>{
        current = (current + 1) % slides.length;
        update();
      }, intervalMs);
    };

    dots.forEach(d => d.addEventListener('click', ()=> {
      stopAuto();
      current = parseInt(d.dataset.index);
      update();
      // reiniciar luego de una pequeña pausa
      setTimeout(startAuto, 1200);
    }));
    let startY=0; let moved=false;
    card.addEventListener('touchstart', (e)=>{ startY = e.touches[0].clientY; moved=false; stopAuto(); }, {passive:true});
    card.addEventListener('touchmove', ()=>{ moved=true; }, {passive:true});
    card.addEventListener('touchend', (e)=>{
      if(!moved) return;
      const dy = e.changedTouches[0].clientY - startY;
      if(Math.abs(dy) < 30) return;
      const dir = dy<0 ? 1 : -1; // swipe up -> siguiente
      const next = (current + dir + slides.length) % slides.length;
      current = next;
      update();
      setTimeout(startAuto, 1200);
    });
    // Pausa por hover/focus en desktop
    card.addEventListener('mouseenter', stopAuto);
    card.addEventListener('mouseleave', startAuto);
    card.addEventListener('focusin', stopAuto);
    card.addEventListener('focusout', startAuto);
    // Inicial
    update();
    startAuto();
  });
}

function renderToursGrid(){
  const grid = document.getElementById('toursGrid');
  if(!grid || !Array.isArray(toursCache)) return;
  const shown = 10; // mantener 10 visibles
  const slice = toursCache.slice(0, shown);
  grid.innerHTML = slice.map(renderTourCard).join('');
  hydrateCarousels(grid);
  updateWhatsLinks();
}

async function initTours(){
  const grid = document.getElementById('toursGrid');
  const btnMore = document.getElementById('loadMoreTours');
  if(!grid || !btnMore) return;
  toursCache = await loadTours();
  renderToursGrid();

  // Botón de referencia: no hace nada por ahora
  btnMore.addEventListener('click', (e)=>{
    e.preventDefault();
  });
}

// Init
window.addEventListener('DOMContentLoaded', async () => {
  await loadI18n();
  setLanguage(getCurrentLang());
  initLangToggle();
  updateWhatsLinks();
  initCardsInteractions();
  initYear();
  initTours();
});
