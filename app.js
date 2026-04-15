/* ── CREDITROLL — Movie Poster Credit Block Generator ───────────────────────
   app.js
──────────────────────────────────────────────────────────────────────────── */

'use strict';

/* ── STATE ──────────────────────────────────────────────────────────────────── */
const S = {
  widthPx:    1600,
  bg:         'black',
  nameWeight: '800',
  pairs:      [],   // [{ role: string, names: string[] }]
};

/* ── AI PARSE ────────────────────────────────────────────────────────────────── */
async function smartParse() {
  const raw = document.getElementById('raw-input').value.trim();
  if (!raw) { showToast('Paste some credits first'); return; }

  const btn = document.getElementById('parse-btn');
  btn.innerHTML = '<span class="inline-spin"></span>&nbsp;Parsing with AI&hellip;';
  btn.disabled = true;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are parsing movie poster credits. Given the following raw text, identify which items are JOB ROLES (e.g. Director, Producer, 1st AC, Nimkii, The Voice, etc.) and which are PEOPLE'S NAMES.

Return ONLY a valid JSON array. No explanation, no markdown fences, no preamble. Each element: {"role": "...", "names": ["Name1", "Name2"]}.

Rules:
- A role is immediately followed by the name(s) belonging to it.
- Multiple names can share one role — group them all in the names array.
- Character names used as roles (e.g. "Nimkii", "Dibikad", "The Voice", "The Rabbit", "Waaban") should be kept as roles if they precede an actor name.
- Never alter or invent names.
- Keep roles in their original capitalization.
- If a line is clearly a continuation name under the previous role, add it to that role's names array.

Raw credits input:
${raw}

Return ONLY the JSON array.`
        }]
      })
    });

    const data = await resp.json();
    const txt = (data.content || [])
      .map(b => b.text || '')
      .join('')
      .replace(/```json|```/gi, '')
      .trim();

    const parsed = JSON.parse(txt);
    S.pairs = parsed.filter(p => p && (p.role || (Array.isArray(p.names) && p.names.length)));
    showToast('AI parsed ' + S.pairs.length + ' entries');
  } catch (e) {
    console.error('AI parse failed, falling back to local parser:', e);
    S.pairs = localParse(document.getElementById('raw-input').value);
    showToast('Parsed locally (' + S.pairs.length + ' entries)');
  }

  renderParsedList();
  liveRender();
  document.getElementById('parsed-card').style.display = '';
  btn.innerHTML = '&#10022; Parse &amp; Generate';
  btn.disabled = false;
}

/* ── LOCAL FALLBACK PARSER ───────────────────────────────────────────────────── */
function localParse(text) {
  const lines  = text.split('\n').map(l => l.trim()).filter(Boolean);
  const roleRx = /^(director|writer|producer|editor|music|cinematograph|photography|costume|design|assistant|gaffer|grip|sound|hair|makeup|bts|script|animal|color|publicity|swing|1st|2nd|3rd|key|nimkii|dibikad|waaban|the |skypeople|seamstress|casting|vfx|visual|special|stunt|location|set dec|art dir|prop|post|mix|re-record|dolby)/i;
  const pairs  = [];
  let cur      = null;

  for (const line of lines) {
    const isRole =
      roleRx.test(line) ||
      (line.split(' ').length <= 4 && /^[A-Z]/.test(line) && line.length < 40);

    if (isRole && (!cur || cur.names.length > 0)) {
      cur = { role: line, names: [] };
      pairs.push(cur);
    } else if (cur) {
      cur.names.push(line);
    } else {
      cur = { role: '', names: [line] };
      pairs.push(cur);
    }
  }
  return pairs;
}

/* ── FILE UPLOAD ─────────────────────────────────────────────────────────────── */
function handleFile(input) {
  const file = input.files[0];
  if (!file) return;

  const reader    = new FileReader();
  reader.onload   = e => {
    let text = e.target.result;
    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      text = text
        .split('\n')
        .map(r => r.replace(/,/g, '\n').replace(/"/g, ''))
        .join('\n');
    }
    document.getElementById('raw-input').value = text.trim();
    showToast('File loaded — click Parse & Generate');
  };
  reader.readAsText(file);
}

/* ── RENDER PARSED LIST ──────────────────────────────────────────────────────── */
function renderParsedList() {
  document.getElementById('parsed-count').textContent = '(' + S.pairs.length + ')';
  document.getElementById('parsed-list').innerHTML = S.pairs
    .map(p =>
      '<div><span class="role-tag">' + esc(p.role) + '</span> &rarr; ' +
      esc((p.names || []).join(', ')) + '</div>'
    )
    .join('');
}

/* ── LIVE RENDER ─────────────────────────────────────────────────────────────── */
function liveRender() {
  if (!S.pairs.length) return;

  const el      = document.getElementById('credits-out');
  const wrap    = document.getElementById('checker-wrap');
  const roleSz  = parseInt(document.getElementById('role-sz').value)   || 13;
  const nameSz  = parseInt(document.getElementById('name-sz').value)   || 28;
  const lsRole  = parseFloat(document.getElementById('ls-role').value) || 1;
  const lh      = parseFloat(document.getElementById('lh').value) / 10 || 1.35;
  const pairGap = parseInt(document.getElementById('pair-gap').value)  || 10;
  const vpad    = parseInt(document.getElementById('v-pad').value)     || 8;
  const spad    = parseInt(document.getElementById('side-pad').value)  || 16;
  const cRole   = document.getElementById('c-role').value;
  const cName   = document.getElementById('c-name').value;
  const nw      = S.nameWeight;
  const w       = S.widthPx;

  let bgColor = 'transparent';
  if      (S.bg === 'black')  bgColor = '#000';
  else if (S.bg === 'white')  bgColor = '#fff';
  else if (S.bg === 'custom') bgColor = document.getElementById('c-bg').value;

  wrap.style.background = bgColor === 'transparent' ? '' : bgColor;

  el.style.cssText = [
    'width:'       + w    + 'px',
    'max-width:100%',
    'background:'  + bgColor,
    'padding:'     + vpad + 'px ' + spad + 'px',
    "font-family:'Barlow Condensed',sans-serif",
    'line-height:' + lh,
    'font-size:0',
    'text-align:center',
    'word-break:break-word'
  ].join(';');

  let html = '';
  S.pairs.forEach(function (p, i) {
    const nameStr = (p.names || []).filter(Boolean).join(', ');
    if (!nameStr && !p.role) return;

    if (i > 0) {
      html += '<span style="display:inline-block;width:' + pairGap + 'px;height:1px;"></span>';
    }

    html += '<span class="c-pair">';

    if (p.role) {
      html +=
        '<span class="c-role" style="' +
        'font-size:'      + roleSz + 'px;' +
        'color:'          + cRole  + ';' +
        'letter-spacing:' + lsRole + 'px;' +
        'font-weight:600;' +
        'text-transform:uppercase;' +
        '">' + esc(p.role) + '&nbsp;</span>';
    }

    if (nameStr) {
      html +=
        '<span class="c-names" style="' +
        'font-size:'   + nameSz + 'px;' +
        'color:'       + cName  + ';' +
        'font-weight:' + nw     + ';' +
        'text-transform:uppercase;' +
        '">' + esc(nameStr) + '</span>';
    }

    html += '</span>';
  });

  el.innerHTML = html;
  document.getElementById('info-w').textContent = w + 'px';
}

/* ── CONTROL HANDLERS ────────────────────────────────────────────────────────── */
function onDimChange() {
  const v    = parseFloat(document.getElementById('width-val').value) || 1600;
  const unit = document.getElementById('width-unit').value;
  const dpi  = parseInt(document.getElementById('dpi').value) || 300;

  if      (unit === 'px') S.widthPx = Math.round(v);
  else if (unit === 'in') S.widthPx = Math.round(v * dpi);
  else if (unit === 'cm') S.widthPx = Math.round(v * dpi / 2.54);

  liveRender();
}

function setWeight(btn) {
  document.querySelectorAll('#wt-tg .tg-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  S.nameWeight = btn.dataset.wt;
  liveRender();
}

function setBg(btn) {
  document.querySelectorAll('[data-bg]').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  S.bg = btn.dataset.bg;
  document.getElementById('bg-custom-row').style.display = S.bg === 'custom' ? '' : 'none';
  liveRender();
}

function syncHex(which) {
  document.getElementById('c-' + which + '-hex').value =
    document.getElementById('c-' + which).value;
}

function syncPicker(which) {
  const hex = document.getElementById('c-' + which + '-hex').value;
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    document.getElementById('c-' + which).value = hex;
    liveRender();
  }
}

function resetAll() {
  S.pairs = [];
  document.getElementById('raw-input').value       = '';
  document.getElementById('credits-out').innerHTML = '';
  document.getElementById('parsed-card').style.display = 'none';
}

/* ── EDIT MODAL ──────────────────────────────────────────────────────────────── */
function openEditor() {
  document.getElementById('edit-pairs').innerHTML = S.pairs
    .map(function (p, i) {
      return (
        '<div style="display:grid;grid-template-columns:1fr 2fr 28px;gap:6px;" data-idx="' + i + '">' +
        '<input type="text" value="' + esc(p.role || '') + '" placeholder="Role"  data-field="role"  data-idx="' + i + '" style="font-size:11px">' +
        '<input type="text" value="' + esc((p.names || []).join(', ')) + '" placeholder="Names" data-field="names" data-idx="' + i + '" style="font-size:11px">' +
        '<button onclick="removePair(' + i + ')" style="background:var(--panel);border:1px solid var(--border);border-radius:2px;color:var(--text-dim);cursor:pointer;padding:5px;font-size:11px">&#10005;</button>' +
        '</div>'
      );
    })
    .join('');

  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeEditor() {
  document.getElementById('modal-overlay').style.display = 'none';
}

function applyEdits() {
  const byIdx = {};
  document.querySelectorAll('#edit-pairs [data-idx]').forEach(function (el) {
    const i = el.dataset.idx;
    if (!byIdx[i]) byIdx[i] = {};
    if (el.dataset.field === 'role')  byIdx[i].role  = el.value.trim();
    if (el.dataset.field === 'names') byIdx[i].names = el.value.split(',').map(n => n.trim()).filter(Boolean);
  });
  S.pairs = Object.values(byIdx);
  renderParsedList();
  liveRender();
  closeEditor();
  showToast('Credits updated');
}

function removePair(idx) { S.pairs.splice(idx, 1); openEditor(); }
function addPair()       { S.pairs.push({ role: '', names: [''] }); openEditor(); }

/* ── EXPORT ──────────────────────────────────────────────────────────────────── */
function buildSVG() {
  const el    = document.getElementById('credits-out');
  const w     = S.widthPx;
  const h     = el.offsetHeight || 60;
  const gfont = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&display=swap';

  let bgRect = '';
  if      (S.bg === 'black')  bgRect = '<rect width="' + w + '" height="' + h + '" fill="#000"/>';
  else if (S.bg === 'white')  bgRect = '<rect width="' + w + '" height="' + h + '" fill="#fff"/>';
  else if (S.bg === 'custom') bgRect = '<rect width="' + w + '" height="' + h + '" fill="' + document.getElementById('c-bg').value + '"/>';

  const divStyle = (el.getAttribute('style') || '').replace(/"/g, "'");

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
    'width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">\n' +
    '  <defs><style>@import url(\'' + gfont + '\');</style></defs>\n' +
    '  ' + bgRect + '\n' +
    '  <foreignObject width="' + w + '" height="' + h + '">\n' +
    '    <div xmlns="http://www.w3.org/1999/xhtml" style="' + divStyle + '">\n' +
    '      ' + el.innerHTML + '\n' +
    '    </div>\n' +
    '  </foreignObject>\n' +
    '</svg>'
  );
}

function dlSVG() {
  if (!S.pairs.length) { showToast('Generate credits first'); return; }
  const blob = new Blob([buildSVG()], { type: 'image/svg+xml' });
  triggerDownload(URL.createObjectURL(blob), 'credits.svg');
  showToast('SVG downloaded');
}

function dlPNG(scale) {
  if (!S.pairs.length) { showToast('Generate credits first'); return; }
  const el = document.getElementById('credits-out');
  const w  = el.offsetWidth;
  const h  = el.offsetHeight;
  if (!w || !h) { showToast('Nothing to export'); return; }

  const canvas  = document.createElement('canvas');
  canvas.width  = w * scale;
  canvas.height = h * scale;
  const ctx     = canvas.getContext('2d');

  if      (S.bg === 'black')  { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  else if (S.bg === 'white')  { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  else if (S.bg === 'custom') { ctx.fillStyle = document.getElementById('c-bg').value; ctx.fillRect(0, 0, canvas.width, canvas.height); }

  const blob = new Blob([buildSVG()], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);
  const img  = new Image();

  img.onload = function () {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob(function (b) {
      triggerDownload(URL.createObjectURL(b), 'credits_' + scale + 'x.png');
      showToast('PNG ' + scale + 'x downloaded');
    });
  };
  img.onerror = function () {
    URL.revokeObjectURL(url);
    showToast('Export the SVG for best quality');
  };
  img.src = url;
}

function copyHTML() {
  if (!S.pairs.length) { showToast('Generate credits first'); return; }
  const el   = document.getElementById('credits-out');
  const full =
    '<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&display=swap" rel="stylesheet">\n' +
    el.outerHTML;
  navigator.clipboard.writeText(full);
  showToast('HTML copied to clipboard');
}

function triggerDownload(url, name) {
  const a = document.createElement('a');
  a.href     = url;
  a.download = name;
  a.click();
}

/* ── UTILITIES ───────────────────────────────────────────────────────────────── */
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

/* ── INIT ────────────────────────────────────────────────────────────────────── */
window.addEventListener('load', function () {
  document.getElementById('raw-input').value =
`Director
Ajuawak Kapashesit
Writer
Ajuawak Kapashesit
Producers
Bhavana Goparaju (Jeevi Films)
Ajuawak Kapashesit
Nimkii
Silvestrey P'orantes
Dibikad
Brian Joyce
Waaban
Kija Deer
The Voice
Gayle Winegar
The Rabbit
Clementine
Skypeople
Thomas Draskovic
Wahbon Spears
Bob Blake
Oogie_Push
Director of Photography
Vaughn Potter
Editor
Ryland Walker Knight
Music
Matthew Cardinal
Skypeople Designers
Justine Woods
Amber Buckanaga
Seamstress
Justine Woods
Amber Buckanaga
Costumer
Amber Buckanaga
Production Assistants
Nkaujoua Xiong
Sudarsna Mukund
Assistant Director
Oogie_Push
1st AC
Jade Chase-Jacobus
2nd AC
Krystal Duong
Gaffer
Anthony Flores
Swing
Daniel Owens
Key Grip
Patrick Wilson
Hair/Makeup
Natalie Christine
BTS
Sequoia Hauck
Sound Recordist
Owen Bradford
Script Supervisor
Mickies Kiros
Animal Handler
Naomi Thompson
Color
Away Team
Sound Designer and Mixer
Dante Fumo
Publicity Designer
Tham Collective`;

  smartParse();
});
