const {test} = require('node:test');
const assert = require('node:assert/strict');
const {browserTest} = require('./helpers/browser.cjs');

test('Limpiar datos requires confirmation and removes local records and audio', {timeout:60000}, async t => {
    await browserTest(t,{},async ({run,until})=>{
        await run(`(async()=>{
            DB.set('pt_incidencias_v3',[{id:'INC-00001',estado:'FINALIZADA',tipo:'Prueba',audioId:'INC-00001'}]);
            DB.set('pt_ultima_sync_v3','2026-11-06T08:00:00Z');
            DB.set('pt_ultimo_envio_v3',1);
            DB.set('pt_sesion',{usuario:'prueba'});
            DB.set('pt_maestros',{ok:true});
            await voiceStore('INC-00001',new Blob(['audio']));
            await voiceStore('huérfano',new Blob(['audio']));
            go('registro');
        })()`);
        await run("window.confirm=()=>false;document.querySelector('.dots').click();document.querySelector('#dbMenu .db-clear-data').click()");
        assert.equal(await run('Incidencias.all().length'),1);
        assert(await run("voiceGet('INC-00001').then(Boolean)"));

        await run("window.confirm=()=>true;document.querySelector('.dots').click();document.querySelector('#dbMenu .db-clear-data').click()");
        await until("document.querySelector('.toast')?.textContent==='Datos locales eliminados.'");
        assert.equal(await run('Incidencias.all().length'),0);
        assert.equal(await run("voiceGet('INC-00001')"),null);
        assert.equal(await run("voiceGet('huérfano')"),null);
        assert.equal(await run("DB.get('pt_ultima_sync_v3',null)"),null);
        assert.equal(await run("DB.get('pt_ultimo_envio_v3',0)"),0);
        assert.equal(await run("DB.get('pt_sesion',{}).usuario"),'prueba');
        assert.equal(await run("DB.get('pt_maestros',{}).ok"),true);
        assert(await run("document.querySelector('#list').textContent.includes('Aún no tienes incidentes')"));
        await run("go('modulos');document.querySelector('.module-dots').click()");
        assert.equal(await run("document.querySelector('#moduleDbMenu.open .db-clear-data').textContent"),'Limpiar datos');
    });
});
