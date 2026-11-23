import { advanced } from './decode-native-advanced.mjs';

const definitions = {};
function define(slug, body, fixed, bug, helpers = '') {
  definitions[slug] = {body,fixed,bug,helpers};
}
const order = `static int compare(const void *a, const void *b) {
    long long x = *(const long long *)a, y = *(const long long *)b;
    return (x > y) - (x < y);
}`;
const lower = `static int boundary(const long long *a, int n, long long target, int upper) {
    int lo = 0, hi = n;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] < target || (upper && a[mid] == target)) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}`;
const counts = `#define BUCKETS 262144
static long long keys[BUCKETS], counts[BUCKETS];
static unsigned char used[BUCKETS];

static int slot(long long key) {
    uint64_t hash = (uint64_t)key;
    hash = (hash ^ (hash >> 30)) * UINT64_C(0xbf58476d1ce4e5b9);
    hash = (hash ^ (hash >> 27)) * UINT64_C(0x94d049bb133111eb);
    unsigned index = (unsigned)(hash ^ (hash >> 31)) & (BUCKETS - 1);
    while (used[index] && keys[index] != key) index = (index + 1) & (BUCKETS - 1);
    return (int)index;
}

static long long count_for(long long key) {
    return counts[slot(key)];
}

static void remember(long long key) {
    int index = slot(key);
    used[index] = 1;
    keys[index] = key;
    ++counts[index];
}`;
const ranges = `typedef struct { long long first, second; } Range;
static int compare_ranges(const void *a, const void *b) {
    long long x = ((const Range *)a)->first, y = ((const Range *)b)->first;
    return (x > y) - (x < y);
}`;
const adjacency = `static int head[100001], next[400000], to[400000], edges;
static void add_edge(int u, int v) {
    to[edges] = v;
    next[edges] = head[u];
    head[u] = edges++;
}`;

define('last-reading', `long long sum = 0;
for (int i = 1; i <= a[0]; ++i) sum += a[i];
return sum;`, 'i <= a[0]', 'i < a[0]');
define('even-count', `int count = 0;
for (int i = 1; i <= a[0]; ++i) if (a[i] % 2 == 0) ++count;
return count;`, 'a[i] % 2 == 0', 'a[i] > 0 && a[i] % 2 == 0');
define('highest-reading', `long long best = a[1];
for (int i = 2; i <= a[0]; ++i) if (a[i] > best) best = a[i];
return best;`, 'best = a[1]', 'best = 0');
define('at-limit', `int count = 0;
for (int i = 2; i < a[0] + 2; ++i) if (a[i] <= a[1]) ++count;
return count;`, 'a[i] <= a[1]', 'a[i] < a[1]');
define('first-ticket', `for (int i = 0; i < a[0]; ++i)
    if (a[i + 2] == a[1]) return i + 1;
return -1;`, 'return i + 1', 'return i');
define('pick-middle', `qsort(a, 3, sizeof(*a), compare);
return a[1];`, 'return a[1]', 'return a[0]', order);
define('unique-stops', `int distinct = 0;
for (int i = 1; i <= a[0]; ++i) {
    distinct += count_for(a[i]) == 0;
    remember(a[i]);
}
return distinct;`, 'return distinct', 'return a[0]', counts);
define('rise-count', `int rises = 0;
for (int i = 2; i <= a[0]; ++i) rises += a[i] > a[i - 1];
return rises;`, 'a[i] > a[i - 1]', 'a[i] >= a[i - 1]');
define('cycle-slot', `long long n = a[0], start = a[1], k = a[2];
return (start - 1 + k) % n + 1;`, '(start - 1 + k) % n + 1', '(start + k) % n');
define('nonempty-batches', `long long n = a[0], k = a[1];
return (n + k - 1) / k;`, '(n + k - 1) / k', 'n / k');
define('range-read', `static long long prefix[100001];
int n = (int)a[0], left = (int)a[1], right = (int)a[2];
for (int i = 1; i <= n; ++i) prefix[i] = prefix[i - 1] + a[i + 2];
return prefix[right] - prefix[left - 1];`, 'prefix[left - 1]', 'prefix[left]');
define('budget-window', `int left = 2, best = 0;
long long total = 0, budget = a[1];
for (int right = 2; right < a[0] + 2; ++right) {
    total += a[right];
    while (left <= right && total > budget) total -= a[left++];
    int length = right - left + 1;
    if (length > best) best = length;
}
return best;`, 'total > budget', 'total >= budget');
define('threshold-index', `int n = (int)a[0];
int i = boundary(a + 2, n, a[1], 0);
return i == n ? -1 : i;`, 'a[1], 0', 'a[1] + 1, 0', lower);
define('pair-budget', `long long pairs = 0;
for (int i = 2; i < a[0] + 2; ++i) {
    pairs += count_for(a[1] - a[i]);
    remember(a[i]);
}
return pairs;`, 'pairs += count_for(a[1] - a[i])', 'pairs += count_for(a[1] - a[i]) != 0', counts);
define('merge-coverage', `static Range intervals[100000];
int n = (int)a[0];
for (int i = 0; i < n; ++i) {
    intervals[i].first = a[2*i + 1];
    intervals[i].second = a[2*i + 2];
}
qsort(intervals, n, sizeof(*intervals), compare_ranges);
long long left = intervals[0].first, right = intervals[0].second, total = 0;
for (int i = 1; i < n; ++i) {
    long long start = intervals[i].first, end = intervals[i].second;
    if (start > right) {
        total += right - left;
        left = start;
        right = end;
    } else if (end > right) {
        right = end;
    }
}
return total + right - left;`, '} else if (end > right) {', '} else {', ranges);
define('smaller-ticket', `static long long stack[100000];
int size = 0, count = 0;
for (int i = (int)a[0]; i >= 1; --i) {
    while (size && stack[size - 1] >= a[i]) --size;
    count += size > 0;
    stack[size++] = a[i];
}
return count;`, 'stack[size - 1] >= a[i]', 'stack[size - 1] > a[i]');
define('skip-neighbor', `long long previous = 0, best = 0;
for (int i = 1; i <= a[0]; ++i) {
    long long take = previous + a[i];
    previous = best;
    if (take > best) best = take;
}
return best;`, 'take = previous + a[i]', 'take = best + a[i]');
define('unweighted-distance', `int n = (int)a[0], m = (int)a[1];
static int distance[100001], queue[100001];
for (int i = 1; i <= n; ++i) head[i] = distance[i] = -1;
for (int i = 0; i < m; ++i) {
    int u = (int)a[2+2*i], v = (int)a[3+2*i];
    add_edge(u, v);
    add_edge(v, u);
}
distance[1] = 0;
int first = 0, last = 0;
queue[last++] = 1;
while (first < last) {
    int u = queue[first++];
    for (int e = head[u]; e != -1; e = next[e]) {
        int v = to[e];
        if (distance[v] != -1) continue;
        distance[v] = distance[u] + 1;
        queue[last++] = v;
    }
}
return distance[n];`, 'distance[1] = 0', 'distance[1] = 1', adjacency);
define('next-workshop', `static Range meetings[100000];
int n = (int)a[0], count = 0;
long long last = -1;
for (int i = 0; i < n; ++i) {
    meetings[i].first = a[2*i + 2];
    meetings[i].second = a[2*i + 1];
}
qsort(meetings, n, sizeof(*meetings), compare_ranges);
for (int i = 0; i < n; ++i) {
    if (meetings[i].second >= last) {
        ++count;
        last = meetings[i].first;
    }
}
return count;`, 'meetings[i].second >= last', 'meetings[i].second > last', ranges);
define('coin-checkout', `int goal = (int)a[1], dp[5001] = {0};
for (int i = 1; i <= goal; ++i) dp[i] = goal + 1;
for (int i = 2; i < a[0] + 2; ++i) {
    int coin = (int)a[i];
    for (int amount = coin; amount <= goal; ++amount) {
        if (dp[amount - coin] + 1 < dp[amount]) dp[amount] = dp[amount - coin] + 1;
    }
}
return dp[goal] <= goal ? dp[goal] : -1;`, 'int amount = coin; amount <= goal; ++amount', 'int amount = goal; amount >= coin; --amount');

for (const [slug, builder] of Object.entries(advanced)) {
  define(slug,...builder({adjacency,lower,counts}));
}

const source = (body, helpers, cpp) => `${cpp ? '#include <iostream>\n' : ''}#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>

${helpers ? helpers+'\n\n' : ''}static long long solve(long long *a) {
${body.split('\n').map(line => '    '+line).join('\n')}
}

int main(${cpp ? '' : 'void'}) {
    static long long values[400010];
    int length = 0;
${cpp ? `    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    while (length < 400010 && std::cin >> values[length]) ++length;
    if (length > 0) std::cout << solve(values) << '\\n';` : `    while (length < 400010 && scanf("%lld", &values[length]) == 1) ++length;
    if (length > 0) printf("%lld\\n", solve(values));`}
    return 0;
}
`;

export function nativePrograms(slug) {
  const spec = definitions[slug];
  if (!spec || spec.body.split(spec.fixed).length !== 2) throw new Error('Missing or ambiguous native correction for '+slug);
  const {body,fixed,bug,helpers} = spec;
  return Object.fromEntries(['c','cpp'].map(language => [language, {
    starter:source(body.replace(fixed,bug),helpers,language === 'cpp'),
    reference:source(body,helpers,language === 'cpp'),
  }]));
}
