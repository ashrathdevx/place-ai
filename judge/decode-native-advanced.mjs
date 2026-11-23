const heap = `typedef struct { long long cost; int vertex; } Entry;
static Entry heap[100002];
static int length;

static void push(Entry value) {
    int i = ++length;
    while (i > 1 && heap[i / 2].cost > value.cost) {
        heap[i] = heap[i / 2];
        i /= 2;
    }
    heap[i] = value;
}

static Entry pop(void) {
    Entry first = heap[1], last = heap[length--];
    int i = 1;
    while (2*i <= length) {
        int child = 2*i;
        if (child < length && heap[child + 1].cost < heap[child].cost) ++child;
        if (last.cost <= heap[child].cost) break;
        heap[i] = heap[child];
        i = child;
    }
    heap[i] = last;
    return first;
}`;
const unionFind = `typedef struct { int u, v; long long weight; } Edge;
static int parent[50001], size[50001];

static int root(int v) {
    while (parent[v] != v) {
        parent[v] = parent[parent[v]];
        v = parent[v];
    }
    return v;
}

static int by_weight(const void *a, const void *b) {
    long long x = ((const Edge *)a)->weight, y = ((const Edge *)b)->weight;
    return (x > y) - (x < y);
}`;
const fenwick = `static long long tree[50001];

static void add(int n, int index, long long amount) {
    while (index <= n) {
        tree[index] += amount;
        index += index & -index;
    }
}

static long long prefix(int index) {
    long long total = 0;
    while (index > 0) {
        total += tree[index];
        index -= index & -index;
    }
    return total;
}`;
const inf = 'static const long long INF = 4000000000000000000LL;';

export const advanced = {
  'route-relaxation': ({adjacency}) => [`int n = (int)a[0], m = (int)a[1];
static long long weight[100000], distance[50001];
for (int i = 1; i <= n; ++i) {
    head[i] = -1;
    distance[i] = INF;
}
for (int i = m - 1; i >= 0; --i) {
    weight[edges] = a[4+3*i];
    add_edge((int)a[2+3*i], (int)a[3+3*i]);
}
distance[1] = 0;
Entry start = {0, 1};
push(start);
while (length) {
    Entry current = pop();
    int u = current.vertex;
    if (distance[u] != current.cost) continue;
    for (int e = head[u]; e != -1; e = next[e]) {
        int v = to[e];
        long long candidate = current.cost + weight[e];
        if (candidate < distance[v]) {
            distance[v] = candidate;
            Entry pending = {candidate, v};
            push(pending);
        }
    }
}
return distance[n] == INF ? -1 : distance[n];`, 'candidate < distance[v]', 'distance[v] == INF', [inf,adjacency,heap].join('\n\n')],
  'forest-cost': () => [`int n = (int)a[0], m = (int)a[1], components = n;
static Edge links[100000];
for (int i = 1; i <= n; ++i) {
    parent[i] = i;
    size[i] = 1;
}
for (int i = 0; i < m; ++i) {
    links[i].u = (int)a[2+3*i];
    links[i].v = (int)a[3+3*i];
    links[i].weight = a[4+3*i];
}
qsort(links, m, sizeof(*links), by_weight);
long long cost = 0;
for (int i = 0; i < m; ++i) {
    int u = root(links[i].u), v = root(links[i].v);
    if (u == v) continue;
    if (size[u] < size[v]) {
        int swap = u;
        u = v;
        v = swap;
    }
    parent[v] = u;
    size[u] += size[v];
    --components;
    cost += links[i].weight;
}
return components == 1 ? cost : -1;`, 'return components == 1 ? cost : -1', 'return cost', unionFind],
  'prerequisite-finish': ({adjacency}) => [`int n = (int)a[0], m = (int)a[1], first = 0, last = 0;
static long long duration[50001], finish[50001];
static int incoming[50001], queue[50001];
for (int i = 1; i <= n; ++i) {
    head[i] = -1;
    duration[i] = finish[i] = a[i+1];
}
for (int i = m - 1; i >= 0; --i) {
    int u = (int)a[n+2+2*i], v = (int)a[n+3+2*i];
    add_edge(u, v);
    ++incoming[v];
}
for (int i = 1; i <= n; ++i) if (!incoming[i]) queue[last++] = i;
long long answer = 0;
while (first < last) {
    int u = queue[first++];
    if (finish[u] > answer) answer = finish[u];
    for (int e = head[u]; e != -1; e = next[e]) {
        int v = to[e];
        long long candidate = finish[u] + duration[v];
        if (candidate > finish[v]) finish[v] = candidate;
        if (--incoming[v] == 0) queue[last++] = v;
    }
}
return first == n ? answer : -1;`, 'if (candidate > finish[v]) finish[v] = candidate', 'finish[v] = candidate', adjacency],
  'patch-ledger': () => [`int n = (int)a[0], q = (int)a[1];
for (int i = 1; i <= n; ++i) add(n, i, a[i+1]);
long long total = 0;
for (int i = 0; i < q; ++i) {
    int pos = n+2+3*i;
    int type = (int)a[pos], x = (int)a[pos+1];
    long long y = a[pos+2];
    if (type == 1) add(n, x, y);
    else total += prefix((int)y) - prefix(x-1);
}
return total;`, 'add(n, x, y)', 'add(n, x, y - (prefix(x) - prefix(x-1)))', fenwick],
  'subset-capacity': () => [`int n = (int)a[0], capacity = (int)a[1];
long long best[1001] = {0};
for (int i = 0; i < n; ++i) {
    int weight = (int)a[2+2*i];
    long long value = a[3+2*i];
    for (int limit = capacity; limit >= weight; --limit) {
        long long candidate = best[limit-weight] + value;
        if (candidate > best[limit]) best[limit] = candidate;
    }
}
return best[capacity];`, 'int limit = capacity; limit >= weight; --limit', 'int limit = weight; limit <= capacity; ++limit'],
  'lower-median': ({lower}) => [`int n = (int)a[0], m = (int)a[1];
int rank = (n + m + 1) / 2;
long long lo = -1000000000, hi = 1000000000;
while (lo < hi) {
    long long mid = lo + (hi - lo) / 2;
    int count = boundary(a + 2, n, mid, 1) + boundary(a + 2 + n, m, mid, 1);
    if (count >= rank) hi = mid;
    else lo = mid + 1;
}
return lo;`, 'rank = (n + m + 1) / 2', 'rank = (n + m) / 2 + 1', lower],
  'negative-transfers': () => [`int n = (int)a[0], m = (int)a[1];
long long distance[251];
for (int i = 1; i <= n; ++i) distance[i] = INF;
distance[1] = 0;
for (int pass = 0; pass < n - 1; ++pass) {
    int changed = 0;
    for (int e = 0; e < m; ++e) {
        int u = (int)a[2+3*e], v = (int)a[3+3*e];
        long long weight = a[4+3*e];
        if (distance[u] != INF && distance[u] + weight < distance[v]) {
            distance[v] = distance[u] + weight;
            changed = 1;
        }
    }
    if (!changed) break;
}
return distance[n] == INF ? 1000000000 : distance[n];`, 'pass < n - 1', 'pass < n - 2', inf],
  'bounded-paths': () => [`int rows = (int)a[0], columns = (int)a[1];
long long paths[300] = {1};
for (int i = 0; i < rows; ++i) {
    for (int j = 0; j < columns; ++j) {
        if (a[2+i*columns+j]) paths[j] = 0;
        else if (j > 0) paths[j] = (paths[j] + paths[j-1]) % 1000000007;
    }
}
return paths[columns-1];`, 'paths[j] = 0', 'continue'],
  'signed-streak': ({lower}) => [`static long long tails[100000];
int n = (int)a[0], size = 0;
for (int i = 1; i <= n; ++i) {
    int index = boundary(tails, size, a[i], 0);
    tails[index] = a[i];
    if (index == size) ++size;
}
return size;`, 'boundary(tails, size, a[i], 0)', 'boundary(tails, size, a[i], 1)', lower],
  'zero-segments': ({counts}) => [`long long target = a[1], prefix = 0, total = 0;
remember(0);
for (int i = 2; i < a[0] + 2; ++i) {
    prefix += a[i];
    total += count_for(prefix - target);
    remember(prefix);
}
return total;`, 'total += count_for(prefix - target);\n    remember(prefix);', 'remember(prefix);\n    total += count_for(prefix - target);', counts],
};
