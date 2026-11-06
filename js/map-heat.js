/* Capa de calor compartida por Google Maps y el mapa offline.
   Acumula horas de duración de las incidencias. */
const MapHeat = (() => {
    function groups(rows) {
        const locations = new Map();
        for (const row of rows) {
            const coords = mapCoords(row);if (!coords) continue;
            const key = `${coords.lat}|${coords.lon}`;
            if (!locations.has(key)) locations.set(key,{...coords,hours:0,count:0});
            const location = locations.get(key),hours = mapDurationHours(row);
            location.hours += Number.isFinite(hours)?Math.max(0,hours):0;
            location.count++;
        }
        return [...locations.values()];
    }

    function raster(points,width,height) {
        // Media resolución para mantener fluidez al desplazar el mapa en móviles.
        const scale = .5,w = Math.max(1,Math.ceil(width*scale)),h = Math.max(1,Math.ceil(height*scale));
        const density = new Float64Array(w*h),coverage = new Float32Array(w*h);
        const radius = Math.max(75,Math.min(125,width*.2))*scale;
        const edge = Math.exp(-4);
        for (const point of points) {
            if (!Number.isFinite(point.x)||!Number.isFinite(point.y)||!Number.isFinite(point.hours)) continue;
            const cx = point.x*scale,cy = point.y*scale;
            const left = Math.max(0,Math.floor(cx-radius)),right = Math.min(w-1,Math.ceil(cx+radius));
            const top = Math.max(0,Math.floor(cy-radius)),bottom = Math.min(h-1,Math.ceil(cy+radius));
            for (let y=top;y<=bottom;y++) for (let x=left;x<=right;x++) {
                const distance = ((x-cx)**2+(y-cy)**2)/(radius**2);
                if (distance>1) continue;
                const influence = (Math.exp(-4*distance)-edge)/(1-edge),i = y*w+x;
                density[i] += Math.max(0,point.hours)*influence;
                // La visibilidad mínima permite localizar también una incidencia de 0.06 h.
                // Esta cobertura visual no se suma a las horas ni altera su clasificación.
                coverage[i] = Math.max(coverage[i],influence);
            }
        }
        const data = new Uint8ClampedArray(w*h*4);
        const palette={low:[30,194,104],medium:[255,190,24],high:[239,55,48]};
        for (let i=0;i<density.length;i++) {
            if (!coverage[i]) continue;
            const color=palette[mapColor(density[i])];
            data.set(color,i*4);
            data[i*4+3]=Math.round(coverage[i]*205);
        }
        return {width:w,height:h,data};
    }

    function draw(canvas,points,width,height) {
        if (!width||!height) return;
        const field=raster(points,width,height);
        canvas.width=field.width;canvas.height=field.height;
        canvas.style.width=width+'px';canvas.style.height=height+'px';
        const context=canvas.getContext('2d');if (!context) return;
        const image=context.createImageData(field.width,field.height);image.data.set(field.data);
        context.putImageData(image,0,0);
    }

    function google(maps,map,rows) {
        let locations=groups(rows);
        class HeatOverlay extends maps.OverlayView {
            onAdd() {
                this.canvas=document.createElement('canvas');this.canvas.className='map-heat';
                this.canvas.setAttribute('aria-hidden','true');
                this.canvas.hidden=this.visible===false;
                this.getPanes().overlayLayer.append(this.canvas);
            }
            draw() {
                if (!this.canvas) return;
                const projection=this.getProjection();if (!projection) return;
                const center=map.getCenter();if (!center) return;
                const origin=projection.fromLatLngToDivPixel(center);
                const {width,height}=map.getDiv().getBoundingClientRect();
                const left=origin.x-width/2,top=origin.y-height/2;
                this.canvas.style.left=left+'px';this.canvas.style.top=top+'px';
                cancelAnimationFrame(this.frame);
                this.frame=requestAnimationFrame(()=>{
                    if (!this.canvas) return;
                    const points=locations.map(location=>{
                        const pixel=projection.fromLatLngToDivPixel(new maps.LatLng(location.lat,location.lon));
                        return {x:pixel.x-left,y:pixel.y-top,hours:location.hours};
                    });
                    draw(this.canvas,points,width,height);
                });
            }
            onRemove() {cancelAnimationFrame(this.frame);this.canvas?.remove();this.canvas=null;}
            setVisible(visible) {this.visible=visible;if(this.canvas)this.canvas.hidden=!visible;}
            setRows(rows) {locations=groups(rows);this.draw();}
        }
        const overlay=new HeatOverlay();overlay.setMap(map);
        return overlay;
    }
    return {groups,raster,draw,google};
})();
