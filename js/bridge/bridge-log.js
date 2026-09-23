/* bridge-log.js — the bridge's readout: lines queue up and type out one at a
   time, digits weighted, the tiles flashing as each line commits. */
window.BridgeLog = (function () {
  function create(el) {            // el: the #btlog element (may be null: everything no-ops)
    let max = 6, head = null, queue = [];

    function push(text, kind) {
      if (!el) return;
      queue.push({ text, kind: kind || "" });
      if (queue.length > max + 2) queue.splice(0, queue.length - (max + 2));
    }

    function commit(entry) {
      /* the tiles flash with the line, not when it was queued */
      if (window.Instruments && Instruments.alert) Instruments.alert(entry.kind);
      const line = document.createElement("div");
      line.className = "tl " + entry.kind;
      el.appendChild(line);
      while (el.children.length > max) el.removeChild(el.firstChild);

      /* split into plain / numeric runs so the digits can carry weight */
      const parts = [];
      const re = /\d[\d,]*(?:\.\d+)?%?|∞|nan/g;
      let last = 0, m;
      while ((m = re.exec(entry.text)) !== null) {
        if (m.index > last) parts.push({ text: entry.text.slice(last, m.index), num: false });
        parts.push({ text: m[0], num: true });
        last = m.index + m[0].length;
      }
      if (last < entry.text.length) parts.push({ text: entry.text.slice(last), num: false });

      const spans = parts.map(p => {
        const s = document.createElement("span");
        if (p.num) s.className = "n";
        line.appendChild(s);
        return s;
      });
      const caret = document.createElement("span");
      caret.className = "caret";
      caret.textContent = "_";
      line.appendChild(caret);

      head = { line, parts, spans, caret, len: entry.text.length, shown: 0 };
    }

    function run(dt) {
      if (!el) return;
      if (head) {
        head.shown = Math.min(head.len, head.shown + dt * 58);
        const n = Math.floor(head.shown);
        let used = 0;
        for (let i = 0; i < head.parts.length; i++) {
          const p = head.parts[i];
          const take = Math.max(0, Math.min(p.text.length, n - used));
          const next = p.text.slice(0, take);
          if (head.spans[i].textContent !== next) head.spans[i].textContent = next;
          used += p.text.length;
        }
        if (n >= head.len) { head.caret.remove(); head = null; }
        return;
      }
      if (queue.length) commit(queue.shift());
    }

    return { push, run, setMax: n => { max = n; }, get idle() { return !head && !queue.length; } };
  }
  return { create };
})();
