/**
 * Introduction video. Two surfaces share one set of files (assets/video/):
 *  - a pane at the top of Summary showing a cover (headshot, name, Play now); pressing Play now plays
 *    with sound and reveals the standard <video controls>. The cover returns when the video ends.
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

  // Pane: nothing plays until the viewer presses Play now.
  var paneVideo = pane && pane.querySelector('video');
  var cover = pane && pane.querySelector('[data-intro-cover]');
  if (paneVideo && cover) {
    pane.querySelector('[data-intro-play]').addEventListener('click', function () {
      cover.hidden = true;
      paneVideo.controls = true;
      paneVideo.muted = false;
      paneVideo.play().catch(function () {});
      paneVideo.focus();
    });
    paneVideo.addEventListener('ended', function () {
      paneVideo.controls = false;
      paneVideo.currentTime = 0;
      cover.hidden = false;
    });
  }

  // Popout from the headshot.
  if (dialog && openBtn) {
    var popVideo = dialog.querySelector('video');
    openBtn.addEventListener('click', function () {
      if (paneVideo) paneVideo.pause();
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
