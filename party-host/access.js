/* Party Host access guard: main Training Portal session only. */
(function () {
  'use strict';
  var me = document.currentScript;
  var scriptUrl = new URL(me.getAttribute('src'), document.baseURI);
  var moduleBase = new URL('.', scriptUrl);
  var portalBase = new URL('../', moduleBase);
  var primaryKey = 'launchTrainingUnlockedUntil';
  function expiry(key) {try{return Number(localStorage.getItem(key)||0);}catch(e){return 0;}}
  function reveal() {document.documentElement.classList.add('party-host-ready');}
  function goToPortal() {
    var where = location.pathname + location.search + location.hash;
    location.replace(portalBase.href + '?return=' + encodeURIComponent(where));
  }
  if (expiry(primaryKey) <= Date.now()) {
    try {localStorage.removeItem(primaryKey);} catch (e) {}
    goToPortal();return;
  }
  reveal();
})();
