export const THEME_STORAGE_KEY = 'tenebris-theme';
export const INTRO_STORAGE_KEY = 'tenebris-intro';

/**
 * Runs in <head>, before first paint:
 * - applies a saved theme (dark is the default), so there is no flash of the wrong theme;
 * - marks repeat visits in this browser session, so the intro loader plays once.
 * If storage is unavailable the intro is skipped rather than replayed on every load.
 */
export const headScript = `(function(){var d=document.documentElement;try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')d.setAttribute('data-theme',t)}catch(e){}try{var s=window.sessionStorage;if(s.getItem('${INTRO_STORAGE_KEY}'))d.setAttribute('data-intro','seen');else s.setItem('${INTRO_STORAGE_KEY}','1')}catch(e){d.setAttribute('data-intro','seen')}})();`;
