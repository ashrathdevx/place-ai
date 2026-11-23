export const hard = [
  ['route-relaxation','Courier Rerouting','Dijkstra','Find the shortest travel time from node 1 to node n. Print −1 if unreachable.', 'n and m, followed by m directed edges u v w.', '1 ≤ n ≤ 50,000\n0 ≤ m ≤ 100,000\n1 ≤ u, v ≤ n\n0 ≤ w ≤ 10⁹',
   `from heapq import heappop, heappush
n = a[0]
graph = [[] for _ in range(n+1)]
for u, v, w in zip(a[2::3], a[3::3], a[4::3]):
    graph[u].append((v, w))
dist = [float("inf")] * (n+1)
dist[1] = 0
queue = [(0, 1)]
while queue:
    cost, u = heappop(queue)
    if cost != dist[u]:
        continue
    for v, weight in graph[u]:
        candidate = cost+weight
        if candidate < dist[v]:
            dist[v] = candidate
            heappush(queue, (candidate, v))
return -1 if dist[n] == float("inf") else dist[n]`,
   'if candidate < dist[v]:','if dist[v] == float("inf"):',
   [['4 4 1 2 50 1 3 1 3 2 1 2 4 3',5,'The cheapest route updates the cost to node 2.'],['1 0',0],['3 4 1 3 10 1 2 0 2 3 0 3 1 0',0]],
   'First discovery does not settle a weighted shortest path. A later route may lower a tentative distance.', 'Test an expensive direct edge and a cheaper multi-edge route to the same node.', 'O((n+m) log(m+1)) time and O(n+m) space.'],
  ['forest-cost','Disconnected Grid','Kruskal','Return the minimum cost of connecting every node with undirected links, or −1 if impossible.', 'n and m, followed by m edges u v w.', '1 ≤ n ≤ 50,000\n0 ≤ m ≤ 100,000\n1 ≤ u, v ≤ n\n0 ≤ w ≤ 10⁹',
   `n = a[0]
parent = list(range(n+1))
size = [1]*(n+1)
def root(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x
cost, components = 0, n
for w, u, v in sorted(zip(a[4::3], a[2::3], a[3::3])):
    p, q = root(u), root(v)
    if p == q:
        continue
    if size[p] < size[q]:
        p, q = q, p
    parent[q] = p
    size[p] += size[q]
    components -= 1
    cost += w
return cost if components == 1 else -1`,
   'return cost if components == 1 else -1','return cost',
   [['4 2 1 2 3 3 4 1',-1,'Both components have links, but no link joins them.'],['1 0',0],['3 1 1 2 0',-1],['3 3 1 2 2 2 3 5 1 3 4',6]],
   'Kruskal can return a minimum spanning forest. A forest connects all nodes only when one component remains.', 'Test disconnected components and a single vertex.', 'O(m log(m+1) + n) time including sorting and O(n+m) space.'],
  ['prerequisite-finish','Late Dependency','Topological DP','Services can run in parallel after all their prerequisites complete. Return the overall finish time, or −1 for a cycle.', 'n and m, n positive durations, then m directed prerequisite pairs u v.', '1 ≤ n ≤ 50,000\n0 ≤ m ≤ 100,000\n1 ≤ duration ≤ 10⁹\n1 ≤ u,v ≤ n',
   `from collections import deque
n = a[0]
duration = [0]+a[2:n+2]
graph = [[] for _ in range(n+1)]
incoming = [0]*(n+1)
for u, v in zip(a[n+2::2], a[n+3::2]):
    graph[u].append(v)
    incoming[v] += 1
best = duration.copy()
queue = deque(i for i in range(1,n+1) if incoming[i] == 0)
visited = 0
while queue:
    u = queue.popleft()
    visited += 1
    for v in graph[u]:
        best[v] = max(best[v], best[u]+duration[v])
        incoming[v] -= 1
        if incoming[v] == 0:
            queue.append(v)
return max(best) if visited == n else -1`,
   'max(best[v], best[u]+duration[v])','best[u]+duration[v]',
   [['3 2 8 2 4 1 3 2 3',12,'Service 3 must wait for time 8.'],['2 2 2 3 1 2 2 1',-1],['4 3 6 1 3 2 1 4 2 4 3 4',8]],
   'The last prerequisite visited is not necessarily the latest to finish. Accumulate the maximum before marking a service ready.', 'Reorder equally ready prerequisites. The result must be independent of that order.', 'O(n+m) time and space.'],
  ['patch-ledger','Moving Ledger','Fenwick Tree','Apply point additions and answer range-sum queries. Print the sum of every query answer.', 'n and q, n starting values, then q triples t x y. For t=1 add y at index x. For t=2 query inclusive range x..y. Indices are one-based.', '1 ≤ n,q ≤ 50,000\nValues and additions have absolute value ≤ 10⁹\n1 ≤ x ≤ n and 1 ≤ x ≤ y ≤ n for queries.',
   `n = a[0]
bit = [0]*(n+1)
def add(i, value):
    while i <= n:
        bit[i] += value
        i += i & -i
def prefix(i):
    total = 0
    while i:
        total += bit[i]
        i -= i & -i
    return total
for i, value in enumerate(a[2:n+2], 1):
    add(i, value)
total = 0
for t, x, y in zip(a[n+2::3], a[n+3::3], a[n+4::3]):
    if t == 1:
        add(x, y)
    else:
        total += prefix(y)-prefix(x-1)
return total`,
   'add(x, y)','add(x, y-prefix(x)+prefix(x-1))',
   [['3 3 2 4 6 2 1 3 1 2 5 2 2 3',27,'The answers are 12 and 15 after adding 5 to position 2.'],['1 2 -2 1 1 -3 2 1 1',-5],['2 1 0 0 2 1 2',0]],
   'The update treats y as a replacement value. The contract specifies a delta, which the Fenwick primitives already support.', 'Start with a nonzero value and add a negative delta. A single-position query should return the old value plus that delta.', 'O((n+q) log(n+1)) time and O(n+q) space including input.'],
  ['subset-capacity','One Copy Per Parcel','Knapsack','Pack items of given weight and value at most once each. Return the maximum total value within capacity.', 'n and capacity, followed by n pairs weight and value.', '1 ≤ n ≤ 100\n0 ≤ capacity ≤ 1,000\n1 ≤ weight ≤ 10⁹\n0 ≤ value ≤ 10⁹',
   `capacity = a[1]
dp = [0]*(capacity+1)
for weight, value in zip(a[2::2], a[3::2]):
    for limit in range(capacity, weight-1, -1):
        dp[limit] = max(dp[limit], dp[limit-weight]+value)
return dp[capacity]`,
   'range(capacity, weight-1, -1)','range(weight, capacity+1)',
   [['2 6 3 5 4 6',6,'Using the weight-3 item twice is illegal.'],['1 10 2 3',3],['2 5 2 3 3 4',7]],
   'Ascending capacities let a transition read a state updated by the same item. Descending order reads the preceding item layer.', 'A single weight-2 item of value 3 must contribute at most 3, even with capacity 10.', 'O(n × capacity) time and O(n + capacity) space including input slices.'],
  ['lower-median','Median Boundary','Binary Search on Answer','Return the lower median of two sorted arrays, treating all values as one multiset. For even total length, choose the smaller middle value.', 'n and m, followed by the n values of the first array and the m values of the second.', '0 ≤ n,m ≤ 100,000\n1 ≤ n+m\n−10⁹ ≤ each value ≤ 10⁹',
   `from bisect import bisect_right
n, m = a[:2]
left, right = a[2:n+2], a[n+2:]
rank = (n+m+1)//2
lo, hi = min(x[0] for x in (left,right) if x), max(x[-1] for x in (left,right) if x)
while lo < hi:
    mid = (lo+hi)//2
    count = bisect_right(left, mid)+bisect_right(right, mid)
    if count >= rank:
        hi = mid
    else:
        lo = mid+1
return lo`,
   'rank = (n+m+1)//2','rank = (n+m)//2+1',
   [['2 2 1 5 2 3',2,'The middle pair after merging is 2 and 3.'],['0 2 -8 -2',-8],['2 3 1 4 1 1 9',1]],
   'The one-based target rank is the lower middle. The feasibility predicate counts all entries ≤ the candidate, including duplicates.', 'Test an even multiset whose middle values differ and an empty first array.', 'O(log(value range + 1) × (log(n+1)+log(m+1))) search after O(n+m) input.'],
  ['negative-transfers','The Last Relaxation','Bellman–Ford','Return the shortest cost from vertex 1 to n with signed edge weights. Print 1,000,000,000 if unreachable. No negative cycle is reachable from vertex 1.', 'n and m, followed by m directed edges u v w.', '1 ≤ n ≤ 250\n0 ≤ m ≤ 5,000\n1 ≤ u, v ≤ n\n−10⁵ ≤ w ≤ 10⁵',
   `n = a[0]
edges = list(zip(a[2::3], a[3::3], a[4::3]))
dist = [float("inf")]*(n+1)
dist[1] = 0
for _ in range(n-1):
    changed = False
    for u, v, w in edges:
        if dist[u]+w < dist[v]:
            changed = True
            dist[v] = dist[u]+w
    if not changed:
        break
return 10**9 if dist[n] == float("inf") else dist[n]`,
   'range(n-1)','range(max(0,n-2))',
   [['4 3 3 4 -5 2 3 2 1 2 4',1,'Reverse edge order needs three passes to propagate the path.'],['2 1 1 2 -3',-3],['3 1 2 3 -6',1000000000]],
   'A shortest simple route may use n−1 edges. With adversarial input order, one pass can extend the known route by just one edge.', 'List the edges of a path in reverse traversal order.', 'O(nm) time and O(n+m) space.'],
  ['bounded-paths','Broken Grid Corner','Grid Dynamic Programming','Count paths from the upper-left to lower-right corner going only right or down. Cells marked 1 are blocked. Use modulo 1,000,000,007.', 'r and c, then r rows of c integers (0 or 1).', '1 ≤ r,c ≤ 300',
   `r, c = a[:2]
dp = [0]*c
dp[0] = 1
for i in range(r):
    for j in range(c):
        if a[2+i*c+j]:
            dp[j] = 0
        elif j:
            dp[j] = (dp[j]+dp[j-1])%1000000007
return dp[-1]`,
   'dp[j] = 0','continue',
   [['3 3 0 0 0 0 1 0 0 0 0',2,'Only the paths around the blocked center survive.'],['1 1 1',0],['2 2 0 0 0 1',0],['2 3 0 0 0 0 0 0',3]],
   'A blocked cell must erase the previous-row count stored in that column. Skipping the assignment leaks paths through blocked cells.', 'Block the start or end cell and check that the result is zero.', 'O(r × c) time and O(c) DP space after reading the grid.'],
  ['signed-streak','Strictly Increasing Chain','Longest Increasing Subsequence','Find the longest strictly increasing subsequence length.', 'n, then n integers.', '1 ≤ n ≤ 100,000\n−10⁹ ≤ each value ≤ 10⁹',
   `from bisect import bisect_left, bisect_right
tails = []
for value in a[1:]:
    i = bisect_left(tails, value)
    if i == len(tails):
        tails.append(value)
    else:
        tails[i] = value
return len(tails)`,
   'i = bisect_left(tails, value)','i = bisect_right(tails, value)',
   [['6 2 2 1 3 3 4',3,'One longest subsequence is 1, 3, 4.'],['4 5 5 5 5',1],['4 4 3 2 1',1]],
   'Each tail records the smallest ending value for a given length. Equal values must replace an existing tail, because they cannot extend a strictly increasing chain.', 'An all-equal array must return length one.', 'O(n log(n+1)) time and O(n) space.'],
  ['zero-segments','Signed Balance Windows','Prefix Sum Frequencies','Count nonempty consecutive segments whose sum equals target. Values can be positive, negative, or zero.', 'n and target, then n integers.', '1 ≤ n ≤ 100,000\n−10⁹ ≤ each value ≤ 10⁹\n−10¹⁴ ≤ target ≤ 10¹⁴',
   `from collections import Counter
counts = Counter({0:1})
target = a[1]
prefix = total = 0
for x in a[2:]:
    prefix += x
    total += counts[prefix-target]
    counts[prefix] += 1
return total`,
   '    total += counts[prefix-target]\n    counts[prefix] += 1','    counts[prefix] += 1\n    total += counts[prefix-target]',
   [['3 0 1 -1 0',3,'The valid segments are 1..2, 1..3, and 3..3.'],['3 0 0 0 0',6],['3 3 1 2 3',2]],
   'Only earlier prefixes define a nonempty segment. Inserting the current prefix before looking it up counts a zero-length segment when the target is zero.', 'Three zeros give six nonempty segments. Check why the empty prefix still belongs in the initial map.', 'O(n) expected time and O(n) space.'],
];

// Large fixtures exercise algorithmic limits in addition to visible counterexamples.
const chain = (n, edge) => Array.from({length:n-1},(_,i) => edge(i+1)).join(' ');
const repeat = (n, value) => (value+' ').repeat(n).trimEnd();
const side = 300;
const stress = [
  [`24000 23999 ${chain(24000,i => `${i} ${i+1} 1`)}`,23999],
  [`24000 23999 ${chain(24000,i => `${i} ${i+1} 2`)}`,47998],
  [`22000 21999 ${repeat(22000,10)} ${chain(22000,i => `${i} ${i+1}`)}`,220000],
  [`20000 2 ${repeat(20000,1)} 1 19999 9 2 1 20000`,20009],
  [`100 1000 ${repeat(100,'2 2')}`,200],
  [`20000 20000 ${repeat(20000,3)} ${repeat(20000,10)}`,3],
  [`250 249 ${chain(250,i => `${250-i} ${251-i} -1`)}`,-249],
  [`${side} ${side} ${repeat(side*side,1)}`,0],
  [`50000 ${repeat(50000,7)}`,1],
  [`50000 0 ${repeat(50000,0)}`,1250025000],
];
for (const [index, fixture] of stress.entries()) hard[index][9].push(fixture);
