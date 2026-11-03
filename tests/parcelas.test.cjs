const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const helpers = vm.runInNewContext(fs.readFileSync(path.join(root,'js/parcelas.js'),'utf8')+'\n'+
    fs.readFileSync(path.join(root,'js/mapa.js'),'utf8')+';({Parcelas,mapCoords,mapHours,mapColor});');

test('only the exact approved parcel catalogue is assigned, including validated P64', () => {
    for (const [code,lat,lon] of [['P61',-8.520616,-78.732651],['P62',-8.550790804,-78.65676825],['P64',-8.5456913,-78.6505618]]) {
        for (const label of [code,'Parcela '+code.slice(1),code.toLowerCase()]) {
            const result = helpers.Parcelas.ubicacion(label);
            assert.equal(result.latitud,lat);assert.equal(result.longitud,lon);assert.equal(result.parcela,code);
        }
    }
    for (const label of ['',null,undefined,'P99','Parcela 640','61','P61 otra','P64 alternativa','Parcela 64-B','__proto__'])
        assert.equal(helpers.Parcelas.ubicacion(label),null,label);
    const snapshot = helpers.Parcelas.ubicacion('P61');snapshot.latitud=0;
    assert.equal(helpers.Parcelas.ubicacion('P61').latitud,-8.520616,'Each new record gets an independent copy');
});

test('map reads stored coordinates without backfilling or replacing historic locations', () => {
    const historic = {id:'OLD',parcela:'Parcela 64',ubicacion:{latitud:-8.4,longitud:-78.8,precision:12}};
    const before = JSON.stringify(historic);
    assert.equal(helpers.mapCoords(historic).lat,-8.4);
    assert.equal(JSON.stringify(historic),before);
    assert.equal(helpers.mapCoords({parcela:'Parcela 64',ubicacion:null}),null);
    assert.equal(helpers.mapCoords(undefined),null);
    for (const location of [{latitud:null,longitud:1},{latitud:'',longitud:1},{latitud:1,longitud:' '},{latitud:100,longitud:1},{latitud:1,longitud:Infinity}])
        assert.equal(helpers.mapCoords({ubicacion:location}),null);
});

test('hours-man thresholds remain green below 50, amber below 100 and red from 100', () => {
    const row = {inicio:'2026-11-03T08:00:00Z',fin:'2026-11-03T10:00:00Z',trabajadores:25};
    assert.equal(helpers.mapHours(row),50);
    for (const [hours,color] of [[0,'low'],[49.99,'low'],[50,'medium'],[99.99,'medium'],[100,'high'],[150,'high']])
        assert.equal(helpers.mapColor(hours),color);
});
