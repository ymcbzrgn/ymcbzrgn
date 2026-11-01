/**
 * Main Entry Point
 * Ubuntu×XP Desktop Portfolio
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { DeviceProvider } from './os/contexts/DeviceContext';
import { useStore } from './os/store';
import App from './App';
import './index.css';

// /tr/ is the Turkish entry of the site (hreflang): opening it is an explicit language choice.
if (/^\/tr(\/|$)/.test(window.location.pathname) && useStore.getState().settings.langOverride !== 'tr') {
  useStore.getState().updateSettings({ langOverride: 'tr' });
}

const root = document.getElementById('root')!;

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <DeviceProvider>
      <App />
    </DeviceProvider>
  </React.StrictMode>
);

/**
 * index.html ships a plain-HTML "boot" block (name, role, links) that crawlers and visitors without
 * JavaScript read. Once the first screen of the desktop or the phone UI is there, fade it out.
 */
const boot = document.getElementById('boot');
if (boot) {
  const ready = () => !!root.querySelector('.desktop-container, .mobile-os');
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    observer.disconnect();
    boot.classList.add('boot--done');
    window.setTimeout(() => boot.remove(), 450);
  };
  const observer = new MutationObserver(() => {
    if (ready()) window.requestAnimationFrame(finish);
  });
  observer.observe(root, { childList: true, subtree: true });
  if (ready()) window.requestAnimationFrame(finish);
  window.setTimeout(finish, 3000); // never keep the visitor waiting behind it
}
