import { useSyncExternalStore } from 'react';

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const standalone = window.matchMedia('(display-mode: standalone)');
const isInstalled = () => standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
let deferred: InstallPrompt | null = null;
let state = { installed: isInstalled(), canPrompt: false, pending: false, error: '' };
const listeners = new Set<() => void>();
const update = (next: Partial<typeof state>) => {
  state = { ...state, ...next };
  listeners.forEach(listener => listener());
};
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferred = event as InstallPrompt;
  update({ canPrompt: true, error: '' });
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  update({ installed: true, canPrompt: false, pending: false });
});
standalone.addEventListener('change', () => update({ installed: isInstalled() }));
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

async function install() {
  const prompt = deferred;
  if (!prompt || state.pending) return;
  update({ pending: true, error: '' });
  try {
    await prompt.prompt();
    await prompt.userChoice;
  } catch {
    update({ error: 'No se ha podido abrir la instalación. Puedes intentarlo desde el menú del navegador.' });
  } finally {
    // Browser prompts can only be used once. appinstalled confirms completion.
    deferred = null;
    update({ canPrompt: false, pending: false });
  }
}

export function usePwaInstall() {
  const snapshot = useSyncExternalStore(subscribe, () => state);
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return { ...snapshot, isIos, install };
}
