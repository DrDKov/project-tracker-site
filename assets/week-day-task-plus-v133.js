(()=>{
  if(window.__WEEKPLUS_V135__)return;
  window.__WEEKPLUS_V135__=1;
  const pad=n=>String(n).padStart(2,'0');
  const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const re=/^(Пн|Вт|Ср|Чт|Пт|Сб|Вс),\s*(\d{1,2})\.(\d{1,2})/;
  function year(){const v=[...document.querySelectorAll('input[type="date"]')].map(x=>x.value).find(x=>/^\d{4}-/.test(x||''));return v?Number(v.slice(0,4)):new Date().getFullYear()}
  function text(el){return String(el.textContent||'').replace(/\s+/g,' ').trim()}
  function iso(s){const m=String(s||'').match(re);if(!m)return'';const d=new Date(year(),Number(m[3])-1,Number(m[2]));return Number.isFinite(d.getTime())?ymd(d):''}
  function setDates(v){const id=document.getElementById('taskId'),a=document.getElementById('taskStart'),b=document.getElementById('taskDue');if(id)id.value='';if(a)a.value=v;if(b)b.value=v}
  function openTask(v){const btn=document.getElementById('newTaskBtn')||document.getElementById('quickTaskBtn');if(btn)btn.click();else document.getElementById('taskModal')?.showModal?.();[0,80,200,400].forEach(ms=>setTimeout(()=>setDates(v),ms))}
  function dateEls(){const all=[...document.querySelectorAll('h1,h2,h3,h4,h5,div,span')].filter(el=>{const s=text(el);return s.length<=32&&iso(s)});return all.filter(el=>!all.some(o=>o!==el&&el.contains(o)))}
  function enhance(){
    document.querySelectorAll('.wk-day-plus').forEach(x=>{const p=x.parentElement;if(!p||!iso(text(p)))x.remove()});
    dateEls().forEach(el=>{
      const old=[...el.querySelectorAll(':scope > .wk-day-plus')];old.slice(1).forEach(x=>x.remove());
      if(old[0])return;
      const v=iso(text(el));if(!v)return;
      const x=document.createElement('button');
      x.type='button';x.className='wk-day-plus';x.textContent='+';x.title='Создать задачу на этот день';
      x.style.cssText='margin-left:6px;width:20px;height:20px;border:1px solid #dbe4ef;border-radius:999px;background:#fff;font-weight:900;cursor:pointer;line-height:16px;padding:0;vertical-align:middle';
      x.onclick=e=>{e.preventDefault();e.stopPropagation();openTask(v)};
      el.appendChild(x)
    })
  }
  document.addEventListener('DOMContentLoaded',enhance);
  setInterval(enhance,800);
  enhance();
})();
