/**
 * Entry point: wires modules together. Loaded last; each module registers itself on window.Site.
 * Each feature starts independently, so a problem in one never disables the others (or the tabs).
 */
(function (Site) {
'use strict';

function safely(name, fn) {
  try { return fn(); } catch (err) { console.error('[' + name + ']', err); return null; }
}

safely('contact', function () { Site.initContact(Site.config); });

document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

var gallery = null;
var lightbox = safely('lightbox', function () {
  return Site.createLightbox(document.getElementById('lightbox'), {
    onClose: function () { if (gallery) gallery.resume(); },
  });
});

gallery = safely('gallery', function () {
  return Site.createGallery(document.getElementById('dashboard-gallery'), Site.dashboards, {
    interval: 6000,
    onOpen: function (slide) { gallery.pause(); if (lightbox) lightbox.open(slide); },
  });
});

// Any element with data-lightbox opens its image full size.
document.querySelectorAll('[data-lightbox]').forEach(function (el) {
  el.addEventListener('click', function () {
    if (lightbox) lightbox.open({ src: el.dataset.src, title: el.dataset.title, caption: el.dataset.caption });
  });
});

var arcade = safely('arcade', function () { return Site.initArcade(document.getElementById('arcade')); });
safely('ampacity', function () { Site.initAmpacity(document.getElementById('ampacity')); });

Site.initTabs({
  onChange: function (name, panel) {
    if (gallery) gallery.setActive(name === 'portfolio');
    if (arcade) arcade.setActive(name === 'fun');
    safely('toc', function () { Site.buildToc(panel); });
  },
});

})(window.Site = window.Site || {});
