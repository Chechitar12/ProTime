// Node 22+ and an installed Chromium browser. No API calls or third-party dependencies.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const {spawn} = require('node:child_process');

test('AI review, editing, explicit saves, errors, cancellation and responsive layout', {timeout:60000}, async t => {
    const browserPath = process.env.PROTIME_TEST_BROWSER || [
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        '/usr/bin/chromium','/usr/bin/google-chrome'
    ].find(file => fs.existsSync(file));
    if (!browserPath) {t.skip('Set PROTIME_TEST_BROWSER to a Chromium executable.');return;}
    const root = path.resolve(__dirname,'..');
    const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
    const profile = fs.mkdtempSync(path.join(os.tmpdir(),'protime-ai-test-'));
    const server = http.createServer((request,response) => {
        const pathname = decodeURIComponent(new URL(request.url,'http://localhost').pathname);
        const file = path.resolve(root,'.'+(pathname === '/'?'/index.html':pathname));
        if (!file.startsWith(root+path.sep)) {response.writeHead(403).end();return;}
        if (pathname === '/js/ai-config.js') {
            response.writeHead(200,{'Content-Type':'text/javascript'}).end(
                "const PROTIME_AI_CONFIG=Object.freeze({apiKey:'test-only-not-a-real-key',model:'gpt-4.1-mini',timeoutMs:350});");return;
        }
        const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
        try {response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'text/plain'}).end(fs.readFileSync(file));}
        catch (_) {response.writeHead(404).end();}
    });
    await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const browser = spawn(browserPath,['--headless=new','--disable-gpu','--no-first-run',
        '--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],
        {windowsHide:true,stdio:'ignore'});
    let ws;
    try {
        const activePort = path.join(profile,'DevToolsActivePort');
        for (let i=0; !fs.existsSync(activePort) && i<150; i++) await pause(50);
        assert(fs.existsSync(activePort),'Browser debugging endpoint started');
        const port = fs.readFileSync(activePort,'utf8').split('\n')[0];
        const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
        ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
        await new Promise(resolve => ws.addEventListener('open',resolve,{once:true}));
        let sequence = 0;
        const waiting = new Map();
        ws.onmessage = event => {
            const message = JSON.parse(event.data);
            if (!message.id) return;
            const job = waiting.get(message.id);waiting.delete(message.id);
            message.error?job.reject(message.error):job.resolve(message.result);
        };
        const command = (method,params={}) => new Promise((resolve,reject) => {
            const id = ++sequence;waiting.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));
        });
        const run = async expression => {
            const result = await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
            if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
            return result.result.value;
        };
        const until = async expression => {
            for (let i=0;i<150;i++) {if (await run(expression)) return;await pause(20);}
            throw new Error('Timed out: '+expression);
        };
        const capture = async name => {
            if (!process.env.PROTIME_QA_OUTPUT) return;
            const screenshot = await command('Page.captureScreenshot',{format:'png'});
            fs.writeFileSync(path.join(process.env.PROTIME_QA_OUTPUT,`protime-ai-${name}.png`),Buffer.from(screenshot.data,'base64'));
        };
        await command('Page.enable');
        await command('Page.addScriptToEvaluateOnNewDocument',{source:`
            window.qa={mode:'ok',calls:[],spoken:[],delay:15};
            const originalFetch=window.fetch;
            window.fetch=async (url,options)=>{
                if(String(url)!=='https://api.openai.com/v1/responses')return originalFetch(url,options);
                qa.calls.push(JSON.parse(options.body));
                const mode=qa.mode;
                await new Promise((resolve,reject)=>{
                    const timer=setTimeout(resolve,mode==='slow'?1000:qa.delay);
                    options.signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'))},{once:true});
                });
                if(mode==='401'||mode==='429')return new Response('{}',{status:Number(mode)});
                if(mode==='network')throw new TypeError('Network');
                const proposal={tipoIncidencia:'Retraso de materiales',plan:'Coordinar entrega de materiales',
                    accionInmediata:'Confirmar disponibilidad y coordinar la entrega a la parcela.',
                    prevencion:'Verificar materiales antes de cada jornada.',
                    importancia:'Este plan ayuda a reducir las interrupciones y organizar los recursos. Revisa su viabilidad antes de ejecutarlo.'};
                const text=mode==='invalid'?'{}':JSON.stringify(proposal);
                return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text}]}]}));
            };
            Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],speak:u=>qa.spoken.push(u.text),cancel:()=>{}}});
        `});
        await command('Page.navigate',{url:origin});
        await until("typeof PlanIA !== 'undefined' && typeof webPlan === 'function'");
        await run(`
            window.fixture={id:'INC-00004',area:'Cosecha',tipo:'Retraso de materiales de cosecha',descripcion:'Materiales no llegaron a la parcela 61.',
                areaResponsable:'Cosecha',responsableValidacion:'Álex Pairazamán',validacionEstado:'Validado',estado:'FINALIZADA',
                inicio:'2026-10-30T08:00:00Z',fin:'2026-10-30T10:00:00Z',trabajadores:30};
            DB.set('pt_incidencias_v3',[fixture,{...fixture,id:'INC-OLD',validacionEstado:'Solucionado',planAccion:'Coordinar materiales',solucionAplicada:'Entrega coordinada'}]);
            go('validacionWeb');webPlan(Incidencias.byId(fixture.id));
        `);
        const before = await run("JSON.stringify(Incidencias.all())");
        await command('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
        await capture('form');
        // Drafts and dates survive a cancelled request.
        await run("webForm.elements.planDescripcion.value='Mi borrador';webForm.elements.fechaEstimada.value='2026-11-05';qa.mode='slow';document.querySelector('[data-ai-action=suggest]').click()");
        await until("!!document.querySelector('.ai-thinking')");
        await capture('loading');
        await run("document.querySelector('[data-ai-action=back]').click()");
        assert.equal(await run("webForm.elements.planDescripcion.value"),'Mi borrador');
        assert.equal(await run("webForm.elements.fechaEstimada.value"),'2026-11-05');
        // Generate, read aloud, edit, review, then explicitly use the proposal.
        await run("qa.mode='ok';document.querySelector('[data-ai-action=suggest]').click()");
        await until("!!document.querySelector('.ai-proposal')");
        assert.equal(await run("JSON.stringify(Incidencias.all())"),before);
        assert.equal(await run("qa.calls.at(-1).store"),false);
        assert.equal(await run("JSON.parse(qa.calls.at(-1).input).antecedentesConfirmados.length"),1);
        assert(!await run("qa.calls.at(-1).input.includes('Álex')"));
        assert.equal(await run("qa.spoken.length"),1);
        await run("webForm.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))");
        assert.equal(await run("JSON.stringify(Incidencias.all())"),before,'Preview cannot submit the original form');
        await run("document.querySelector('[data-ai-action=edit]').click();document.querySelector('[data-ai-field=plan]').value='Plan revisado por el usuario';document.querySelector('[data-ai-action=review]').click()");
        assert(await run("document.querySelector('.ai-proposal').textContent.includes('Plan revisado por el usuario')"));
        if (process.env.PROTIME_QA_OUTPUT) {
            for (const [width,height,name] of [[1280,900,'desktop'],[390,844,'mobile']]) {
                await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
                const screenshot = await command('Page.captureScreenshot',{format:'png'});
                fs.writeFileSync(path.join(process.env.PROTIME_QA_OUTPUT,`protime-ai-${name}.png`),Buffer.from(screenshot.data,'base64'));
            }
        }
        for (const [width,height] of [[320,568],[390,844],[768,1024],[1440,900],[812,375]]) {
            await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
            assert(await run("document.documentElement.scrollWidth<=innerWidth"),'No horizontal overflow');
            assert(await run("(()=>{const r=document.querySelector('.ai-plan-modal').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()"),'Dialog fits viewport');
        }
        await run("document.querySelector('[data-ai-action=apply]').click()");
        await capture('confirmation');
        assert.equal(await run("JSON.stringify(Incidencias.all())"),before,'Using a proposal does not save');
        assert.equal(await run("webForm.elements.planTipo.value"),'Plan revisado por el usuario');
        assert.equal(await run("webForm.elements.fechaEstimada.value"),'2026-11-05');
        await run("webForm.elements.planDescripcion.value+=' Ajuste final.';webForm.requestSubmit()");
        assert.equal(await run("webStatus(Incidencias.byId(fixture.id))"),'En proceso');
        assert(await run("Incidencias.byId(fixture.id).planAccion.endsWith('Ajuste final.')"));
        // Solution workflow remains separate and only marks solved on explicit save.
        await run("webSolve(Incidencias.byId(fixture.id));document.querySelector('[data-ai-action=suggest]').click()");
        await until("!!document.querySelector('.ai-proposal')");
        await run("document.querySelector('[data-ai-action=apply]').click()");
        assert.equal(await run("webStatus(Incidencias.byId(fixture.id))"),'En proceso');
        await run("webForm.elements.solucionAplicada.value='Solución efectivamente realizada';webForm.requestSubmit()");
        assert.equal(await run("webStatus(Incidencias.byId(fixture.id))"),'Solucionado');
        // Token, limits, malformed response, network failure, timeout and offline.
        for (const mode of ['401','429','invalid','network','slow']) {
            await run(`webPlan(fixture);qa.mode='${mode}';document.querySelector('[data-ai-action=suggest]').click()`);
            await until("!!document.querySelector('.ai-error')");
            assert(!await run("document.querySelector('[data-ai-fields]').hidden"),'Manual entry stays available');
            await run('webClose()');
        }
        await run("webPlan(fixture);Object.defineProperty(navigator,'onLine',{configurable:true,value:false});document.querySelector('[data-ai-action=suggest]').click()");
        assert(await run("document.querySelector('.ai-error').textContent.includes('internet')"));
        await run("Object.defineProperty(navigator,'onLine',{configurable:true,value:true});qa.mode='slow';document.querySelector('[data-ai-action=suggest]').click();webClose()");
        await pause(400);
        assert(!await run("!!document.querySelector('#webModal')"),'Closed dialogs stay closed after abort');
        // Empty pilot configuration gives an actionable error without API traffic.
        const emptyConfigTest = await run(`(async()=>{
            const source=await(await fetch('./js/ai-plan.js')).text();
            const local= new Function('PROTIME_AI_CONFIG', source+';return PlanIA;')({apiKey:'',model:'gpt-4.1-mini'});
            webPlan(fixture);PlanIA.close();local.attach(fixture,'plan');
            const calls=qa.calls.length;document.querySelector('[data-ai-action=suggest]').click();
            const result=qa.calls.length===calls&&document.querySelector('.ai-error').textContent.includes('OPENAI_API_KEY');local.close();return result;
        })()`);
        assert(emptyConfigTest);
        await command('Browser.close');
    } finally {
        ws?.close();browser.kill();
        await new Promise(resolve => server.close(resolve));
        // Delete only the unique test profile created under the OS temporary directory.
        assert.equal(path.dirname(profile),path.resolve(os.tmpdir()));
        assert(path.basename(profile).startsWith('protime-ai-test-'));
        await fs.promises.rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:100}).catch(()=>{});
    }
});
