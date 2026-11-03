// Build estático: el navegador recibe la configuración generada, no lee .env.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname,'..');
const ASSETS = ['index.html','manifest.webmanifest','sw.js','css/estilos.css','css/ai-plan.css','css/mapa.css',
    'js/storage.js','js/incidencias.js','js/parcelas.js','js/app.js','js/web.js','js/ai-plan.js',
    'js/voice.js','js/mapa.js','js/map-heat.js','js/google-maps.js','js/pwa.js','icons/icon-192.png','icons/icon-512.png',
    'icons/icon-maskable-512.png','icons/apple-touch-icon.png'];

function build({sourceDir=ROOT,outputDir=path.join(ROOT,'dist'),env=process.env,requireKey=false}={}) {
    const apiKey = String(env.OPENAI_API_KEY||'').trim();
    if (requireKey && !apiKey) throw new Error('Falta OPENAI_API_KEY. Configura el secreto del repositorio antes de publicar.');
    const destination = path.resolve(outputDir), source = path.resolve(sourceDir);
    // La salida es siempre un directorio dist dentro de la carpeta fuente indicada.
    if (path.dirname(destination) !== source || path.basename(destination) !== 'dist')
        throw new Error('La salida debe ser la carpeta dist dentro del proyecto.');
    if (fs.existsSync(destination) && fs.lstatSync(destination).isSymbolicLink())
        throw new Error('La carpeta dist no puede ser un enlace simbólico.');
    fs.rmSync(destination,{recursive:true,force:true});
    fs.mkdirSync(destination,{recursive:true});
    for (const asset of ASSETS) {
        const target = path.join(destination,asset);
        fs.mkdirSync(path.dirname(target),{recursive:true});
        fs.copyFileSync(path.join(source,asset),target);
    }
    const config = {apiKey,model:String(env.OPENAI_MODEL||'gpt-4.1-mini').trim()||'gpt-4.1-mini',timeoutMs:45000};
    fs.writeFileSync(path.join(destination,'js/ai-config.js'),
        '// Generado durante el build. Estos valores son públicos en el navegador.\n'+
        `const PROTIME_AI_CONFIG = Object.freeze(${JSON.stringify(config,null,4)});\n`);
    const mapConfig = {apiKey:String(env.GOOGLE_MAPS_API_KEY||'').trim(),
        mapId:String(env.GOOGLE_MAPS_MAP_ID||'DEMO_MAP_ID').trim()||'DEMO_MAP_ID'};
    fs.writeFileSync(path.join(destination,'js/map-config.js'),
        '// Generado desde GOOGLE_MAPS_API_KEY y GOOGLE_MAPS_MAP_ID. Configuración pública del navegador.\n'+
        `const PROTIME_MAP_CONFIG = Object.freeze(${JSON.stringify(mapConfig,null,4)});\n`);
    fs.writeFileSync(path.join(destination,'.nojekyll'),'');
    // También cambia el worker si cambian la clave o el modelo: evita cachés desactualizados.
    const hash = crypto.createHash('sha256');
    for (const asset of [...ASSETS,'js/ai-config.js','js/map-config.js']) hash.update(asset).update(fs.readFileSync(path.join(destination,asset)));
    const version = hash.digest('hex').slice(0,16);
    const worker = path.join(destination,'sw.js');
    const original = fs.readFileSync(worker,'utf8');
    const updated = original.replace(/const CACHE_NAME = .*;/, 'const CACHE_NAME = `${CACHE_PREFIX}build-'+version+'`;');
    if (updated === original) throw new Error('No se pudo actualizar la versión del service worker.');
    fs.writeFileSync(worker,updated);
    return destination;
}

if (require.main === module) {
    try {
        const dotenv = path.join(ROOT,'.env');
        if (fs.existsSync(dotenv)) process.loadEnvFile(dotenv);
        build({requireKey:process.argv.includes('--require-ai-key')});
        console.log('Build completado en dist/. La configuración del frontend será visible en el navegador.');
    } catch (error) { console.error(error.message);process.exitCode=1; }
}
module.exports = {build};
