/* Party Host access guard: standard portal session followed by a module-only gate. */
(function () {
  'use strict';
  var me = document.currentScript;
  var scriptUrl = new URL(me.getAttribute('src'), document.baseURI);
  var moduleBase = new URL('.', scriptUrl);
  var portalBase = new URL('../', moduleBase);
  var primaryKey = 'launchTrainingUnlockedUntil';
  var secondaryKey = 'launchPartyHostUnlockedUntil';
  var expiryMs = 8 * 60 * 60 * 1000;
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
  if (expiry(secondaryKey) > Date.now()) {reveal();return;}
  try {localStorage.removeItem(secondaryKey);}catch(e){}
  function showGate() {
    var css = document.createElement('style');
    css.id='party-host-auth-style';
    css.textContent = 'body.party-host-locked > :not(#party-host-auth){display:none!important}'+
      '#party-host-auth{box-sizing:border-box;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(circle at top left,#193018,#111820 65%);font-family:Arial,Helvetica,sans-serif;color:#111820}'+
      '#party-host-auth *{box-sizing:border-box}#party-host-auth .ph-panel{width:min(100%,470px);background:#fff;border-top:9px solid #69be45;border-radius:18px;padding:34px;box-shadow:0 18px 50px rgba(0,0,0,.3)}'+
      '#party-host-auth h1{font-size:1.85rem;line-height:1.1;margin:0 0 14px;color:#111820}'+
      '#party-host-auth p{line-height:1.5;color:#52616d;margin:0 0 20px}'+
      '#party-host-auth label{font-weight:800;display:block;margin-bottom:8px}'+
      '#party-host-auth input{width:100%;min-height:46px;border:1px solid #8b989d;border-radius:8px;padding:10px;font:inherit}'+
      '#party-host-auth button{border:0;border-radius:999px;background:#f2e600;color:#111820;font-weight:900;font:inherit;min-height:45px;padding:10px 22px;cursor:pointer;margin-top:16px}'+
      '#party-host-auth .ph-error{min-height:1.3em;color:#b42318;font-weight:bold;margin:12px 0 0}'+
      '#party-host-auth .ph-return{color:#255e17;display:inline-block;margin-top:8px;font-weight:bold;text-decoration:underline}';
    document.head.appendChild(css);
    document.body.classList.add('party-host-locked');
    var gate=document.createElement('main');gate.id='party-host-auth';
    gate.innerHTML='<section class="ph-panel"><h1>Party Host Training</h1><p>This training is currently password protected. Enter the Party Host training password to continue.</p><form id="ph-pass-form"><label for="ph-password">Training password</label><input id="ph-password" type="password" required autocomplete="off"><button type="submit">Unlock Party Host Training</button><p role="alert" aria-live="polite" id="ph-pass-error" class="ph-error"></p></form><a class="ph-return" id="ph-back" href="#">Return to Training Portal</a></section>';
    document.body.appendChild(gate);
    gate.querySelector('#ph-back').href=portalBase.href;
    gate.querySelector('#ph-pass-form').addEventListener('submit',function(e){
      e.preventDefault();
      var input=gate.querySelector('#ph-password');
      var error=gate.querySelector('#ph-pass-error');
      if(input.value!=='Celebration'){error.textContent='Incorrect password. Please try again.';input.select();return;}
      try {localStorage.setItem(secondaryKey,String(Date.now()+expiryMs));}
      catch (err) {error.textContent='This browser does not allow local storage. Enable site storage to continue.';return;}
      document.body.classList.remove('party-host-locked');gate.remove();reveal();
    });
    reveal();
    gate.querySelector('#ph-password').focus();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',showGate,{once:true});else showGate();
})();
