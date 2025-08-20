// Configuração e dados
const CAPITULOS = Array.from({ length: 22 }, (_, i) => {
  const num = i + 1;
  return {
    id: num,
    titulo: `Capítulo ${num}`,
    destaque: [1, 3, 7, 12, 21].includes(num), // ajuste como quiser
    src: `musica${num}.mp3`,
    capa: `cover${num}.jpg`, // opcional; se não existir, usamos fallback
  };
});

let state = {
  atual: null, // id do capítulo atual
  tocando: false,
  favoritos: JSON.parse(localStorage.getItem('favoritos') || '[]'),
  filtro: 'all',
  installPrompt: null,
};

// Utilidades
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const toastEl = $('#toast');
const toastBS = toastEl ? new bootstrap.Toast(toastEl, { delay: 2500 }) : null;
const showToast = (msg) => {
  if (!toastBS) return;
  $('#toastMsg').textContent = msg;
  toastBS.show();
};

const formatTime = (s) => {
  if (!isFinite(s)) return '00:00';
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
};

// Inicialização de bibliotecas
AOS.init({ once: true });

// Swiper Destaques
let swiper = null;
const initSwiper = () => {
  swiper = new Swiper('.destaque-swiper', {
    slidesPerView: 1.2,
    spaceBetween: 12,
    pagination: { el: '.swiper-pagination', clickable: true },
    breakpoints: {
      576: { slidesPerView: 2.2 },
      992: { slidesPerView: 3.2 },
    },
  });
};

// Renderização
const renderDestaques = () => {
  const wrap = $('#swiperDestaques');
  wrap.innerHTML = '';
  CAPITULOS.filter(c => c.destaque).forEach(c => {
    const slide = document.createElement('div');
    slide.className = 'swiper-slide';
    slide.innerHTML = `
      <div class="card card-capitulo h-100">
        <img src="${c.capa}" onerror="this.src='hero.jpg'" class="card-img-top" alt="">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title mb-1">${c.titulo}</h5>
          <p class="card-text small text-muted">Revelação — Áudio</p>
          <div class="mt-auto d-flex gap-2">
            <button class="btn btn-primary btn-sm" data-play="${c.id}">
              <i class="bi bi-play-fill me-1"></i>Ouvir
            </button>
            <button class="btn btn-outline-warning btn-sm btn-fav" data-fav="${c.id}" data-ativo="${state.favoritos.includes(String(c.id))}">
              <i class="bi bi-star${state.favoritos.includes(String(c.id)) ? '-fill' : ''}"></i>
            </button>
          </div>
        </div>
      </div>
    `;
    wrap.appendChild(slide);
  });
  if (!swiper) initSwiper(); else swiper.update();
};

const renderGrid = (modo = 'all') => {
  const grid = $('#gridCapitulos');
  grid.innerHTML = '';
  let lista = [...CAPITULOS];

  if (modo === 'favoritos') {
    lista = lista.filter(c => state.favoritos.includes(String(c.id)));
  }
  if (modo === 'recentes') {
    lista = lista.slice(-8);
  }

  lista.forEach(c => {
    const col = document.createElement('div');
    col.className = 'col-6 col-md-4 col-lg-3';
    const favAtivo = state.favoritos.includes(String(c.id));
    col.innerHTML = `
      <div class="card card-capitulo h-100" data-id="${c.id}">
        <img src="${c.capa}" onerror="this.src='hero.jpg'" class="card-img-top" alt="">
        <div class="card-body d-flex flex-column">
          <div class="d-flex align-items-start justify-content-between">
            <h6 class="mb-2">${c.titulo}</h6>
            <button class="btn btn-sm btn-outline-warning btn-fav" data-fav="${c.id}" data-ativo="${favAtivo}">
              <i class="bi bi-star${favAtivo ? '-fill' : ''}"></i>
            </button>
          </div>
          <p class="small text-muted mb-3">Revelação — Áudio</p>
          <div class="mt-auto d-flex gap-2">
            <button class="btn btn-primary w-100" data-play="${c.id}"><i class="bi bi-play-fill me-1"></i>Reproduzir</button>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(col);
  });
};

// Busca
const applySearch = (query) => {
  const q = query.trim().toLowerCase();
  const cards = $$('#gridCapitulos .card-capitulo');
  cards.forEach(card => {
    const title = card.querySelector('h6').textContent.toLowerCase();
    card.parentElement.style.display = title.includes(q) ? '' : 'none';
  });
};

const buildSuggestions = (query) => {
  const el = $('#sugestoes');
  el.innerHTML = '';
  if (!query) return el.classList.add('d-none');
  const q = query.toLowerCase();
  const itens = CAPITULOS.filter(c => c.titulo.toLowerCase().includes(q)).slice(0, 6);
  if (itens.length === 0) return el.classList.add('d-none');
  itens.forEach(c => {
    const a = document.createElement('a');
    a.className = 'list-group-item list-group-item-action';
    a.textContent = c.titulo;
    a.dataset.play = c.id;
    el.appendChild(a);
  });
  el.classList.remove('d-none');
};

// Player
const audio = $('#audio');
const playerTitulo = $('#playerTitulo');
const playerEstado = $('#playerEstado');
const seek = $('#playerSeek');
const tempoAtual = $('#tempoAtual');
const tempoTotal = $('#tempoTotal');
const btnPlay = $('#btnPlay');
const btnPrev = $('#btnPrev');
const btnNext = $('#btnNext');
const btnFavAtual = $('#btnFavAtual');
const btnMute = $('#btnMute');

const setAtual = (id) => {
  const cap = CAPITULOS.find(c => c.id === id);
  if (!cap) return;
  state.atual = id;
  audio.src = cap.src;
  playerTitulo.textContent = cap.titulo;
  playerEstado.textContent = 'Carregando...';
  audio.play().then(() => {
    state.tocando = true;
    btnPlay.innerHTML = '<i class="bi bi-pause-fill"></i>';
  }).catch(() => {
    state.tocando = false;
    btnPlay.innerHTML = '<i class="bi bi-play-fill"></i>';
  });
  highlightAtual();
  updateFavButton();
};

const highlightAtual = () => {
  $$('#gridCapitulos .card-capitulo').forEach(card => {
    const id = parseInt(card.dataset.id, 10);
    card.classList.toggle('border-primary', id === state.atual);
  });
};

const togglePlay = () => {
  if (!audio.src) return;
  if (state.tocando) {
    audio.pause();
    state.tocando = false;
    btnPlay.innerHTML = '<i class="bi bi-play-fill"></i>';
    playerEstado.textContent = 'Pausado';
  } else {
    audio.play();
    state.tocando = true;
    btnPlay.innerHTML = '<i class="bi bi-pause-fill"></i>';
    playerEstado.textContent = 'Reproduzindo';
  }
};

const next = () => {
  const idx = CAPITULOS.findIndex(c => c.id === state.atual);
  const prox = (idx + 1) % CAPITULOS.length;
  setAtual(CAPITULOS[prox].id);
};

const prev = () => {
  const idx = CAPITULOS.findIndex(c => c.id === state.atual);
  const ant = (idx - 1 + CAPITULOS.length) % CAPITULOS.length;
  setAtual(CAPITULOS[ant].id);
};

audio.addEventListener('timeupdate', () => {
  const { currentTime, duration } = audio;
  seek.value = duration ? Math.floor((currentTime / duration) * 100) : 0;
  tempoAtual.textContent = formatTime(currentTime);
  tempoTotal.textContent = formatTime(duration);
  playerEstado.textContent = state.tocando ? 'Reproduzindo' : 'Pausado';
});

seek.addEventListener('input', () => {
  const { duration } = audio;
  if (!duration) return;
  audio.currentTime = (seek.value / 100) * duration;
});

audio.addEventListener('ended', () => {
  next();
});

btnPlay.addEventListener('click', togglePlay);
btnNext.addEventListener('click', next);
btnPrev.addEventListener('click', prev);

btnMute.addEventListener('click', () => {
  audio.muted = !audio.muted;
  btnMute.innerHTML = audio.muted ? '<i class="bi bi-volume-mute"></i>' : '<i class="bi bi-volume-up"></i>';
});

const toggleFav = (id) => {
  const key = String(id);
  const i = state.favoritos.indexOf(key);
  if (i >= 0) state.favoritos.splice(i, 1);
  else state.favoritos.push(key);
  localStorage.setItem('favoritos', JSON.stringify(state.favoritos));
  document.querySelectorAll(`[data-fav="${id}"]`).forEach(btn => {
    const ativo = state.favoritos.includes(String(id));
    btn.dataset.ativo = ativo;
    btn.innerHTML = `<i class="bi bi-star${ativo ? '-fill' : ''}"></i>`;
  });
  updateFavButton();
};

const updateFavButton = () => {
  const ativo = state.atual && state.favoritos.includes(String(state.atual));
  btnFavAtual.innerHTML = `<i class="bi bi-star${ativo ? '-fill' : ''}"></i>`;
};

// Eventos globais
document.addEventListener('click', (e) => {
  const playId = e.target.closest('[data-play]')?.dataset.play;
  const favId = e.target.closest('[data-fav]')?.dataset.fav;
  const sugItem = e.target.closest('#sugestoes .list-group-item')?.dataset.play;

  if (playId) {
    setAtual(parseInt(playId, 10));
    $('#sugestoes').classList.add('d-none');
  }
  if (favId) {
    toggleFav(parseInt(favId, 10));
  }
  if (sugItem) {
    setAtual(parseInt(sugItem, 10));
    $('#sugestoes').classList.add('d-none');
  }
});

$('#btnFavAtual').addEventListener('click', () => {
  if (!state.atual) return;
  toggleFav(state.atual);
});

// Filtros
$$('#lista [data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    state.filtro = btn.dataset.filter;
    renderGrid(state.filtro);
  });
});

// Busca
const campoBusca = $('#campoBusca');
const sugestoes = $('#sugestoes');
let debounce = null;
campoBusca.addEventListener('input', (e) => {
  clearTimeout(debounce);
  const val = e.target.value;
  debounce = setTimeout(() => {
    applySearch(val);
    buildSuggestions(val);
  }, 150);
});
document.addEventListener('click', (e) => {
  if (!sugestoes.contains(e.target) && e.target !== campoBusca) {
    sugestoes.classList.add('d-none');
  }
});
// Botão de abrir busca (foco)
$('#btnSearchOpen').addEventListener('click', () => campoBusca.focus());

// Vistas do menu
$('#menuTodos').addEventListener('click', () => {
  state.filtro = 'all';
  renderGrid();
  bootstrap.Offcanvas.getOrCreateInstance('#menuLateral').hide();
});
$('#menuFavoritos').addEventListener('click', () => {
  state.filtro = 'favoritos';
  renderGrid('favoritos');
  bootstrap.Offcanvas.getOrCreateInstance('#menuLateral').hide();
});
$('#btnFavoritosView').addEventListener('click', () => {
  state.filtro = state.filtro === 'favoritos' ? 'all' : 'favoritos';
  renderGrid(state.filtro);
});

// Tema (dark/light)
const themeKey = 'nhlavutelo_theme';
const applyTheme = (t) => {
  document.body.classList.toggle('dark', t === 'dark');
};
applyTheme(localStorage.getItem(themeKey) || 'light');
$('#btnTheme').addEventListener('click', () => {
  const cur = document.body.classList.contains('dark') ? 'dark' : 'light';
  const next = cur === 'dark' ? 'light' : 'dark';
  localStorage.setItem(themeKey, next);
  applyTheme(next);
});

// Ano no footer
$('#ano').textContent = new Date().getFullYear();

// Instalação PWA
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  state.installPrompt = e;
  $('#btnInstall').classList.remove('d-none');
});
$('#btnInstall').addEventListener('click', async () => {
  if (!state.installPrompt) return;
  state.installPrompt.prompt();
  const { outcome } = await state.installPrompt.userChoice;
  showToast(outcome === 'accepted' ? 'Instalação iniciada.' : 'Instalação cancelada.');
  state.installPrompt = null;
  $('#btnInstall').classList.add('d-none');
});

// Offline/online avisos
window.addEventListener('online', () => showToast('Conexão restaurada.'));
window.addEventListener('offline', () => showToast('Você está offline. Conteúdo em cache disponível.'));

// Registrar Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js');
  });
}

// Render inicial
renderDestaques();
renderGrid('all');
initSwiper();

// ===== Comentários Públicos (Firestore) =====
