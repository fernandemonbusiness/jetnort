import './style.css'
import { CITIES, SERVICES, TRIPS, occupied } from './data.js'
const $ = (s, r = document) => r.querySelector(s)
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const iso = d => d.toISOString().slice(0, 10)
const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d) }
const dow = s => new Date(s + 'T12:00:00').getDay()
const nextDate = days => { for (let i = 0; i < 7; i++) if (days.includes(dow(addDays(i)))) return addDays(i) }
const fmt = s => new Date(s + 'T12:00:00').toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })
const route = d => CITIES[d].join(' → ')
const freeSeats = (t, date) => { const v = SERVICES[t.svc]; const n = v.rows * v.per; return n - occupied(t.id, date, n).size }
const S = { dir: 'OI', date: addDays(1), pax: 1, trip: null, seats: [], step: 1, pass: [], pay: 'qr', done: null }
const store = { get: () => { try { return JSON.parse(localStorage.getItem('jn_bookings') || '[]') } catch { return [] } }, add: b => { try { localStorage.setItem('jn_bookings', JSON.stringify([...store.get(), b])) } catch {} } }

// Nav
const nav = $('#nav'), links = $('#links'), burger = $('#burger')
addEventListener('scroll', () => nav.classList.toggle('small', scrollY > 60), { passive: true })
burger.onclick = () => { const o = links.classList.toggle('open'); burger.setAttribute('aria-expanded', o) }
links.onclick = e => { if (e.target.matches('a')) { links.classList.remove('open'); burger.setAttribute('aria-expanded', false) } }

// Reveal + counters
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return
  e.target.classList.add('in'); io.unobserve(e.target)
  e.target.querySelectorAll('[data-n]').forEach(c => { const n = +c.dataset.n; let t0; const f = t => { t0 ??= t; const p = Math.min((t - t0) / 1400, 1); c.textContent = Math.round(n * p).toLocaleString('es'); if (p < 1) requestAnimationFrame(f) }; requestAnimationFrame(f) })
}), { threshold: .12 })
document.querySelectorAll('.reveal').forEach(el => io.observe(el))

// Buscador
const o = $('#o'), d = $('#d'), f1 = $('#f1'), f2 = $('#f2')
f1.min = f2.min = addDays(0); f1.value = S.date
o.onchange = () => d.value = o.value === 'OI' ? 'IO' : 'OI'
d.onchange = () => o.value = d.value === 'OI' ? 'IO' : 'OI'
$('#search').onsubmit = e => {
  e.preventDefault()
  Object.assign(S, { dir: o.value, date: f1.value, pax: Math.min(6, Math.max(1, +$('#px').value || 1)), trip: null, seats: [], step: 1 })
  render(); $('#reservas').scrollIntoView()
}

// Horarios
const sc = { dir: 'OI' }
const fday = $('#fday'), fsvc = $('#fsvc')
DAYS.forEach((n, i) => fday.add(new Option(n, i)))
const tabs = $('#dtabs')
;['OI', 'IO'].forEach(k => { const b = document.createElement('button'); b.textContent = route(k); b.dataset.k = k; tabs.append(b) })
function renderSched() {
  tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === sc.dir))
  $('#sched').innerHTML = TRIPS.filter(t => t.dir === sc.dir && (!fsvc.value || t.svc === fsvc.value) && (fday.value === '' || t.days.includes(+fday.value))).map(t => {
    const date = fday.value === '' ? nextDate(t.days) : nextDate([+fday.value]), n = freeSeats(t, date), v = SERVICES[t.svc]
    const tag = n === 0 ? '<span class="tag t-out">Agotado</span>' : n <= 8 ? `<span class="tag t-low">Pocos asientos (${n})</span>` : '<span class="tag t-ok">Disponible</span>'
    return `<tr><td><b>${t.dep}</b></td><td>${t.arr}</td><td>${v.name}</td><td>${fmt(date)}</td><td>Bs ${v.price}</td><td>${tag}</td><td><button class="btn sm" data-pick="${t.id}|${date}" ${n ? '' : 'disabled'}>Elegir asiento</button></td></tr>`
  }).join('') || '<tr><td colspan="7">No hay salidas con ese filtro.</td></tr>'
}
tabs.onclick = e => { if (e.target.dataset.k) { sc.dir = e.target.dataset.k; renderSched() } }
fday.onchange = fsvc.onchange = renderSched
$('#sched').onclick = e => {
  const p = e.target.dataset.pick; if (!p) return
  const [id, date] = p.split('|'), t = TRIPS.find(x => x.id === id)
  Object.assign(S, { dir: t.dir, trip: t, date, seats: [], step: 1 }); render(); $('#reservas').scrollIntoView()
}

// Reservas
const bk = $('#bk')
const stepBar = () => `<div class="steps">${['1. Viaje y asientos', '2. Pasajeros', '3. Pago y confirmación'].map((x, i) => `<span class="${S.step === i + 1 ? 'on' : ''}">${x}</span>`).join('')}</div>`
const total = () => S.trip ? S.seats.length * SERVICES[S.trip.svc].price : 0
function seatMap() {
  const v = SERVICES[S.trip.svc], occ = occupied(S.trip.id, S.date, v.rows * v.per)
  let h = '<div class="bus"><div class="front"><span>🚪 Puerta</span><span>Conductor 🧑‍✈️</span></div>'
  for (let r = 0; r < v.rows; r++) {
    h += '<div class="row">'
    for (let c = 0; c < v.per; c++) {
      const n = r * v.per + c + 1; if (c === v.left) h += '<i class="aisle"></i>'
      const oc = occ.has(n), sl = S.seats.includes(n)
      h += `<button type="button" class="seat ${oc ? 'occ' : sl ? 'sel' : ''}" data-seat="${n}" ${oc ? 'disabled' : ''} aria-label="Asiento ${n}">${n}</button>`
    }
    h += '</div>'
  }
  return h + '</div><div class="legend"><span><i></i>Libre</span><span><i style="background:#c9d0d6;border-color:#c9d0d6"></i>Ocupado</span><span><i style="background:var(--am);border-color:var(--am)"></i>Seleccionado</span></div>'
}
function render() {
  let h = stepBar()
  if (S.done) {
    const b = S.done
    h += `<div class="card ok"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M14 27l8 8 16-17"/></svg><h3>¡Reserva registrada!</h3><div class="code">${b.code}</div><p>${route(b.dir)} · ${fmt(b.date)} · ${b.dep}<br>Asientos: ${b.seats.join(', ')} · Total: Bs ${b.total}</p><p class="note">Demo: la reserva se guarda solo en este navegador.</p><button class="btn" data-new>Nueva reserva</button></div>`
  } else if (S.step === 1) {
    const list = TRIPS.filter(t => t.dir === S.dir && t.days.includes(dow(S.date)))
    h += `<p><b>${route(S.dir)}</b> · ${fmt(S.date)} · ${S.pax} pasajero(s)</p><div style="margin-top:1rem">` + (list.map(t => { const v = SERVICES[t.svc], n = freeSeats(t, S.date); return `<div class="trip"><span><b>${t.dep}</b> → ${t.arr} · ${v.name}</span><span>Bs ${v.price} · ${n} libres</span><button class="btn sm ${S.trip?.id === t.id ? '' : 'ghost'}" data-trip="${t.id}" ${n ? '' : 'disabled'}>${S.trip?.id === t.id ? 'Elegido' : 'Elegir'}</button></div>` }).join('') || '<p>No hay salidas ese día. Prueba otra fecha.</p>') + '</div>'
    if (S.trip) h += `<div class="layout"><div>${seatMap()}</div><aside class="card sum"><h3>Resumen</h3><p>${route(S.dir)}<br>${fmt(S.date)} · ${S.trip.dep}</p><p>Asientos: ${S.seats.sort((a, b) => a - b).join(', ') || '—'} (${S.seats.length}/${S.pax})</p><div class="tot">Bs ${total()}</div><div class="msg" id="msg"></div><button class="btn" data-next ${S.seats.length === S.pax ? '' : 'disabled'}>Continuar</button></aside></div>`
  } else if (S.step === 2) {
    h += '<form id="pf" class="card">' + Array.from({ length: S.pax }, (_, i) => `<div class="pass"><h3>Pasajero ${i + 1} · Asiento ${S.seats[i]}</h3><div class="grid2"><label>Nombre completo<input name="n${i}" required></label><label>Documento (CI o pasaporte)<input name="d${i}" required></label><label>Nacionalidad<input name="p${i}" required></label><label>Fecha de nacimiento<input type="date" name="b${i}" required></label><label>Teléfono<input type="tel" name="t${i}" required></label><label>Email<input type="email" name="e${i}" required></label></div></div>`).join('') + '<div class="actions"><button type="button" class="btn ghost" data-back>Atrás</button><button class="btn">Continuar</button></div></form>'
  } else {
    h += `<div class="card"><h3>Resumen</h3><p>${route(S.dir)} · ${fmt(S.date)} · ${S.trip.dep}<br>Asientos: ${S.seats.join(', ')}</p><div class="tot sum" style="font:700 1.4rem var(--h);margin:.6rem 0">Total: Bs ${total()}</div><div class="pay"><b>Forma de pago</b> <small>[A CONFIRMAR]</small><label><input type="radio" name="pay" value="QR / transferencia" checked> QR / transferencia</label><label><input type="radio" name="pay" value="Pago en oficina"> Pago en oficina</label></div><div class="actions"><button class="btn ghost" data-back>Atrás</button><button class="btn" data-confirm>Confirmar reserva</button><a class="btn ghost" href="https://wa.me/591XXXXXXXX">Reservar por WhatsApp</a><a class="btn ghost" href="tel:+0000000000">Llamar</a></div></div>`
  }
  bk.innerHTML = h
}
bk.onclick = e => {
  const t = e.target, q = a => t.closest(`[${a}]`)
  if (q('data-trip')) { S.trip = TRIPS.find(x => x.id === q('data-trip').dataset.trip); S.seats = []; render() }
  else if (q('data-seat')) {
    const n = +q('data-seat').dataset.seat, i = S.seats.indexOf(n)
    if (i > -1) S.seats.splice(i, 1); else if (S.seats.length < S.pax) S.seats.push(n); else { render(); $('#msg').textContent = `Ya elegiste ${S.pax} asiento(s). Quita uno o sube los pasajeros.`; return }
    render()
  }
  else if (q('data-next')) { S.step = 2; render() }
  else if (q('data-back')) { S.step--; render() }
  else if (q('data-new')) { Object.assign(S, { done: null, trip: null, seats: [], step: 1 }); render() }
  else if (q('data-confirm')) {
    const code = 'JN-' + Math.random().toString(36).slice(2, 8).toUpperCase()
    const b = { code, dir: S.dir, date: S.date, dep: S.trip.dep, seats: [...S.seats], total: total(), pass: S.pass, pay: bk.querySelector('input[name=pay]:checked').value }
    store.add(b); S.done = b; render()
  }
}
bk.onsubmit = e => {
  e.preventDefault(); const f = new FormData(e.target)
  S.pass = Array.from({ length: S.pax }, (_, i) => ({ nombre: f.get('n' + i), doc: f.get('d' + i), nac: f.get('p' + i), nacim: f.get('b' + i), tel: f.get('t' + i), email: f.get('e' + i) }))
  S.step = 3; render()
}
$('#lookup').onsubmit = e => {
  e.preventDefault()
  const c = $('#lc').value.trim().toUpperCase(), dc = $('#ld').value.trim().toLowerCase()
  const b = store.get().find(x => x.code === c && x.pass.some(p => String(p.doc).toLowerCase() === dc))
  $('#lres').innerHTML = b ? `<p><b>${b.code}</b> · ${route(b.dir)} · ${fmt(b.date)} · ${b.dep}<br>Asientos: ${b.seats.join(', ')} · Bs ${b.total} · ${b.pay}</p>` : '<p class="msg">No encontramos esa reserva en este navegador.</p>'
}

// Reseñas
const T = [['Rosa M.', 'Viaje cómodo y puntual. El asiento cama es muy amplio.'], ['Luis C.', 'Reservar fue rápido y elegí mi asiento sin llamar.'], ['Andrea P.', 'Buen trato y cruce de frontera sin problemas.'], ['Jorge T.', 'Lo recomiendo para viajar a Iquique con la familia.']]
const car = $('#car')
car.innerHTML = T.map(([n, t], i) => `<blockquote class="${i ? '' : 'on'}"><p>“${t}”</p><footer>${n} · ★★★★★</footer></blockquote>`).join('')
let k = 0; setInterval(() => { const q = car.children; q[k].classList.remove('on'); k = (k + 1) % q.length; q[k].classList.add('on') }, 5000)

$('#news').onsubmit = e => { e.preventDefault(); $('#nmsg').textContent = '¡Gracias por suscribirte!'; e.target.reset() }
renderSched(); render()
