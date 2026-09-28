/**
 * Generic dialogs. A button with data-modal-open="id" opens <dialog id="id">;
 * any element inside with data-modal-close, a click on the backdrop, or Escape closes it.
 */
(function (Site) {
'use strict';

Site.initModals = function initModals() {
  document.querySelectorAll('[data-modal-open]').forEach(function (btn) {
    var dlg = document.getElementById(btn.dataset.modalOpen);
    if (!dlg) return;
    btn.addEventListener('click', function () { dlg.showModal(); });
  });
  document.querySelectorAll('dialog.modal').forEach(function (dlg) {
    dlg.querySelectorAll('[data-modal-close]').forEach(function (b) {
      b.addEventListener('click', function () { dlg.close(); });
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  });
};

})(window.Site = window.Site || {});
