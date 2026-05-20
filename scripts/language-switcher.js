(function () {
  'use strict';

  // === Flag SVGs as base64 data URIs ===
  // sourceFlagUri shows on the LEFT (clicking goes to /, the source-language site).
  // targetFlagUri shows on the RIGHT (clicking goes to /<target_lang>/).
  // Swap these to match your direction. Defaults: UK (en) + Quebec (fr).
  var sourceFlagUri = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDYwIDQwIj48cmVjdCB3aWR0aD0iNjAiIGhlaWdodD0iNDAiIGZpbGw9IiMwMTIxNjkiLz48cGF0aCBkPSJNMCwwIEw2MCw0MCBNNjAsMCBMMCw0MCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjgiLz48cGF0aCBkPSJNMCwwIEw2MCw0MCIgc3Ryb2tlPSIjQzgxMDJFIiBzdHJva2Utd2lkdGg9IjQiIGNsaXAtcGF0aD0icG9seWdvbigwIDAsMzAgMjAsNjAgMCw2MCA0MCwzMCAyMCwwIDQwKSIvPjxwYXRoIGQ9Ik02MCwwIEwwLDQwIiBzdHJva2U9IiNDODEwMkUiIHN0cm9rZS13aWR0aD0iNCIgY2xpcC1wYXRoPSJwb2x5Z29uKDAgMCwzMCAyMCwwIDQwLDYwIDQwLDMwIDIwLDYwIDApIi8+PHBhdGggZD0iTTMwLDAgVjQwIE0wLDIwIEg2MCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjEyIi8+PHBhdGggZD0iTTMwLDAgVjQwIE0wLDIwIEg2MCIgc3Ryb2tlPSIjQzgxMDJFIiBzdHJva2Utd2lkdGg9IjYiLz48L3N2Zz4=';
  var targetFlagUri = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDE2Ij48cmVjdCB3aWR0aD0iMjQiIGhlaWdodD0iMTYiIGZpbGw9IiMwMDNEQTUiLz48cmVjdCB4PSIxMCIgeT0iMCIgd2lkdGg9IjQiIGhlaWdodD0iMTYiIGZpbGw9IiNmZmYiLz48cmVjdCB4PSIwIiB5PSI2IiB3aWR0aD0iMjQiIGhlaWdodD0iNCIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjUiIHk9IjUuNSIgZm9udC1zaXplPSI1IiBmaWxsPSIjZmZmIiBmb250LWZhbWlseT0ic2VyaWYiPuKanDwvdGV4dD48dGV4dCB4PSIxNSIgeT0iNS41IiBmb250LXNpemU9IjUiIGZpbGw9IiNmZmYiIGZvbnQtZmFtaWx5PSJzZXJpZiI+4pqcPC90ZXh0Pjx0ZXh0IHg9IjUiIHk9IjEzLjUiIGZvbnQtc2l6ZT0iNSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNlcmlmIj7impw8L3RleHQ+PHRleHQgeD0iMTUiIHk9IjEzLjUiIGZvbnQtc2l6ZT0iNSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNlcmlmIj7impw8L3RleHQ+PC9zdmc+';

  // === Widget dimensions (must match CSS below) ===
  var W = 80;
  var H = 32;
  var PAD_BOTTOM = 20;
  var PAD_RIGHT = 20;
  var PAD_BOTTOM_MOBILE = 10;
  var PAD_RIGHT_MOBILE = 10;
  var MOBILE_BREAKPOINT = 640;

  // === Read language config from meta tags injected at build time ===
  function readMeta(name, fallback) {
    var el = document.querySelector('meta[name="' + name + '"]');
    return el ? el.getAttribute('content') : fallback;
  }
  var baseUrl = (readMeta('base-url', '') || '').replace(/\/$/, '');
  var SOURCE_LANG = readMeta('source-lang', 'en');
  var TARGET_LANG = readMeta('target-lang', 'fr');
  var DEFAULT_LANG = readMeta('default-lang', TARGET_LANG);

  // === CSS for the widget (body::after pseudo-element) ===
  // React cannot remove CSS pseudo-elements — they are not DOM nodes.
  var css =
    'body::after {' +
    '  content: "";' +
    '  position: fixed;' +
    '  bottom: ' + PAD_BOTTOM + 'px;' +
    '  right: ' + PAD_RIGHT + 'px;' +
    '  z-index: 2147483647;' +
    '  display: block;' +
    '  width: ' + W + 'px;' +
    '  height: ' + H + 'px;' +
    '  background-color: rgba(255, 255, 255, 0.95);' +
    '  background-image: url("' + sourceFlagUri + '"), url("' + targetFlagUri + '");' +
    '  background-repeat: no-repeat, no-repeat;' +
    '  background-position: 8px center, 48px center;' +
    '  background-size: 24px 16px, 24px 16px;' +
    '  border-radius: 8px;' +
    '  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);' +
    '  cursor: pointer;' +
    '  pointer-events: auto;' +
    '}' +
    '.dark body::after, html.dark body::after {' +
    '  background-color: rgba(30, 30, 30, 0.95);' +
    '  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);' +
    '}' +
    '@media (max-width: ' + MOBILE_BREAKPOINT + 'px) {' +
    '  body::after {' +
    '    bottom: ' + PAD_BOTTOM_MOBILE + 'px;' +
    '    right: ' + PAD_RIGHT_MOBILE + 'px;' +
    '  }' +
    '}';

  // === Attach CSS via adoptedStyleSheets (React-proof) ===
  // adoptedStyleSheets is a property on the Document object, not a DOM node.
  // React's reconciliation only operates on DOM nodes — it cannot remove this.
  var sheet = null;

  function applyStyles() {
    try {
      if (typeof CSSStyleSheet === 'function' && 'adoptedStyleSheets' in document) {
        if (!sheet) {
          sheet = new CSSStyleSheet();
          sheet.replaceSync(css);
        }
        var existing = Array.prototype.slice.call(document.adoptedStyleSheets);
        if (existing.indexOf(sheet) === -1) {
          document.adoptedStyleSheets = existing.concat([sheet]);
        }
        return;
      }
    } catch (e) {
      // Fall through to <style> fallback
    }
    // Fallback for older browsers: create <style> element + re-inject if removed
    if (!document.getElementById('lang-switcher-style')) {
      var style = document.createElement('style');
      style.id = 'lang-switcher-style';
      style.textContent = css;
      (document.head || document.documentElement).appendChild(style);
    }
  }

  // Belt-and-suspenders: re-apply styles every frame
  function styleLoop() {
    applyStyles();
    requestAnimationFrame(styleLoop);
  }

  // === Language detection and navigation ===
  function isOnTarget() {
    var path = window.location.pathname;
    var prefix = baseUrl + '/' + TARGET_LANG;
    return path === prefix || path.startsWith(prefix + '/');
  }

  function getPageSlug() {
    var path = window.location.pathname;
    if (isOnTarget()) {
      return path.slice((baseUrl + '/' + TARGET_LANG).length) || '/';
    }
    return path.slice(baseUrl.length) || '/';
  }

  function switchTo(lang) {
    var slug = getPageSlug();
    var newPath = lang === TARGET_LANG
      ? baseUrl + '/' + TARGET_LANG + slug
      : baseUrl + slug;
    localStorage.setItem('myst-lang', lang);
    window.location.href = newPath;
  }

  // === Click handling via document listener (React-proof) ===
  // document.addEventListener persists across all SPA navigations.
  // capture:true ensures our handler fires before React's event system.
  function getWidgetBounds() {
    var isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    var padR = isMobile ? PAD_RIGHT_MOBILE : PAD_RIGHT;
    var padB = isMobile ? PAD_BOTTOM_MOBILE : PAD_BOTTOM;
    return {
      right: window.innerWidth - padR,
      bottom: window.innerHeight - padB,
      left: window.innerWidth - padR - W,
      top: window.innerHeight - padB - H
    };
  }

  document.addEventListener('click', function (e) {
    var b = getWidgetBounds();
    if (e.clientX >= b.left && e.clientX <= b.right &&
        e.clientY >= b.top && e.clientY <= b.bottom) {
      e.preventDefault();
      e.stopPropagation();
      var mid = b.left + W / 2;
      if (e.clientX < mid) {
        switchTo(SOURCE_LANG);
      } else {
        switchTo(TARGET_LANG);
      }
    }
  }, true);

  // === Auto-redirect based on saved preference ===
  function autoRedirect() {
    var pref = localStorage.getItem('myst-lang') || DEFAULT_LANG;
    var onTarget = isOnTarget();
    if (pref === TARGET_LANG && !onTarget) {
      switchTo(TARGET_LANG);
    } else if (pref === SOURCE_LANG && onTarget) {
      switchTo(SOURCE_LANG);
    }
  }

  // === Initialize ===
  applyStyles();
  requestAnimationFrame(styleLoop);
  autoRedirect();
})();
