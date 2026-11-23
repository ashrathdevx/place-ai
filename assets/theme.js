const key = 'place-ai:theme';
const system = matchMedia('(prefers-color-scheme: dark)');
let preference = 'system';
try {
  const saved = localStorage.getItem(key);
  if (saved === 'light' || saved === 'dark') preference = saved;
} catch {}

export const themePreference = () => preference;
export const activeTheme = () => preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;

function applyTheme() {
  document.documentElement.dataset.theme = activeTheme();
  window.dispatchEvent(new Event('place-theme'));
}
export function setTheme(value) {
  if (!['system','light','dark'].includes(value)) return;
  preference = value;
  try { localStorage.setItem(key,value); } catch {}
  applyTheme();
}

system.addEventListener('change',applyTheme);
window.addEventListener('storage',event => {
  if (event.key !== key) return;
  preference = ['light','dark'].includes(event.newValue) ? event.newValue : 'system';
  applyTheme();
});
applyTheme();
