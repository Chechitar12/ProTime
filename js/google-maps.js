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
            mapId:PROTIME_MAP_CONFIG.mapId||'DEMO_MAP_ID',streetViewControl:false,mapTypeControl:false,
            fullscreenControl:true,gestureHandling:'cooperative'});
        const popup = new maps.InfoWindow({maxWidth:320});
        const markers = new Map();
        for (const row of view.rows) {
            const coordinates = mapCoords(row),hours = mapHours(row);
            const content = document.createElement('button');
            content.type = 'button';content.className = 'map-google-pin '+mapColor(hours);
            content.setAttribute('aria-label',`${row.id} · ${row.parcela||'Sin parcela'} · ${hours.toFixed(2)} horas-hombre`);
            const marker = new maps.marker.AdvancedMarkerElement({map,position:{lat:coordinates.lat,lng:coordinates.lon},
                title:content.getAttribute('aria-label'),content});
            const open = () => {
                popup.setContent(mapPopupContent(row));
                popup.open({map,anchor:marker});
            };
            marker.addListener('click',open);
            content.onclick = open;
            markers.set(row.id,{marker,row,open});
        }
        const failure = () => onFailure();
        authListeners.add(failure);
        if (view.rows.length > 1) {
            const bounds = new maps.LatLngBounds();
            for (const {marker} of markers.values()) bounds.extend(marker.position);
            map.fitBounds(bounds,50);
            // Several incidences can share one exact coordinate. Avoid an excessive zoom.
            maps.event.addListenerOnce(map,'idle',() => {if (map.getZoom()>17) map.setZoom(17);});
        }
        return {
            focus(id) {
                const entry = markers.get(id);if (!entry) return;
                map.panTo(entry.marker.position);entry.open();
            },
            destroy() {
                authListeners.delete(failure);popup.close();
                for (const {marker} of markers.values()) {maps.event.clearInstanceListeners(marker);marker.map = null;}
                maps.event.clearInstanceListeners(map);
            }
        };
    }
    return {mount};
})();
