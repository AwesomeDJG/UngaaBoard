(function(){
  // Minimal theme creator and apply script
  const KEY = 'unga_theme_v1';
  const defaultTheme = {
    '--bg': '#0f1115',
    '--bg-soft': '#14171d',
    '--card': '#161a21',
    '--card-hover': '#1c202a',
    '--border': '#262b36',
    '--text': '#e6e6eb',
    '--muted': '#9aa0aa',
    '--accent': '#4f8cff',
    '--accent-2': '#7c6cff',
    '--danger': '#ff5c5c',
    '--success': '#2ecc71',
    '--shadow': '0 10px 30px rgba(0,0,0,.35)',
    '--radius': '12px'
  };

  function safeGetItem(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function safeSetItem(k,v){ try { localStorage.setItem(k,v); } catch(e){ console.warn('theme save failed', e); } }

  function applyTheme(obj){
    const root = document.documentElement;
    obj = obj || {};
    const keys = Object.keys(defaultTheme);
    keys.forEach(k => root.style.setProperty(k, obj[k] ?? defaultTheme[k]));
  }

  function loadTheme(){
    try {
      const raw = safeGetItem(KEY);
      if (!raw) return defaultTheme;
      const parsed = JSON.parse(raw);
      return Object.assign({}, defaultTheme, parsed);
    } catch(e){ return defaultTheme; }
  }

  // Create modal UI (injected once)
  function createModal(){
    if (document.getElementById('ungaThemeModal')) return;
    const modal = document.createElement('div');
    modal.id = 'ungaThemeModal';
    modal.innerHTML = `
      <div class="unga-modal-backdrop" role="dialog" aria-modal="true">
        <div class="unga-modal">
          <h3>Theme Creator</h3>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <label>Background<br><input type="color" data-var="--bg" /></label>
            <label>Card<br><input type="color" data-var="--card" /></label>
            <label>Text<br><input type="color" data-var="--text" /></label>
            <label>Border<br><input type="color" data-var="--border" /></label>
            <label>Accent<br><input type="color" data-var="--accent" /></label>
            <label>Accent 2<br><input type="color" data-var="--accent-2" /></label>
            <label>Muted<br><input type="color" data-var="--muted" /></label>
            <label>Danger<br><input type="color" data-var="--danger" /></label>
          </div>
          <div style="margin-top:12px; display:flex; gap:8px; align-items:center;">
            <button id="ungaThemeSave">Save</button>
            <button id="ungaThemeReset">Reset</button>
            <button id="ungaThemeClose">Close</button>
            <span id="ungaThemeMsg" style="margin-left:8px; color:var(--muted)"></span>
          </div>
        </div>
      </div>
    `;
    const style = document.createElement('style');
    style.id = 'ungaThemeStyles';
    style.textContent = `
      #ungaThemeModal .unga-modal-backdrop{ position:fixed; inset:0; display:flex; align-items:center; justify-content:center; z-index:9999; }
      #ungaThemeModal .unga-modal{ background:var(--card); border:1px solid var(--border); padding:18px; border-radius:12px; width:640px; box-shadow:var(--shadow); color:var(--text); }
      #ungaThemeModal label{ display:flex; flex-direction:column; font-size:13px; color:var(--muted); }
      #ungaThemeModal input[type=color]{ width:72px; height:36px; border-radius:8px; border:1px solid var(--border); background:transparent; }
      #ungaThemeModal button{ padding:8px 12px; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);

    // Populate inputs with current theme
    const theme = loadTheme();
    const inputs = modal.querySelectorAll('input[type=color]');
    inputs.forEach(inp => {
      const v = theme[inp.dataset.var] || defaultTheme[inp.dataset.var] || '#000000';
      // If value isn't a hex color, try to convert rgb -> hex, otherwise fallback
      inp.value = rgbToHex(v) || v;
      inp.addEventListener('input', onInputChange);
    });

    modal.querySelector('#ungaThemeSave').addEventListener('click', onSave);
    modal.querySelector('#ungaThemeReset').addEventListener('click', onReset);
    modal.querySelector('#ungaThemeClose').addEventListener('click', closeModal);
  }

  function onInputChange(e){
    const inp = e.currentTarget;
    const varName = inp.dataset.var;
    if (!varName) return;
    const tmp = {};
    tmp[varName] = inp.value;
    applyTheme(Object.assign({}, loadTheme(), tmp));
  }

  function onSave(){
    const modal = document.getElementById('ungaThemeModal');
    const inputs = modal.querySelectorAll('input[type=color]');
    const out = {};
    inputs.forEach(inp => { if (inp.dataset.var) out[inp.dataset.var] = inp.value; });
    try { safeSetItem(KEY, JSON.stringify(out)); document.getElementById('ungaThemeMsg').textContent = 'Saved ✓'; } catch(e){ document.getElementById('ungaThemeMsg').textContent = 'Save failed'; }
  }

  function onReset(){
    try { safeSetItem(KEY, ''); } catch(e){}
    applyTheme(defaultTheme);
    const modal = document.getElementById('ungaThemeModal');
    if (modal) {
      const inputs = modal.querySelectorAll('input[type=color]');
      inputs.forEach(inp => { inp.value = rgbToHex(defaultTheme[inp.dataset.var]) || '#000000'; });
      document.getElementById('ungaThemeMsg').textContent = 'Reset to defaults';
    }
  }

  function closeModal(){
    const modal = document.getElementById('ungaThemeModal');
    if (modal) modal.remove();
    const style = document.getElementById('ungaThemeStyles'); if (style) style.remove();
  }

  function openModal(){ createModal(); }

  // Utility: convert rgb(...) or rgba(...) to hex when possible
  function rgbToHex(v){
    if (!v) return null;
    v = v.trim();
    if (v[0] === '#') return v;
    const m = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return null;
    const r = parseInt(m[1],10), g = parseInt(m[2],10), b = parseInt(m[3],10);
    return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
  }

  // Attach to #themeBtn if present; otherwise only apply theme on load
  function init(){
    try { applyTheme(loadTheme()); } catch(e){ console.warn('apply theme', e); }
    const btn = document.getElementById('themeBtn');
    if (btn) {
      btn.addEventListener('click', openModal);
      // make sure button is visible when JS runs (profile.html will toggle display for owner)
      // leave visibility control to page logic
    }
  }

  // Initialize on DOMContentLoaded
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();