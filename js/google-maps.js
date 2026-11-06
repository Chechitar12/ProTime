/* Adaptador opcional: las coordenadas y los colores son los del registro local. */
const GoogleMapsView = (() => {
    let sdkPromise = null;
    let authError = false;
    const authListeners = new Set();

    function load() {
        if (authError) return Promise.reject(new Error('No se pudo autorizar Google Maps.'));
        if (window.google?.maps?.marker?.AdvancedMarkerElement) return Promise.resolve(window.google.maps);
        if (sdkPromise) return sdkPromise;
        sdkPromise = new Promise((resolve,reject) => {
            const script = document.createElement('script');
            let settled = false;
            const fail = () => {
                if (settled) return;
                settled = true;clearTimeout(timer);
                script.remove();delete window.__protimeGoogleMapsReady;
                reject(new Error('No se pudo cargar Google Maps.'));
            };
            const timer = setTimeout(fail,15000);
            const previousAuthFailure = window.gm_authFailure;
            window.gm_authFailure = () => {
                authError = true;fail();
                for (const callback of authListeners) callback();
                if (typeof previousAuthFailure === 'function') previousAuthFailure();
            };
            window.__protimeGoogleMapsReady = () => {
                if (settled) return;
                if (!window.google?.maps?.marker?.AdvancedMarkerElement) {fail();return;}
                settled = true;clearTimeout(timer);delete window.__protimeGoogleMapsReady;
                resolve(window.google.maps);
            };
            const params = new URLSearchParams({key:PROTIME_MAP_CONFIG.apiKey,callback:'__protimeGoogleMapsReady',
                loading:'async',libraries:'marker',v:'weekly',language:'es',region:'PE'});
            script.src = 'https://maps.googleapis.com/maps/api/js?'+params;
            script.async = true;script.onerror = fail;
            document.head.append(script);
        });
        return sdkPromise;
    }

    async function mount({element,view,onFailure}) {
        const maps = await load();
        if (!element.isConnected) return null;
        const map = new maps.Map(element,{center:{lat:view.center.lat,lng:view.center.lon},zoom:view.zoom,
            mapId:PROTIME_MAP_CONFIG.mapId||'DEMO_MAP_ID',mapTypeId:'satellite',streetViewControl:false,mapTypeControl:false,
            fullscreenControl:true,gestureHandling:'cooperative'});
        const popup = new maps.InfoWindow({maxWidth:320});
        const heat = MapHeat.google(maps,map,view.rows);
        heat.setVisible(view.mode==='heat');
        const markers = new Map();
        const labels=[];
        let fitListener;
        function clearMarkers() {
            popup.close();
            for(const marker of [...labels,...[...markers.values()].map(entry=>entry.marker)]){
                maps.event.clearInstanceListeners(marker);marker.map=null;
            }
            labels.length=0;markers.clear();
        }
        function setData(rows,parcels) {
            clearMarkers();
            heat.setRows(rows);
            const bounds=new maps.LatLngBounds();
            for(const parcel of parcels){
                const content=document.createElement('div'),label=document.createElement('span');
                content.className='map-parcel-label-slot';label.className='map-parcel-label';label.textContent=parcel.label;
                content.append(label);
                const position={lat:parcel.lat,lng:parcel.lon};
                labels.push(new maps.marker.AdvancedMarkerElement({map,position,content,zIndex:1}));
                bounds.extend(position);
            }
            for(const row of rows){
                const coords=mapCoords(row);
                const position={lat:coords.lat,lng:coords.lon};
                const content=mapMarkerButton(row,mapHours(row),'map-google-pin');
                const marker=new maps.marker.AdvancedMarkerElement({map,position,content,
                    title:content.getAttribute('aria-label'),zIndex:2});
                const open=()=>{
                    popup.setContent(mapPopupContent(row));
                    popup.open({map,anchor:marker});
                };
                content.onclick=open;
                markers.set(row.id,{marker,open});
                bounds.extend(position);
            }
            fitListener?.remove();
            if(rows.length||parcels.length){
                map.fitBounds(bounds,{top:95,right:45,bottom:45,left:45});
                fitListener=maps.event.addListenerOnce(map,'idle',()=>{if(map.getZoom()>17)map.setZoom(17);});
            }
        }
        setData(view.rows,view.parcels);
        const failure = () => onFailure();
        authListeners.add(failure);
        return {
            setData,
            setMode(mode) {heat.setVisible(mode==='heat');},
            focus(id) {
                const entry = markers.get(id);if (!entry) return;
                map.panTo(entry.marker.position);entry.open();
            },
            destroy() {
                heat.setMap(null);
                authListeners.delete(failure);clearMarkers();fitListener?.remove();
                maps.event.clearInstanceListeners(map);
            }
        };
    }
    return {mount};
})();
