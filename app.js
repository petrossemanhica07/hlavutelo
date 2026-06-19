// ==================== CONFIGURAÇÃO INICIAL ====================
const app = {
  // Dados de capítulos (exemplo - você pode integrar com uma API)
  chapters: Array.from({ length: 22 }, (_, i) => ({
    id: i + 1,
    number: i + 1,
    title: `Capítulo ${i + 1}`,
    duration: 3600 + Math.random() * 2400,
    file: `musica${i + 1}.mp3`,
    icon: ['📖', '✝️', '🙏', '⛪', '💫'][Math.floor(Math.random() * 5)],
    favorite: localStorage.getItem(`fav-${i + 1}`) === 'true',
    date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
  })),

  // Estado da aplicação
  state: {
    current: 0,
    isPlaying: false,
    favorites: [],
    theme: localStorage.getItem('theme') || 'light',
    isMuted: false
  },

  // Elementos do DOM
  elements: {},

  // Inicialização
  init() {
    this.cacheElements();
    this.setupEventListeners();
    this.restoreState();
    this.render();
    this.setupServiceWorker();
    this.setupFirebase();
    AOS.init({ duration: 800, once: true });
  },

  // Cache dos elementos do DOM
  cacheElements() {
    this.elements = {
      // Navbar
      btnSearchOpen: document.getElementById('btnSearchOpen'),
      btnTheme: document.getElementById('btnTheme'),
      btnInstall: document.getElementById('btnInstall'),
      
      // Search
      searchModal: document.getElementById('searchModal'),
      campoBusca: document.getElementById('campoBusca'),
      sugestoes: document.getElementById('sugestoes'),
      
      // Hero
      heroPlayBtn: document.getElementById('heroPlayBtn'),
      heroExploreBtn: document.getElementById('heroExploreBtn'),
      
      // Sections
      swiperDestaques: document.getElementById('swiperDestaques'),
      gridCapitulos: document.getElementById('gridCapitulos'),
      
      // Player
      audio: document.getElementById('audio'),
      btnPlay: document.getElementById('btnPlay'),
      btnPrev: document.getElementById('btnPrev'),
      btnNext: document.getElementById('btnNext'),
      playerSeek: document.getElementById('playerSeek'),
      playerTitulo: document.getElementById('playerTitulo'),
      tempoAtual: document.getElementById('tempoAtual'),
      tempoTotal: document.getElementById('tempoTotal'),
      btnFavAtual: document.getElementById('btnFavAtual'),
      btnMute: document.getElementById('btnMute'),
      
      // Comments
      btnComments: document.getElementById('btnComments'),
      commentsPanel: document.getElementById('commentsPanel'),
      commentForm: document.getElementById('commentForm'),
      commentName: document.getElementById('commentName'),
      commentText: document.getElementById('commentText'),
      
      // Toast
      toast: document.getElementById('toast'),
      
      // Footer
      ano: document.getElementById('ano')
    };
  },

  // Restaurar estado salvo
  restoreState() {
    const saved = localStorage.getItem('appState');
    if (saved) {
      const state = JSON.parse(saved);
      this.state.current = state.current;
      this.state.favorites = state.favorites;
      this.state.theme = state.theme;
    }

    this.updateFavorites();
    this.applyTheme(this.state.theme);
    this.elements.ano.textContent = new Date().getFullYear();
  },

  // ==================== EVENT LISTENERS ====================
  setupEventListeners() {
    // Navbar
    this.elements.btnSearchOpen.addEventListener('click', () => this.openSearch());
    this.elements.btnTheme.addEventListener('click', () => this.toggleTheme());
    
    // Search
    this.elements.campoBusca.addEventListener('input', (e) => this.filterChapters(e.target.value));
    document.addEventListener('click', (e) => {
      if (!this.elements.searchModal.contains(e.target) && !this.elements.btnSearchOpen.contains(e.target)) {
        this.closeSearch();
      }
    });

    // Tecla ESC para fechar busca
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeSearch();
    });

    // Hero
    this.elements.heroPlayBtn.addEventListener('click', () => {
      this.playChapter(0);
      window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
    });
    this.elements.heroExploreBtn.addEventListener('click', () => {
      document.getElementById('lista')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Player
    this.elements.btnPlay.addEventListener('click', () => this.togglePlay());
    this.elements.btnPrev.addEventListener('click', () => this.prevChapter());
    this.elements.btnNext.addEventListener('click', () => this.nextChapter());
    this.elements.playerSeek.addEventListener('input', (e) => {
      if (this.elements.audio.duration) {
        this.elements.audio.currentTime = (e.target.value / 100) * this.elements.audio.duration;
      }
    });
    this.elements.btnFavAtual.addEventListener('click', () => this.toggleFavorite(this.state.current));
    this.elements.btnMute.addEventListener('click', () => this.toggleMute());

    // Audio events
    this.elements.audio.addEventListener('loadedmetadata', () => this.updatePlayerUI());
    this.elements.audio.addEventListener('timeupdate', () => this.updateProgress());
    this.elements.audio.addEventListener('ended', () => this.nextChapter());

    // Comments
    this.elements.btnComments.addEventListener('click', () => {
      const modal = new bootstrap.Offcanvas(this.elements.commentsPanel);
      modal.show();
    });
    this.elements.commentForm.addEventListener('submit', (e) => this.submitComment(e));

    // Filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.filterByType(e.target.closest('.filter-btn')));
    });

    // PWA Install
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.elements.btnInstall.classList.remove('d-none');
    });
    this.elements.btnInstall?.addEventListener('click', () => this.installApp());
  },

  // ==================== RENDERIZAÇÃO ====================
  render() {
    this.renderSwiper();
    this.renderGrid();
    this.updatePlayerUI();
  },

  renderSwiper() {
    const destaques = this.chapters.slice(0, 5);
    this.elements.swiperDestaques.innerHTML = destaques.map((ch, i) => `
      <div class="swiper-slide swiper-slide-featured">
        <div class="card-chapter" style="cursor: pointer;" onclick="app.playChapter(${ch.id - 1})">
          <div class="card-image">${ch.icon}</div>
          <div class="card-body-chapter">
            <div>
              <div class="card-chapter-number">Episódio ${ch.number}</div>
              <div class="card-chapter-title">${ch.title}</div>
            </div>
            <div class="card-chapter-meta">
              <span><i class="bi bi-hourglass-split"></i> ${this.formatDuration(ch.duration)}</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    // Reinicializar swiper
    if (window.swiperInstance) {
      window.swiperInstance.destroy();
    }
    window.swiperInstance = new Swiper('.swiper-featured', {
      slidesPerView: 1.2,
      spaceBetween: 16,
      loop: false,
      pagination: { el: '.swiper-pagination', clickable: true },
      breakpoints: {
        640: { slidesPerView: 1.5 },
        768: { slidesPerView: 2 },
        1024: { slidesPerView: 2.5 },
        1200: { slidesPerView: 3 }
      }
    });
  },

  renderGrid() {
    let chapters = this.chapters;

    // Aplicar filtro
    const activeFilter = document.querySelector('.filter-btn.active');
    if (activeFilter?.dataset.filter === 'favoritos') {
      chapters = chapters.filter(ch => ch.favorite);
    } else if (activeFilter?.dataset.filter === 'recentes') {
      chapters = chapters.sort((a, b) => b.date - a.date).slice(0, 10);
    }

    this.elements.gridCapitulos.innerHTML = chapters.map((ch, i) => `
      <div class="card-chapter" data-aos="fade-up" data-aos-delay="${i * 50}">
        <div class="card-image" onclick="app.playChapter(${ch.id - 1})" style="cursor: pointer;">${ch.icon}</div>
        <button class="card-chapter-favorite ${ch.favorite ? 'active' : ''}" 
                onclick="event.stopPropagation(); app.toggleFavorite(${ch.id - 1})" 
                title="Adicionar aos favoritos">
          <i class="bi bi-star${ch.favorite ? '-fill' : ''}"></i>
        </button>
        <div class="card-body-chapter">
          <div>
            <div class="card-chapter-number">Capítulo ${ch.number}</div>
            <div class="card-chapter-title">${ch.title}</div>
          </div>
          <div class="card-chapter-meta">
            <span><i class="bi bi-play-circle"></i> ${this.formatDuration(ch.duration)}</span>
          </div>
        </div>
      </div>
    `).join('');

    AOS.refresh();
  },

  // ==================== PLAYER ====================
  playChapter(index) {
    this.state.current = index;
    const chapter = this.chapters[index];
    this.elements.audio.src = chapter.file;
    this.play();
    this.saveState();
    this.showToast(`Reproduzindo: ${chapter.title}`);
  },

  play() {
    this.elements.audio.play().catch(() => {
      this.showToast('Erro ao reproduzir áudio', 'error');
    });
    this.state.isPlaying = true;
    this.updatePlayerUI();
  },

  pause() {
    this.elements.audio.pause();
    this.state.isPlaying = false;
    this.updatePlayerUI();
  },

  togglePlay() {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  },

  nextChapter() {
    if (this.state.current < this.chapters.length - 1) {
      this.playChapter(this.state.current + 1);
    } else {
      this.pause();
    }
  },

  prevChapter() {
    if (this.state.current > 0) {
      this.playChapter(this.state.current - 1);
    }
  },

  updatePlayerUI() {
    const chapter = this.chapters[this.state.current];
    this.elements.playerTitulo.textContent = chapter.title;

    // Botão play
    const icon = this.state.isPlaying ? 'pause-circle-fill' : 'play-fill';
    this.elements.btnPlay.innerHTML = `<i class="bi bi-${icon}"></i>`;
    this.elements.btnPlay.classList.toggle('playing', this.state.isPlaying);

    // Botão favorito
    this.elements.btnFavAtual.classList.toggle('active', chapter.favorite);

    // Tempo total
    if (this.elements.audio.duration) {
      this.elements.tempoTotal.textContent = this.formatTime(this.elements.audio.duration);
    }
  },

  updateProgress() {
    const { audio } = this.elements;
    if (audio.duration) {
      const percent = (audio.currentTime / audio.duration) * 100;
      this.elements.playerSeek.value = percent;
      this.elements.tempoAtual.textContent = this.formatTime(audio.currentTime);
    }
  },

  toggleMute() {
    this.state.isMuted = !this.state.isMuted;
    this.elements.audio.muted = this.state.isMuted;
    const icon = this.state.isMuted ? 'volume-mute' : 'volume-up';
    this.elements.btnMute.innerHTML = `<i class="bi bi-${icon}"></i>`;
  },

  // ==================== FAVORITOS ====================
  toggleFavorite(index) {
    this.chapters[index].favorite = !this.chapters[index].favorite;
    localStorage.setItem(`fav-${index + 1}`, this.chapters[index].favorite);
    this.updateFavorites();
    this.renderGrid();
    this.updatePlayerUI();
    this.showToast(this.chapters[index].favorite ? 'Adicionado aos favoritos' : 'Removido dos favoritos');
  },

  updateFavorites() {
    this.state.favorites = this.chapters.filter(ch => ch.favorite).map(ch => ch.id);
  },

  // ==================== BUSCA ====================
  openSearch() {
    this.elements.searchModal.classList.add('active');
    this.elements.campoBusca.focus();
  },

  closeSearch() {
    this.elements.searchModal.classList.remove('active');
    this.elements.campoBusca.value = '';
    this.elements.sugestoes.classList.add('d-none');
  },

  filterChapters(query) {
    if (!query.trim()) {
      this.elements.sugestoes.classList.add('d-none');
      return;
    }

    const filtered = this.chapters.filter(ch =>
      ch.title.toLowerCase().includes(query.toLowerCase()) ||
      ch.number.toString().includes(query)
    );

    if (filtered.length) {
      this.elements.sugestoes.innerHTML = filtered.slice(0, 6).map(ch => `
        <div class="search-item" onclick="app.playChapter(${ch.id - 1}); app.closeSearch();">
          <strong>${ch.title}</strong>
          <small>${this.formatDuration(ch.duration)}</small>
        </div>
      `).join('');
      this.elements.sugestoes.classList.remove('d-none');
    } else {
      this.elements.sugestoes.innerHTML = '<div style="padding: 1rem; text-align: center; color: #999;">Nenhum resultado encontrado</div>';
      this.elements.sugestoes.classList.remove('d-none');
    }
  },

  // ==================== FILTROS ====================
  filterByType(btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.renderGrid();
  },

  // ==================== TEMA ====================
  toggleTheme() {
    this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
    this.applyTheme(this.state.theme);
    this.saveState();
  },

  applyTheme(theme) {
    document.documentElement.classList.toggle('dark-mode', theme === 'dark');
    document.body.classList.toggle('dark-mode', theme === 'dark');
    
    const icon = theme === 'light' ? 'moon-stars' : 'sun';
    this.elements.btnTheme.innerHTML = `<i class="bi bi-${icon}"></i>`;

    // Meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#0f0f0f' : '#4f2b16');
    }
  },

  // ==================== COMENTÁRIOS ====================
  submitComment(e) {
    e.preventDefault();
    const name = this.elements.commentName.value.trim();
    const text = this.elements.commentText.value.trim();

    if (!name || !text) {
      this.showToast('Por favor, preencha todos os campos', 'error');
      return;
    }

    // Aqui você integraria com Firebase ou uma API
    this.showToast('Comentário enviado com sucesso! ✨');
    this.elements.commentForm.reset();
  },

  // ==================== UTILITÁRIOS ====================
  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  },

  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(mins / 60);
    if (hours > 0) {
      return `${hours}h ${mins % 60}m`;
    }
    return `${mins}m`;
  },

  showToast(message, type = 'success') {
    this.elements.toast.textContent = message;
    this.elements.toast.className = 'toast-message show';
    setTimeout(() => {
      this.elements.toast.classList.remove('show');
    }, 3000);
  },

  saveState() {
    const state = {
      current: this.state.current,
      favorites: this.state.favorites,
      theme: this.state.theme
    };
    localStorage.setItem('appState', JSON.stringify(state));
  },

  // ==================== PWA ====================
  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.warn('Service Worker failed:', err);
      });
    }
  },

  installApp() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then(choiceResult => {
        if (choiceResult.outcome === 'accepted') {
          this.showToast('App instalado com sucesso! 🎉');
          this.elements.btnInstall.classList.add('d-none');
        }
        this.deferredPrompt = null;
      });
    }
  },

  // ==================== FIREBASE ====================
  setupFirebase() {
    // Implementar integração com Firebase aqui
    // Este é um placeholder para que você integre o código Firebase
    console.log('Firebase ready for integration');
  }
};

// Inicializar app quando DOM está pronto
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

// Atualizar AOS ao scroll
window.addEventListener('load', () => {
  AOS.refresh();
});