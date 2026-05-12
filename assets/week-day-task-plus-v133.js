(()=>{
  if(window.__WEEKPLUS_V133__)return;
  window.__WEEKPLUS_V133__=1;
  const pad=n=>String(n).padStart(2,'0');
  const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  function dateFor(i){const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7)+i);return ymd(d)}
  function setDate(v){
    const id=document.getElementById('taskId');
    const a=document.getElementById('taskStart');
    const b=document.getElementById('taskDue');
    if(id)id.value='';
    if(a)a.value=v;
    if(b)b.value=v;
  }
  function openDate(v){
    const btn=document.getElementById('newTaskBtn')||document.getElementById('quickTaskBtn');
    if(btn)btn.click();
    [0,100,300].forEach(t=>setTimeout(()=>setDate(v),t));
  }
  function enhance(){
    const days=Array.from(document.querySelectorAll('.wk-tlday'));
    days.forEach((day,i)=>{
      if(day.querySelector('.wk-day-plus'))return;
      day.style.position='relative';
      day.style.paddingRight='32px';
      const x=document.createElement('button');
      x.type='button';
      x.className='wk-day-plus';
      x.textContent='+';
      x.title='Создать задачу на этот день';
      x.style.cssText='position:absolute;right:7px;top:7px;width:22px;height:22px;border:1px solid #dbe4ef;border-radius:999px;background:#fff;font-weight:900;cursor:pointer;z-index:20';
      x.onclick=e=>{e.preventDefault();openDate(dateFor(i))};
      day.appendChild(x);
    });
  }
  document.addEventListener('DOMContentLoaded',enhance);
  setInterval(enhance,1000);
  enhance();
})();
