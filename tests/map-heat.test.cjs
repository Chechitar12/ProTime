const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const heat=vm.runInNewContext(['js/mapa.js','js/map-heat.js'].map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n')+';MapHeat;');
const pixel=(field,x,y)=>Array.from(field.data.slice((y*field.width+x)*4,(y*field.width+x)*4+4));

test('heat accumulates actual hours at coincident coordinates without changing records',()=>{
    const row={ubicacion:{latitud:-8.5456913,longitud:-78.6505618},inicio:'2026-11-03T08:00:00Z',fin:'2026-11-03T10:00:00Z',trabajadores:15};
    const rows=[row,{...row,id:'SECOND'},{...row,ubicacion:null}];
    const before=JSON.stringify(rows),groups=heat.groups(rows);
    assert.equal(groups.length,1);assert.equal(groups[0].hours,4);assert.equal(groups[0].count,2);
    assert.equal(groups[0].lat,-8.5456913);assert.equal(groups[0].lon,-78.6505618);
    assert.equal(JSON.stringify(rows),before);
});

test('a low-impact incidence creates a visible diffuse green area; greater impact turns warmer',()=>{
    const point={x:200,y:200};
    const low=heat.raster([{...point,hours:.06}],400,400);
    const center=pixel(low,100,100),near=pixel(low,110,100),edge=pixel(low,130,100);
    assert(center[1]>center[0]&&center[1]>center[2]);
    assert(center[3]>near[3]&&near[3]>edge[3]&&edge[3]>0,'Smooth influence beyond the marker');
    assert.equal(pixel(low,0,0)[3],0,'No fabricated heat far from incidents');
    const medium=pixel(heat.raster([{...point,hours:50}],400,400),100,100);
    const high=pixel(heat.raster([{...point,hours:100}],400,400),100,100);
    const centerColor=hours=>pixel(heat.raster([{...point,hours}],400,400),100,100).slice(0,3);
    assert.deepEqual(centerColor(49.99),center.slice(0,3));
    assert.deepEqual(centerColor(99.99),medium.slice(0,3));
    assert(medium[0]>medium[1]&&medium[1]>medium[2]);
    assert(high[0]>high[1]*2&&high[0]>high[2]*2);
    const accumulated=pixel(heat.raster([{...point,hours:30},{...point,hours:30}],400,400),100,100);
    assert(accumulated[0]>accumulated[1],'Nearby hours combine instead of normalizing each point to maximum');
});

test('empty or offscreen locations leave a transparent heat layer',()=>{
    assert(heat.raster([],200,200).data.every(value=>value===0));
    assert(heat.raster([{x:-1000,y:-1000,hours:100}],200,200).data.every(value=>value===0));
});
