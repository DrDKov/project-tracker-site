/* Private project chat files: read with the logged-in user's JWT, never persisted signed URLs. */
(function(root){
'use strict';
const BUCKET='project-chat-files', ORIGIN='https://mqvohqvpygenijdivkzn.supabase.co';
const UUID=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const state={client:null,user:'',container:null};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function pathFrom(value){
  const raw=String(value||'');
  if(raw.startsWith('storage://project-chat-files/'))return raw.slice('storage://project-chat-files/'.length);
  try{
    const url=new URL(raw);
    if(url.origin!==ORIGIN||url.protocol!=='https:')return '';
    const match=url.pathname.match(/^\/storage\/v1\/object\/(?:sign|public|authenticated)\/project-chat-files\/(.+)$/);
    return match?decodeURIComponent(match[1]):'';
  }catch(_){return ''}
}
function pathForProject(raw,projectId){
  const path=pathFrom(raw),pieces=path.split('/');
  if(!UUID.test(String(projectId||''))||pieces.length!==2||pieces[0].toLowerCase()!==String(projectId).toLowerCase()||
    !pieces[1]||pieces[1]==='.'||pieces[1]==='..'||/[\u0000-\u001f]/.test(pieces[1]))return '';
  return path;
}
function fileLine(f){
  const name=String(f.name||'file').replace(/[\r\n]/g,' ').trim();
  return (f.isImage?'🖼':'📎')+' '+name+': storage://project-chat-files/'+f.path;
}
function render(body,projectId){
  return String(body||'').split('\n').map(line=>{
    const m=line.match(/^(📎|🖼)\s+(.+?):\s+(\S+)\s*$/u);
    if(m){
      const path=pathForProject(m[3],projectId);
      if(path){
        const name=esc(m[2]),data=' data-pt-chat-path="'+esc(path)+'" data-pt-chat-name="'+name+'"';
        return m[1]==='🖼'
          ?'<button type="button" class="chat-img-link pt-chat-download"'+data+'><img data-pt-chat-preview="'+esc(path)+'" alt="'+name+'" loading="lazy"><span>'+name+'</span></button>'
          :'<button type="button" class="chat-file-link pt-chat-download"'+data+'>📎 <span>'+name+'</span></button>';
      }
    }
    return line.trim()?'<div>'+esc(line)+'</div>':'<br>';
  }).join('');
}
function cleanup(container){
  if(!container)return;
  container.querySelectorAll('img[data-pt-chat-preview]').forEach(img=>{
    if(img.src&&img.src.startsWith('blob:'))URL.revokeObjectURL(img.src);
  });
}
async function download(path){
  if(!state.client||!state.user)throw Error('Требуется вход в приложение');
  const result=await state.client.storage.from(BUCKET).download(path);
  if(result.error||!result.data)throw result.error||Error('Файл недоступен');
  return result.data;
}
function hydrate(container,client,userId,visible){
  if(!container)return;
  const user=String(userId||'');
  if(state.user!==user)cleanup(container);
  state.client=client;state.user=user;state.container=container;
  if(!container.__ptChatAccessBound){
    container.__ptChatAccessBound=true;
    container.addEventListener('click',async event=>{
      const btn=event.target.closest('button[data-pt-chat-path]');
      if(!btn||!container.contains(btn)||btn.disabled)return;
      event.preventDefault();
      btn.disabled=true;
      const userAtStart=state.user;
      try{
        const blob=await download(btn.dataset.ptChatPath);
        if(userAtStart!==state.user||!btn.isConnected)return;
        const url=URL.createObjectURL(blob),a=document.createElement('a');
        a.href=url;a.download=btn.dataset.ptChatName||'attachment';a.style.display='none';
        document.body.appendChild(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),30000);
      }catch(error){
        alert('Не удалось открыть вложение. Проверьте доступ к проекту и повторите попытку.');
        console.warn('Chat attachment download failed',error);
      }finally{btn.disabled=false}
    });
  }
  if(!visible||!client||!user)return;
  container.querySelectorAll('img[data-pt-chat-preview]').forEach(async img=>{
    if(img.dataset.ptPreviewStarted)return;
    img.dataset.ptPreviewStarted='1';
    const userAtStart=state.user;
    try{
      const blob=await download(img.dataset.ptChatPreview);
      if(!img.isConnected||state.user!==userAtStart)return;
      img.src=URL.createObjectURL(blob);
    }catch(_){
      if(img.isConnected){img.alt='Предпросмотр недоступен. Нажмите, чтобы скачать.';img.style.display='none'}
    }
  });
}
if(typeof document!=='undefined'){
  const css=document.createElement('style');
  css.textContent='.pt-chat-download{font:inherit;cursor:pointer;text-align:left}.chat-img-link.pt-chat-download{border:0;background:transparent;padding:0;color:inherit}.pt-chat-download:disabled{opacity:.6;cursor:progress}.chat-img-link img:not([src]){min-width:80px;min-height:44px;background:#edf2f7}';
  document.head.appendChild(css);
  root.addEventListener('pt-session-ended',()=>{
    cleanup(state.container);
    if(state.container)state.container.querySelectorAll('img[data-pt-chat-preview]').forEach(img=>{img.removeAttribute('src');img.dataset.ptPreviewStarted=''});
    state.client=null;state.user='';
  });
}
const api={pathForProject,fileLine,render,cleanup,hydrate};
root.ProjectTrackerChatFiles=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
