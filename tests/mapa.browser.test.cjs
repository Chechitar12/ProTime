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
                class MockMap {constructor(el,opts){this.el=el;this.options=opts;this.zoom=opts.zoom;qa.maps.push(this)}fitBounds(b){this.bounds=b}panTo(p){this.position=p}getZoom(){return this.zoom}setZoom(z){this.zoom=z}}
                class Marker {constructor(opts){Object.assign(this,opts);qa.markers.push(this);opts.map.el.append(opts.content)}addListener(event,fn){this.click=fn}}
                class InfoWindow {constructor(){qa.popups.push(this)}setContent(c){this.content=c}open(o){this.options=o}close(){this.closed=true}}
                window.google={maps:{Map:MockMap,marker:{AdvancedMarkerElement:Marker},InfoWindow,
                    LatLngBounds:class{constructor(){this.points=[]}extend(p){this.points.push(p)}},
                    event:{addListenerOnce(obj,name,fn){fn()},clearInstanceListeners(){}}}};
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
        for(const [parcela,lat,lon] of [['Parcela 61',-8.520616,-78.732651],['Parcela 62',-8.550790804,-78.65676825],['Parcela 64',-8.5456913,-78.6505618]]) {
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
        // Finalize the three known records with controlled hours; preserve the historic originals.
        await run(`
            Incidencias.all().filter(x=>x.ubicacion?.fuente==='catalogo_parcelas').forEach((x,i)=>Incidencias.update(x.id,{
                inicio:'2026-11-03T08:00:00Z',fin:'2026-11-03T10:00:00Z',estado:'FINALIZADA',trabajadores:[50,25,10][i]}));
            go('mapaIncidencias');
        `);
        assert.equal(await run('JSON.stringify(Incidencias.all().filter(x=>[old.id,pendingOld.id].includes(x.id)))'),historical);
        assert.equal(await run('document.querySelectorAll(".map-pin").length'),4);
        assert(await run("document.querySelector('.map-pending').textContent.includes('2 incidencia')"));
        for(const color of ['low','medium','high'])assert(await run(`!!document.querySelector('.map-pin.${color}')`));
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
        assert.equal(await run("qa.markers.find(m=>m.title.includes('INC-P64')).position.lat"),-8.5456913);
        assert.equal(await run("qa.markers.find(m=>m.title.includes('INC-P64')).position.lng"),-78.6505618);
        assert.equal(await run("qa.markers.find(m=>m.title.includes('INC-OLD')).position.lat"),-8.54);
        await run("document.querySelector('[data-map-id=INC-P64]').click()");
        assert(await run("qa.popups.at(-1).content.includes('INC-P64')"));
        await run("go('registro')");
        assert(await run('qa.markers.every(m=>m.map===null)'));
        assert.equal(await run('Incidencias.byId(old.id).ubicacion.latitud'),-8.54);
    });
});
