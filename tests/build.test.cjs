const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const {build} = require('../scripts/build.cjs');

test('environment build publishes only application assets and rotates worker cache', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(),'protime-build-test-'));
    try {
        // Use a source tree isolated from the real .env and any user files.
        const source = path.join(temp,'source');
        fs.mkdirSync(source);
        for (const entry of ['index.html','manifest.webmanifest','sw.js','css','js','icons'])
            fs.cpSync(path.join(__dirname,'..',entry),path.join(source,entry),{recursive:true});
        fs.writeFileSync(path.join(source,'.env'),'PRIVATE_TEST=not-for-publishing');
        fs.mkdirSync(path.join(source,'documentos'));
        fs.writeFileSync(path.join(source,'documentos/private.txt'),'not-for-publishing');
        const output = build({sourceDir:source,outputDir:path.join(source,'dist'),env:{OPENAI_API_KEY:'dummy-test-value',OPENAI_MODEL:'test-model',GOOGLE_MAPS_API_KEY:'dummy-map-value',GOOGLE_MAPS_MAP_ID:'test-map-id'}});
        const readConfig = () => vm.runInNewContext(fs.readFileSync(path.join(output,'js/ai-config.js'),'utf8')+';PROTIME_AI_CONFIG;');
        assert.equal(readConfig().apiKey,'dummy-test-value');
        assert.equal(readConfig().model,'test-model');
        const readMap = () => vm.runInNewContext(fs.readFileSync(path.join(output,'js/map-config.js'),'utf8')+';PROTIME_MAP_CONFIG;');
        assert.equal(readMap().apiKey,'dummy-map-value');
        assert.equal(readMap().mapId,'test-map-id');
        assert(!fs.existsSync(path.join(output,'.env')));
        assert(!fs.existsSync(path.join(output,'documentos')));
        assert(!fs.existsSync(path.join(output,'tests')));
        const worker1 = fs.readFileSync(path.join(output,'sw.js'),'utf8');
        const paths = [...worker1.matchAll(/^\s+'\.\/([^']*)',?$/gm)].map(match => match[1]).filter(Boolean);
        for (const asset of paths) assert(fs.existsSync(path.join(output,asset)),asset+' exists');
        fs.writeFileSync(path.join(output,'stale.txt'),'stale');
        build({sourceDir:source,outputDir:output,env:{OPENAI_API_KEY:'changed-dummy-value'}});
        assert(!fs.existsSync(path.join(output,'stale.txt')));
        assert.notEqual(fs.readFileSync(path.join(output,'sw.js'),'utf8'),worker1);
        assert.equal(readConfig().model,'gpt-4.1-mini');
        assert.equal(readMap().apiKey,'');
        const beforeMapChange = fs.readFileSync(path.join(output,'sw.js'),'utf8');
        build({sourceDir:source,outputDir:output,env:{OPENAI_API_KEY:'changed-dummy-value',GOOGLE_MAPS_API_KEY:'dummy-map-change'}});
        assert.notEqual(fs.readFileSync(path.join(output,'sw.js'),'utf8'),beforeMapChange,'Map key rotation updates worker cache');
        assert.throws(() => build({sourceDir:source,outputDir:output,env:{},requireKey:true}),/OPENAI_API_KEY/);
        assert.throws(() => build({sourceDir:source,outputDir:source,env:{}}),/dist/);
        build({sourceDir:source,outputDir:output,env:{}});
        assert.equal(readConfig().apiKey,'');
    } finally {
        assert.equal(path.dirname(temp),path.resolve(os.tmpdir()));
        assert(path.basename(temp).startsWith('protime-build-test-'));
        fs.rmSync(temp,{recursive:true,force:true});
    }
});
