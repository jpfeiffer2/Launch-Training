(() => {
  "use strict";

  const STORAGE_KEY = "launchTrainingUnlockedUntil";
  const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
  const PASSWORD_HASH = "67f68a72462bca9b1642747164bcc1fac7a3d5340059f4ce99dc77ee9829bb6c";

  const gate = document.getElementById("login-gate");
  const portal = document.getElementById("portal-app");
  const form = document.getElementById("portal-login-form");
  const passwordInput = document.getElementById("portal-password");
  const errorMessage = document.getElementById("login-error");
  const lockButton = document.getElementById("lock-portal");

  function isUnlocked() {
    return Number(localStorage.getItem(STORAGE_KEY) || 0) > Date.now();
  }

  function getPortalBasePath() {
    const marker = "/Launch-Training/";
    const currentPath = window.location.pathname;
    const markerPosition = currentPath.indexOf(marker);

    if (markerPosition >= 0) {
      return currentPath.slice(0, markerPosition + marker.length);
    }

    return currentPath.endsWith("/")
      ? currentPath
      : currentPath.slice(0, currentPath.lastIndexOf("/") + 1);
  }

  function getSafeReturnPath() {
    const requestedPath = new URLSearchParams(window.location.search).get("return");
    const portalBasePath = getPortalBasePath();

    if (
      requestedPath &&
      requestedPath.startsWith(portalBasePath) &&
      !requestedPath.startsWith("//")
    ) {
      return requestedPath;
    }

    return "";
  }

  async function sha256(value) {
    const encoded = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(digest))
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  function showPortal() {
    gate.hidden = true;
    portal.hidden = false;
    document.body.classList.add("portal-unlocked");
  }

  function showLogin() {
    portal.hidden = true;
    gate.hidden = false;
    document.body.classList.remove("portal-unlocked");
    window.setTimeout(() => passwordInput.focus(), 0);
  }

  if (isUnlocked()) {
    const returnPath = getSafeReturnPath();

    if (returnPath && returnPath !== window.location.pathname) {
      window.location.replace(returnPath);
    } else {
      showPortal();
    }
  } else {
    localStorage.removeItem(STORAGE_KEY);
    showLogin();
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    errorMessage.textContent = "";

    const submittedHash = await sha256(passwordInput.value);

    if (submittedHash !== PASSWORD_HASH) {
      errorMessage.textContent = "Incorrect password. Please try again.";
      passwordInput.select();
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      String(Date.now() + SESSION_DURATION_MS)
    );

    const returnPath = getSafeReturnPath();

    if (returnPath) {
      window.location.replace(returnPath);
    } else {
      showPortal();
      passwordInput.value = "";
      history.replaceState(null, "", getPortalBasePath());
    }
  });

  lockButton.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.replace(getPortalBasePath());
  });
})();
