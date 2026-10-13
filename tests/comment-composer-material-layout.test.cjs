const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.join(__dirname,'..');
const js=fs.readFileSync(path.join(base,'assets/task-materials.js'),'utf8');
const css=fs.readFileSync(path.join(base,'assets/task-inspector.css'),'utf8');
const appCss=fs.readFileSync(path.join(base,'assets/app.css'),'utf8');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const app=fs.readFileSync(path.join(base,'assets/app.js'),'utf8');
const start=js.indexOf('function ensureUI(){');
const end=js.indexOf('async function onTaskOpen(',start);
assert.ok(start>=0&&end>start,'The actual composer setup function is available');
assert.match(appCss,/#taskModal #taskCommentsBlock \.task-comment-form\{display:grid!important;grid-template-columns:minmax\(0,1fr\) 44px!important/);
assert.match(css,/\.task-comment-form>\.task-comment-input-wrap\{/);
assert.match(css,/\.task-comment-input-wrap>#taskCommentText\{/);
assert.match(css,/padding-left:48px!important/);
assert.match(css,/\.task-comment-input-wrap>\.task-material-comment-button\{[\s\S]*?position:absolute!important/);
assert.match(css,/\.task-comment-form>\.task-comment-send\{[\s\S]*?grid-column:2/);
assert.doesNotMatch(js,/composer\.insertBefore\(button,composer\.querySelector\('#taskCommentText'\)/,'The materials button must not be a third direct grid child');
assert.match(html,/task-inspector\.css\?v=20261013-comment-composer-fix-v1/);
assert.match(app,/task-materials\.js\?v=20261013-comment-composer-fix-v1/);

function makeNode(name){
 return {name,children:[],dataset:{},className:'',
  setAttribute(k,v){this[k]=v},
  appendChild(child){
   if(child.parent){const list=child.parent.children;list.splice(list.indexOf(child),1)}
   child.parent=this;this.children.push(child);
  },
  querySelector(selector){
   if(selector==='[data-task-material-choose="comment"]')return this.children.find(x=>x.dataset.taskMaterialChoose==='comment')||null;
   return null;
  }
 };
}
const composer=makeNode('composer'),textarea=makeNode('textarea'),send=makeNode('send');
composer.appendChild(textarea);composer.appendChild(send);
textarea.before=function(node){const index=composer.children.indexOf(this);composer.children.splice(index,0,node);node.parent=composer};
textarea.closest=function(selector){return this.parent?.className==='task-comment-input-wrap'?this.parent:null};
composer.querySelector=selector=>selector==='#taskCommentText'?textarea:null;
const grid=makeNode('form-grid'),modal=makeNode('task-modal');
const section=makeNode('task-materials-section');
const picker=makeNode('task-material-picker');
const form={querySelector:selector=>selector==='.form-grid'?grid:selector==='#taskCommentsBlock .task-comment-form'?composer:null};
const nodes={taskForm:form,taskModal:modal,taskMaterialsSection:section,taskMaterialPicker:picker,taskMaterialsList:null};
const document={getElementById:id=>nodes[id]||null,createElement:makeNode};
const code=js.slice(start,end);
const context={document,$:id=>nodes[id]||null,renderAttached:()=>{}};
vm.runInNewContext(code+'\nensureUI();ensureUI();',context);
assert.equal(composer.children.length,2,'The comment grid must contain exactly its original two columns');
assert.equal(composer.children[0].className,'task-comment-input-wrap');
assert.strictEqual(composer.children[1],send,'Send button remains the second column');
assert.equal(composer.children[0].children.length,2);
assert.strictEqual(composer.children[0].children[0],textarea,'Original textarea is preserved');
assert.equal(composer.children[0].children[1].dataset.taskMaterialChoose,'comment');
assert.equal(composer.children[0].children.filter(x=>x.dataset.taskMaterialChoose==='comment').length,1,'Repeated UI updates never duplicate buttons');
console.log('Comment composer retains full-width input and original send button after materials injection');
