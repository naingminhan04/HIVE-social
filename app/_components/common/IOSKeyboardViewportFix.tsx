"use client";

import { useEffect } from "react";

const isIOSSafari = () => {
  const ua = window.navigator.userAgent;
  const isIOS =
    /iP(ad|hone|od)/.test(ua) ||
    (ua.includes("Macintosh") && window.navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/(CriOS|FxiOS|EdgiOS|OPiOS)/.test(ua);
  return isIOS && isSafari;
};

const setKeyboardInset = (value: number) => {
  document.documentElement.style.setProperty(
    "--ios-keyboard-inset-bottom",
    `${Math.max(0, Math.round(value))}px`,
  );
};

export default function IOSKeyboardViewportFix() {
  useEffect(() => {
    if (!window.visualViewport || !isIOSSafari()) return;

    const viewport = window.visualViewport;
    let wasKeyboardOpen = false;
    let resetTimer: number | null = null;

    const syncInset = () => {
      if (resetTimer) {
        window.clearTimeout(resetTimer);
        resetTimer = null;
      }

      const keyboardInset =
        window.innerHeight - viewport.height - viewport.offsetTop;
      const isKeyboardOpen = keyboardInset > 80;
      wasKeyboardOpen = wasKeyboardOpen || isKeyboardOpen;
      setKeyboardInset(isKeyboardOpen ? keyboardInset : 0);

      if (!isKeyboardOpen && wasKeyboardOpen) {
        wasKeyboardOpen = false;
        resetTimer = window.setTimeout(() => {
          setKeyboardInset(0);
          window.scrollTo(window.scrollX, window.scrollY);
        }, 120);
      }
    };

    syncInset();
    viewport.addEventListener("resize", syncInset);
    viewport.addEventListener("scroll", syncInset);
    window.addEventListener("focusout", syncInset);
    window.addEventListener("orientationchange", syncInset);

    return () => {
      if (resetTimer) window.clearTimeout(resetTimer);
      setKeyboardInset(0);
      viewport.removeEventListener("resize", syncInset);
      viewport.removeEventListener("scroll", syncInset);
      window.removeEventListener("focusout", syncInset);
      window.removeEventListener("orientationchange", syncInset);
    };
  }, []);

  return null;
}
