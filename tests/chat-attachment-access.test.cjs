const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const chat=require('../assets/chat-attachment-access.js');
const P='1ae021a8-cf4b-49dd-9b19-c099aed9ae90';
const OTHER='22222222-2222-4222-8222-222222222222';
const file=P+'/123456_file.png';
const legacy='https://mqvohqvpygenijdivkzn.supabase.co/storage/v1/object/sign/project-chat-files/'+file+'?token=old-long-lived-token';
assert.equal(chat.pathForProject('storage://project-chat-files/'+file,P),file);
assert.equal(chat.pathForProject(legacy,P),file);
assert.equal(chat.pathForProject(legacy,OTHER),'');
assert.equal(chat.pathForProject('storage://project-chat-files/not-a-uuid/file.png',P),'');
assert.equal(chat.pathForProject('storage://project-chat-files/'+P+'/../evil.png',P),'');
assert.equal(chat.pathForProject('https://evil.example/storage/v1/object/sign/project-chat-files/'+file,P),'');
assert.equal(chat.fileLine({name:'image.png',path:file,isImage:true}),'🖼 image.png: storage://project-chat-files/'+file);
const htmlOld=chat.render('🖼 image.png: '+legacy,P);
assert.match(htmlOld,/data-pt-chat-preview/);
assert.doesNotMatch(htmlOld,/token=old-long-lived-token|https:\/\/mqvohqvpygenijdivkzn/);
const htmlNew=chat.render('📎 image.png: storage://project-chat-files/'+file,P);
assert.match(htmlNew,/data-pt-chat-path/);
assert.doesNotMatch(htmlNew,/href=|<script>/);
assert.match(chat.render('Hello <script>alert(1)</script>',P),/&lt;script&gt;/);
assert.doesNotMatch(chat.render('📎 image.png: '+legacy,OTHER),/data-pt-chat-path/);
const runtime=fs.readFileSync(path.join(__dirname,'../assets/app-runtime.js'),'utf8');
assert.match(runtime,/ProjectTrackerChatFiles\.fileLine/);
assert.match(runtime,/ProjectTrackerChatFiles\.hydrate/);
assert.match(runtime,/box\.__ptChatMarkup!==html/);
assert.doesNotMatch(runtime,/createSignedUrl\(path,60\*60\*24\*30\)/);
const migration=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261011_project_chat_storage_acl.sql'),'utf8');
assert.match(migration,/can_view_project/);
assert.match(migration,/auth_user_id/);
assert.match(migration,/can_edit_project/);
// Legacy signed links can expire, but the new renderer must retain the file path
// and must never reuse the historical bearer token in its DOM output.
const expiredLegacy=legacy.replace('old-long-lived-token','expired-2026-06-13');
assert.match(chat.render('📎 archived.xlsx: '+expiredLegacy,P),new RegExp('data-pt-chat-path="'+file.replace('.','\\.')+'"'));
assert.doesNotMatch(chat.render('📎 archived.xlsx: '+expiredLegacy,P),/expired-2026-06-13/);
// Cache-bust both the classic loader and its dynamic module import. Otherwise
// existing browsers may continue executing the old 30-day signed-URL renderer.
const index=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'../assets/app.js'),'utf8');
assert.match(index,/chat-attachment-access\.js\?v=20261011-chat-legacy-fix-v2/);
assert.match(index,/app\.js\?v=20261013-task-loading-toast-v1/);
assert.match(loader,/app-runtime\.js\?v=20261013-task-loading-toast-v1/);

console.log('Secure chat attachment tests passed');
