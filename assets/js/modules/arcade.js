/**
 * Arcade cabinet on the Fun tab. The screen shows a non-interactive attract-mode
 * preview of the game; pressing Play opens the game in its own window.
 * If a popup blocker stops the window, the game opens in a full-screen overlay instead.
 *
 * Source: the cabinet's data-src attribute (games/conduit-carl/conduit-carl.html). A bundled
 * single-file build can instead provide the game markup in <script type="text/plain" id="carl-src">.
 */
(function (Site) {
'use strict';

Site.initArcade = function initArcade(root) {
  if (!root) return { setActive: function () {} };
  var screen = root.querySelector('.arcade__preview');
  var launch = root.querySelector('.arcade__launch');
  var src = root.dataset.src;
  var inline = document.getElementById('carl-src');
  var loaded = false;

  function gameMarkup() {
    return inline ? inline.textContent.replace(/<\\\/script/g, '</script') : null;
  }

  function load() {
    if (loaded) return;
    loaded = true;
    var markup = gameMarkup();
    if (markup) screen.srcdoc = markup; else screen.src = src;
  }

  function openOverlay() {
    var dlg = document.createElement('dialog');
    dlg.className = 'arcade-overlay';
    dlg.setAttribute('aria-label', 'Conduit Carl');
    dlg.innerHTML = '<button type="button" class="arcade-overlay__close" aria-label="Close game">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<iframe title="Conduit Carl" allow="autoplay; fullscreen"></iframe>';
    var frame = dlg.querySelector('iframe');
    var markup = gameMarkup();
    if (markup) frame.srcdoc = markup; else frame.src = src;
    dlg.querySelector('button').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('close', function () { dlg.remove(); });
    document.body.appendChild(dlg);
    dlg.showModal();
    frame.focus();
  }

  function play() {
    var features = 'popup,width=1180,height=860';
    var markup = gameMarkup();
    var win = null;
    try {
      win = markup ? window.open('', 'conduit-carl', features) : window.open(src, 'conduit-carl', features);
    } catch (e) { win = null; }

    if (!win) return openOverlay();
    if (markup) {
      win.document.open();
      win.document.write(markup);
      win.document.close();
    }
    win.focus();
  }

  launch.addEventListener('click', play);

  // Scale the desktop-sized preview to fit the cabinet screen.
  var box = root.querySelector('.arcade__screen');
  function fit() {
    var scale = box.clientWidth / 1180;
    screen.style.transform = 'scale(' + scale + ')';
    screen.style.height = (box.clientHeight / scale) + 'px';
  }
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(box);
  fit();

  return {
    // Only load the preview once the Fun tab is opened, so the game isn't running in the background.
    setActive: function (isActive) { if (isActive) load(); },
  };
};

})(window.Site = window.Site || {});
