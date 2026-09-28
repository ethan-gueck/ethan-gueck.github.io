(function (Site) {
'use strict';
/** Full-size image viewer using the native <dialog> element. */
Site.createLightbox = function createLightbox(dialog, { onClose } = {}) {
  const img = dialog.querySelector('.lightbox__img');
  const cap = dialog.querySelector('.lightbox__caption');

  dialog.querySelector('.lightbox__close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => onClose?.());

  return {
    open({ src, title, caption }) {
      img.src = src;
      img.alt = title;
      cap.textContent = `${title}. ${caption}`;
      dialog.showModal();
    },
  };
}

})(window.Site = window.Site || {});
