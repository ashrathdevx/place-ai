export function watchArenaProgress(onData, onUnavailable = () => {}) {
  let request;
  let stopped = false;

  async function refresh() {
    if (request || stopped || document.hidden) return;
    request = new AbortController();
    try {
      const signal = AbortSignal.any([request.signal,AbortSignal.timeout(10000)]);
      const response = await fetch('/api/evidence/arena',{signal});
      if (!response.ok) throw new Error('Judge records unavailable');
      const data = await response.json();
      if (!stopped) onData(data);
    } catch {
      if (!stopped) onUnavailable();
    } finally {
      request = null;
    }
  }
  const storage = event => {
    if (event.key === 'place-ai:judge-verdict') void refresh();
  };
  const timer = setInterval(refresh,15000);
  document.addEventListener('visibilitychange',refresh);
  window.addEventListener('storage',storage);
  window.addEventListener('pagehide',event => {
    if (event.persisted) return;
    stopped = true;
    request?.abort();
    clearInterval(timer);
    document.removeEventListener('visibilitychange',refresh);
    window.removeEventListener('storage',storage);
  });
  void refresh();
}
