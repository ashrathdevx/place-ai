export const cseTrack = [
  {
    id:'arrays', title:'Array boundaries', challenge:'decode-last-reading', followUp:'decode-highest-reading',
    concept:'For an array of length n, valid indices run from 0 through n − 1. Trace the first and last iteration before you change a loop.',
    example:'For [2, −3, 8, 1], the running totals are 2, −1, 7, 8. A loop that stops before index 3 returns 7.',
    goal:'Check whether the running total includes the final reading.',
    hints:['Trace the index and the running total on each iteration.','Try a single reading. The total should equal that reading.'],
  },
  {
    id:'conditions', title:'Conditions and zero', challenge:'decode-even-count', followUp:'decode-at-limit',
    concept:'Write the condition from the input contract, then test values on each side of its boundary and exactly at the boundary.',
    example:'For −2, 0, and 3, the remainder after division by 2 is zero for −2 and 0. Both count as even.',
    goal:'Check how the condition handles zero.',
    hints:['Write down what qualifies as even before tracing the condition.','Try an input containing only zero.'],
  },
  {
    id:'search', title:'Searching for the first match', challenge:'decode-first-ticket', followUp:'decode-threshold-index',
    concept:'When the task asks for the first match, later matches must never displace it. Track the index and the answer separately.',
    example:'Searching [7, 2, 7] for 7 should return position 1 when the contract uses one-based positions.',
    goal:'Check whether the reported position uses the problem’s numbering.',
    hints:['Compare the internal array index with the position required by the statement.','Try a one-ticket input where that ticket matches the target.'],
  },
  {
    id:'sorting', title:'Sorting and ordering', challenge:'decode-pick-middle', followUp:'decode-merge-coverage',
    concept:'Separate the rule for ordering values from the rule for using them. Identify which index the ordered result belongs at.',
    example:'Ordering [9, 2, 5] gives [2, 5, 9]. The middle element is at index 1.',
    goal:'Check the branch that chooses the middle reading.',
    hints:['Write the values in sorted order on paper, then trace the program’s selected value.','Try the same three values in ascending and descending order.'],
  },
  {
    id:'debugging', title:'Debugging with small tests', challenge:'decode-rise-count', followUp:'decode-coin-checkout',
    concept:'Reduce a failing input until it contains the smallest example that still fails. Change one thing at a time and rerun the original case.',
    example:'For consecutive readings [4, 4, 5], only 4 → 5 is a rise. Equal neighbors make a small test for the comparison.',
    goal:'Use a small failing test to check how adjacent readings are compared.',
    hints:['Trace just one pair at a time and record whether it should count.','Try two equal readings.'],
  },
];

export function moduleProgress(module, catalog, visited) {
  const required = [module.challenge,module.followUp];
  const accepted = new Set(catalog.filter(item => item.solved === true).map(item => item.slug));
  if (required.every(slug => accepted.has(slug))) return 'Complete';
  return required.some(slug => accepted.has(slug)) || visited.includes(module.id) ? 'In progress' : 'To do';
}

export function continueStudy(catalog = [], progress = {}) {
  const visited = Array.isArray(progress.visited) ? progress.visited : [];
  const accepted = new Set(catalog.filter(item => item.solved === true).map(item => item.slug));
  const unfinished = cseTrack.filter(module => moduleProgress(module,catalog,visited) !== 'Complete');
  const module = unfinished.find(item => item.id === progress.last?.module) ?? unfinished[0];
  if (!module) return {label:'Review the track',url:'/learn?lesson=arrays'};
  const last = progress.last?.module === module.id ? progress.last.slug : null;
  const required = [module.challenge,module.followUp];
  const slug = required.includes(last) && !accepted.has(last) ? last
    : last ? required.find(item => !accepted.has(item)) : null;
  return {label:'Continue learning',url:slug ? challengeUrl(module.id,slug) : '/learn?lesson='+module.id};
}

export function challengeUrl(module,slug) {
  return '/arena/problems/'+encodeURIComponent(slug)+'?lesson='+encodeURIComponent(module);
}
