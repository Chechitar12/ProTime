const app = document.querySelector('#app');
let screen = 'login', filtro = 'todos', reporteFiltro = 'curso', detalleId = null, reportOpenId = null;
const nowDay = () => new Date().toLocaleDateString('es-PE');
const sameToday = x => new Date(x).toLocaleDateString('es-PE') === nowDay();
const fmt = d => new Date(d).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const time = d => new Date(d).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
const dur = (a, b = Date.now()) => { let s = Math.max(0, Math.floor((new Date(b) - new Date(a)) / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return [h, m, x].map(v => String(v).padStart(2, '0')).join(':'); };
function go(s) { if (screen === 'nuevo' && s !== 'nuevo' && typeof voiceReset === 'function') voiceReset(); screen = s; document.body.classList.toggle('web-mode', ['reporteWeb','validacionWeb','mapaIncidencias'].includes(s)); render(); document.querySelector('#app')?.scrollTo(0, 0); }
function internalHeader(t, showDate = false) { if(showDate)return `<header class="pt-header home-header"><button class="hbtn" onclick="go('modulos')" title="Menú principal">←</button><button class="hbtn" onclick="toggleMenu()" title="Menú PRO TIME">☰</button><div class="home-header-info"><div class="home-header-line"><span>Grupo: G003</span><time>${nowDay()}</time></div><b>Dashboard</b></div><button class="dots" onclick="toggleDbMenu(event)" title="Opciones">⋮</button><div id="dbMenu" class="db-menu"><button onclick="descargarBD()">⬇ Descargar BD</button></div></header>${menu()}`; return `<header class="pt-header"><button class="hbtn" onclick="go('modulos')" title="Menú principal">←</button><button class="hbtn" onclick="toggleMenu()" title="Menú PRO TIME">☰</button><div class="head-title"><b>${t}</b><small>PRO TIME · Grupo: 003</small></div><button class="dots" onclick="toggleDbMenu(event)" title="Opciones">⋮</button><small class="head-version">1.0.14 - DEV</small><div id="dbMenu" class="db-menu"><button onclick="descargarBD()">⬇ Descargar BD</button></div></header>${menu()}`; }
function render() { ({ login, loading, modulos, home, maestra, registro, nuevo, detalle, reportes, reporteDetalle, indicadores, envio, reporteWeb, validacionWeb, mapaIncidencias }[screen] || login)(); }
function login() { let cred = DB.get('pt_recordar', null); app.innerHTML = `<main class="login"><div class="login-logo"><div class="camposol-mark"><span class="brand-leaf">♧</span><b>CAMPOSOL</b></div><h1>SAYTA</h1><p>Ingresa tus credenciales para iniciar sesión</p></div><form id="loginForm"><label>Empresa<select><option>CAMPOSOL PERU</option></select></label><label>Usuario<input id="u" autocomplete="username" value="${cred?.usuario || ''}"></label><label>Contraseña<div class="pass"><input id="p" type="password" autocomplete="current-password" value="${cred?.password || ''}"><button type="button" id="eye" aria-label="Mostrar contraseña">◉</button></div></label><div class="opts"><label><input id="remember" type="checkbox" ${cred ? 'checked' : ''}> Recordar contraseña</label><u>Olvidé mi contraseña</u></div><p id="err"></p><button class="orange">Iniciar sesión</button><button type="button" class="ms">▦ &nbsp; Ingreso con Microsoft</button></form><footer>Designed by Camposol S.A<br>SAYTA · DEV 1.0.14</footer></main>`; const eye = document.getElementById('eye'), p = document.getElementById('p'), loginForm = document.getElementById('loginForm'), u = document.getElementById('u'), remember = document.getElementById('remember'), err = document.getElementById('err'); eye.onclick = () => p.type = p.type === 'password' ? 'text' : 'password'; loginForm.onsubmit = e => { e.preventDefault(); if (u.value.trim() === '621901' && p.value === '621901') {
    if (remember.checked)
        DB.set('pt_recordar', { usuario: u.value.trim(), password: p.value });
    else
        DB.set('pt_recordar', null);
    DB.set('pt_sesion', { usuario: '621901', nombre: 'Cesar Santisteban', grupo: 'G003' });
    go('loading');
}
else
    err.textContent = 'Usuario o contraseña incorrectos.'; }; }
function loading() { app.innerHTML = `<main class="loading"><div class="load-logo">♧<b>CAMPOSOL</b></div><div class="load-bottom"><p id="loadText">Fundos...</p><div class="loadbar"><i id="loadBar"></i></div></div></main>`; let items = ['Fundos...', 'Parcelas...', 'Actividades...', 'Lotes...'], i = 0, p = 0; let t = setInterval(() => { p += 4; loadBar.style.width = p + '%'; let ni = Math.min(3, Math.floor(p / 25)); if (ni !== i) {
    i = ni;
    loadText.textContent = items[i];
} if (p >= 100) {
    clearInterval(t);
    DB.set('pt_maestros', { ok: true, grupo: 'G003', fundo: 'Agricultor', parcelas: ['Parcela 61', 'Parcela 62', 'Parcela 64'], area: 'Cosecha' });
    setTimeout(() => go('modulos'), 250);
} }, 45); }
function modulos() {
    app.innerHTML = `
        <main class="module">
            <section class="module-top">
                <div class="module-user">
                    <b>CESAR SANTISTEBAN</b>
                    <small>CAMPOSOL PERU</small>
                </div>

                <em>1.0.14 - DEV</em>

                <button class="module-dots" onclick="toggleModuleDbMenu(event)" title="Opciones">⋮</button>
                <div id="moduleDbMenu" class="module-db-menu">
                    <button onclick="descargarBD()">⬇ Descargar BD</button>
                </div>

                <div class="round-logo">CS</div>
            </section>

            <h3>Menú principal</h3>

            <button class="module-tile" onclick="go('home')">
                <i>◷</i>
                <b>PRO TIME</b>
            </button>

            <button class="module-logout" onclick="logout()">
                ↪ &nbsp; CERRAR SESIÓN
            </button>
        </main>
    `;
}

function toggleModuleDbMenu(event) {
    event?.stopPropagation();
    document.querySelector('#moduleDbMenu')?.classList.toggle('open');
}
function logout() { DB.set('pt_sesion', null); go('login'); }
function todayAll() { return Incidencias.all().filter(x => sameToday(x.inicio)); }
function stats() { let a = todayAll(), fin = a.filter(x => x.estado === 'FINALIZADA'), curso = a.filter(x => x.estado === 'EN PROCESO'); let ms = fin.reduce((s, x) => s + (new Date(x.fin) - new Date(x.inicio)), 0), hh = fin.reduce((s, x) => s + ((new Date(x.fin) - new Date(x.inicio)) / 36e5 * Number(x.trabajadores || 0)), 0); let ultimo = [...a].sort((x, y) => new Date(y.fechaRegistro || y.inicio) - new Date(x.fechaRegistro || x.inicio))[0]; let trabajadoresActuales = ultimo ? Number(ultimo.trabajadores || 0) : 0; return { a, fin, curso, ms, hh, trabajadoresActuales }; }
function home() { let s = stats(), mins = Math.floor(s.ms / 60000), pct = s.a.length ? Math.round(s.fin.length / s.a.length * 100) : 0; app.innerHTML = `${internalHeader('HOME', true)}<main class="page home-page"><section class="kpis home-kpis"><article class="k-blue"><b>${s.a.length}</b><small>Incidencias registradas</small></article><article class="k-orange"><b>${s.curso.length}</b><small>En proceso</small></article><article class="k-green"><b>${s.fin.length}</b><small>Finalizadas</small></article><article class="k-purple"><b>${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m</b><small>Tiempo muerto</small></article><article class="k-cyan"><b>${s.trabajadoresActuales}</b><small>Trabajadores afectados</small></article><article class="k-red"><b>${s.hh.toFixed(1)} h</b><small>Horas-hombre perdidas</small></article></section><section class="chart-card home-chart"><h3>En proceso vs. finalizadas</h3><div class="donut" style="--p:${pct}"><b>${pct}%</b></div><div class="legend"><span>● En proceso: ${s.curso.length}</span><span>● Finalizadas: ${s.fin.length}</span></div></section></main>`; }
function menu() { return `<div id="overlay" class="overlay" onclick="toggleMenu()"></div><aside id="drawer"><div class="drawer-head"><button onclick="toggleMenu()">←</button><b>PRO TIME</b></div><nav><a onclick="go('home')"><i>⌂</i>Home</a><a onclick="go('maestra')"><i>▤</i>Data Maestra</a><a onclick="go('registro')"><i>✚</i>Registro de incidentes</a><a onclick="go('reportes')"><i>▧</i>Reporte de incidencias</a><a onclick="go('reporteWeb')"><i>▧</i>Reporte de incidencias Web</a><a onclick="go('validacionWeb')"><i>✓</i>Validación de Incidencias Web</a><a onclick="go('mapaIncidencias')"><i>⌖</i>Mapa de incidencias</a><a onclick="go('indicadores')"><i>▥</i>Indicadores</a><a onclick="go('envio')"><i>☁</i>Envío de información <span class="menu-badge">${Incidencias.all().filter(x => !x.sincronizado).length || ''}</span></a><hr><a onclick="logout()"><i>↪</i>Cerrar sesión</a></nav></aside>`; }
function toggleMenu() { document.querySelector('#drawer')?.classList.toggle('open'); document.querySelector('#overlay')?.classList.toggle('show'); }
function maestra() {
    app.innerHTML = `
        ${internalHeader('Descarga de datos maestros')}
        <main class="page">
            <div class="download">
                <h3>Progreso de descarga</h3>

                <div class="download-row">
                    <b id="state">En curso</b>
                    <strong id="pct">0%</strong>
                </div>

                <div class="bar">
                    <i id="bar"></i>
                </div>

                <p id="dmsg">Fundos...</p>

                <details>
                    <summary>Ver detalle de maestros</summary>
                    <p>
                        Grupo G003<br>
                        Fundo Agricultor<br>
                        Parcelas 61, 62 y 64<br>
                        Área Cosecha
                    </p>
                </details>

                <button class="primary" id="down" type="button" disabled>
                    Descargando datos...
                </button>
            </div>
        </main>
    `;

    iniciarDescargaMaestros();
}

function iniciarDescargaMaestros() {
    const barra = document.querySelector('#bar');
    const porcentaje = document.querySelector('#pct');
    const mensaje = document.querySelector('#dmsg');
    const estado = document.querySelector('#state');
    const boton = document.querySelector('#down');

    if (!barra || !porcentaje || !mensaje || !estado || !boton) {
        return;
    }

    const maestros = ['Fundos...', 'Parcelas...', 'Actividades...', 'Lotes...'];
    let avance = 0;

    barra.style.width = '0%';
    porcentaje.textContent = '0%';
    estado.textContent = 'En curso';
    mensaje.textContent = maestros[0];
    boton.disabled = true;
    boton.textContent = 'Descargando datos...';

    const intervalo = setInterval(() => {
        avance = Math.min(100, avance + 2);

        barra.style.width = `${avance}%`;
        porcentaje.textContent = `${avance}%`;

        const indice = Math.min(3, Math.floor(avance / 25));
        mensaje.textContent = maestros[indice];

        if (avance >= 100) {
            clearInterval(intervalo);

            estado.textContent = 'Completado';
            mensaje.textContent = 'Descarga completada';
            boton.disabled = false;
            boton.textContent = 'Volver a descargar';
            boton.onclick = iniciarDescargaMaestros;

            DB.set('pt_maestros', {
                ok: true,
                fecha: new Date().toISOString(),
                grupo: 'G003',
                fundo: 'Agricultor',
                parcelas: ['Parcela 61', 'Parcela 62', 'Parcela 64'],
                area: 'Cosecha'
            });
        }
    }, 55);
}

function registro() { let base = Incidencias.all(), a = base.filter(x => filtro === 'todos' || (filtro === 'curso' && x.estado === 'EN PROCESO') || (filtro === 'fin' && x.estado === 'FINALIZADA')); app.innerHTML = `${internalHeader('Registro de incidentes')}<main class="page"><input class="search" id="q" placeholder="Buscar incidencia"><div class="tabs"><button class="${filtro === 'todos' ? 'active' : ''}" onclick="filtro='todos';registro()">Todos</button><button class="${filtro === 'curso' ? 'active' : ''}" onclick="filtro='curso';registro()">En curso</button><button class="${filtro === 'fin' ? 'active' : ''}" onclick="filtro='fin';registro()">Finalizados</button></div><div id="list">${a.map(card).join('') || emptyRegistro()}</div><button class="fab" onclick="go('nuevo')">+</button></main>`; q.oninput = () => { let z = q.value.trim().toLowerCase(); let r = a.filter(x => Object.values(x).join(' ').toLowerCase().includes(z)); list.innerHTML = r.map(card).join('') || emptyRegistro(); }; tick(); }
function emptyRegistro() { return `<div class="empty"><div>▧</div><b>Aún no tienes incidentes registrados</b><small>Presiona + para registrar una nueva incidencia</small></div>`; }
function card(x) { let fin = x.estado === 'FINALIZADA'; return `<article class="incident ${fin ? 'finalizada' : 'proceso'}" onclick="${fin ? '' : `detalleInc('${x.id}')`}"><div class="inc-top"><b>${x.id}</b><span>${x.estado}</span></div><h3>${x.tipo}</h3><p><b>Grupo:</b> ${x.grupo} &nbsp; <b>Fundo:</b> ${x.fundo}<br><b>Parcela:</b> ${x.parcela}<br><b>Inicio:</b> ${fmt(x.inicio)}<br>${fin ? `<b>Duración:</b> ${dur(x.inicio, x.fin)}` : `<b>Tiempo:</b> <strong class="timer" data-start="${x.inicio}"></strong>`}</p>${!fin ? `<button class="finish" onclick="event.stopPropagation();detalleInc('${x.id}')">FINALIZAR</button>` : ''}</article>`; }
function nuevo() {
    app.innerHTML = `${internalHeader('Nueva incidencia')}<main class="page"><form id="newForm" class="form"><label>Grupo<input value="G003" readonly></label><label>Supervisor<input value="Cesar Santisteban" readonly></label><label>Fundo<input value="Agricultor" readonly></label><label>Parcela<select id="parcela" required><option value="">Seleccionar parcela</option><option>Parcela 61</option><option>Parcela 62</option><option>Parcela 64</option></select></label><label>Área<input value="Cosecha" readonly></label><label>Fecha y hora de inicio<input id="inicio" readonly></label><label>Tipo de incidente<select id="tipo" required><option value="">Seleccionar</option><option>Retraso de material</option><option>Falla en maquinaria</option><option>Falta de personal</option><option>Retraso de transporte</option><option>Lluvia</option><option>Falla del aplicativo</option><option>Otro</option></select></label><div class="voice-field"><div class="voice-field-header"><label for="desc">Descripción</label><div class="voice-actions"><button type="button" id="voiceToggle" class="voice-button" title="Iniciar o detener grabación" aria-label="Iniciar grabación">🎙</button><button type="button" id="voiceDiscard" class="voice-discard" title="Borrar grabación" aria-label="Borrar grabación"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v6m4-6v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></div><textarea id="desc" required placeholder="Escribe aquí o utiliza el micrófono; podrás editar la transcripción."></textarea><span id="voiceStatus" role="status" class="voice-status"></span><audio id="voicePreview" controls hidden></audio></div><label>Trabajadores afectados<input id="trabajadores" type="number" min="1" step="1" value="45" required></label><label>Evidencia (Foto)<input id="foto" type="file" accept="image/*" capture="environment"></label><button class="primary" id="saveIncident">Guardar incidencia</button></form></main>`;
    const form=document.getElementById('newForm');
    const inicio=form.querySelector('#inicio'),parcela=form.querySelector('#parcela'),tipo=form.querySelector('#tipo'),desc=form.querySelector('#desc'),trabajadores=form.querySelector('#trabajadores');
    inicio.value=fmt(new Date());
    voiceInit(form);
    geoInit(form);
    form.onsubmit=async e=>{
        e.preventDefault();
        const button=form.querySelector('#saveIncident');button.disabled=true;
        try {
            const audio=await voicePrepare(form);
            const nums=Incidencias.all().map(x=>+x.id.replace(/\D/g,''));
            const n=Math.max(0,...nums)+1;
            const id='INC-'+String(n).padStart(5,'0');
            if(audio)await voiceStore(id,audio);
            const x={id,grupo:'G003',supervisor:'Cesar Santisteban',fundo:'Agricultor',parcela:parcela.value,area:'Cosecha',inicio:new Date().toISOString(),tipo:tipo.value,descripcion:desc.value.trim(),trabajadores:Number(trabajadores.value),estado:'EN PROCESO',sincronizado:false,fechaRegistro:new Date().toISOString(),audioId:audio?id:null,ubicacion:null};
            if(!x.descripcion){voiceMessage(form,'Escribe o transcribe una descripción antes de guardar.');desc.focus();if(audio)await voiceRemove(id);return}
            try{Incidencias.save(x)}catch(error){if(audio)await voiceRemove(id);throw error}
            geoAfterSave(id);
            voiceReset();toast('Incidencia y descripción guardadas correctamente');filtro='todos';setTimeout(()=>go('registro'),450);
        }catch(error){voiceMessage(form,'No se pudo guardar: '+(error?.message||'error del navegador'));}
        finally{button.disabled=false}
    };
}
function detalleInc(id) { detalleId = id; go('detalle'); }
function detalle() { let x = Incidencias.byId(detalleId); if (!x)
    return go('registro'); if (x.estado === 'FINALIZADA')
    return detalleReporte(x.id); app.innerHTML = `${internalHeader('Detalle de incidencia')}<main class="page"><article class="detail-summary proceso"><div><b>${x.id}</b><span>◷ &nbsp; EN CURSO</span></div><h2>${x.tipo}</h2></article><section class="time-card"><small>▣ &nbsp; Inicio</small><b>${fmt(x.inicio)}</b></section><section class="clock-card"><small>Tiempo en curso</small><strong class="timer" data-start="${x.inicio}"></strong></section><div class="detail-actions"><button class="cancel-big" onclick="confirmarCancelar()">Cancelar</button><button class="finish-big" onclick="confirmarFinal('${x.id}')">Finalizar ahora</button></div></main>`; tick(); }
function confirmarCancelar() { let modal = document.createElement('div'); modal.className = 'modal-wrap'; modal.innerHTML = `<div class="modal"><div class="alerticon">!</div><h2>¿Seguro que deseas cancelar la acción?</h2><p>La incidencia continuará en proceso.</p><div class="modal-actions"><button onclick="this.closest('.modal-wrap').remove()">No</button><button class="yes" onclick="go('registro')">Sí</button></div></div>`; app.appendChild(modal); }
function localInputValue(d) { let x = new Date(d), pad = n => String(n).padStart(2, '0'); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; }
function confirmarFinal(id) { let x = Incidencias.byId(id), fin = new Date(); let modal = document.createElement('div'); modal.className = 'modal-wrap'; modal.innerHTML = `<div class="modal"><div class="alerticon">!</div><h2>Finalizar incidencia</h2><p>La fecha y hora se cargan con el momento actual. Puedes corregirlas antes de finalizar.</p><div class="confirm-data edit-end"><span>Inicio:<b>${fmt(x.inicio)}</b></span><label>Fecha de fin<input id="endDate" type="date" value="${localInputValue(fin)}"></label><label>Hora de fin<input id="endTime" type="time" step="1" value="${fin.toTimeString().slice(0, 8)}"></label><span>Duración:<b id="endDuration">${dur(x.inicio, fin)}</b></span><small id="endError"></small></div><div class="modal-actions"><button onclick="this.closest('.modal-wrap').remove()">Cancelar</button><button class="yes" id="finalNow">Finalizar ahora</button></div></div>`; app.appendChild(modal); let calc = () => { let d = new Date(`${endDate.value}T${endTime.value}`); if (!endDate.value || !endTime.value || d < new Date(x.inicio)) {
    endError.textContent = 'La fecha/hora de fin no puede ser anterior al inicio.';
    endDuration.textContent = '--:--:--';
    finalNow.disabled = true;
    return;
} endError.textContent = ''; endDuration.textContent = dur(x.inicio, d); finalNow.disabled = false; finalNow.onclick = () => finalizarAhora(id, d); }; endDate.oninput = calc; endTime.oninput = calc; calc(); }
function finalizarAhora(id, fin) { Incidencias.update(id, { estado: 'FINALIZADA', fin: new Date(fin).toISOString(), sincronizado: false }); document.querySelector('.modal-wrap')?.remove(); let x = Incidencias.byId(id); app.innerHTML = `${internalHeader('Incidencia finalizada')}<main class="page success"><div class="check">✓</div><h2>Incidencia finalizada correctamente</h2><article><b>${x.id}</b><h3>${x.tipo}</h3><span class="green-pill">FINALIZADA</span><p>Grupo: ${x.grupo}<br>Fundo: ${x.fundo}<br>Parcela: ${x.parcela}<br>Fecha: ${new Date(x.inicio).toLocaleDateString('es-PE')}<br>Inicio: ${time(x.inicio)}<br>Fin: ${time(x.fin)}<br><b>Duración total: ${dur(x.inicio, x.fin)}</b></p></article><button class="primary" onclick="go('registro')">Aceptar</button></main>`; }
function reportes() { let a = todayAll().filter(x => reporteFiltro === 'curso' ? x.estado === 'EN PROCESO' : x.estado === 'FINALIZADA'); app.innerHTML = `${internalHeader('Reporte de incidencias')}<main class="page"><div class="tabs two"><button class="${reporteFiltro === 'curso' ? 'active' : ''}" onclick="reporteFiltro='curso';reportOpenId=null;reportes()">En proceso</button><button class="${reporteFiltro === 'fin' ? 'active' : ''}" onclick="reporteFiltro='fin';reportOpenId=null;reportes()">Finalizadas</button></div>${a.map(reportCard).join('') || '<div class="empty"><b>Sin incidencias para mostrar</b><small>Solo se muestra información del día.</small></div>'}</main>`; tick(); }
function reportCard(x) { let fin = x.estado === 'FINALIZADA', open = reportOpenId === x.id; return `<article class="incident report-accordion ${fin ? 'finalizada' : 'proceso'}"><div class="report-summary" onclick="toggleReport('${x.id}')"><div class="inc-top"><b>${x.id}</b><span>${x.estado}</span></div><h3>${x.tipo}</h3><p>Inicio: ${fmt(x.inicio)}${fin ? '<br>Duración: ' + dur(x.inicio, x.fin) : '<br>Tiempo: <strong class="timer" data-start="' + x.inicio + '"></strong>'}</p><b class="view">${open ? 'Ocultar detalle ▲' : 'Ver detalle ▼'}</b></div>${open ? `<div class="report-detail"><p><b>Grupo:</b> ${x.grupo}<br><b>Supervisor:</b> ${x.supervisor}<br><b>Fundo:</b> ${x.fundo}<br><b>Parcela:</b> ${x.parcela}<br><b>Área:</b> ${x.area}<br><b>Descripción:</b> ${x.descripcion}<br><b>Trabajadores afectados:</b> ${x.trabajadores}<br><b>Fecha/hora de inicio:</b> ${fmt(x.inicio)}${fin ? `<br><b>Fecha/hora de fin:</b> ${fmt(x.fin)}<br><b>Duración:</b> ${dur(x.inicio, x.fin)}` : ''}</p><small>Información de solo lectura</small></div>` : ''}</article>`; }
function toggleReport(id) { reportOpenId = reportOpenId === id ? null : id; reportes(); }
function detalleReporte(id) { reportOpenId = id; go('reportes'); }
function reporteDetalle() { go('reportes'); }
function indicadores() { let s = stats(), mins = Math.floor(s.ms / 60000), tipos = {}; s.a.forEach(x => tipos[x.tipo] = (tipos[x.tipo] || 0) + 1); let maxTipo = Object.entries(tipos).sort((a, b) => b[1] - a[1])[0]; app.innerHTML = `${internalHeader('Indicadores')}<main class="page"><div class="today">Indicadores de hoy · ${nowDay()}</div><section class="kpis indicators"><article class="k-blue"><b>${s.a.length}</b><small>Incidencias registradas</small></article><article class="k-orange"><b>${s.curso.length}</b><small>En proceso</small></article><article class="k-green"><b>${s.fin.length}</b><small>Finalizadas</small></article><article class="k-purple"><b>${Math.floor(mins / 60)}h ${mins % 60}m</b><small>Tiempo muerto</small></article><article class="k-cyan"><b>${s.trabajadoresActuales}</b><small>Trabajadores afectados</small></article><article class="k-red"><b>${s.hh.toFixed(1)} h</b><small>Horas-hombre perdidas</small></article></section><section class="chart-card"><h3>En proceso vs. finalizadas</h3><div class="donut" style="--p:${s.a.length ? Math.round(s.fin.length / s.a.length * 100) : 0}"><b>${s.a.length ? Math.round(s.fin.length / s.a.length * 100) : 0}%</b></div><div class="legend"><span>● En proceso: ${s.curso.length}</span><span>● Finalizadas: ${s.fin.length}</span></div></section><section class="chart-card"><h3>Incidencias por tipo</h3>${Object.entries(tipos).map(([k, v]) => bar(k, v, Math.max(1, s.a.length))).join('') || '<p>Sin información registrada</p>'}</section>${maxTipo ? `<section class="impact"><small>Mayor recurrencia del día</small><b>${maxTipo[0]}</b><span>${maxTipo[1]} incidencia(s)</span></section>` : ''}</main>`; }
function bar(k, v, total) { return `<div class="barrow"><span>${k}</span><i><em style="width:${v / total * 100}%"></em></i><b>${v}</b></div>`; }
function envio() { let a = Incidencias.all(), pend = a.filter(x => !x.sincronizado), sync = DB.get('pt_ultima_sync_v3', null), last = DB.get('pt_ultimo_envio_v3', 0); app.innerHTML = `${internalHeader('Envío de información')}<main class="page sync-page"><section class="sync-card"><h3>Información por sincronizar</h3><div class="sync-counts"><span class="sent">☁ Enviados: <b>${last}</b></span><span class="pending">⌁ Pendientes: <b>${pend.length}</b></span></div><div class="sync-progress"><i style="width:${pend.length ? 35 : 100}%"></i></div><p>Solo se muestra la cantidad de registros pendientes.</p></section><section class="last-sync"><small>Última sincronización</small><b>${sync ? fmt(sync) : 'Aún no se ha sincronizado'}</b></section><button class="sync-button" ${!pend.length ? 'disabled' : ''} onclick="sincronizar()">☁ &nbsp; Enviar pendientes</button></main>`; }
function sincronizar() { let a = Incidencias.all(), n = a.filter(x => !x.sincronizado).length, t = new Date().toISOString(); DB.set('pt_incidencias_v3', a.map(x => x.sincronizado ? x : { ...x, sincronizado: true, fechaEnvio: t })); DB.set('pt_ultima_sync_v3', t); DB.set('pt_ultimo_envio_v3', n); toast(`${n} registro(s) enviados correctamente`); setTimeout(envio, 500); }
function toggleDbMenu(e) { e?.stopPropagation(); document.querySelector('#dbMenu')?.classList.toggle('open'); }
function descargarBD() { let rows = Incidencias.all(); if (!rows.length) {
    document.querySelector('#dbMenu')?.classList.remove('open');
    document.querySelector('#moduleDbMenu')?.classList.remove('open');
    toast('No existen registros para descargar');
    return;
} let headers = ['ID', 'Grupo', 'Supervisor', 'Fundo', 'Parcela', 'Area', 'Tipo', 'Descripcion', 'Trabajadores', 'Estado', 'FechaRegistro', 'Inicio', 'Fin', 'Duracion', 'Sincronizado', 'FechaEnvio']; let esc = v => '"' + String(v ?? '').replaceAll('"', '""') + '"'; let csv = '\ufeff' + headers.join(';') + '\n' + rows.map(x => [x.id, x.grupo, x.supervisor, x.fundo, x.parcela, x.area, x.tipo, x.descripcion, x.trabajadores, x.estado, x.fechaRegistro, x.inicio, x.fin || '', x.fin ? dur(x.inicio, x.fin) : dur(x.inicio), x.sincronizado ? 'SI' : 'NO', x.fechaEnvio || ''].map(esc).join(';')).join('\n'); let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'PRO_TIME_BD_' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); document.querySelector('#dbMenu')?.classList.remove('open'); document.querySelector('#moduleDbMenu')?.classList.remove('open'); }
function tick() { document.querySelectorAll('.timer').forEach(e => e.textContent = dur(e.dataset.start)); setTimeout(() => { if (document.querySelector('.timer'))
    tick(); }, 1000); }
function toast(msg) { let t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 1400); }
// La vista inicial se carga al terminar de cargar todos los scripts en index.html.
