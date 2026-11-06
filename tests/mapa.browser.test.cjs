const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {browserTest} = require('./helpers/browser.cjs');

test('parcel changes, persisted coordinates, pending parcels, map details and Google adapter', {timeout:60000}, async t => {
    await browserTest(t,{
        routes:{'/js/map-config.js':"const PROTIME_MAP_CONFIG=Object.freeze({get apiKey(){return window.qa.googleEnabled?'dummy-key':''},mapId:'DEMO_MAP_ID'});"},
        script:`
            window.qa={googleEnabled:false,markers:[],popups:[],maps:[]};
            const imageSrc=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
            Object.defineProperty(HTMLImageElement.prototype,'src',{...imageSrc,set(value){if(!String(value).includes('tile.openstreetmap.org'))imageSrc.set.call(this,value)}});
            const nativeAppend=Element.prototype.append;
            Element.prototype.append=function(...nodes){const node=nodes[0];if(this===document.head&&node?.tagName==='SCRIPT'&&node.src.includes('maps.googleapis.com')){setTimeout(()=>node.onerror(),0);return}return nativeAppend.apply(this,nodes)};
            qa.installGoogle=()=>{
                class MockMap {constructor(el,opts){this.el=el;this.options=opts;this.zoom=opts.zoom;qa.maps.push(this);this.pane=document.createElement('div');el.append(this.pane)}fitBounds(b){this.bounds=b}panTo(p){this.position=p}getZoom(){return this.zoom}setZoom(z){this.zoom=z}getDiv(){return this.el}getCenter(){return this.options.center}}
                class OverlayView {setMap(map){this.map=map;if(map){this.onAdd();this.draw()}else this.onRemove()}getPanes(){return {overlayLayer:this.map.pane}}getProjection(){return {fromLatLngToDivPixel:c=>({x:(typeof c.lng==='function'?c.lng():c.lng)*1000,y:(typeof c.lat==='function'?c.lat():c.lat)*-1000})}}}
                class Marker {constructor(opts){this.content=opts.content;Object.assign(this,opts);qa.markers.push(this);opts.map.el.append(opts.content)}set map(value){this.currentMap=value;if(!value)this.content.remove()}get map(){return this.currentMap}}
                class InfoWindow {constructor(){qa.popups.push(this)}setContent(c){this.content?.remove();this.content=c}open(o){this.options=o;o.map.el.append(this.content)}close(){this.content?.remove()}}
                window.google={maps:{Map:MockMap,marker:{AdvancedMarkerElement:Marker},InfoWindow,OverlayView,LatLng:class{constructor(lat,lng){this.lat=()=>lat;this.lng=()=>lng}},
                    LatLngBounds:class{constructor(){this.points=[]}extend(p){this.points.push(p)}},
                    event:{addListenerOnce(obj,name,fn){fn();return {remove(){}}},clearInstanceListeners(){}}}};
            };
        `
    },async ({run,until,command}) => {
        await run(`
            window.old={id:'INC-OLD',parcela:'Parcela 64',tipo:'Histórico GPS',descripcion:'Coordenada original',estado:'FINALIZADA',
                inicio:'2026-10-30T08:00:00Z',fin:'2026-10-30T10:00:00Z',trabajadores:60,ubicacion:{latitud:-8.54,longitud:-78.69,precision:15}};
            window.pendingOld={...old,id:'INC-NONE',ubicacion:null};
            DB.set('pt_incidencias_v3',[old,pendingOld]);
        `);
        const historical = await run('JSON.stringify(Incidencias.all())');
        for(const [parcela,lat,lon] of [['Parcela 61',-8.520616,-78.732651],['Parcela 62',-8.550790804,-78.65676825],['Parcela 64',-8.5456913,-78.6505618],['Parcela 86',-8.543204,-78.646914]]) {
            await run("go('nuevo')");
            await run(`parcela.value='Parcela 61';parcela.dispatchEvent(new Event('change'));parcela.value=${JSON.stringify(parcela)};parcela.dispatchEvent(new Event('change'))`);
            assert.equal(await run('geoLatitud.value'),String(lat));
            assert.equal(await run('geoLongitud.value'),String(lon));
            if(parcela==='Parcela 64')assert(await run("geoStatus.textContent.includes('validada')"));
            await run("tipo.value='Retraso de material';desc.value='Material pendiente <script>no ejecutar</script>';trabajadores.value='25';newForm.requestSubmit()");
            await until("screen==='registro'");
            const saved=await run('Incidencias.all()[0]');
            assert.equal(saved.parcela,parcela);assert.equal(saved.ubicacion.latitud,lat);assert.equal(saved.ubicacion.longitud,lon);
            assert.equal(saved.ubicacionEstado,'configurada');
        }
        await run("go('nuevo');parcela.value='Parcela 64';parcela.dispatchEvent(new Event('change'));parcela.add(new Option('Parcela 99','Parcela 99'));parcela.value='Parcela 99';parcela.dispatchEvent(new Event('change'))");
        assert.equal(await run('geoLatitud.value'),'');assert.equal(await run('geoLongitud.value'),'');
        assert(await run("geoStatus.textContent.includes('pendiente')"));
        await run("tipo.value='Otro';desc.value='Sin ubicación';newForm.requestSubmit()");
        await until("screen==='registro'");
        assert.equal(await run('Incidencias.all()[0].ubicacion'),null);
        assert.equal(await run('Incidencias.all()[0].ubicacionEstado'),'pendiente');
        // Parcela 86 has 5 h × 10 workers, exactly at the yellow threshold.
        await run(`
            Incidencias.all().filter(x=>x.ubicacion?.fuente==='catalogo_parcelas').forEach((x,i)=>Incidencias.update(x.id,{
                inicio:'2026-11-03T08:00:00Z',fin:['2026-11-03T13:00:00Z','2026-11-05T10:00:00Z','2026-11-07T12:00:00Z','2026-11-03T13:02:00Z'][i],estado:'FINALIZADA',trabajadores:[10,25,10,1][i]}));
            go('mapaIncidencias');
        `);
        assert.equal(await run('JSON.stringify(Incidencias.all().filter(x=>[old.id,pendingOld.id].includes(x.id)))'),historical);
        assert.equal(await run('document.querySelectorAll(".map-pin").length'),5);
        assert(await run("document.querySelector('.map-pending').textContent.includes('2 incidencia')"));
        for(const color of ['low','medium','high'])assert(await run(`!!document.querySelector('.map-pin.${color}')`));
        assert.equal(await run("document.querySelectorAll('.map-parcel-label').length"),14);
        assert.equal(await run("getComputedStyle(document.querySelector('.map-pin.high .map-pin-face'),'::before').animationIterationCount"),'infinite');
        assert.equal(await run("getComputedStyle(document.querySelector('.map-pin.low .map-pin-face'),'::before').animationName"),'none');
        await run(`window.setMapFilter=(name,value)=>{
            const input=document.querySelector('.map-filters').elements[name];
            input.value=value;input.dispatchEvent(new Event('change',{bubbles:true}));
        };setMapFilter('parcela','P64');setMapFilter('tipo','Histórico GPS');setMapFilter('estado','FINALIZADA');
        setMapFilter('desde','2026-10-30');setMapFilter('hasta','2026-10-30');`);
        assert.deepEqual(await run('mapView.rows.map(row=>row.id)'),['INC-OLD']);
        assert.equal(await run("document.querySelector('.map-parcel-label').textContent"),'Parcela 64');
        await run("setMapFilter('desde','2026-10-31')");
        assert(await run("document.querySelector('#mapFilterError').textContent.length>0"));
        assert.equal(await run('mapView.rows.length'),0);
        await run("document.querySelector('.map-filters').reset()");
        assert.equal(await run('mapView.rows.length'),5);
        await run("setMapFilter('parcela','P86')");
        assert.deepEqual(await run('mapView.rows.map(row=>row.parcela)'),['Parcela 86']);
        assert.equal(await run("document.querySelector('.map-pin.medium .map-pin-face').textContent"),'50HH');
        assert.equal(await run('MapHeat.groups(mapView.rows)[0].hours'),50);
        await run("document.querySelector('.map-pin.medium').click()");
        assert(await run("document.querySelector('.map-details').textContent.includes('5:00 h')"));
        await run("document.querySelector('.map-filters').reset()");
        assert.equal(await run('mapView.mode'),'heat');
        assert(await run("document.querySelector('.map-heat').width>1"));
        await run("document.querySelector('[data-map-mode=markers]').click()");
        assert(await run("document.querySelector('.map-heat').hidden"));
        await run("document.querySelector('[data-map-mode=heat]').click()");
        assert(!await run("document.querySelector('.map-heat').hidden"));
        await run("document.querySelector('[data-map-id=INC-OLD]').click()");
        const detail=await run("document.querySelector('.map-details').textContent");
        for(const expected of ['INC-OLD','Parcela 64','Histórico GPS','Coordenada original','FINALIZADA','120.00'])assert(detail.includes(expected));
        assert.equal(await run("mapView.center.lat"),-8.54);
        for(const [width,height] of [[320,568],[768,1024],[1440,900]]) {
            await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
            await run('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
            await run("document.querySelector('[data-map-id=INC-OLD]').click()");
            assert(await run('document.documentElement.scrollWidth<=innerWidth'));
            assert(await run("(()=>{const p=document.querySelector('.map-popup').getBoundingClientRect(),m=incidentMap.getBoundingClientRect();return p.left>=m.left&&p.right<=m.right&&p.top>=m.top&&p.bottom<=m.bottom})()"));
        }
        if(process.env.PROTIME_QA_OUTPUT){
            const shot=await command('Page.captureScreenshot',{format:'png'});
            fs.writeFileSync(path.join(process.env.PROTIME_QA_OUTPUT,'protime-map.png'),Buffer.from(shot.data,'base64'));
        }
        await run("document.querySelector('.map-open-incident').click()");
        assert.equal(await run('screen'),'reportes');
        assert(await run("document.querySelector('.report-detail').textContent.includes('Coordenada original')"));
        // Empty maps remain valid, and opening a map never backfills missing coordinates.
        await run("DB.set('pt_incidencias_v3',[pendingOld]);go('mapaIncidencias')");
        assert.equal(await run('document.querySelectorAll(".map-pin").length'),0);
        assert.equal(await run('Incidencias.byId(pendingOld.id).ubicacion'),null);
        // Google errors fall back to the same coordinates without affecting saved data.
        await run("qa.googleEnabled=true;go('mapaIncidencias')");
        await until("document.querySelector('#mapProviderStatus').textContent.includes('no está disponible')");
        assert.equal(await run('mapView.provider'),'osm');
        // Test the optional Google integration without sending a request to Google.
        await run("qa.installGoogle();DB.set('pt_incidencias_v3',[old,{...old,id:'INC-P64',parcela:'Parcela 64',ubicacion:Parcelas.ubicacion('P64')}]);go('mapaIncidencias')");
        await until("mapView?.provider==='google'");
        assert.equal(await run('qa.maps.at(-1).options.mapTypeId'),'satellite');
        assert.equal(await run("document.querySelectorAll('.map-google-host .map-parcel-label').length"),14);
        await until("document.querySelector('.map-google-host .map-heat')?.width>1");
        assert(!await run("document.querySelector('.map-google-host .map-heat').hidden"));
        await run("document.querySelector('[data-map-mode=markers]').click()");
        assert(await run("document.querySelector('.map-google-host .map-heat').hidden"));
        await run("document.querySelector('[data-map-mode=heat]').click()");
        assert(!await run("document.querySelector('.map-google-host .map-heat').hidden"));
        assert.equal(await run("qa.markers.find(m=>m.title?.includes('INC-P64')).position.lat"),-8.5456913);
        assert.equal(await run("qa.markers.find(m=>m.title?.includes('INC-P64')).position.lng"),-78.6505618);
        assert.equal(await run("qa.markers.find(m=>m.title?.includes('INC-OLD')).position.lat"),-8.54);
        await run("setMapFilter('parcela','P61')");
        assert.equal(await run("document.querySelectorAll('.map-google-pin').length"),0);
        assert.equal(await run("document.querySelector('.map-google-host .map-parcel-label').textContent"),'Parcela 61');
        await run("document.querySelector('.map-filters').reset()");
        await run("document.querySelector('[data-map-id=INC-P64]').click()");
        assert(await run("qa.popups.at(-1).content.textContent.includes('INC-P64')"));
        await run("document.querySelector('.map-google-host .map-open-incident').click()");
        assert.equal(await run('screen'),'reportes');
        assert(await run('qa.markers.every(m=>m.map===null)'));
        assert.equal(await run('Incidencias.byId(old.id).ubicacion.latitud'),-8.54);
        await run(`qa.googleEnabled=false;
            window.lowHeat={...old,id:'INC-LOW',parcela:'Parcela 61',tipo:'Falta de personal',descripcion:'Registro de bajo impacto',
                inicio:'2026-11-03T08:00:00Z',fin:'2026-11-03T08:03:36Z',trabajadores:1,ubicacion:Parcelas.ubicacion('P61')};
            DB.set('pt_incidencias_v3',[lowHeat]);go('mapaIncidencias');`);
        await until("document.querySelector('.map-heat').width>1");
        assert(await run("(()=>{const c=document.querySelector('.map-heat'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let area=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)area++;return area>1000})()"),'A single 0.06-hour incidence produces a visible area of heat');
        if(process.env.PROTIME_QA_OUTPUT){
            for(const [name,rows] of [['single','[lowHeat]'],['overview',`[lowHeat,{...old,id:'INC-MED',parcela:'Parcela 62',ubicacion:Parcelas.ubicacion('P62'),trabajadores:30},{...old,id:'INC-HIGH',parcela:'Parcela 64',ubicacion:Parcelas.ubicacion('P64'),trabajadores:75}]`]]){
                await run(`DB.set('pt_incidencias_v3',${rows});go('mapaIncidencias')`);
                await run('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
                const shot=await command('Page.captureScreenshot',{format:'png'});
                fs.writeFileSync(path.join(process.env.PROTIME_QA_OUTPUT,`protime-heat-${name}.png`),Buffer.from(shot.data,'base64'));
            }
        }
    });
});
