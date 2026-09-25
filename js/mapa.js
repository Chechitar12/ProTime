/* Coordenadas y registros se conservan en este navegador. Las teselas del mapa
   se descargan de OpenStreetMap cuando hay conexión; los marcadores siguen
   disponibles sobre una cuadrícula cuando no se pueden cargar. */
function geoInit(form) {
    const box=document.createElement('div');box.className='geo-field';
    box.innerHTML='<span id="geoStatus" role="status">⌖ La ubicación se intentará capturar automáticamente después de guardar; el registro no esperará al GPS.</span>';
    form.querySelector('#saveIncident').before(box);
}
function geoGet(){
    return new Promise(resolve=>{
        if(!navigator.geolocation||!window.isSecureContext){resolve(null);return}
        navigator.geolocation.getCurrentPosition(p=>resolve({latitud:p.coords.latitude,longitud:p.coords.longitude,
            precision:p.coords.accuracy,fecha:new Date(p.timestamp).toISOString()}),()=>resolve(null),
            {enableHighAccuracy:false,timeout:5000,maximumAge:60000});
    });
}
function geoAfterSave(id){
    // Inicia la solicitud sin esperar su resultado antes de completar el registro.
    geoGet().then(ubicacion=>{
        if(!ubicacion||!Incidencias.byId(id))return;
        Incidencias.update(id,{ubicacion});
        if(screen==='mapaIncidencias')mapaIncidencias();
    }).catch(()=>{});
}
let mapView=null;
const mapCoords=x=>{
    const c=x.ubicacion;
    if(!c)return null;
    const lat=Number(c.latitud),lon=Number(c.longitud);
    return Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=85&&Math.abs(lon)<=180?{lat,lon}:null;
};
const mapHours=x=>{
    const start=new Date(x.inicio).getTime(),end=x.fin?new Date(x.fin).getTime():Date.now();
    return Number.isFinite(start)&&Number.isFinite(end)?Math.max(0,(end-start)/3600000)*Number(x.trabajadores||0):0;
};
const mapColor=h=>h<50?'low':h<100?'medium':'high';
function mapaIncidencias(){
    const rows=Incidencias.all().filter(x=>mapCoords(x));
    app.innerHTML=`${internalHeader('Mapa de incidencias')}<main class="map-page"><h1>Mapa de incidencias</h1>
        <p>Ubicaciones guardadas en este navegador. Toca un marcador para ver el detalle.</p>
        <div class="map-legend"><span><i class="low"></i>Menos de 50 h</span><span><i class="medium"></i>50 a menos de 100 h</span><span><i class="high"></i>100 h o más</span></div>
        <div class="map-layout"><div id="incidentMap" class="incident-map" aria-label="Mapa de incidencias">
        <div class="map-tiles"></div><div class="map-pins"></div><div class="map-controls"><button id="mapPlus" aria-label="Acercar">+</button><button id="mapMinus" aria-label="Alejar">−</button></div><div class="map-attribution">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> colaboradores</div></div>
        <aside class="map-sidebar"><b>${rows.length} incidencia(s) con ubicación</b>${rows.length?rows.map(x=>`<button type="button" class="map-item" data-map-id="${webEsc(x.id)}"><span class="map-dot ${mapColor(mapHours(x))}"></span><span><strong>${webEsc(x.tipo||'Incidencia')}</strong><small>${webEsc(x.grupo||'—')} · ${webEsc(x.area||'—')} · ${mapHours(x).toFixed(2)} h</small></span></button>`).join(''):'<p>Aún no hay incidencias con coordenadas. Registra una nueva desde el teléfono y permite la ubicación.</p>'}</aside></div>
        <p class="map-note">El mapa base requiere internet. Las incidencias y sus coordenadas permanecen guardadas localmente.</p></main>`;
    const first=mapCoords(rows[0])||{lat:-9.19,lon:-75.02};
    mapView={center:first,zoom:rows.length>1?10:rows.length?14:5,rows};
    if(rows.length>1){let lats=rows.map(x=>mapCoords(x).lat),lons=rows.map(x=>mapCoords(x).lon);
        mapView.center={lat:(Math.min(...lats)+Math.max(...lats))/2,lon:(Math.min(...lons)+Math.max(...lons))/2};
        const spread=Math.max(Math.max(...lats)-Math.min(...lats),Math.max(...lons)-Math.min(...lons));
        mapView.zoom=Math.max(3,Math.min(15,Math.floor(Math.log2(80/Math.max(.005,spread)))));
    }
    const el=document.getElementById('incidentMap');
    el.querySelector('#mapPlus').onclick=()=>{mapView.zoom=Math.min(18,mapView.zoom+1);mapDraw()};
    el.querySelector('#mapMinus').onclick=()=>{mapView.zoom=Math.max(2,mapView.zoom-1);mapDraw()};
    el.onwheel=e=>{e.preventDefault();mapView.zoom=Math.max(2,Math.min(18,mapView.zoom+(e.deltaY<0?1:-1)));mapDraw()};
    let drag=null;
    el.onpointerdown=e=>{if(e.target.closest('button,a,.map-popup'))return;drag={x:e.clientX,y:e.clientY,lat:mapView.center.lat,lon:mapView.center.lon};el.setPointerCapture(e.pointerId)};
    el.onpointermove=e=>{if(!drag)return;const scale=256*2**mapView.zoom;
        const start=mapProject({lat:drag.lat,lon:drag.lon},mapView.zoom);
        mapView.center=mapUnproject({x:start.x-(e.clientX-drag.x),y:start.y-(e.clientY-drag.y)},mapView.zoom);mapDraw()};
    el.onpointerup=el.onpointercancel=()=>{drag=null};
    document.querySelectorAll('[data-map-id]').forEach(b=>b.onclick=()=>{
        const row=rows.find(x=>x.id===b.dataset.mapId);if(!row)return;
        mapView.center=mapCoords(row);mapDraw();mapPopup(row);
    });
    mapDraw();
}
function mapProject(c,z){const lat=Math.max(-85,Math.min(85,c.lat))*Math.PI/180;
    const k=256*2**z;return {x:(c.lon+180)/360*k,y:(1-Math.log(Math.tan(lat)+1/Math.cos(lat))/Math.PI)/2*k}}
function mapUnproject(p,z){const k=256*2**z,n=Math.PI*(1-2*p.y/k);
    return {lat:Math.atan(Math.sinh(n))*180/Math.PI,lon:((p.x/k*360)%360+360)%360-180}}
function mapDraw(){
    const el=document.querySelector('#incidentMap');if(!el||!mapView)return;
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
        pin.style.left=px+'px';pin.style.top=py+'px';pin.setAttribute('aria-label',`${x.tipo||'Incidencia'}, ${h.toFixed(2)} horas`);
        pin.title=`${x.tipo||'Incidencia'} · ${h.toFixed(2)} h`;pin.dataset.id=x.id;pin.onclick=()=>mapPopup(x,pin);pins.append(pin);
    }
}
function mapPopup(x,anchor){
    document.querySelector('.map-popup')?.remove();
    const map=document.querySelector('#incidentMap');if(!map)return;
    const popup=document.createElement('div');popup.className='map-popup';
    popup.innerHTML=`<button class="map-popup-close" aria-label="Cerrar">×</button><strong>${webEsc(x.tipo||'—')}</strong>
        <dl><dt>Grupo</dt><dd>${webEsc(x.grupo||'—')}</dd><dt>Área</dt><dd>${webEsc(x.area||'—')}</dd><dt>Horas de afectación</dt><dd><span class="web-impact impact-${mapColor(mapHours(x))}">${mapHours(x).toFixed(2)} h</span></dd></dl>`;
    const box=map.getBoundingClientRect(),pin=anchor||[...map.querySelectorAll('.map-pin')].find(b=>b.dataset.id===x.id);
    let px=pin?Number.parseFloat(pin.style.left):box.width/2,py=pin?Number.parseFloat(pin.style.top):box.height/2;
    popup.style.left=Math.min(Math.max(px,145),box.width-145)+'px';popup.style.top=Math.max(170,py)+'px';
    map.append(popup);popup.querySelector('button').onclick=()=>popup.remove();
}
