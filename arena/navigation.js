export const filterKeys = ['q','topic','level','progress','view'];

export function catalogSearch(search) {
  const current = new URLSearchParams(search);
  const filters = new URLSearchParams();
  for (const key of filterKeys) {
    const value = current.get(key);
    if (value) filters.set(key,value);
  }
  return filters.size ? '?'+filters : '';
}

export function selectChallenges(problems, search) {
  const filters = new URLSearchParams(search);
  const needle = (filters.get('q') ?? '').trim().toLowerCase();
  const topic = filters.get('topic'), level = filters.get('level'), progress = filters.get('progress');
  return problems.filter(item =>
    [item.title,...(item.topics ?? [])].some(value => value.toLowerCase().includes(needle)) &&
    (!level || item.difficulty === level) &&
    (!topic || item.topics?.includes(topic)) &&
    (!progress || item.solved === (progress === 'solved')));
}

export function problemHref(slug, {search = '', contest, editorial = false} = {}) {
  const params = new URLSearchParams(catalogSearch(search));
  if (contest) params.set('contest',contest);
  return '/arena/problems/'+encodeURIComponent(slug)+(editorial ? '/editorial' : '')+(params.size ? '?'+params : '');
}
