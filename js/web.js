/* Las dos vistas comparten los datos locales pt_incidencias_v3. */
const WEB_STATES = ['Pendiente','Modificado','Validado','En proceso','Solucionado','Rechazado'];
const WEB_RESPONSABLES = {
    'Cosecha':['Álex Pairazamán'],
    'Transporte materia prima':['Víctor Orozco'],
    'PCO':['Emanuel Mesa'],
    'TI':['Cristian Cabanillas','César Santisteban']
};
const WEB_FIELDS = [
    ['id','Incidencia'],['grupo','Grupo'],['supervisor','Supervisor'],['fundo','Fundo'],
    ['parcela','Parcela'],['area','Área'],['tipo','Tipo'],['descripcion','Descripción'],
    ['audioId','Audio'],['ubicacion','Ubicación'],['fechaRegistro','Fecha de registro'],['inicio','Hora de inicio'],
    ['fin','Hora de fin'],['minutos','Minutos'],['trabajadores','Trabajadores'],
    ['horasHombre','Horas hombre'],['evidencia','Evidencia'],['fechaEnvio','Fecha de envío'],
    ['estado','Estado de incidencia'],['areaResponsable','Área responsable'],
    ['responsableValidacion','Responsable'],['planAccion','Plan de acción'],
    ['fechaEstimada','Fecha propuesta de solución'],['plazo','Plazo'],
    ['solucionAplicada','Solución aplicada'],['fechaSolucion','Fecha de solución'],
    ['ultimoUsuario','Última modificación por'],['historialWeb','Historial'],
    ['validacionEstado','Estado de validación']
];
const WEB_ONLY_VALIDATION = new Set(['areaResponsable','responsableValidacion','planAccion','fechaEstimada','plazo','solucionAplicada','fechaSolucion']);
const webVisibleFields=validation=>validation?WEB_FIELDS:WEB_FIELDS.filter(([key])=>!WEB_ONLY_VALIDATION.has(key));
let webSelected = new Set(), webModal = null;
let webFilters={desde:'',hasta:'',numero:'',grupo:'',area:'',estado:''};
const webEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const webUser=()=>{const s=DB.get('pt_sesion',{});return s.nombre||s.usuario||'Usuario local'};
const webStatus=x=>WEB_STATES.includes(x.validacionEstado)?x.validacionEstado:'Pendiente';
const webIncident=x=>x.estado==='FINALIZADA'?'Finalizado':'En curso';
const webMinutes=x=>x.fin&&x.inicio?Math.max(0,Math.round((new Date(x.fin)-new Date(x.inicio))/60000)):null;
const webHours=x=>{const minutes=webMinutes(x);return minutes===null?null:minutes*Number(x.trabajadores||0)/60};
const webNeedsPlan=x=>{const hours=webHours(x);return hours!==null&&hours>=50};
const webDate=v=>v&&!Number.isNaN(new Date(v).getTime())?new Date(v).toLocaleString('es-PE'):'—';
const webValidDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'');
function webDeadline(x){
    if(webStatus(x)==='Solucionado'){
        if(!webValidDate(x.fechaEstimada)||!x.fechaSolucion)return 'Solucionado';
        return x.fechaSolucion.slice(0,10)>x.fechaEstimada?'Solucionado fuera de plazo':'Solucionado dentro del plazo';
    }
    if(webStatus(x)!=='En proceso'||!webValidDate(x.fechaEstimada))return '—';
    const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Lima'});
    return today>x.fechaEstimada?'Fuera de plazo':today===x.fechaEstimada?'Vence hoy':'Dentro del plazo';
}
function webPill(label){
    const colors={'Pendiente':'pending','En curso':'progress','En proceso':'progress','Validado':'validated',
        'Finalizado':'validated','Solucionado':'validated','Modificado':'modified','Rechazado':'rejected',
        'Fuera de plazo':'rejected','Vence hoy':'pending','Dentro del plazo':'validated',
        'Solucionado fuera de plazo':'rejected','Solucionado dentro del plazo':'validated'};
    return `<span class="web-pill web-${colors[label]||'pending'}">${webEsc(label)}</span>`;
}
function webNotice(message){
    document.querySelector('#webNotice')?.remove();
    const el=document.createElement('div');el.id='webNotice';el.className='web-notice';
    el.setAttribute('role','status');el.textContent=message;document.body.append(el);
    setTimeout(()=>{if(el.isConnected)el.remove()},5000);
}
function webLog(x,tipo,detalle,estado){
    return [...(x.historialWeb||[]),{tipo,detalle,fecha:new Date().toISOString(),usuario:webUser(),estado}];
}
function webOptions(field,current){
    const values=[...new Set(Incidencias.all().map(x=>String(x[field]??'').trim()).filter(Boolean))]
        .sort((a,b)=>a.localeCompare(b,'es'));
    return `<option value="">Todos</option>${values.map(v=>`<option value="${webEsc(v)}" ${v===current?'selected':''}>${webEsc(v)}</option>`).join('')}`;
}
function webRows(validation){
    return Incidencias.all().filter(x=>{
        if(validation&&!['Validado','En proceso','Solucionado'].includes(webStatus(x)))return false;
        const day=String(x.fechaRegistro||x.inicio||'').slice(0,10);
        return (!webFilters.desde||day>=webFilters.desde)&&(!webFilters.hasta||day<=webFilters.hasta)
            &&(!webFilters.numero||x.id===webFilters.numero)
            &&(!webFilters.grupo||x.grupo===webFilters.grupo)
            &&(!webFilters.area||x.area===webFilters.area)
            &&(!webFilters.estado||webStatus(x)===webFilters.estado);
    });
}
function webTop(validation){
    const title=validation?'Validación de Incidencias Web':'Reporte de incidencias Web';
    const estados=validation?['Validado','En proceso','Solucionado']:WEB_STATES;
    return `${internalHeader(title)}<main class="web-page"><div class="web-heading"><h1>${title}</h1>
        <p>${validation?'Incidencias asignadas para plan de acción y solución.':'Todas las incidencias registradas en este navegador.'}</p></div>
        <div class="web-filters"><label>Fecha desde<input id="webDesde" type="date" value="${webEsc(webFilters.desde)}"></label>
        <label>Fecha hasta<input id="webHasta" type="date" value="${webEsc(webFilters.hasta)}"></label>
        <label>Incidencia<select id="webNumero">${webOptions('id',webFilters.numero)}</select></label>
        <label>Grupo<select id="webGrupo">${webOptions('grupo',webFilters.grupo)}</select></label>
        <label>Área<select id="webArea">${webOptions('area',webFilters.area)}</select></label>
        <label>Estado de validación<select id="webEstado"><option value="">Todos</option>${estados.map(v=>`<option ${webFilters.estado===v?'selected':''}>${v}</option>`).join('')}</select></label>
        <button class="web-btn" id="webExport">⬇ Exportar CSV</button></div>
        ${validation?'':`<div class="web-toolbar"><strong id="webSelectedCount">0 seleccionados</strong>
        <button id="webEdit" class="web-btn" disabled>Editar</button><button id="webDelete" class="web-btn danger" disabled>Eliminar</button>
        <button id="webValidate" class="web-btn" disabled>Validar y asignar</button></div>`}
        <p class="web-count" id="webCount"></p><div class="web-scroll"><table class="web-table"><thead><tr>
        ${validation?'':'<th><input id="webAll" type="checkbox" aria-label="Seleccionar todas las incidencias visibles"></th>'}
        ${webVisibleFields(validation).map(([,name],index)=>`<th data-column="${index}">${name}<span class="web-resizer" title="Arrastra para cambiar el ancho" aria-hidden="true"></span></th>`).join('')}<th>Acción</th></tr></thead><tbody id="webBody"></tbody></table></div></main>`;
}
function reporteWeb(){app.innerHTML=webTop(false);webBind(false)}
function validacionWeb(){app.innerHTML=webTop(true);webBind(true)}
function webBind(validation){
    webResizeColumns(validation);
    for(const [id,key] of [['webDesde','desde'],['webHasta','hasta'],['webNumero','numero'],
        ['webGrupo','grupo'],['webArea','area'],['webEstado','estado']]){
        document.getElementById(id).onchange=e=>{webFilters[key]=e.target.value;webSelected.clear();webDraw(validation)};
    }
    document.getElementById('webExport').onclick=()=>webDownload(validation);
    if(!validation){
        document.getElementById('webAll').onchange=e=>{
            for(const x of webRows(false))e.target.checked?webSelected.add(x.id):webSelected.delete(x.id);
            webDraw(false);
        };
        document.getElementById('webEdit').onclick=()=>{
            const selected=webSelectedRows();if(selected.length===1)webEdit(selected[0]);
        };
        document.getElementById('webDelete').onclick=()=>webDelete(webSelectedRows());
        document.getElementById('webValidate').onclick=()=>webValidate(webSelectedRows());
    }
    webDraw(validation);
}
function webResizeColumns(validation){
    const table=document.querySelector('.web-table');
    if(!validation)table.querySelector('th:first-child').style.width='55px';
    const sizes=webVisibleFields(validation).map(([key])=>({descripcion:260,planAccion:240,solucionAplicada:220,
        historialWeb:105,audioId:115,fechaRegistro:145,inicio:140,fin:140,fechaEstimada:150,
        validacionEstado:145,areaResponsable:150,responsableValidacion:150}[key]||115));
    try{
        const saved=JSON.parse(localStorage.getItem('pt_web_widths')||'null');
        if(Array.isArray(saved)&&saved.length===sizes.length)saved.forEach((v,i)=>{
            if(Number.isFinite(v)&&v>=80&&v<=650)sizes[i]=v;
        });
    }catch(_){}
    const heads=[...table.querySelectorAll('th[data-column]')];
    const update=()=>{
        heads.forEach((th,i)=>th.style.width=sizes[i]+'px');
        table.style.width=(sizes.reduce((sum,v)=>sum+v,0)+(validation?180:235))+'px';
    };
    update();
    heads.forEach((th,i)=>th.querySelector('.web-resizer').onpointerdown=e=>{
        e.preventDefault();e.stopPropagation();
        const start=e.clientX,original=sizes[i],handle=e.currentTarget;
        handle.setPointerCapture(e.pointerId);
        handle.onpointermove=event=>{sizes[i]=Math.max(80,Math.min(650,original+event.clientX-start));update()};
        handle.onpointerup=()=>{
            handle.onpointermove=null;handle.onpointerup=null;
            try{localStorage.setItem('pt_web_widths',JSON.stringify(sizes))}catch(_){}
        };
    });
}
function webSelectedRows(){return Incidencias.all().filter(x=>webSelected.has(x.id))}
function webValue(x,key){
    if(key==='estado')return webIncident(x);
    if(key==='validacionEstado')return webStatus(x);
    if(key==='plazo')return webDeadline(x);
    if(key==='minutos')return webMinutes(x)??'—';
    if(key==='horasHombre'){
        const hours=webHours(x);return hours===null?'—':hours.toFixed(2);
    }
    if(key==='ubicacion'){
        const c=x.ubicacion;return c&&Number.isFinite(Number(c.latitud))&&Number.isFinite(Number(c.longitud))?`${Number(c.latitud).toFixed(6)}, ${Number(c.longitud).toFixed(6)}`:'—';
    }
    if(key==='inicio'||key==='fin'||key==='fechaRegistro'||key==='fechaEnvio'||key==='fechaSolucion')return webDate(x[key]);
    return x[key]??'—';
}
function webCell(x,key){
    if(key==='audioId')return x.audioId?`<button type="button" class="web-text" data-audio="${webEsc(x.audioId)}" aria-label="Escuchar audio de ${webEsc(x.id)}">▶ Escuchar</button>`:'—';
    if(key==='historialWeb')return `<button type="button" class="web-text" data-history="${webEsc(x.id)}">Ver (${(x.historialWeb||[]).length})</button>`;
    if(key==='horasHombre'){
        const hours=webHours(x);
        if(hours===null)return '—';
        const color=hours<50?'impact-low':hours<100?'impact-medium':'impact-high';
        return `<span class="web-impact ${color}" title="${hours.toFixed(2)} horas hombre perdidas">${hours.toFixed(2)} h</span>`;
    }
    if(key==='evidencia'&&x.evidencia&&/^(https?:\/\/|data:image\/(png|jpeg|webp);base64,)/i.test(x.evidencia))
        return `<a href="${webEsc(x.evidencia)}" target="_blank" rel="noopener">Ver evidencia</a>`;
    if(['estado','validacionEstado','plazo'].includes(key))return webPill(webValue(x,key));
    if(['descripcion','planAccion','solucionAplicada'].includes(key))
        return `<div class="web-cell-text" title="${webEsc(webValue(x,key))}">${webEsc(webValue(x,key))}</div>`;
    return webEsc(webValue(x,key));
}
const webCanEdit=x=>webStatus(x)!=='Solucionado';
function webActions(x,validation){
    if(validation)return `${webStatus(x)==='Validado'&&webNeedsPlan(x)?`<button class="web-btn web-plan-btn" data-plan="${webEsc(x.id)}">Asignar plan de acción</button>`:''}
        ${webStatus(x)==='Validado'&&!webNeedsPlan(x)?`<button class="web-btn web-solve-btn" data-solve="${webEsc(x.id)}">Registrar solución aplicada</button>`:''}
        ${webStatus(x)==='En proceso'?`<button class="web-btn web-solve-btn" data-solve="${webEsc(x.id)}">Marcar solucionado</button>`:''}`;
    const canValidate=x.estado==='FINALIZADA'&&['Pendiente','Modificado'].includes(webStatus(x));
    const canDelete=x.estado==='FINALIZADA'&&webStatus(x)!=='Rechazado'&&webStatus(x)!=='Solucionado';
    return `<button class="web-icon" title="${webCanEdit(x)?'Editar':'Edición bloqueada'}" aria-label="Editar ${webEsc(x.id)}" data-edit="${webEsc(x.id)}" ${webCanEdit(x)?'':'disabled'}>✎</button>
        <button class="web-icon web-icon-check" title="Validar y asignar" aria-label="Validar ${webEsc(x.id)}" data-validate="${webEsc(x.id)}" ${canValidate?'':'disabled'}>✓</button>
        <button class="web-icon web-icon-trash" title="Eliminar" aria-label="Eliminar ${webEsc(x.id)}" data-delete="${webEsc(x.id)}" ${canDelete?'':'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v6m4-6v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
}
function webDraw(validation){
    const rows=webRows(validation),body=document.getElementById('webBody');if(!body)return;
    document.getElementById('webCount').textContent=`${rows.length} incidencia(s) mostrada(s) · ${Incidencias.all().length} registrada(s)`;
    body.innerHTML=rows.map(x=>`<tr>${validation?'':`<td><input class="web-check" type="checkbox" data-id="${webEsc(x.id)}" ${webSelected.has(x.id)?'checked':''} aria-label="Seleccionar ${webEsc(x.id)}"></td>`}
        ${webVisibleFields(validation).map(([key])=>`<td>${webCell(x,key)}</td>`).join('')}<td class="web-row-actions">${webActions(x,validation)}</td></tr>`).join('')
        ||`<tr><td colspan="${webVisibleFields(validation).length+(validation?1:2)}" class="web-empty">No hay incidencias para los filtros seleccionados.</td></tr>`;
    if(!validation){
        const all=document.getElementById('webAll');
        all.checked=!!rows.length&&rows.every(x=>webSelected.has(x.id));
        all.indeterminate=rows.some(x=>webSelected.has(x.id))&&!all.checked;
        const selected=webSelectedRows();
        document.getElementById('webSelectedCount').textContent=`${selected.length} seleccionado(s)`;
        document.getElementById('webEdit').disabled=selected.length!==1||!webCanEdit(selected[0]);
        document.getElementById('webDelete').disabled=!selected.length||selected.some(x=>x.estado!=='FINALIZADA'||['Rechazado','Solucionado'].includes(webStatus(x)));
        document.getElementById('webValidate').disabled=!selected.length||selected.some(x=>x.estado!=='FINALIZADA'||!['Pendiente','Modificado'].includes(webStatus(x)));
    }
    body.onchange=e=>{
        if(e.target.classList.contains('web-check')){
            e.target.checked?webSelected.add(e.target.dataset.id):webSelected.delete(e.target.dataset.id);
            webDraw(false);
        }
    };
    body.onclick=e=>{
        const btn=e.target.closest('button[data-edit],button[data-delete],button[data-validate],button[data-plan],button[data-solve],button[data-audio],button[data-history]');
        if(!btn||btn.disabled)return;
        if(btn.dataset.audio){voiceOpenPlayer(btn.dataset.audio);return}
        const x=Incidencias.byId(btn.dataset.edit||btn.dataset.delete||btn.dataset.validate||btn.dataset.plan||btn.dataset.solve||btn.dataset.history);
        if(!x)return;
        if(btn.dataset.edit)webEdit(x);
        else if(btn.dataset.delete)webDelete([x]);
        else if(btn.dataset.validate)webValidate([x]);
        else if(btn.dataset.plan)webPlan(x);
        else if(btn.dataset.solve)webSolve(x);
        else webHistory(x);
    };
}
function webClose(){document.getElementById('webModal')?.remove();webModal=null}
function webShow(title,content,submit){
    webClose();const wrap=document.createElement('div');wrap.id='webModal';wrap.className='web-modal-wrap';
    wrap.innerHTML=`<div class="web-modal" role="dialog" aria-modal="true" aria-label="${webEsc(title)}"><h2>${webEsc(title)}</h2>
        <form id="webForm">${content}<div class="web-modal-actions"><button type="button" id="webCancel">Cancelar</button>
        <button class="web-btn" type="submit">Guardar</button></div><p id="webError" role="alert"></p></form></div>`;
    document.body.append(wrap);webModal=wrap;
    wrap.querySelector('#webCancel').onclick=webClose;
    wrap.onclick=e=>{if(e.target===wrap)webClose()};
    wrap.querySelector('#webForm').onsubmit=e=>{e.preventDefault();submit(new FormData(e.target))};
}
function webEdit(x){
    if(!webCanEdit(x)){webNotice('La incidencia finalizada o validada está bloqueada para edición.');return}
    const fields=[['grupo','Grupo'],['supervisor','Supervisor'],['fundo','Fundo'],['parcela','Parcela'],
        ['area','Área'],['tipo','Tipo'],['descripcion','Descripción'],['inicio','Inicio'],['fin','Fin'],
        ['trabajadores','Trabajadores'],['evidencia','Evidencia']];
    const inputs=fields.map(([key,label])=>{
        const v=x[key]??'',type=key==='trabajadores'?'number':['inicio','fin'].includes(key)?'datetime-local':'text';
        if(key==='descripcion')return `<label class="wide">${label}<textarea name="${key}" required>${webEsc(v)}</textarea></label>`;
        const localDate=type==='datetime-local'&&v?new Date(new Date(v).getTime()-new Date(v).getTimezoneOffset()*60000).toISOString().slice(0,16):v;
        return `<label>${label}<input name="${key}" type="${type}" ${key==='trabajadores'?'min="0" step="1"':''} value="${webEsc(localDate)}"></label>`;
    }).join('');
    webShow('Editar '+x.id,`<p>Los campos del aplicativo pueden corregirse aquí. El audio original se conserva.</p><div class="web-form-grid">${inputs}</div>`,d=>{
        const changes={},details=[];
        for(const [key,label] of fields){
            let value=d.get(key);
            if(key==='trabajadores'){
                value=Number(value);
                if(!Number.isInteger(value)||value<0){document.getElementById('webError').textContent='Ingresa un número válido de trabajadores.';return}
            }
            if(['inicio','fin'].includes(key))value=value?new Date(value).toISOString():null;
            const old=x[key]??(key==='trabajadores'?0:'');
            if(String(value??'')!==String(old??'')){
                changes[key]=value;details.push(`${label}: ${old||'—'} → ${value||'—'}`);
            }
        }
        const start=changes.inicio||x.inicio,end=changes.fin===undefined?x.fin:changes.fin;
        if(end&&start&&new Date(end)<new Date(start)){
            document.getElementById('webError').textContent='El fin debe ser posterior al inicio.';return;
        }
        if(details.length){
            const status=webStatus(x);
            const validationStatus=['Pendiente','Modificado'].includes(status)?'Modificado':status;
            Incidencias.update(x.id,{...changes,validacionEstado:validationStatus,ultimoUsuario:webUser(),
                historialWeb:webLog(x,'Edición',details.join('\n'),validationStatus)});
        }
        webClose();webDraw(false);webNotice(details.length?'Incidencia modificada.':'No se detectaron cambios.');
    });
}
function webDelete(rows){
    if(!rows.length)return;
    if(rows.some(x=>x.estado!=='FINALIZADA'||['Rechazado','Solucionado'].includes(webStatus(x)))){
        webNotice('Solo se pueden rechazar incidencias finalizadas que no estén solucionadas.');return;
    }
    if(!confirm(`¿Marcar ${rows.length} incidencia(s) como Rechazado? Se conservarán los registros y el historial.`))return;
    for(const x of rows)Incidencias.update(x.id,{validacionEstado:'Rechazado',ultimoUsuario:webUser(),
        historialWeb:webLog(x,'Eliminación lógica','Registro conservado como evidencia.','Rechazado')});
    webSelected.clear();webDraw(false);webNotice(`${rows.length} incidencia(s) rechazadas.`);
}
function webValidate(rows){
    if(!rows.length)return;
    if(rows.some(x=>x.estado!=='FINALIZADA'||!['Pendiente','Modificado'].includes(webStatus(x)))){
        webNotice('Solo se pueden validar incidencias finalizadas y pendientes de asignación.');return;
    }
    const current=rows.length===1?rows[0]:{};
    const areaValue=Object.hasOwn(WEB_RESPONSABLES,current.areaResponsable||'')?current.areaResponsable:'';
    webShow(`Validar y asignar ${rows.length===1?current.id:rows.length+' incidencias'}`,
        `<p>Asigna el área y la persona encargada. El estado cambiará a Validado.</p>
        <label>Área responsable<select name="areaResponsable" id="assignArea" required><option value="">Selecciona un área</option>
        ${Object.keys(WEB_RESPONSABLES).map(area=>`<option value="${webEsc(area)}" ${areaValue===area?'selected':''}>${webEsc(area)}</option>`).join('')}</select></label>
        <label>Persona responsable<select name="responsableValidacion" id="assignPerson" required></select></label>`,d=>{
        const areaResponsable=String(d.get('areaResponsable')||'').trim();
        const responsableValidacion=String(d.get('responsableValidacion')||'').trim();
        if(!Object.hasOwn(WEB_RESPONSABLES,areaResponsable)||!WEB_RESPONSABLES[areaResponsable].includes(responsableValidacion)){
            document.getElementById('webError').textContent='Selecciona un área y una persona responsable de la lista.';return;
        }
        for(const x of rows)Incidencias.update(x.id,{areaResponsable,responsableValidacion,validacionEstado:'Validado',
            ultimoUsuario:webUser(),historialWeb:webLog(x,'Validación',`Área: ${areaResponsable}; responsable: ${responsableValidacion}`,'Validado')});
        webSelected.clear();webClose();webDraw(false);webNotice(`${rows.length} incidencia(s) asignadas. Ya están en Validación de Incidencias Web.`);
    });
    const area=document.getElementById('assignArea'),person=document.getElementById('assignPerson');
    const updatePerson=()=>{
        const options=WEB_RESPONSABLES[area.value]||[];
        person.innerHTML=`<option value="">Selecciona una persona</option>${options.map(name=>`<option value="${webEsc(name)}">${webEsc(name)}</option>`).join('')}`;
        if(options.includes(current.responsableValidacion))person.value=current.responsableValidacion;
    };
    area.onchange=()=>{current.responsableValidacion='';updatePerson()};
    updatePerson();
}
function webPlan(x){
    if(webStatus(x)!=='Validado'||!webNeedsPlan(x))return;
    webShow('Asignar plan de acción · '+x.id,
        `<p>Área: ${webEsc(x.areaResponsable||'—')} · Responsable: ${webEsc(x.responsableValidacion||'—')}</p>
        <label>Plan de acción<select name="planTipo" required><option value="">Selecciona un plan</option><option>Capacitación al personal</option><option>Coordinar traslado o transporte</option><option>Asignar más unidades</option><option>Mejorar el proceso de cosecha</option><option>Otro</option></select></label>
        <label>Descripción del plan de acción<textarea name="planDescripcion" required placeholder="Describe las acciones que se realizarán"></textarea></label>
        <label>Fecha propuesta de solución<input name="fechaEstimada" type="date" required value="${webEsc(x.fechaEstimada||new Date().toLocaleDateString('en-CA',{timeZone:'America/Lima'}))}"></label>`,d=>{
        const planTipo=String(d.get('planTipo')||'').trim(),planDescripcion=String(d.get('planDescripcion')||'').trim();
        const planAccion=planTipo&&planDescripcion?`${planTipo}: ${planDescripcion}`:'',fechaEstimada=String(d.get('fechaEstimada')||'');
        if(!planAccion||!webValidDate(fechaEstimada)){document.getElementById('webError').textContent='Completa el plan y la fecha propuesta.';return}
        Incidencias.update(x.id,{planTipo,planDescripcion,planAccion,fechaEstimada,validacionEstado:'En proceso',ultimoUsuario:webUser(),
            historialWeb:webLog(x,'Plan de acción',`Plan: ${planAccion}; fecha propuesta: ${fechaEstimada}`,'En proceso')});
        webClose();webDraw(true);webNotice('Plan asignado. La incidencia está En proceso.');
    });
}
function webSolve(x){
    if(webStatus(x)!=='En proceso'&&!(webStatus(x)==='Validado'&&!webNeedsPlan(x)))return;
    const defaultDate=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
    webShow('Registrar solución aplicada · '+x.id,
        `${webNeedsPlan(x)?`<p>Plan: ${webEsc(x.planAccion||'—')}</p>`:''}<label>Solución aplicada<textarea name="solucionAplicada" required></textarea></label>
        <label>Fecha y hora de solución<input name="fechaSolucion" type="datetime-local" value="${defaultDate}" required></label>`,d=>{
        const solucionAplicada=String(d.get('solucionAplicada')||'').trim();
        if(!solucionAplicada){document.getElementById('webError').textContent='Describe la solución aplicada.';return}
        const fechaValue=String(d.get('fechaSolucion')||'');
        if(!fechaValue||Number.isNaN(new Date(fechaValue).getTime())){document.getElementById('webError').textContent='Indica una fecha de solución válida.';return}
        const fechaSolucion=new Date(fechaValue).toISOString();
        Incidencias.update(x.id,{solucionAplicada,fechaSolucion,validacionEstado:'Solucionado',ultimoUsuario:webUser(),
            historialWeb:webLog(x,'Solución',`Solución aplicada: ${solucionAplicada}; fecha: ${fechaSolucion}`,'Solucionado')});
        webClose();webDraw(true);webNotice('Incidencia solucionada y registrada en el historial.');
    });
}
function webHistory(x){
    const items=x.historialWeb||[];
    webShow('Historial de '+x.id,
        `<div class="web-history">${items.length?items.map(h=>`<p><b>${webEsc(h.tipo)}</b> · ${webEsc(webDate(h.fecha))} · ${webEsc(h.usuario||'Usuario no registrado')}<br><span class="web-detail">${webEsc(h.detalle||'')}</span>${h.estado?`<br>${webPill(h.estado)}`:''}</p>`).join(''):'Sin acciones registradas.'}</div>`,()=>{});
    document.querySelector('#webForm button[type=submit]').remove();
}
function webDownload(validation){
    const fields=webVisibleFields(validation).filter(([key])=>key!=='historialWeb');
    const data=[fields.map(([,name])=>name),...webRows(validation).map(x=>fields.map(([key])=>key==='audioId'?(x.audioId?'Audio guardado localmente · '+x.audioId:''):webValue(x,key)))];
    const csv='\ufeff'+data.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(';')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;
    link.download=validation?'PROTIME_Validacion_Web.csv':'PROTIME_Incidencias_Web.csv';
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
