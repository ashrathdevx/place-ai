import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalogSearch,problemHref,selectChallenges } from './navigation.js';
import { fallbackCatalog } from '../judge/public-catalog.mjs';

const all = fallbackCatalog('/api/problems',new URLSearchParams()).filter(item => item.kind === 'decode');
test('all unfiltered challenge links resolve directly without a topic', () => {
  assert.equal(selectChallenges(all,'').length,30);
  for (const item of all) {
    const link = new URL(problemHref(item.slug),'http://localhost');
    assert.equal(link.search,'');
    assert.equal(fallbackCatalog(link.pathname.replace('/arena/','/api/'),link.searchParams).title,item.title);
  }
});
test('filters narrow results independently and follow editorial and return links', () => {
  const inputs = '?level=Easy&q=Reading&topic=Arrays&unrelated=ignored';
  const results = selectChallenges(all,inputs);
  assert.ok(results.length > 0 && results.length < 10);
  assert.ok(results.every(item => item.difficulty === 'Easy' && item.topics.includes('Arrays')));
  const href = new URL(problemHref(results[0].slug,{search:inputs,editorial:true}),'http://localhost');
  assert.match(href.pathname,/\/editorial$/);
  assert.equal(href.search,catalogSearch(inputs));
  assert.equal(selectChallenges(all,'?q=never-matches-123').length,0);
});
