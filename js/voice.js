/* La voz se guarda en IndexedDB; el texto continúa en pt_incidencias_v3. */
let voiceSession = null;

function voiceMessage(form, message) {
    const label = form?.querySelector('#voiceStatus');
    if (label) label.textContent = message;
}

function voiceOpen() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) return reject(new Error('Este navegador no permite guardar audio localmente.'));
        const req = indexedDB.open('protime_audio_v3', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('audios');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function voiceStore(id, blob) {
    const db = await voiceOpen();
    try {
        await new Promise((resolve, reject) => {
            const tx = db.transaction('audios', 'readwrite');
            tx.objectStore('audios').put(blob, id);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    } finally { db.close(); }
}

async function voiceGet(id) {
    const db = await voiceOpen();
    try {
        return await new Promise((resolve, reject) => {
            const req = db.transaction('audios').objectStore('audios').get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    } finally { db.close(); }
}

async function voiceRemove(id) {
    const db = await voiceOpen();
    try {
        await new Promise((resolve, reject) => {
            const tx = db.transaction('audios', 'readwrite');
            tx.objectStore('audios').delete(id);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    } finally { db.close(); }
}

function voiceReset() {
    const state = voiceSession;
    if (!state) return;
    if (state.timer) clearTimeout(state.timer);
    try { if (state.recognition) state.recognition.abort(); } catch (_) {}
    try { if (state.recorder?.state === 'recording') state.recorder.stop(); } catch (_) {}
    state.stream?.getTracks().forEach(track => track.stop());
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    voiceSession = null;
}

function voiceInit(form) {
    voiceReset();
    const state = { form, recorder:null, recognition:null, stream:null, blob:null,
        previewUrl:null, timer:null, stopping:null, base:'', manualBase:null, transcript:'' };
    voiceSession = state;
    const toggle=form.querySelector('#voiceToggle'), discard=form.querySelector('#voiceDiscard');
    discard.disabled=true;
    toggle.onclick=async () => {
        if (state.recorder?.state === 'recording') return voiceStop(state);
        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
            voiceMessage(form,'La grabación requiere abrir ProTime con HTTPS y permitir el micrófono.');return;
        }
        try {
            state.stream=await navigator.mediaDevices.getUserMedia({audio:true});
            if (voiceSession!==state) { state.stream.getTracks().forEach(t=>t.stop());return; }
            if(state.manualBase===null)state.manualBase=form.querySelector('#desc').value;
            state.blob=null;discard.disabled=true;
            const chunks=[];
            state.recorder=new MediaRecorder(state.stream);
            state.recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
            state.recorder.onerror=()=>voiceMessage(form,'Hubo un problema durante la grabación. Inténtalo de nuevo.');
            state.recorder.onstop=()=>{
                state.blob=chunks.length?new Blob(chunks,{type:state.recorder.mimeType||chunks[0].type}):null;
                state.stream?.getTracks().forEach(t=>t.stop());state.stream=null;
                if(state.blob){
                    if(state.previewUrl) URL.revokeObjectURL(state.previewUrl);
                    state.previewUrl=URL.createObjectURL(state.blob);
                    const preview=form.querySelector('#voicePreview');preview.src=state.previewUrl;preview.hidden=false;
                    discard.disabled=false;
                    voiceMessage(form,'Audio listo. Revisa y edita la descripción antes de guardar.');
                } else voiceMessage(form,'No se capturó audio. Puedes intentarlo nuevamente.');
                if(state.stopping){state.stopping();state.stopping=null}
            };
            state.base=form.querySelector('#desc').value.trim();state.transcript='';
            const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
            if(Recognition){
                try{
                    const recognition=new Recognition();state.recognition=recognition;
                    recognition.lang='es-PE';recognition.continuous=true;recognition.interimResults=true;
                    recognition.onresult=e=>{
                        const spoken=Array.from(e.results).map(result=>result[0].transcript.trim()).join(' ').trim();
                        const desc=form.querySelector('#desc');
                        desc.value=[state.base,spoken].filter(Boolean).join(' ').trim();
                        desc.dispatchEvent(new Event('input',{bubbles:true}));
                    };
                    recognition.onerror=e=>{
                        if(e.error!=='no-speech'&&e.error!=='aborted')voiceMessage(form,'Se grabará el audio, pero la transcripción no está disponible. Escribe la descripción manualmente.');
                    };
                    recognition.start();
                }catch(_){state.recognition=null}
            }
            state.recorder.start();toggle.classList.add('recording');toggle.setAttribute('aria-label','Detener grabación');toggle.setAttribute('aria-pressed','true');
            voiceMessage(form,Recognition?'Grabando y transcribiendo…':'Grabando audio. La transcripción no está disponible en este navegador.');
            state.timer=setTimeout(()=>voiceStop(state),90000);
        } catch (error) {
            state.stream?.getTracks().forEach(t=>t.stop());state.stream=null;
            voiceMessage(form,'No se pudo acceder al micrófono. Revisa el permiso del navegador.');
        }
    };
    discard.onclick=async()=>{
        if(state.recorder?.state==='recording')await voiceStop(state);
        if(state.recognition)state.recognition.onresult=null;
        state.blob=null;discard.disabled=true;
        if(state.manualBase!==null){form.querySelector('#desc').value=state.manualBase;state.manualBase=null}
        const preview=form.querySelector('#voicePreview');preview.hidden=true;preview.removeAttribute('src');
        if(state.previewUrl)URL.revokeObjectURL(state.previewUrl);state.previewUrl=null;
        voiceMessage(form,'Grabación descartada. La descripción permanece editable.');
    };
}

function voiceStop(state) {
    if(state.recorder?.state!=='recording')return Promise.resolve();
    if(state.timer)clearTimeout(state.timer);
    const finished=new Promise(resolve=>{state.stopping=resolve});
    state.recorder.stop();
    try { state.recognition?.stop(); } catch (_) {}
    const toggle=state.form.querySelector('#voiceToggle');
    toggle.classList.remove('recording');toggle.setAttribute('aria-label','Iniciar grabación');toggle.setAttribute('aria-pressed','false');
    return finished;
}

async function voicePrepare(form) {
    const state=voiceSession;
    if(!state||state.form!==form)return null;
    if(state.recorder?.state==='recording')await voiceStop(state);
    return state.blob;
}

async function voiceOpenPlayer(id) {
    const modal=document.createElement('div');modal.className='web-modal-wrap';
    modal.innerHTML='<div class="web-modal" role="dialog" aria-modal="true"><h2>Audio de la incidencia</h2><p id="voicePlayerStatus">Cargando grabación…</p><audio controls style="width:100%" hidden></audio><div class="web-modal-actions"><button type="button">Cerrar</button></div></div>';
    document.body.append(modal);
    let url=null;
    const close=()=>{if(url)URL.revokeObjectURL(url);modal.remove()};
    modal.querySelector('button').onclick=close;modal.onclick=e=>{if(e.target===modal)close()};
    try {
        const blob=await voiceGet(id);
        if(!modal.isConnected)return;
        const status=modal.querySelector('#voicePlayerStatus');
        if(!blob){status.textContent='No se encontró el audio en este navegador.';return}
        url=URL.createObjectURL(blob);
        const player=modal.querySelector('audio');player.src=url;player.hidden=false;
        status.textContent='Grabación original guardada en este navegador.';
    } catch (_) {modal.querySelector('#voicePlayerStatus').textContent='No se pudo abrir el audio en este navegador.'}
}
