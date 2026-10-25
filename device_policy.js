/* v0.11.002: budget menu previews and world buffers separately from UI pixels. */
(() => {
  'use strict';
  const safePreviews = /Android|iPad|iPhone|iPod|Mobile/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    || !!window.matchMedia?.('(pointer: coarse)').matches;
  if (safePreviews) document.documentElement.classList.add('mobile-device');
  window.GenesisDevice = Object.freeze({
    safePreviews,
    configureApp(element) {
      if (safePreviews) element.setAttribute('max-pixel-ratio', '1.5');
    }
  });
})();
