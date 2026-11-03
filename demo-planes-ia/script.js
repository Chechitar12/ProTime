const $ = id => document.getElementById(id);
const steps = [...document.querySelectorAll('[data-step]')];
let assigned = false;
const messages = ['El historial y la programación permiten priorizar una revisión preventiva.','La propuesta recupera un caso similar y su resultado registrado.','La aprobación conecta responsable, correo, fecha y seguimiento.','El resultado evaluado queda disponible como antecedente para futuras decisiones.'];
function showStep(n) {
  for(let i=1;i<=4;i++) $(`stage-${i}`).hidden = i !== n;
  steps.forEach(button => {const value=Number(button.dataset.step);button.classList.toggle('active',value===n);if(value===n) button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
  $('context-message').textContent=messages[n-1];
  if(n===3){$('awaiting').hidden=assigned;$('coord-content').hidden=!assigned;$('coord-status').textContent=assigned?'Asignación simulada':'Por aprobar';$('coord-status').classList.toggle('green',assigned);}
  if(n===4){$('save-learning').disabled=!assigned;$('save-learning').title=assigned?'':'Aprueba primero el plan en el paso 2';}
}
steps.forEach(button=>button.addEventListener('click',()=>showStep(Number(button.dataset.step))));
function disclosure(buttonId,panelId){$(buttonId).addEventListener('click',()=>{const open=$(panelId).hidden;$(panelId).hidden=!open;$(buttonId).setAttribute('aria-expanded',String(open));});}
disclosure('method-toggle','method-detail');disclosure('history-toggle','history-detail');disclosure('mail-toggle','mail-detail');disclosure('edit','edit-form');
$('generate').addEventListener('click',()=>showStep(2));$('review').addEventListener('click',()=>showStep(2));
function dateLabel(){const d=new Date($('deadline-input').value);return d.toLocaleString('es-PE',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});}
function syncPlan(){
  $('plan-title').textContent=$('action-input').value.trim();$('owner-label').textContent=$('owner-input').value;$('deadline-label').textContent=dateLabel();
  $('assigned-owner').textContent=$('owner-input').value;$('assigned-date').textContent=dateLabel();$('mail-owner').textContent=$('owner-input').value;$('mail-action').textContent=$('action-input').value.trim();$('mail-date').textContent=`Fecha de solución: ${dateLabel()}.`;
  const reminder=new Date(new Date($('deadline-input').value).getTime()-30*60000);
  $('reminder-label').textContent=`Recepción pendiente. Recordatorio: ${reminder.toLocaleString('es-PE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false})} (30 min antes).`;
}
$('edit-form').addEventListener('submit',e=>{e.preventDefault();if(!$('action-input').value.trim()){$('action-input').setCustomValidity('Escribe una acción.');$('action-input').reportValidity();return;}syncPlan();$('edit-form').hidden=true;$('edit').setAttribute('aria-expanded','false');assigned=false;$('learning-result').hidden=true;});
$('action-input').addEventListener('input',()=>$('action-input').setCustomValidity(''));
$('approve').addEventListener('click',()=>{if(!$('edit-form').hidden){$('edit-form').requestSubmit();if(!$('edit-form').hidden)return;}syncPlan();assigned=true;$('learning-result').hidden=true;showStep(3);$('email-notice-recipient').textContent=`Responsable: ${$('owner-input').value} · Parcela 61`;$('email-notice').hidden=false;});
$('close-email-notice').addEventListener('click',()=>{$('email-notice').hidden=true;});
document.addEventListener('keydown',event=>{if(event.key==='Escape')$('email-notice').hidden=true;});
$('evaluate').addEventListener('click',()=>showStep(4));
$('save-learning').addEventListener('click',()=>{if(!assigned)return;const text={effective:'✓ Resultado incorporado al historial de esta demo. Este caso podrá orientar futuras recomendaciones, mostrando el periodo evaluado.',adjust:'↻ Se registra que la acción requiere ajuste. El caso servirá para revisar la próxima propuesta y evitar repetirla sin cambios.',insufficient:'ⓘ Se registra evidencia insuficiente. El caso no se presentará como una solución comprobada; requiere más observación.'};$('learning-result').textContent=text[$('outcome').value];$('learning-result').hidden=false;});
$('outcome').addEventListener('change',()=>$('learning-result').hidden=true);
$('restart').addEventListener('click',()=>location.reload());
showStep(1);

