/* Режим заметок ?review (Netlify Forms, форма review). */
/* Режим заметок: открыть сайт с ?review. Клик по любому месту – поле для заметки. Заметка уходит в Netlify Forms (форма review)
   с адресом места (блок, CSS-путь, текст рядом, точка, экран). Отправленные заметки остаются номерками у элементов (в этом браузере). */
(() => {
  if (!new URLSearchParams(location.search).has('review')) return;
  const KEY = 'kosmosky-d-review', FIELDS = ['section', 'selector', 'snippet', 'point', 'viewport', 'page', 'note'];
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const save = l => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} };
  const cssPath = el => { const parts = [];
    while (el && el.nodeType === 1 && el.tagName !== 'BODY') {
      if (el.id) { parts.unshift('#' + el.id); break; }
      let part = el.tagName.toLowerCase(); const cls = [...el.classList].filter(c => !c.startsWith('rv-'))[0]; if (cls) part += '.' + cls;
      const sibs = el.parentElement ? [...el.parentElement.children].filter(x => x.tagName === el.tagName) : [];
      if (sibs.length > 1) part += ':nth-of-type(' + (sibs.indexOf(el) + 1) + ')';
      parts.unshift(part); el = el.parentElement; }
    return parts.join(' > '); };
  const snippet = el => (el.getAttribute('aria-label') || el.getAttribute('alt') || el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140);
  let on = true, hovered = null, ctx = null, notes = load();
  const bar = document.createElement('div'); bar.className = 'rv-bar t-small';
  bar.innerHTML = '<button type="button" aria-pressed="true">Notes: on</button><span class="rv-count"></span><button type="button" class="rv-clear">Сбросить номерки</button>';
  const tg = bar.querySelector('button'), cnt = bar.querySelector('.rv-count');
  const pop = document.createElement('form'); pop.className = 'rv-pop t-small'; pop.hidden = true;
  pop.innerHTML = '<p class="rv-where"></p><textarea name="note" placeholder="Что здесь поправить?" required></textarea><div class="rv-act"><button type="button" class="rv-cancel">Отмена</button><button type="submit">Отправить</button></div>';
  const where = pop.querySelector('.rv-where'), ta = pop.querySelector('textarea');
  document.body.append(bar, pop);
  const ui = t => bar.contains(t) || pop.contains(t) || (t.classList && t.classList.contains('rv-pin')) || !!(t.closest && t.closest('.intro'));
  const count = () => cnt.textContent = notes.length ? 'Отправлено: ' + notes.length : 'Кликните по элементу';
  const pins = () => { document.querySelectorAll('.rv-pin').forEach(p => p.remove());
    notes.forEach((n, i) => { let el; try { el = document.querySelector(n.selector); } catch (e) {} if (!el) return;
      const r = el.getBoundingClientRect(), p = document.createElement('span'); p.className = 'rv-pin'; p.textContent = i + 1; p.dataset.tip = n.note;
      p.style.left = (r.left + scrollX + r.width * n.px) + 'px'; p.style.top = (r.top + scrollY + r.height * n.py) + 'px'; document.body.append(p); }); };
  const close = () => { pop.hidden = true; ctx = null; };
  tg.addEventListener('click', () => { on = !on; tg.textContent = 'Notes: ' + (on ? 'on' : 'off'); tg.setAttribute('aria-pressed', on); if (!on) { close(); hovered && hovered.classList.remove('rv-hover'); } });
  pop.querySelector('.rv-cancel').addEventListener('click', close);
  bar.querySelector('.rv-clear').addEventListener('click', () => { notes = []; save(notes); pins(); count(); });
  document.addEventListener('mouseover', e => { if (!on || ui(e.target)) return; hovered && hovered.classList.remove('rv-hover'); hovered = e.target; hovered.classList.add('rv-hover'); });
  document.addEventListener('click', e => { if (!on || ui(e.target)) return; e.preventDefault(); e.stopPropagation();
    const el = e.target, r = el.getBoundingClientRect(), sec = el.closest('section[id]');
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    ctx = { section: sec ? sec.id : 'page', selector: cssPath(el), snippet: snippet(el), point: Math.round(px * 100) + '% x ' + Math.round(py * 100) + '% of element',
      viewport: innerWidth + 'x' + innerHeight + ', scrollY ' + Math.round(scrollY), page: location.pathname, px, py };
    where.textContent = ctx.section + ': ' + (ctx.snippet.slice(0, 60) || ctx.selector);
    pop.style.setProperty('--x', Math.min(e.clientX, innerWidth - 340) + 'px'); pop.style.setProperty('--y', Math.min(e.clientY, innerHeight - 220) + 'px');
    pop.hidden = false; ta.value = ''; ta.focus(); }, true);
  pop.addEventListener('submit', async e => { e.preventDefault(); if (!ctx) return;
    const body = new URLSearchParams({ 'form-name': 'review' }); FIELDS.forEach(f => body.append(f, f === 'note' ? ta.value.trim() : ctx[f]));
    const b = pop.querySelector('[type=submit]'); b.textContent = 'Отправляю…';
    try { const res = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
      if (!res.ok) throw new Error(res.status);
      notes.push({ selector: ctx.selector, px: ctx.px, py: ctx.py, note: ta.value.trim() }); save(notes); count(); pins(); close();
    } catch (err) { where.textContent = 'Не отправилось (' + err.message + '), попробуйте ещё раз'; } finally { b.textContent = 'Отправить'; } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  addEventListener('resize', pins); setTimeout(pins, 1500); count();
  const intro = document.querySelector('.intro'); if (intro) intro.addEventListener('click', () => setTimeout(pins, 2500));
})();
