// Сосед — регистрация service worker и баннер «Установить» (часть 1)
// Тексты берутся из словаря T через t() из index.html (RU/UZ).
(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function (err) {
        console.error('SW не зарегистрировался:', err);
      });
    });
  }

  var DISMISS_KEY = 'sosed_install_dismissed';
  var banner = null, textEl = null, installBtn = null, deferredPrompt = null, ios = false;

  function standalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }
  function dismissedRecently() {
    try { return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < 7 * 24 * 3600 * 1000; }
    catch (e) { return false; }
  }
  function hide() { if (banner) banner.hidden = true; }
  function dismiss() {
    hide();
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) {}
  }

  function build() {
    if (banner) return;
    banner = document.createElement('div');
    banner.className = 'pwa-banner';
    banner.setAttribute('role', 'region');
    banner.innerHTML =
      '<span class="pwa-text"></span>' +
      '<button type="button" class="pwa-go"></button>' +
      '<button type="button" class="pwa-x"></button>';
    textEl = banner.querySelector('.pwa-text');
    installBtn = banner.querySelector('.pwa-go');
    banner.querySelector('.pwa-x').onclick = dismiss;
    installBtn.onclick = function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { deferredPrompt = null; hide(); });
    };
    document.body.appendChild(banner);
  }

  // Вызывается из render() — обновляет тексты при смене языка
  window.pwaRefresh = function () {
    if (!banner || typeof t !== 'function') return;
    textEl.textContent = ios ? t('instIos') : t('inst');
    installBtn.textContent = t('instBtn');
    installBtn.hidden = ios;
    var x = banner.querySelector('.pwa-x');
    x.textContent = '×';
    x.setAttribute('aria-label', t('close'));
  };

  function show() {
    if (standalone() || dismissedRecently()) return;
    build();
    banner.hidden = false;
    window.pwaRefresh();
  }

  // Android / десктоп Chrome, Edge
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    ios = false;
    show();
  });
  window.addEventListener('appinstalled', hide);

  // iPhone / iPad, Safari: системного запроса нет, показываем подсказку
  ios = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) window.addEventListener('load', function () { setTimeout(show, 2500); });
})();
