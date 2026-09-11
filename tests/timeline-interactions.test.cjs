const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'assets', 'app-runtime.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'app.css'), 'utf8');
const deployPrep = fs.readFileSync(path.join(root, '.github', 'scripts', 'apply_recurrence_scope.py'), 'utf8');

assert.match(runtime, /Calendar timeline handlers v4 start/);
assert.match(runtime, /data-tl-resize="end"/);
assert.match(runtime, /window\.addEventListener\('pointermove',moveTimelineGesture/);
assert.match(runtime, /timelinePointerDate\(e\.clientX,e\.clientY/);
assert.match(runtime, /timelineMovePatch\(g\.task,g\.date,g\.targetDate,g\.newStart,g\.duration,g\.allDay\)/);
assert.match(runtime, /timelineResizePatch\(g\.start,g\.newDuration\)/);
assert.match(runtime, /data-tl-action="status"/);
assert.match(runtime, /moveTask\(st\.dataset\.id,st\.value\)/);
assert.match(runtime, /data-tl-action="download"/);
assert.match(runtime, /calendarDownloadButton\(t,'task-calendar-export'\)/);
assert.match(runtime, /BEGIN:VCALENDAR/);
assert.match(runtime, /text\/calendar;charset=utf-8/);
assert.match(runtime, /\.ics'/);
assert.match(runtime, /toLocaleLowerCase\('ru-RU'\)===\'без проекта\'/);
assert.match(css, /Interactive calendar timeline v1 start/);
assert.match(css, /\.timeline-resize-handle/);
assert.match(css, /\.timeline-status-select/);
assert.match(deployPrep, /Calendar timeline handlers v4 start/);

const moveLine = runtime.split(/\r?\n/).find((line) => line.startsWith('function timelineMovePatch'));
const resizeLine = runtime.split(/\r?\n/).find((line) => line.startsWith('function timelineResizePatch'));
assert.ok(moveLine && resizeLine, 'pure timeline schedule helpers must exist');

const helpers = `
const D=v=>new Date(v+'T00:00:00');
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const add=(v,n)=>{const d=D(v);d.setDate(d.getDate()+n);return ymd(d)};
const diff=(a,b)=>Math.round((D(b)-D(a))/864e5);
const mt=n=>pad(Math.floor(n/60))+':'+pad(n%60);
`;
const context = {};
vm.runInNewContext(`${helpers}${moveLine}${resizeLine}
resultMove=timelineMovePatch({start_date:'2026-09-11',due_date:'2026-09-13'},'2026-09-12','2026-09-14',540,90,false);
resultAllDay=timelineMovePatch({start_date:'2026-09-11',due_date:'2026-09-13'},'2026-09-12','2026-09-14',0,0,true);
resultResize=timelineResizePatch(540,120);`, context);

assert.deepEqual(JSON.parse(JSON.stringify(context.resultMove)), {
  start_date: '2026-09-13', due_date: '2026-09-15',
  start_time: '09:00', end_time: '10:30', duration_minutes: 90, is_all_day: false,
});
assert.deepEqual(JSON.parse(JSON.stringify(context.resultAllDay)), {
  start_date: '2026-09-13', due_date: '2026-09-15',
});
assert.deepEqual(JSON.parse(JSON.stringify(context.resultResize)), {
  end_time: '11:00', duration_minutes: 120, is_all_day: false,
});

console.log('timeline interaction checks passed');
