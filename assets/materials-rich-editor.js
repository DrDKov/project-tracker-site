/* Materials 3.2 Markdown authoring — HTML-free source, sanitized previews. */
(function(){
'use strict';
if(window.ProjectTrackerMaterialsRich)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function inline(text){
 let s=esc(text);
 // Links are explicitly restricted to https/http; raw HTML is always escaped.
 s=s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s<>"']+)\)/gi,(_,label,url)=>'<a href="'+url.replace(/&amp;/g,'&amp;')+'" rel="noopener noreferrer" target="_blank">'+label+'</a>');
 s=s.replace(/`([^`\n]+)`/g,'<code>$1</code>');
 s=s.replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>');
 s=s.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g,'<em>$1</em>');
 return s;
}
function isSeparator(line){return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)}
function cells(line){return line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(x=>x.trim())}
function render(source){
 const lines=String(source||'').replace(/\r\n?/g,'\n').split('\n');
 let out='',i=0;
 while(i<lines.length){
  const line=lines[i],trim=line.trim();
  if(!trim){i++;continue}
  if(trim.startsWith('```')){
   i++;const code=[];while(i<lines.length&&!lines[i].trim().startsWith('```'))code.push(lines[i++]);
   if(i<lines.length)i++;
   out+='<pre><code>'+esc(code.join('\n'))+'</code></pre>';continue;
  }
  if(i+1<lines.length&&line.includes('|')&&isSeparator(lines[i+1])){
   const heads=cells(line);i+=2;let rows=[];
   while(i<lines.length&&lines[i].includes('|')&&lines[i].trim())rows.push(cells(lines[i++]));
   out+='<div class="library-table-scroll"><table><thead><tr>'+heads.map(c=>'<th>'+inline(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+heads.map((_,j)=>'<td>'+inline(row[j]||'')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';continue;
  }
  let m;
  if((m=line.match(/^(#{1,3})\s+(.+)$/))){const level=m[1].length;out+='<h'+level+'>'+inline(m[2])+'</h'+level+'>';i++;continue}
  if((m=line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+)$/))){
   const checked=m[1].toLowerCase()==='x';
   out+='<label class="library-check-item"><input type="checkbox" data-library-check-line="'+i+'" '+(checked?'checked':'')+'><span>'+inline(m[2])+'</span></label>';i++;continue;
  }
  if((m=line.match(/^\s*[-*]\s+(.+)$/))){out+='<div class="library-list-line"><span>•</span>'+inline(m[1])+'</div>';i++;continue}
  if((m=line.match(/^\s*\d+\.\s+(.+)$/))){out+='<div class="library-list-line"><span>'+esc(line.match(/\d+/)?.[0])+'.</span>'+inline(m[1])+'</div>';i++;continue}
  if(/^\s*---+\s*$/.test(line)){out+='<hr>';i++;continue}
  out+='<p>'+inline(line)+'</p>';i++;
 }
 return out||'<p class="library-empty">Нет содержимого</p>';
}
const tools=[
 ['heading','H2','Заголовок'],['bold','B','Полужирный'],['italic','I','Курсив'],
 ['list','• Список','Маркированный список'],['number','1. Список','Нумерованный список'],
 ['check','☑ Чек-лист','Добавить пункт чек-листа'],
 ['table','▦ Таблица','Добавить таблицу 3 × 3'],
 ['link','↗ Ссылка','Добавить ссылку'],
 ['quote','❝ Цитата','Добавить цитату']
];
function toolbar(){return '<div class="library-rich-toolbar" role="toolbar" aria-label="Форматирование">'+tools.map(([key,name,help])=>'<button type="button" data-library-format="'+key+'" title="'+help+'" aria-label="'+help+'">'+name+'</button>').join('')+'</div>'}
function apply(field,action){
 if(!field)return;
 const start=field.selectionStart??field.value.length,end=field.selectionEnd??start;
 const selection=field.value.slice(start,end);
 const fallback=selection||({heading:'Название',bold:'важный текст',italic:'текст',link:'Название ресурса'}[action]||'Текст');
 let replacement='',cursorOffset=null;
 switch(action){
  case 'heading':replacement='## '+fallback;break;
  case 'bold':replacement='**'+fallback+'**';break;
  case 'italic':replacement='*'+fallback+'*';break;
  case 'list':replacement='- '+fallback;break;
  case 'number':replacement='1. '+fallback;break;
  case 'check':replacement='- [ ] '+(selection||'Новый пункт');break;
  case 'table':replacement='| Колонка 1 | Колонка 2 | Колонка 3 |\n| --- | --- | --- |\n| Значение | Значение | Значение |';break;
  case 'link':replacement='['+fallback+'](https://example.com)';break;
  case 'quote':replacement='> '+fallback;break;
  default:return;
 }
 field.focus();
 field.setRangeText(replacement,start,end,'select');
 field.dispatchEvent(new Event('input',{bubbles:true}));
}
function toggle(source,lineNo,checked){
 const lines=String(source||'').replace(/\r\n?/g,'\n').split('\n'),v=lines[lineNo];
 if(typeof v!=='string'||!/^\s*[-*]\s+\[[ xX]\]/.test(v))return source;
 lines[lineNo]=v.replace(/^(\s*[-*]\s+\[)[ xX](\])/,'$1'+(checked?'x':' ')+'$2');
 return lines.join('\n');
}
window.ProjectTrackerMaterialsRich={render,toolbar,apply,toggle,escape:esc};
})();
