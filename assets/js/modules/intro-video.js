/**
 * Introduction video. Two surfaces share one set of files (assets/video/):
 *  - a pane at the top of Summary that autoplays (muted, as browsers require) when it is centred in view
 *    and pauses when it leaves; the standard <video controls> are available.
 *  - a popout opened from the headshot.
 * Dark mode plays intro_dark; light mode plays intro_light_green by default, with a Green/White toggle
 * (remembered in localStorage "pp-intro-variant").
 */
(function (Site) {
'use strict';

var KEY = 'pp-intro-variant';
var DIR = 'assets/video/';

function isDark() { return document.documentElement.dataset.theme === 'dark'; }
function lightVariant() {
  try { return localStorage.getItem(KEY) === 'light_white' ? 'light_white' : 'light_green'; } catch (e) { return 'light_green'; }
}
function variant() { return isDark() ? 'dark' : lightVariant(); }

Site.initIntroVideo = function initIntroVideo() {
  var pane = document.querySelector('[data-intro-pane]');
  var dialog = document.getElementById('intro-dialog');
  var openBtn = document.querySelector('[data-intro-open]');
  var videos = Array.prototype.slice.call(document.querySelectorAll('[data-intro-video]'));
  var toggles = Array.prototype.slice.call(document.querySelectorAll('[data-intro-variants]'));

  function load(video, v) {
    if (video.dataset.variant === v) return;
    var t = video.dataset.variant ? video.currentTime : 0;
    var wasPlaying = !video.paused;
    video.dataset.variant = v;
    video.poster = DIR + 'poster_' + v + '.jpg';
    video.src = DIR + 'intro_' + v + '.mp4';
    video.addEventListener('loadedmetadata', function once() {
      video.removeEventListener('loadedmetadata', once);
      if (t) video.currentTime = t;
      if (wasPlaying) video.play().catch(function () {});
    });
    if (wasPlaying) video.play().catch(function () {});
  }

  function sync() {
    var v = variant();
    toggles.forEach(function (g) {
      g.hidden = isDark();
      g.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.variant === v)); });
    });
    videos.forEach(function (video) {
      // The popout loads only when opened; the pane loads right away.
      if (video.closest('dialog') && !dialog.open) { delete video.dataset.variant; return; }
      load(video, v);
    });
  }

  toggles.forEach(function (g) {
    g.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-variant]');
      if (!b) return;
      try { localStorage.setItem(KEY, b.dataset.variant); } catch (err) { /* still switch for this visit */ }
      sync();
    });
  });
  document.addEventListener('site:theme', sync);
  window.addEventListener('storage', function (e) { if (e.key === KEY || e.key === 'pp-theme') sync(); });

  // Pane: autoplay when centred, pause when it leaves. A viewer's own pause is respected until it leaves and returns.
  var paneVideo = pane && pane.querySelector('video');
  if (paneVideo) {
    paneVideo.muted = true; // autoplay is only allowed muted; viewers unmute with the controls
    var userPaused = false, autoPaused = false;
    paneVideo.addEventListener('pause', function () { if (!autoPaused && !paneVideo.ended) userPaused = true; });
    if ('IntersectionObserver' in window) {
      // A band around the vertical centre of the viewport: "in the centre" means overlapping it.
      new IntersectionObserver(function (entries) {
        var en = entries[entries.length - 1];
        var visible = paneVideo.offsetParent !== null;
        if (en.isIntersecting && visible && !(dialog && dialog.open)) {
          if (!userPaused && paneVideo.paused && !paneVideo.ended) paneVideo.play().catch(function () {});
        } else {
          userPaused = false;
          if (!paneVideo.paused) { autoPaused = true; paneVideo.pause(); autoPaused = false; }
        }
      }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 }).observe(paneVideo);
    }
  }

  // Popout from the headshot.
  if (dialog && openBtn) {
    var popVideo = dialog.querySelector('video');
    openBtn.addEventListener('click', function () {
      if (paneVideo) { autoPaused = true; paneVideo.pause(); autoPaused = false; }
      dialog.showModal();
      sync();
      popVideo.play().catch(function () {});
    });
    dialog.querySelector('.lightbox__close').addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', function () { popVideo.pause(); });
  }

  sync();
};

})(window.Site = window.Site || {});
