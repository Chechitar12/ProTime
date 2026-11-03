/* Solo se dibujan coordenadas guardadas. Nunca se infieren ni migran históricos. */
function geoInit(form) {
    const box=document.createElement('div');box.className='geo-field';
    box.innerHTML='<span id="geoStatus" role="status" aria-live="polite"></span><div class="geo-coordinates"><label>Latitud<input id="geoLatitud" readonly aria-label="Latitud de la parcela"></label><label>Longitud<input id="geoLongitud" readonly aria-label="Longitud de la parcela"></label></div>';
    const parcela=form.querySelector('#parcela');
    parcela.closest('label').after(box);
    const update=()=>{
        const location=Parcelas.ubicacion(parcela.value);
        box.dataset.location=location?'configured':'pending';
        box.querySelector('#geoLatitud').value=location?String(location.latitud):'';
        box.querySelector('#geoLongitud').value=location?String(location.longitud):'';
        box.querySelector('#geoStatus').textContent=location?`⌖ Ubicación configurada para ${location.parcela}${location.parcela==='P64'?' · ubicación validada':''}.`:
            parcela.value?'Ubicación pendiente: esta parcela no tiene coordenadas configuradas. La incidencia se guardará sin ubicación.':'Selecciona una parcela para asignar sus coordenadas.';
    };
    parcela.addEventListener('change',update);
    parcela.addEventListener('input',update);
    update();
}
let mapView=null,mapMode='heat';
function mapDispose(){
    mapView?.observer?.disconnect();
    mapView?.googleHandle?.destroy();
    mapView=null;
}
const mapCoords=x=>{
    const c=x?.ubicacion;
    if(!c||c.latitud==null||c.longitud==null||String(c.latitud).trim()===''||String(c.longitud).trim()==='')return null;
    const lat=Number(c.latitud),lon=Number(c.longitud);
    return Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=85&&Math.abs(lon)<=180?{lat,lon}:null;
};
const mapHours=x=>{
    const start=new Date(x.inicio).getTime(),end=x.fin?new Date(x.fin).getTime():Date.now();
    return Number.isFinite(start)&&Number.isFinite(end)?Math.max(0,(end-start)/3600000)*Number(x.trabajadores||0):0;
};
const mapColor=h=>h<50?'low':h<100?'medium':'high';
function mapaIncidencias(){
    mapDispose();
    const all=Incidencias.all(),rows=all.filter(x=>mapCoords(x)),pending=all.length-rows.length;
    app.innerHTML=`${internalHeader('Mapa de incidencias')}<main class="map-page"><h1>Mapa de calor de incidencias</h1>
        <p>Identifica las zonas de mayor afectación. Toca un punto o selecciona una incidencia para ver el detalle.</p>
        <div class="map-view-toolbar"><div class="map-view-switch" role="group" aria-label="Visualización del mapa">
        <button type="button" data-map-mode="heat" aria-pressed="${mapMode==='heat'}">◉ Mapa de calor</button>
        <button type="button" data-map-mode="markers" aria-pressed="${mapMode==='markers'}">⌖ Marcadores</button></div>
        <div class="map-heat-legend"><span>Menor impacto</span><i aria-hidden="true"></i><span>Mayor impacto</span></div></div>
        <p class="map-heat-explanation">El calor acumula las horas-hombre de incidencias próximas. Es una influencia visual, no el límite de la parcela. Los puntos conservan el color individual de cada incidencia.</p>
        <div class="map-legend"><span><i class="low"></i>Menos de 50 h</span><span><i class="medium"></i>50 a menos de 100 h</span><span><i class="high"></i>100 h o más</span></div>
        ${pending?`<p class="map-pending" role="status">${pending} incidencia(s) con ubicación pendiente o no válida. Los registros históricos se conservan sin modificar.</p>`:''}
        <p id="mapProviderStatus" class="map-provider-status" role="status"></p>
        <div class="map-layout"><div id="incidentMap" class="incident-map" aria-label="Mapa de incidencias"></div>
        <aside class="map-sidebar"><b>${rows.length} incidencia(s) con ubicación</b>${rows.length?rows.map(x=>`<button type="button" class="map-item" data-map-id="${webEsc(x.id)}"><span class="map-dot ${mapColor(mapHours(x))}"></span><span><strong>${webEsc(x.id)} · ${webEsc(x.parcela||'Sin parcela')}</strong><small>${webEsc(x.tipo||'Incidencia')} · ${mapHours(x).toFixed(2)} h</small></span></button>`).join(''):'<p>Aún no hay incidencias con coordenadas. Selecciona una parcela configurada al registrar una nueva incidencia.</p>'}</aside></div>
        <p class="map-note">El mapa base requiere internet. Las incidencias y sus coordenadas permanecen guardadas localmente.</p></main>`;
    // El centro vacío es solo una vista inicial, nunca una ubicación de incidencia.
    const defaultCenter=Parcelas.ubicacion('P61');
    const first=mapCoords(rows[0])||{lat:defaultCenter.latitud,lon:defaultCenter.longitud};
    mapView={center:first,zoom:rows.length>1?10:14,rows,provider:'osm',mode:mapMode};
    if(rows.length>1){let lats=rows.map(x=>mapCoords(x).lat),lons=rows.map(x=>mapCoords(x).lon);
        mapView.center={lat:(Math.min(...lats)+Math.max(...lats))/2,lon:(Math.min(...lons)+Math.max(...lons))/2};
        const spread=Math.max(Math.max(...lats)-Math.min(...lats),Math.max(...lons)-Math.min(...lons));
        mapView.zoom=Math.max(3,Math.min(15,Math.floor(Math.log2(80/Math.max(.005,spread)))));
    }
    const view=mapView,el=document.getElementById('incidentMap');
    el.dataset.mode=mapMode;
    document.querySelectorAll('[data-map-mode]').forEach(button=>button.onclick=()=>{
        mapMode=button.dataset.mapMode;view.mode=mapMode;el.dataset.mode=mapMode;
        document.querySelectorAll('[data-map-mode]').forEach(control=>control.setAttribute('aria-pressed',String(control.dataset.mapMode===mapMode)));
        document.querySelector('.map-heat-legend').hidden=mapMode!=='heat';
        document.querySelector('.map-heat-explanation').hidden=mapMode!=='heat';
        view.googleHandle?.setMode(mapMode);
        if(view.provider==='osm')mapDraw();
    });
    document.querySelector('.map-heat-legend').hidden=mapMode!=='heat';
    document.querySelector('.map-heat-explanation').hidden=mapMode!=='heat';
    mapOsmMount(view);
    document.querySelectorAll('[data-map-id]').forEach(b=>b.onclick=()=>{
        const row=rows.find(x=>x.id===b.dataset.mapId);if(!row)return;
        if(view.provider==='google'){view.googleHandle?.focus(row.id);return;}
        view.center=mapCoords(row);mapDraw();mapPopup(row);
    });
    view.observer=new ResizeObserver(()=>{if(mapView===view&&view.provider==='osm')mapDraw()});
    view.observer.observe(el);
    if(PROTIME_MAP_CONFIG.apiKey.trim())mapGoogleMount(view);
    else document.getElementById('mapProviderStatus').textContent='Mapa base: OpenStreetMap.';
}
function mapOsmMount(view){
    const el=document.getElementById('incidentMap');if(!el||mapView!==view)return;
    view.provider='osm';el.dataset.provider='osm';
    el.innerHTML='<div class="map-tiles"></div><canvas class="map-heat" aria-hidden="true"></canvas><div class="map-pins"></div><div class="map-controls"><button id="mapPlus" aria-label="Acercar">+</button><button id="mapMinus" aria-label="Alejar">−</button></div><div class="map-attribution">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> colaboradores</div>';
    if(!view.fitted&&view.rows.length){
        const points=view.rows.map(row=>mapProject(mapCoords(row),0));
        const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));
        const minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
        const box=el.getBoundingClientRect();
        view.center=mapUnproject({x:(minX+maxX)/2,y:(minY+maxY)/2},0);
        view.zoom=Math.max(2,Math.min(17,Math.floor(Math.min(
            Math.log2(Math.max(64,box.width-100)/Math.max(.0001,maxX-minX)),
            Math.log2(Math.max(64,box.height-100)/Math.max(.0001,maxY-minY))))));
        view.fitted=true;
    }
    el.querySelector('#mapPlus').onclick=()=>{mapView.zoom=Math.min(18,mapView.zoom+1);mapDraw()};
    el.querySelector('#mapMinus').onclick=()=>{mapView.zoom=Math.max(2,mapView.zoom-1);mapDraw()};
    el.onwheel=e=>{if(view.provider!=='osm')return;e.preventDefault();mapView.zoom=Math.max(2,Math.min(18,mapView.zoom+(e.deltaY<0?1:-1)));mapDraw()};
    let drag=null;
    el.onpointerdown=e=>{if(view.provider!=='osm'||e.target.closest('button,a,.map-popup'))return;drag={x:e.clientX,y:e.clientY,lat:mapView.center.lat,lon:mapView.center.lon};el.setPointerCapture(e.pointerId)};
    el.onpointermove=e=>{if(!drag||view.provider!=='osm')return;
        const start=mapProject({lat:drag.lat,lon:drag.lon},mapView.zoom);
        mapView.center=mapUnproject({x:start.x-(e.clientX-drag.x),y:start.y-(e.clientY-drag.y)},mapView.zoom);mapDraw()};
    el.onpointerup=el.onpointercancel=()=>{drag=null};
    mapDraw();
}
async function mapGoogleMount(view){
    const el=document.getElementById('incidentMap'),host=document.createElement('div');
    host.className='map-google-host';el.append(host);
    const status=document.getElementById('mapProviderStatus');
    status.textContent='Cargando Google Maps…';
    let failed=false;
    const fallback=()=>{
        failed=true;
        if(mapView!==view||!el.isConnected)return;
        view.googleHandle?.destroy();view.googleHandle=null;
        mapOsmMount(view);
        status.textContent='Google Maps no está disponible. Se muestra OpenStreetMap; los marcadores conservan sus coordenadas.';
    };
    try{
        const handle=await GoogleMapsView.mount({element:host,view,onFailure:fallback});
        if(mapView!==view||failed){handle?.destroy();return;}
        view.googleHandle=handle;view.provider='google';el.dataset.provider='google';
        el.querySelectorAll(':scope>.map-tiles,:scope>.map-heat,:scope>.map-pins,:scope>.map-controls,:scope>.map-attribution,:scope>.map-popup').forEach(layer=>{layer.hidden=true});
        status.textContent='Mapa base: Google Maps · coordenadas guardadas de cada incidencia.';
    }catch(_){fallback()}
}
function mapProject(c,z){const lat=Math.max(-85,Math.min(85,c.lat))*Math.PI/180;
    const k=256*2**z;return {x:(c.lon+180)/360*k,y:(1-Math.log(Math.tan(lat)+1/Math.cos(lat))/Math.PI)/2*k}}
function mapUnproject(p,z){const k=256*2**z,n=Math.PI*(1-2*p.y/k);
    return {lat:Math.atan(Math.sinh(n))*180/Math.PI,lon:((p.x/k*360)%360+360)%360-180}}
function mapDraw(){
    const el=document.querySelector('#incidentMap');if(!el||!mapView||mapView.provider!=='osm')return;
    el.querySelector('.map-popup')?.remove();
    const {width,height}=el.getBoundingClientRect(),z=mapView.zoom,world=256*2**z,c=mapProject(mapView.center,z);
    const tiles=el.querySelector('.map-tiles'),pins=el.querySelector('.map-pins');
    tiles.replaceChildren();pins.replaceChildren();
    const left=Math.floor((c.x-width/2)/256),right=Math.ceil((c.x+width/2)/256),top=Math.floor((c.y-height/2)/256),bottom=Math.ceil((c.y+height/2)/256),count=2**z;
    for(let tx=left;tx<=right;tx++)for(let ty=top;ty<=bottom;ty++){
        if(ty<0||ty>=count)continue;
        const img=document.createElement('img');img.alt='';img.draggable=false;
        img.style.left=(tx*256-c.x+width/2)+'px';img.style.top=(ty*256-c.y+height/2)+'px';
        img.src=`https://tile.openstreetmap.org/${z}/${((tx%count)+count)%count}/${ty}.png`;tiles.append(img);
    }
    for(const x of mapView.rows){const p=mapProject(mapCoords(x),z),h=mapHours(x);
        let dx=p.x-c.x;if(dx>world/2)dx-=world;if(dx< -world/2)dx+=world;
        const px=dx+width/2,py=p.y-c.y+height/2;
        if(px< -40||px>width+40||py< -40||py>height+40)continue;
        const pin=document.createElement('button');pin.type='button';pin.className=`map-pin ${mapColor(h)}`;
        pin.style.left=px+'px';pin.style.top=py+'px';pin.setAttribute('aria-label',`${x.id}, ${x.parcela||'Sin parcela'}, ${x.tipo||'Incidencia'}, ${h.toFixed(2)} horas-hombre`);
        pin.title=`${x.tipo||'Incidencia'} · ${h.toFixed(2)} h`;pin.dataset.id=x.id;pin.onclick=()=>mapPopup(x,pin);pins.append(pin);
    }
    const heat=el.querySelector('.map-heat');heat.hidden=mapView.mode!=='heat';
    if(mapView.mode==='heat')MapHeat.draw(heat,MapHeat.groups(mapView.rows).map(location=>{
        const pixel=mapProject(location,z);let dx=pixel.x-c.x;
        if(dx>world/2)dx-=world;if(dx< -world/2)dx+=world;
        return {x:dx+width/2,y:pixel.y-c.y+height/2,hours:location.hours};
    }),width,height);
}
function mapPopup(x,anchor){
    document.querySelector('.map-popup')?.remove();
    const map=document.querySelector('#incidentMap');if(!map)return;
    const popup=document.createElement('div');popup.className='map-popup';
    popup.setAttribute('role','dialog');popup.setAttribute('aria-label','Detalle de '+x.id);
    popup.innerHTML=`<button class="map-popup-close" aria-label="Cerrar detalle">×</button>${mapPopupContent(x)}`;
    const box=map.getBoundingClientRect(),pin=anchor||[...map.querySelectorAll('.map-pin')].find(b=>b.dataset.id===x.id);
    let px=pin?Number.parseFloat(pin.style.left):box.width/2,py=pin?Number.parseFloat(pin.style.top):box.height/2;
    map.append(popup);popup.style.transform='none';
    const size=popup.getBoundingClientRect();
    popup.style.left=Math.max(8,Math.min(px-size.width/2,box.width-size.width-8))+'px';
    popup.style.top=Math.max(8,Math.min(py-size.height-20,box.height-size.height-8))+'px';
    popup.querySelector('button').onclick=()=>popup.remove();popup.querySelector('button').focus();
}
function mapPopupContent(x){
    const hours=mapHours(x),estado=x.validacionEstado?`${x.estado||'—'} · ${x.validacionEstado}`:x.estado||'—';
    return `<div class="map-details"><strong>${webEsc(x.id)}</strong><dl>
        <dt>Parcela</dt><dd>${webEsc(x.parcela||'—')}</dd>
        <dt>Tipo</dt><dd>${webEsc(x.tipo||'—')}</dd>
        <dt>Descripción</dt><dd class="map-description">${webEsc(x.descripcion||'—')}</dd>
        <dt>Estado</dt><dd>${webEsc(estado)}</dd>
        <dt>Horas-hombre afectadas</dt><dd><span class="web-impact impact-${mapColor(hours)}">${hours.toFixed(2)} h</span></dd></dl></div>`;
}
