(()=>{
  if (window.__WEEKPLUS_STEP__) return;
  window.__WEEKPLUS_STEP__ = 1;
  function enhance(){
    const days = Array.from(document.querySelectorAll('.wk-tlday'));
    days.forEach((day)=>{
      if (day.querySelector('.wk-day-plus')) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'wk-day-plus';
      b.textContent = '+';
      day.appendChild(b);
    });
  }
  document.addEventListener('DOMContentLoaded', enhance);
  setInterval(enhance, 1000);
})();
