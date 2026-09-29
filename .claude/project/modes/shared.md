### Portfolio notes (shared)

- Landing step: run `py -3 tools/bump.py` before a commit that changes
  any script or stylesheet (only this mode bumps).
- **Try:** `Set-Location C:\Users\Traff\Desktop\sebas\Portfolio; py -3 serve.py`
  and the line under it gives `http://127.0.0.1:8765<url path>`. If 8765
  is busy, the owner already has it running: give only the URL.
- Merging by hand: `?v=` numbers no longer conflict (the `cachebust`
  merge driver that `try.py` installs ignores them); if one still does,
  keep either side. Two branches adding `<script>` lines at the same
  spot: keep both, in load order. After the last merge: `py -3
  tools/bump.py` once and the full `py -3 tools/nav-flows.test.py`.
