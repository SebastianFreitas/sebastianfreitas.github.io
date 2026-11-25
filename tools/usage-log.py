# Usage meter: appends one line per reading to a shared TSV (weekly % typed in by the caller, spend summed from the transcripts since the previous line).
# py -3 tools/usage-log.py --week 40 --fable 20 [--five 5] [--note "text"] [--log path] [--since 2026-11-23T08:00]
# py -3 tools/usage-log.py --show [n]
import argparse, datetime, glob, json, os, sys

ROOT = os.path.expanduser('~/.claude/projects')
DEFAULT_LOG = os.path.expanduser('~/.claude/usage-readings.tsv')
COLS = ['time_utc', 'week_pct', 'fable_pct', 'five_pct', 'usd_total', 'usd_fable', 'usd_opus', 'usd_sonnet',
        'calls', 'cache_read_mtok', 'usd_ctx_over_150k', 'note']
USAGE = 'usage: py -3 tools/usage-log.py --week <0-100> --fable <0-100> [--five <0-100>] [--note text] [--log path] [--since ISO] | --show [n]'
#            input, 5m write, 1h write, cache read, output  (list prices per million tokens)
PRICE = {'fable': (8, 10, 16, 0.20, 40), 'opus': (4, 5, 8, 0.20, 20), 'sonnet': (2, 2.5, 4, 0.10, 10), 'haiku': (0.1, 0.125, 0.2, 0.01, 0.5)}


def fam(m):
    for k in PRICE:
        if k in (m or ''):
            return k
    return 'sonnet'


def cost(r):
    p = PRICE[fam(r['model'])]
    cw5 = r['cw'] - r['cw1h']
    return (p[0] * r['inp'] + p[1] * cw5 + p[2] * r['cw1h'] + p[3] * r['cr'] + p[4] * r['out']) / 1e6


def parse_ts(s):
    return datetime.datetime.fromisoformat(s.replace('Z', '+00:00'))


def load(start, end):
    """API calls of every project with start < timestamp <= end, one per message id."""
    cut = start.timestamp()
    found = {}
    for d in glob.glob(os.path.join(ROOT, '*')):
        for f in glob.glob(os.path.join(d, '**', '*.jsonl'), recursive=True):
            try:
                if os.path.getmtime(f) < cut or 'context-watch' in f:
                    continue
                fh = open(f, encoding='utf-8')
            except Exception:
                continue
            with fh:
                for line in fh:
                    if '"usage"' not in line:
                        continue
                    try:
                        o = json.loads(line)
                        if o.get('type') != 'assistant':
                            continue
                        m = o.get('message') or {}
                        u = m.get('usage')
                        if not u or m.get('model') == '<synthetic>':
                            continue
                        t = parse_ts(o.get('timestamp') or '')
                        if not (start < t <= end):
                            continue
                        cc = u.get('cache_creation') or {}
                        found[m.get('id') or o.get('uuid')] = dict(
                            model=m.get('model') or '', inp=u.get('input_tokens', 0),
                            cw=u.get('cache_creation_input_tokens', 0), cw1h=cc.get('ephemeral_1h_input_tokens', 0),
                            cr=u.get('cache_read_input_tokens', 0), out=u.get('output_tokens', 0))
                    except Exception:
                        continue
    return list(found.values())


def read_rows(path):
    if not os.path.exists(path):
        return []
    with open(path, encoding='utf-8') as fh:
        rows = [l.rstrip('\n').split('\t') for l in fh if l.strip()]
    return [r for r in rows[1:] if len(r) >= 5]


def pct(s):
    v = float(s)
    if not 0 <= v <= 100:
        raise ValueError
    return v


def fmt(v):
    return ('%g' % v)


def show(path, n):
    rows = read_rows(path)
    allrows = rows
    rows = rows[-n:]
    head = ['time_utc', 'week', 'fable', 'five', 'usd', 'calls', 'ctx>150k', 'pts/$100', 'note']
    table = [head]
    for r in rows:
        i = allrows.index(r)
        rate = ''
        if i > 0:
            try:
                usd = float(r[4])
                if usd > 0:
                    rate = '%.1f' % ((float(r[1]) - float(allrows[i - 1][1])) / usd * 100)
            except ValueError:
                pass
        g = lambda k: r[k] if len(r) > k else ''
        table.append([g(0), g(1), g(2), g(3), g(4), g(8), g(10), rate, g(11)])
    w = [max(len(row[c]) for row in table) for c in range(len(head))]
    for row in table:
        print('  '.join(row[c].ljust(w[c]) for c in range(len(head))).rstrip())


def main():
    ap = argparse.ArgumentParser(add_help=False)
    ap.add_argument('--week')
    ap.add_argument('--fable')
    ap.add_argument('--five')
    ap.add_argument('--note', default='')
    ap.add_argument('--log', default=DEFAULT_LOG)
    ap.add_argument('--since')
    ap.add_argument('--show', nargs='?', const=10, type=int)
    try:
        a, extra = ap.parse_known_args()
    except SystemExit:
        print(USAGE)
        sys.exit(2)
    log = os.path.expanduser(a.log)
    if a.show is not None:
        show(log, a.show)
        return
    try:
        if extra:
            raise ValueError
        week, fable = pct(a.week), pct(a.fable)
        five = pct(a.five) if a.five is not None else None
    except (ValueError, TypeError):
        print(USAGE)
        sys.exit(2)

    now = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
    rows = read_rows(log)
    first = not rows
    if rows:
        start = parse_ts(rows[-1][0])
    elif a.since:
        start = datetime.datetime.fromisoformat(a.since)
        if start.tzinfo is None:
            start = start.astimezone()
    else:
        loc = datetime.datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)
        loc -= datetime.timedelta(days=loc.weekday())
        if loc > datetime.datetime.now():
            loc -= datetime.timedelta(days=7)
        start = loc.astimezone()
    start = start.astimezone(datetime.timezone.utc)

    calls = load(start, now)
    by = {'fable': 0.0, 'opus': 0.0, 'sonnet': 0.0}
    total = over = 0.0
    cr = 0
    for r in calls:
        c = cost(r)
        total += c
        k = fam(r['model'])
        if k in by:
            by[k] += c
        cr += r['cr']
        if r['inp'] + r['cr'] + r['cw'] > 150000:
            over += c
    vals = ['%.2f' % total, '%.2f' % by['fable'], '%.2f' % by['opus'], '%.2f' % by['sonnet'], str(len(calls)),
            '%.2f' % (cr / 1e6), '%.2f' % over]
    line = [now.strftime('%Y-%m-%dT%H:%M:%SZ'), fmt(week), fmt(fable), '' if five is None else fmt(five)] + vals + \
           [a.note.replace('\t', ' ').replace('\n', ' ')]
    os.makedirs(os.path.dirname(os.path.abspath(log)), exist_ok=True)
    with open(log, 'a', encoding='utf-8', newline='\n') as fh:
        if first:
            fh.write('\t'.join(COLS) + '\n')
        fh.write('\t'.join(line) + '\n')

    print('\t'.join(line))
    if first:
        print('first line: $%.2f over %d calls since %s (%.1f%% from calls over 150k)'
              % (total, len(calls), start.strftime('%Y-%m-%dT%H:%M:%SZ'), over / total * 100 if total else 0))
    else:
        pts = week - float(rows[-1][1])
        rate = '%.1f' % (pts / total * 100) if total > 0 else 'n/a'
        print('since last line: %+g weekly points for $%.2f (%s points per $100)' % (pts, total, rate))
        print('%.1f%% of that spend came from calls over 150k context' % (over / total * 100 if total else 0))


main()
