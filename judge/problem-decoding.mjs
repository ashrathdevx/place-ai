const headings = {
  Easy: ['What is the goal?', 'Walk through an example', 'Check one edge case'],
  Medium: ['Start with a direct approach', 'Find the bottleneck', 'Reveal the key insight'],
  Hard: ['Model the problem', 'Find what stays true', 'Connect the invariant to the limits'],
};

const notes = {
  'array-sum': [
    'Read n numbers and print their total. Every number contributes once, including negative values and zeros.',
    'For 1, 2, 3, 4, 5, the running totals are 1, 3, 6, 10, and 15.',
    'Three numbers equal to one billion add up to three billion. In C++, use a long long for the total.',
  ],
  'binary-search': [
    'Return the first zero-based position of the target in a sorted array. Return −1 when it is missing.',
    'In [1, 3, 4, 4, 4, 8, 9], position 2 is the first 4. On an equal value, the first match can still be to the left.',
    'In [4, 4, 4], the answer for target 4 is 0. Do not treat index 0 as a missing match.',
  ],
  'balanced-brackets': [
    'Each closing bracket must match the most recent opening bracket that is still waiting for a partner.',
    'In {[()]}, the openings wait in this order: {, [, (. The first closing bracket removes (, then ] removes [, then } removes {.',
    'A string containing only ( returns NO. The stack must be empty at the end.',
  ],
  'credit-ledger': [
    'Each question asks for the sum over a range of days. Both day numbers are included.',
    'For 4, −7, 6, 2, −1, days 2 through 5 add to 0. The cumulative total through day 5 is 4, and the total through day 1 is also 4. Their difference gives the answer.',
    'If the two day numbers are equal, the answer is that day’s adjustment alone. Keep cumulative totals in 64-bit integers.',
  ],
  'coin-change': [
    'Try every sequence of coins that totals the target, then keep the sequence using the fewest coins.',
    'Different sequences reach the same remaining amount. Re-solving that remainder for every sequence repeats the same work. Taking the biggest coin first can also fail with arbitrary denominations.',
    'Store the fewest coins for each amount. Choosing a last coin of value c reduces amount a to a − c. Start with zero coins for amount zero.',
  ],
  'shortest-path': [
    'Follow routes from 1 until you find n, and compare their lengths in edges.',
    'Trying full routes repeats visits and can grow quickly. Every edge costs one step, so the only priority is distance from the start.',
    'Explore with a queue by distance layer. The first visit to a vertex gives its minimum distance. If n is never visited, output −1.',
  ],
  'shuttle-budget': [
    'Choose a starting stop, extend the stretch one stop at a time, and track the longest stretch within the budget.',
    'Restarting the total for many starting stops can take quadratic time. All costs are nonnegative, so extending right never lowers the total.',
    'Keep one window. Add the next stop on the right and remove stops on the left until the total fits. Record the longest valid window, including free stops when the budget is zero.',
  ],
  'repair-escalation': [
    'From each ticket, scan right until you find a ticket with strictly lower priority.',
    'A long run with no lower priority can make almost every ticket scan much of the same suffix.',
    'Scan right to left with a stack of candidates. Remove candidates at least as high as the current priority. The first remaining candidate is the nearest strictly lower one.',
  ],
  'lab-bookings': [
    'Mark every occupied minute and count the marked minutes once.',
    'Timestamps span up to two trillion minutes. The count depends only on where bookings begin and end.',
    'Sort bookings by start, then merge overlaps into one occupied span. If a booking starts after the current span ends, add the current length and start a new span.',
  ],
  'workshop-capacity': [
    'Pick an allowance and try splitting the ordered jobs into the allowed number of shifts.',
    'Checking every allowance is too slow. Once an allowance works, every larger one also works.',
    'For a fixed allowance, fill each shift with the longest batch that fits in order. Count the shifts used and binary search for the smallest allowance passing that check.',
  ],
  'trail-beacons': [
    'Find a shortest path from each checkpoint to any beacon and record its length.',
    'Starting a new search from each checkpoint repeats exploration. Trails are undirected, so a path has the same length in either direction.',
    'Start one breadth-first search with all beacons already in the queue at distance zero. Each first visit gives the distance to the nearest beacon.',
  ],
  'study-rewards': [
    'Try taking or skipping each day, discarding any selection that has two days too close together.',
    'Enumerating all selections is exponential. Many choices leave the same prefix of earlier days available.',
    'For day i, compare skipping it with taking its reward plus the best score through day i − g − 1. Use zero when that earlier prefix is empty.',
  ],
  'matrix-fibonacci': [
    'Treat two consecutive Fibonacci numbers as the state. One transition transforms (F(k + 1), F(k)) into (F(k + 2), F(k + 1)).',
    'A fixed 2 × 2 matrix represents that transition. Composing two powers of the matrix adds their step counts while preserving the same state representation modulo 1,000,000,007.',
    'n can reach 10¹⁸, so taking one step per term is too slow. Square the matrix to build powers for 1, 2, 4, and more steps. Combine the powers indicated by the bits of n in O(log n) time.',
  ],
  'service-rollout': [
    'Model each prerequisite as a directed edge. Unlimited parallel work means that a service starts at the latest finish time among its prerequisites.',
    'When a service has no unfinished prerequisites left, its earliest start is final. Along each outgoing edge, pass along its finish time and keep the maximum seen so far.',
    'Process ready services with an indegree queue in O(n + m). If any services remain unprocessed, a dependency cycle blocks the rollout. Otherwise take the largest finish time and store times in 64-bit integers.',
  ],
};

export function getProblemDecoding(slug, difficulty) {
  if (!Object.hasOwn(notes,slug) || !Object.hasOwn(headings,difficulty)) return undefined;
  const content = notes[slug];
  const labels = headings[difficulty];
  return labels.map((label, index) => ({ label, text:content[index] }));
}
