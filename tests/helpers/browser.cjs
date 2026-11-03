const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const {spawn} = require('node:child_process');
const assert = require('node:assert/strict');
const pause = ms => new Promise(resolve => setTimeout(resolve,ms));

async function browserTest(t,{script='',routes={}}={},callback) {
    const executable = process.env.PROTIME_TEST_BROWSER || [
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files/Google/Chrome/Application/chrome.exe','/usr/bin/chromium','/usr/bin/google-chrome'
    ].find(file => fs.existsSync(file));
    if (!executable) {t.skip('Chromium browser required');return;}
    const root = path.resolve(__dirname,'../..');
    const profile = fs.mkdtempSync(path.join(os.tmpdir(),'protime-map-test-'));
    const server = http.createServer((request,response) => {
        const pathname = decodeURIComponent(new URL(request.url,'http://localhost').pathname);
        const file = path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
        if (!file.startsWith(root+path.sep)) {response.writeHead(403).end();return;}
        const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
        try {response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'text/plain'}).end(routes[pathname]??fs.readFileSync(file));}
        catch (_) {response.writeHead(404).end();}
    });
    await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const browser = spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
        '--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
    let ws;
    try {
        const activePort = path.join(profile,'DevToolsActivePort');
        for (let i=0;!fs.existsSync(activePort)&&i<150;i++) await pause(50);
        assert(fs.existsSync(activePort),'Browser started');
        const port = fs.readFileSync(activePort,'utf8').split('\n')[0];
        const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
        ws = new WebSocket(tabs.find(tab => tab.type==='page').webSocketDebuggerUrl);
        await new Promise(resolve => ws.addEventListener('open',resolve,{once:true}));
        let sequence=0;const waiting=new Map();
        ws.onmessage = event => {
            const message=JSON.parse(event.data);if (!message.id) return;
            const job=waiting.get(message.id);waiting.delete(message.id);
            message.error?job.reject(message.error):job.resolve(message.result);
        };
        const command=(method,params={})=>new Promise((resolve,reject)=>{
            const id=++sequence;waiting.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));
        });
        const run=async expression=>{
            const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
            if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
            return result.result.value;
        };
        const until=async expression=>{
            for(let i=0;i<200;i++){if(await run(expression))return;await pause(20);}
            throw new Error('Timed out: '+expression);
        };
        await command('Page.enable');
        if(script)await command('Page.addScriptToEvaluateOnNewDocument',{source:script});
        await command('Page.navigate',{url:origin});
        await until("typeof Parcelas!=='undefined' && typeof mapaIncidencias==='function'");
        await callback({run,until,command,origin});
        await command('Browser.close');
    } finally {
        ws?.close();browser.kill();
        await new Promise(resolve=>server.close(resolve));
        assert.equal(path.dirname(profile),path.resolve(os.tmpdir()));
        assert(path.basename(profile).startsWith('protime-map-test-'));
        await fs.promises.rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:100}).catch(()=>{});
    }
}
module.exports={browserTest};
