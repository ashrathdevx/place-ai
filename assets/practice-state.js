const storageKey = 'place-ai:practice-v1';
const slugPattern = /^[a-z0-9-]+$/;
export function practiceState() {
  try { return JSON.parse(localStorage.getItem(storageKey)) ?? {}; } catch { return {}; }
}
export function updatePractice(slug, update) {
  const state = practiceState();
  const item = update(state[slug] ?? {});
  try { localStorage.setItem(storageKey,JSON.stringify({...state,[slug]:item})); } catch {}
  return item;
}
export function hasDraft(slug) {
  if (!slugPattern.test(slug)) return false;
  try {
    const draft = JSON.parse(localStorage.getItem('place-ai:draft:'+slug));
    return Boolean(draft && Object.values(draft).some(value => typeof value === 'string'));
  } catch { return false; }
}
export function reviewReason(item) {
  if (!item || item.skipped) return '';
  if (item.wrong >= 2) return 'Two or more wrong answers';
  if ((item.hints?.length ?? 0) >= 2) return 'Used two or more hints';
  return '';
}
export function recordVerdict(slug,id,verdict) {
  if (verdict !== 'WA' && verdict !== 'AC') return;
  updatePractice(slug,item => {
    if (item.lastVerdict === id) return item;
    return verdict === 'AC' ? {...item,lastVerdict:id,wrong:0,hints:[],skipped:false}
      : {...item,lastVerdict:id,wrong:(item.wrong ?? 0)+1,skipped:false};
  });
}
export function recordHint(slug,index) {
  updatePractice(slug,item => (item.hints ?? []).includes(index) ? item
    : {...item,hints:[...(item.hints ?? []),index],skipped:false});
}
export function studyProgress() {
  try { return JSON.parse(localStorage.getItem('place-ai:study-v1')) ?? {}; } catch { return {}; }
}
export function rememberLesson(module,slug) {
  try {
    const visited = studyProgress().visited ?? [];
    localStorage.setItem('place-ai:study-v1',JSON.stringify({
      visited:[...new Set([...visited,module])],last:{module,slug},
    }));
  } catch {}
}
