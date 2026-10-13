const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../assets/planning-inbox.js'),'utf8');
const events={};
const registered=(name,fn)=>(events[name]??=[]).push(fn);
const cssVars=new Map();
let tablet=true;
const mq={get matches(){return tablet},addEventListener(_kind,fn){registered('media',fn)}};
const area={
 id:'planningQuickInput',
 value:'',
 placeholder:'Введите задачу и нажмите Enter. Несколько задач — каждая с новой строки',
 rows:2,
 focus(){},
 style:{
   setProperty(k,v){cssVars.set(k,v)},
   removeProperty(k){cssVars.delete(k)}
 },
 get scrollHeight(){
   const lines=this.value?this.value.split('\n').reduce((sum,line)=>sum+Math.max(1,Math.ceil(line.length/32)),0):1;
   return lines*22+22;
 }
};
const nodes={planningQuickInput:area};
const doc={
 readyState:'complete',
 getElementById:id=>nodes[id]||null,
 addEventListener:registered
};
const win={
 matchMedia(){return mq},
 addEventListener:registered
};
vm.runInNewContext(src,{document:doc,window:win,console});
const emit=(name,event)=>{for(const fn of events[name]||[])fn(event)};
assert.equal(area.placeholder,'Новая задача…');
assert.equal(area.rows,1);
assert.equal(cssVars.get('--planning-quick-height'),'46px');
area.value='Выполнить небольшую задачу';
emit('input',{target:area});
assert.equal(cssVars.get('--planning-quick-height'),'46px','Single line stays compact');
area.value='Задача с очень длинным названием, которое переносится на несколько строк автоматически и не обрезается в поле ввода';
emit('input',{target:area});
assert.ok(parseInt(cssVars.get('--planning-quick-height'),10)>46,'Long task auto-grows');
area.value='Строка 1\nСтрока 2\nСтрока 3\nСтрока 4';
emit('input',{target:area});
assert.ok(parseInt(cssVars.get('--planning-quick-height'),10)>=110,'Manual line breaks grow the editor');
area.value='x'.repeat(1000);
emit('input',{target:area});
assert.equal(cssVars.get('--planning-quick-height'),'220px','Height is capped at 220px');
area.value='';
emit('input',{target:area});
assert.equal(cssVars.get('--planning-quick-height'),'46px','After clearing, editor shrinks to one line');
tablet=false;
emit('media',{});
assert.equal(area.rows,2,'Non-tablet presentation restores its previous rows');
assert.equal(area.placeholder,'Введите задачу и нажмите Enter. Несколько задач — каждая с новой строки');
assert.equal(cssVars.has('--planning-quick-height'),false,'Non-tablet height override is removed');
tablet=true;
emit('media',{});
assert.equal(area.rows,1,'Returning to tablet restores compact capture');
assert.equal(area.placeholder,'Новая задача…');
console.log('Tablet planning composer auto-grow, shrink, capped height, placeholder and responsive restore passed');
