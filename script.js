document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);

  const modal = $('authModal');
  const authClose = $('authClose');
  const tabLogin = $('tabLogin');
  const tabSignup = $('tabSignup');
  const formLogin = $('formLogin');
  const formSignup = $('formSignup');

  const btnEntrar = $('btnEntrar');
  const btnSignup = $('btnSignup');
  const btnLogout = $('btnLogout');
  const btnWithdraw = $('btnWithdraw');
  const goMarket = $('goMarket');

  const userNameEl = $('userName');
  const ptsBadgeEl = $('ptsBadge');

  const ptsEl = $('dashPts');
  const mxnEl = $('dashMxn');

  const marketGrid = $('mkGrid');
  const activeList = $('activeList');
  const historyList = $('historyList');

  const plansGrid = $('plansGrid');
  const planActiveEl = $('planActive');

  const refCodeEl = $('refCode');
  const refLinkEl = $('refLink');
  const refCountEl = $('refCount');
  const copyRefBtn = $('copyRef');
  const simulateBtn = $('simulateRef');

  const LS = {
    user: 'zokkoUser',
    pts: 'zokko_pts',
    act: 'zokko_act',
    hist: 'zokko_hist',
    plan: 'zokko_plan',
    planHist: 'zokko_plan_hist',
    tutorial: 'zokko_tutorial_done',
    trialStart: 'zokko_trial_start',
    buysToday: 'zokko_buys_today',
    lastReset: 'zokko_last_reset',
    streak: 'zokko_streak',
    lastVisit: 'zokko_last_visit',
    refCode: 'zokko_refcode',
    refCount: 'zokko_refcount'
  };
  // Variable para almacenar el plan actual del usuario
let planActual = "Ninguno";
  const read = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? def; } catch { return def; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const del = (k) => localStorage.removeItem(k);

  const PTS_TO_MXN = 0.10;
  const DAY_MS = 60 * 1000;
  const TRIAL_DAYS = 14;
  const MAX_DAILY_BUYS = 5;
  const MIN_WITHDRAW_PTS = 1050;

  if (read(LS.pts, null) == null) write(LS.pts, 600);
  if (!Array.isArray(read(LS.act))) write(LS.act, []);
  if (!Array.isArray(read(LS.hist))) write(LS.hist, []);
  if (!Array.isArray(read(LS.planHist))) write(LS.planHist, []);

  const hardShow = (el) => { if (!el) return; el.hidden = false; el.style.display = ''; };
  const hardHide = (el) => { if (!el) return; el.hidden = true; el.style.display = 'none'; };
  const fmt = (num) => Number(num || 0).toLocaleString();

  function showToast(msg){
    let t = document.querySelector('.toast');
    if(!t){
      t = document.createElement('div');
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(()=> t.classList.remove('show'), 2200);
  }

  function refreshMiniStats() {
    const streak = Number(localStorage.getItem('zokko_streak') || 0);
    const streakEl = document.getElementById('streakCount');
    if (streakEl) streakEl.textContent = streak;

    const refCount = Number(localStorage.getItem('zokko_refcount') || 0);
    const refCountMini = document.getElementById('refCountMini');
    if (refCountMini) refCountMini.textContent = refCount;

    const act = Array.isArray(read(LS.act)) ? read(LS.act) : [];
    const activeBuys = document.getElementById('activeBuys');
    if (activeBuys) activeBuys.textContent = act.length;
  }
// Función para elegir un plan
function elegirPlan(planNombre, puntos, costoMXN) {
  const confirmacion = confirm(`¿Estás seguro de elegir el plan ${planNombre}? Costo: ${puntos} pts ≈ $${costoMXN} MXN`);
  
  if (confirmacion) {
    planActual = planNombre;
    alert(`Has elegido el plan ${planNombre}. ¡Disfruta de tus beneficios!`);
    // Aquí puedes agregar la lógica para actualizar el balance del usuario
  }
}
  function toggleHeader(logged) {
    btnEntrar?.toggleAttribute('hidden', logged);
    btnSignup?.toggleAttribute('hidden', logged);
    btnLogout?.toggleAttribute('hidden', !logged);

    const u = read(LS.user, null);
    if (userNameEl) {
      if (logged && u?.name) { 
        userNameEl.textContent = (u.name || 'Usuario').toUpperCase(); 
        userNameEl.hidden = false; 
      } else userNameEl.hidden = true;
    }
    if (ptsBadgeEl) {
      const pts = read(LS.pts, 0);
      ptsBadgeEl.textContent = `${pts} pts`;
      ptsBadgeEl.toggleAttribute('hidden', !logged);
    }
  }

  function setMode(mode) {
    const isLogin = mode === 'login';
    tabLogin?.classList.toggle('active', isLogin);
    tabSignup?.classList.toggle('active', !isLogin);
    if (formLogin) formLogin.hidden = !isLogin;
    if (formSignup) formSignup.hidden = isLogin;
  }
  function openModal(mode = 'login') { hardShow(modal); document.body.classList.add('modal-open'); setMode(mode); }
  function closeModal() { hardHide(modal); document.body.classList.remove('modal-open'); }

  btnEntrar?.addEventListener('click', (e) => { e.preventDefault(); openModal('login'); });
  btnSignup?.addEventListener('click', (e) => { e.preventDefault(); openModal('signup'); });
  tabLogin?.addEventListener('click', () => setMode('login'));
  tabSignup?.addEventListener('click', () => setMode('signup'));
  authClose?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (!modal?.hidden && e.key === 'Escape') closeModal(); });

  function setLoggedUser(user) {
    write(LS.user, user);
    if (!localStorage.getItem(LS.trialStart)) {
      localStorage.setItem(LS.trialStart, Date.now().toString());
    }
    toggleHeader(true);
    refreshBalanceUI();
    refreshRefUI();
    closeModal();
    window.location.href = "dashboard.html";
  }

  function clearUser() {
    localStorage.clear();
    toggleHeader(false);
    if (window.location.pathname.includes('dashboard')) {
      window.location.href = "index.html";
    }
  }

  formLogin?.addEventListener('submit', (e) => { 
    e.preventDefault();
    const email = $('loginEmail')?.value.trim() || ''; 
    const name = email.split('@')[0] || 'Usuario'; 
    setLoggedUser({name, email});
  });
  formSignup?.addEventListener('submit', (e) => { 
    e.preventDefault();
    const name = $('suName')?.value.trim() || 'Usuario'; 
    const email = $('suEmail')?.value.trim() || ''; 
    setLoggedUser({name, email});
  });
  btnLogout?.addEventListener('click', (e) => { 
    e.preventDefault(); 
    clearUser(); 
  });

  const savedUser = read(LS.user, null);
  if (savedUser?.email) {
    toggleHeader(true);
  } else {
    toggleHeader(false);
  }

  function isTrialActive() {
    const start = Number(localStorage.getItem(LS.trialStart) || 0);
    const now = Date.now();
    return (now - start) < (TRIAL_DAYS * 24 * 60 * 60 * 1000);
  }

  function canBuyToday() {
    const today = new Date().toISOString().split('T')[0];
    const lastReset = localStorage.getItem(LS.lastReset) || today;
    const buysToday = Number(localStorage.getItem(LS.buysToday) || 0);

    if (lastReset !== today) {
      localStorage.setItem(LS.lastReset, today);
      localStorage.setItem(LS.buysToday, '0');
      return true;
    }

    return buysToday < MAX_DAILY_BUYS;
  }

  function recordBuy() {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(LS.lastReset, today);
    const current = Number(localStorage.getItem(LS.buysToday) || 0);
    localStorage.setItem(LS.buysToday, String(current + 1));
  }

  function hasActivePlan() {
    const plan = read(LS.plan, null);
    if (!plan) return false;
    return Date.now() < plan.endsAt;
  }

  const PRODUCTS = [
    { id:'shoe', icon:'👟', name:'Zapatilla Retro NFT', price:10, roi:1.50, days:1 },
    { id:'watch', icon:'⌚', name:'Reloj Neon Pulse NFT', price:17, roi:1.70, days:2 },
    { id:'nft-gold', icon:'🌟', name:'NFT Dorado', price:27, roi:1.70, days:2 },
    { id:'laptop', icon:'💻', name:'Laptop Espacial NFT', price:40, roi:1.80, days:2 },
    { id:'phone', icon:'📱', name:'Smartphone Virtual', price:55, roi:1.45, days:3 },
    { id:'mystic', icon:'🔮', name:'Colección Mística', price:70, roi:1.40, days:4 },
    { id:'rare-ssr', icon:'💠', name:'Rareza Suprema', price:105, roi:1.43, days:6 },
    { id:'chest-bronze', icon:'🥉', name:'Cofre Bronceado', price:20, roi:1.50, days:2 },
    { id:'chest-silver', icon:'🥈', name:'Cofre Plateado', price:40, roi:1.50, days:3 },
    { id:'chest-gold', icon:'🥇', name:'Cofre Dorado', price:80, roi:1.50, days:4 },
    { id:'avatar', icon:'🧬', name:'Avatar Holográfico', price:35, roi:1.43, days:3 },
    { id:'sword', icon:'🗡️', name:'Espada Fantasma', price:50, roi:1.40, days:5 },
    { id:'chest-myst', icon:'🎁', name:'Cofre Misterioso', price:50, roi:1.30, days:2 },
    { id:'crystal', icon:'💎', name:'Cristal Evolutivo', price:23, roi:1.30, days:3 },
    { id:'booster', icon:'⚡', name:'Caja de Energía', price:30, roi:1.50, days:4 },
    { id:'totem', icon:'🪬', name:'Tótem del Caos', price:60, roi:1.50, days:10 }
  ];

  function renderMarketplace() {
    if (!marketGrid) return;
    marketGrid.innerHTML = PRODUCTS.map(p => {
      const pct = Math.round((p.roi - 1) * 100);
      const dTxt = p.days === 1 ? '1 día' : `${p.days} días`;
      const mxn = (p.price * PTS_TO_MXN).toFixed(2);
      return `
        <article class="mk-card" data-id="${p.id}">
          <div class="mk-head">
            <div class="mk-emoji">${p.icon}</div>
            <div class="mk-title">${p.name}</div>
            <div class="mk-badge">ROI ${pct}% · ${dTxt}</div>
          </div>
          <div class="mk-price">
            <b>${p.price} pts</b> <small>$${mxn} MXN</small>
          </div>
          <div class="mk-cta"><button class="btn btn-primary btn-buy" data-id="${p.id}">Comprar</button></div>
          <div class="mk-meta">Reventa en ${dTxt}</div>
        </article>`;
    }).join('');
  }

  function purchase(pid) {
    const p = PRODUCTS.find(x => x.id === pid);
    if (!p) return;

    if (!hasActivePlan() && !isTrialActive()) {
      showToast('Tu prueba terminó. Compra un plan para seguir.');
      return;
    }

    if (!hasActivePlan() && !canBuyToday()) {
      showToast(`Límite diario alcanzado (${MAX_DAILY_BUYS}/día).`);
      return;
    }

    const pts = read(LS.pts, 0);
    if (pts < p.price) { 
      showToast('No tienes puntos suficientes.'); 
      return; 
    }

    write(LS.pts, pts - p.price);
    if (!hasActivePlan()) recordBuy();

    const now = Date.now();
    const item = { id:`${pid}-${now}`, pid:p.id, name:p.name, price:p.price, roi:p.roi, startsAt:now, endsAt:now + p.days*DAY_MS };
    const act = read(LS.act, []);
    act.push(item); 
    write(LS.act, act);

    refreshBalanceUI(); 
    renderActives();
    showToast(`Comprado: ${p.name}`);
  }

  marketGrid?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-buy');
    if (!btn) return;
    purchase(btn.dataset.id);
  });

  function tickMarketplace() {
    const now = Date.now();
    const act = read(LS.act, []);
    const still = [], finished = [];
    for (const it of act) (now >= it.endsAt ? finished : still).push(it);

    if (finished.length) {
      const hist = read(LS.hist, []);
      let add = 0;
      finished.forEach(f => {
        const payout = Math.round(f.price * f.roi);
        add += payout;
        hist.push({ name:f.name, price:f.price, roi:f.roi, payout, completedAt: now });
      });
      write(LS.hist, hist);
      write(LS.pts, read(LS.pts, 0) + add);
    }
    write(LS.act, still);
    refreshBalanceUI(); 
    renderActives(); 
    renderHistory();
  }

  const PLANS = [
    { id:'impulso', icon:'⚡', name:'Impulso', price:5000, roi:1.00, days:21, desc:'Plan de arranque',
      perks:['Genera 5,000 pts','Activo 3 semanas','Compras sugeridas: 126','Después: espera 1 mes o subir'] },
    { id:'plata', icon:'🥈', name:'Plata', price:25000, roi:1.00, days:14, desc:'Nivel intermedio',
      perks:['Genera 25,000 pts','Activo 2 semanas','Compras: 126','Estado: Igual'] },
    { id:'oro', icon:'🥇', name:'Oro', price:100000, roi:1.00, days:14, desc:'Paquete sólido',
      perks:['Genera 100,000 pts','Activo 2 semanas','Compras: 126','Estado: Igual'] },
    { id:'platino', icon:'💠', name:'Platino', price:300000, roi:1.00, days:14, desc:'Nivel alto',
      perks:['Genera 300,000 pts','Activo 2 semanas','Compras: 126','Estado: Igual'] },
    { id:'diamante', icon:'💎', name:'Diamante', price:800000, roi:1.00, days:14, desc:'Nivel premium',
      perks:['Genera 800,000 pts','Activo 2 semanas','Compras: 126','Estado: Igual'] },
    { id:'titan', icon:'🗿', name:'Titán', price:3000000, roi:1.00, days:14, desc:'Gran escala',
      perks:['Genera 3,000,000 pts','Activo 2 semanas','Compras: 126','Estado: Igual'] },
    { id:'leyenda', icon:'🏆', name:'Leyenda', price:9000000, roi:1.00, days:14, desc:'Plan final',
      perks:['Genera 9,000,000 pts','Activo 2 semanas','Compras: 126','Plan final ✅'] }
  ];

  function renderPlansGrid() {
    if (!plansGrid) return;
    plansGrid.innerHTML = PLANS.map(pl => `
      <article class="plan-card" data-id="${pl.id}">
        <div class="plan-top">
          <div class="plan-title">${pl.icon} ${pl.name}</div>
          <div class="plan-badge">ROI ${(pl.roi*100).toFixed(0)}% · ${pl.days} días</div>
        </div>
        <div class="plan-price">
          <b>${pl.price.toLocaleString()} pts</b>
          <small>≈ $${(pl.price * PTS_TO_MXN).toFixed(2)} MXN</small>
        </div>
        <ul class="plan-list">${pl.perks.map(p => `<li>${p}</li>`).join('')}</ul>
        <div class="plan-cta"><button class="btn-plan" data-id="${pl.id}">Elegir plan</button></div>
      </article>`).join('');
  }

  function renderActivePlan() {
    if (!planActiveEl) return;
    const cur = read(LS.plan, null);
    if (!cur || Date.now() >= cur.endsAt) { 
      planActiveEl.innerHTML = `<div class="empty">Sin plan activo. Usa tu prueba gratuita o compra un plan.</div>`; 
      return; 
    }
    const now = Date.now();
    const total = Math.max(1, cur.endsAt - cur.startAt);
    const done = Math.max(0, Math.min(1, (now - cur.startAt) / total));
    const pct = (done * 100).toFixed(0);
    planActiveEl.innerHTML = `
      <div class="plan-row"><b>${cur.name}</b><span>${cur.price.toLocaleString()} pts</span></div>
      <div class="plan-bar"><span style="width:${pct}%"></span></div>
      <div class="plan-row"><small>Progreso</small><small>${pct}%</small></div>`;
  }

  function subscribePlan(planId) {
    const p = PLANS.find(x => x.id === planId);
    if (!p) return;

    const pts = read(LS.pts, 0);
    if (pts < p.price) { 
      showToast('No tienes puntos suficientes.'); 
      return; 
    }

    write(LS.pts, pts + p.price);

    const now = Date.now();
    const obj = { id:p.id, name:p.name, price:p.price, roi:p.roi, days:p.days, startAt:now, endsAt:now + p.days*DAY_MS };
    write(LS.plan, obj);
    refreshBalanceUI(); 
    renderActivePlan();
    showToast(`¡${p.name} activado! +${p.price.toLocaleString()} pts`);
  }

  plansGrid?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-plan'); 
    if (!btn) return;
    subscribePlan(btn.dataset.id);
  });

  function tickPlan() {
    const cur = read(LS.plan, null);
    if (!cur) return;
    if (Date.now() >= cur.endsAt) { 
      del(LS.plan); 
      renderActivePlan(); 
      return; 
    }
    renderActivePlan();
  }

  function refreshBalanceUI() {
    const pts = read(LS.pts, 0);
    if (ptsEl) { 
      ptsEl.textContent = fmt(pts); 
      ptsEl.classList.add('bump'); 
      setTimeout(() => ptsEl.classList.remove('bump'), 200); 
    }
    if (mxnEl) mxnEl.textContent = (pts * PTS_TO_MXN).toFixed(2);
    if (ptsBadgeEl) {
      const logged = !!read(LS.user, null);
      ptsBadgeEl.textContent = `${fmt(pts)} pts`;
      ptsBadgeEl.toggleAttribute('hidden', !logged);
    }
    refreshMiniStats();
  }

  function renderActives() {
    if (!activeList) return;
    const act = read(LS.act, []);
    if (!act.length) { 
      activeList.innerHTML = `<div class="empty">Sin compras activas</div>`; 
      return; 
    }
    activeList.innerHTML = act.map(it => {
      const now=Date.now(), total=it.endsAt-it.startsAt, pct=((now-it.startsAt)/total*100).toFixed(0);
      return `<div class="act-item"><div class="act-top"><strong>${it.name}</strong></div><div class="act-bar"><span style="width:${pct}%"></span></div><div class="act-meta"><small>${pct}%</small></div></div>`;
    }).join('');
    refreshMiniStats();
  }

  function renderHistory() {
    if (!historyList) return;
    const hist = read(LS.hist, []);
    if (!hist.length) { 
      historyList.innerHTML = `<div class="empty">Sin historial</div>`; 
      return; 
    }
    historyList.innerHTML = hist.slice().reverse().map(h => `<div class="hist-item"><div>${h.name}</div><div>+${fmt(h.payout)} pts</div></div>`).join('');
  }

  const makeRefCode = (u) => (u?.name || 'user').slice(0,3).toUpperCase() + '-' + Math.random().toString(36).slice(2,7).toUpperCase();
  const makeRefLink = (code) => `${location.origin}${location.pathname}?ref=${code}`;

  function refreshRefUI() {
    const u = read(LS.user, null); 
    if (!u) return;
    let code = localStorage.getItem(LS.refCode); 
    if (!code) { 
      code = makeRefCode(u); 
      localStorage.setItem(LS.refCode, code); 
    }
    const link = makeRefLink(code);
    const count = Number(localStorage.getItem(LS.refCount) || 0);
    if (refCodeEl) refCodeEl.textContent = code;
    if (refLinkEl) refLinkEl.value = link;
    if (refCountEl) refCountEl.textContent = count;
  }

  copyRefBtn?.addEventListener('click', async () => { 
    try { 
      await navigator.clipboard.writeText(refCodeEl?.textContent||''); 
      showToast('Código copiado ✅'); 
    } catch {} 
  });
  refLinkEl?.addEventListener('click', async () => { 
    try { 
      await navigator.clipboard.writeText(refLinkEl.value||''); 
      showToast('Enlace copiado ✅'); 
    } catch {} 
  });
  simulateBtn?.addEventListener('click', () => { 
    const cur = Number(localStorage.getItem(LS.refCount) || 0) + 1; 
    localStorage.setItem(LS.refCount, cur); 
    refreshRefUI(); 
  });

  btnWithdraw?.addEventListener('click', () => {
    const pts = read(LS.pts, 0);
    if (pts < MIN_WITHDRAW_PTS) {
      showToast(`Mínimo de retiro: ${fmt(MIN_WITHDRAW_PTS)} pts ($${(MIN_WITHDRAW_PTS * PTS_TO_MXN).toFixed(2)} MXN)`);
      return;
    }
    if (!confirm(`¿Retirar $${(pts * PTS_TO_MXN).toFixed(2)} MXN?\nSe procesará en 24-48h.`)) return;
    write(LS.pts, 0);
    showToast('¡Solicitud de retiro enviada! 🎉');
    refreshBalanceUI();
    renderHistory();
  });

  function checkStreak() {
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem(LS.lastVisit);
    let streak = Number(localStorage.getItem(LS.streak) || 0);

    if (lastVisit === today) return;

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (lastVisit === yesterday || !lastVisit) {
      streak++;
    } else {
      streak = 1;
    }

    localStorage.setItem(LS.streak, streak);
    localStorage.setItem(LS.lastVisit, today);

    const bonuses = {7: 500, 14: 1500, 30: 5000};
    if (bonuses[streak]) {
      const bonus = bonuses[streak];
      write(LS.pts, read(LS.pts,0)+bonus);
      showToast(`¡Racha de ${streak} días! +${fmt(bonus)} pts 🎉`);
      refreshBalanceUI();
    }
  }

  if (document.body.contains(marketGrid)) {
    renderMarketplace();
    renderActives();
    renderHistory();
    renderPlansGrid();
    renderActivePlan();
    refreshBalanceUI();
    refreshRefUI();
    checkStreak();
  }

  setInterval(() => { 
    tickMarketplace(); 
    tickPlan(); 
  }, 1000);

  window.ZOKKO_DEBUG = { 
    clearUser, 
    clearAll: () => localStorage.clear(),
    addPoints: (n) => { write(LS.pts, read(LS.pts,0)+n); refreshBalanceUI(); }
  };

  goMarket?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'dashboard.html#marketplace-section';
  });
});// Función para retirar ganancias
function retirarGanancias() {
  document.getElementById("modal-retiro").style.display = "block";
}

// Función para cerrar el modal
function cerrarModal() {
  document.getElementById("modal-retiro").style.display = "none";
}

// Función para confirmar el retiro
function confirmarRetiro() {
  const monto = parseFloat(document.getElementById("monto-retiro").value);
  const balance = parseFloat(document.getElementById("balance-value").textContent);

  if (isNaN(monto) || monto <= 0) {
    alert("Por favor, ingresa un monto válido.");
    return;
  }

  if (monto > balance) {
    alert("No tienes suficiente saldo para retirar esa cantidad.");
    return;
  }

  // Actualizar el balance
  const nuevoBalance = balance - monto;
  const nuevoMonto = nuevoBalance / 10; // Conversión a dólares

  document.getElementById("balance-value").textContent = nuevoBalance;
  document.getElementById("balance-currency").textContent = `= $${nuevoMonto.toFixed(2)} MXN`;

  // Cerrar modal y mostrar mensaje
  cerrarModal();
  alert(`¡Retiro de $${monto / 10} MXN realizado con éxito!`);
}

// Cerrar el modal si el usuario hace clic fuera del contenido
window.onclick = function(event) {
  const modal = document.getElementById("modal-retiro");
  if (event.target === modal) {
    cerrarModal();
  }
}
// Función para elegir un plan
function elegirPlan(planNombre, puntos, costoMXN) {
  const confirmacion = confirm(`¿Estás seguro de elegir el plan ${planNombre}? Costo: ${puntos} pts ≈ $${costoMXN} MXN`);
  
  if (confirmacion) {
    alert(`Has elegido el plan ${planNombre}. ¡Disfruta de tus beneficios!`);
    // Aquí puedes agregar la lógica para actualizar el balance del usuario
  }
}
// Funciones de autenticación
function registerUser(name, email, password) {
  const users = JSON.parse(localStorage.getItem('zokko_users') || '[]');
  
  // Verificar si el email ya existe
  const existingUser = users.find(user => user.email === email);
  if (existingUser) {
    return { success: false, message: 'El email ya está registrado' };
  }
  
  // Verificar si las contraseñas coinciden
  if (password !== document.getElementById('registerConfirmPassword').value) {
    return { success: false, message: 'Las contraseñas no coinciden' };
  }
  
  // Crear nuevo usuario
  const newUser = {
    id: Date.now().toString(),
    name: name,
    email: email,
    password: password,
    balance: 0,
    points: 0,
    streak: 0,
    refCount: 0,
    plan: 'Ninguno',
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  localStorage.setItem('zokko_users', JSON.stringify(users));
  
  // Guardar usuario actual en localStorage
  localStorage.setItem('zokko_current_user', JSON.stringify(newUser));
  
  return { success: true, message: 'Usuario registrado exitosamente' };
}

function loginUser(email, password) {
  const users = JSON.parse(localStorage.getItem('zokko_users') || '[]');
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    localStorage.setItem('zokko_current_user', JSON.stringify(user));
    return { success: true, message: 'Inicio de sesión exitoso', user };
  } else {
    return { success: false, message: 'Email o contraseña incorrectos' };
  }
}

function logoutUser() {
  localStorage.removeItem('zokko_current_user');
  window.location.href = 'index.html';
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('zokko_current_user') || 'null');
}

function updateUserBalance(newBalance) {
  const user = getCurrentUser();
  if (user) {
    user.balance = newBalance;
    localStorage.setItem('zokko_current_user', JSON.stringify(user));
    
    // Actualizar en la lista de usuarios
    const users = JSON.parse(localStorage.getItem('zokko_users') || '[]');
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      users[userIndex] = user;
      localStorage.setItem('zokko_users', JSON.stringify(users));
    }
  }
}

// Event listeners para login y register
document.addEventListener('DOMContentLoaded', () => {
  // Formulario de login
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      
      const result = loginUser(email, password);
      const messageDiv = document.getElementById('loginMessage');
      
      if (result.success) {
        messageDiv.textContent = result.message;
        messageDiv.className = 'message success';
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1000);
      } else {
        messageDiv.textContent = result.message;
        messageDiv.className = 'message error';
      }
    });
  }
  
  // Formulario de registro
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = document.getElementById('registerName').value;
      const email = document.getElementById('registerEmail').value;
      const password = document.getElementById('registerPassword').value;
      
      const result = registerUser(name, email, password);
      const messageDiv = document.getElementById('registerMessage');
      
      if (result.success) {
        messageDiv.textContent = result.message;
        messageDiv.className = 'message success';
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1000);
      } else {
        messageDiv.textContent = result.message;
        messageDiv.className = 'message error';
      }
    });
  }
  
  // Botón de logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logoutUser);
  }
  
  // Mostrar nombre de usuario en dashboard
  const userNameSpan = document.getElementById('userName');
  if (userNameSpan) {
    const user = getCurrentUser();
    if (user) {
      userNameSpan.textContent = user.name;
    }
  }
});