import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {seedState,mergeCalendar,weekSlots,generateRecurring,pendingUploads,parseICS,zurichISO,nextNumber,migrateState,supportsUploads,courseInfo,monthDays,shiftMonth,todayKey,wallTime,plainDashes,repeatRuleForTask,repeatRelease,createRepeatRule,saveAssignment,assignmentKindLabel,codeExpertUrlForTask} from '../lib/model.mjs';
const events=JSON.parse(fs.readFileSync('tests/fixtures/moodle-events.json','utf8'));
test('Moodle import pairs opens and closes, corrects screenshot dates, preserves progress, and is idempotent',()=>{const s=mergeCalendar(seedState(),events);const q=s.tasks.find(t=>t.id==='numerical-quiz-4');assert.equal(q.release,'2026-10-08T12:00:00+02:00');assert.equal(q.due,'2026-10-19T08:00:00+02:00');assert.equal(s.tasks.find(t=>t.id==='theory-quiz-4').status,'Done');assert.equal(s.tasks.find(t=>t.id==='theory-sheet-3').due,'2026-10-09T11:00:00+02:00');assert.equal(mergeCalendar(s,events).tasks.length,s.tasks.length);assert.equal(s.calendarEvents,11);});
test('HODL alternates on both sides of the anchor week; Russian and SPCA use the confirmed rooms',()=>{for(const [week,start,end] of [['2026-10-12',810,825],['2026-10-19',735,960],['2026-10-05',735,960],['2026-10-26',810,825]]){const s=weekSlots(week);const h=s.find(s=>s.subject==='hodl');assert.deepEqual([h.day,h.start,h.end],[1,start,end]);assert.deepEqual(s.filter(s=>s.subject==='russian').map(s=>[s.day,s.start,s.end,s.room]),[[2,735,840,'HG E19']]);assert.deepEqual(s.filter(s=>s.subject==='spca'&&s.type==='Exercise').map(s=>[s.day,s.start,s.end,s.room]),[[2,855,960,'CHN F42']]);}});
test('Series and online tasks show the right calendar type and CodeExpert course',()=>{const s=seedState(),task=id=>s.tasks.find(t=>t.id===id);assert.equal(assignmentKindLabel(task('analysis-serie-2')),'Sheet');assert.equal(assignmentKindLabel(task('numerical-codeexpert-4')),'CodeExpert');assert.equal(assignmentKindLabel(task('theory-quiz-4')),'Moodle quiz');assert.equal(codeExpertUrlForTask(task('numerical-codeexpert-4')),'https://expert.ethz.ch/enrolled/AS26/NumINFK/exercises');assert.equal(codeExpertUrlForTask(task('spca-assignment-2')),'https://expert.ethz.ch/enrolled/AS26/spca/exercises');assert.equal(codeExpertUrlForTask(task('theory-quiz-4')),null);});
test('Manual attachments work for all tasks; only configured repeating file assignments ask for uploads',()=>{const s=mergeCalendar(seedState(),events);const now=new Date('2026-10-13T10:00:00Z');assert.equal(pendingUploads(s,now).length,0);assert.equal(supportsUploads(s.tasks.find(t=>t.id==='numerical-quiz-4')),true);assert.equal(supportsUploads(s.tasks.find(t=>t.id==='numerical-codeexpert-4')),true);const q=s.tasks.find(t=>t.id==='theory-sheet-4');q.release='2026-10-10T10:00Z';assert.equal(pendingUploads(s,now).length,0);Object.assign(s.rules.find(r=>r.id==='theory-sheets'),{availableDaysBefore:6,availableTime:'12:00'});assert.deepEqual(pendingUploads(s,now).map(t=>t.id),['theory-sheet-4']);q.files=['f'];assert.equal(pendingUploads(s,now).length,0);q.files=[];q.noFile=true;assert.equal(pendingUploads(s,now).length,0);});
test('Repeat rules number tasks once and preserve Zurich time across DST',()=>{let s=seedState();s.rules=[{id:'a',subject:'analysis',prefix:'Serie',startNumber:5,every:1,firstDate:'2026-10-16',endDate:'2026-11-06',releaseTime:'12:00',dueDays:7,dueTime:'11:00'}];s=generateRecurring(s,new Date('2026-10-13T10:00Z'));let ts=s.tasks.filter(t=>t.source==='Repeat rule');assert.deepEqual(ts.map(t=>t.title),['Serie 5','Serie 6','Serie 7','Serie 8']);assert.equal(ts[0].release,'2026-10-16T10:00:00.000Z');assert.equal(ts[2].release,'2026-10-30T11:00:00.000Z');assert.equal(ts[1].due,'2026-10-30T10:00:00.000Z');assert.equal(generateRecurring(s,new Date('2026-10-13T10:00Z')).tasks.length,s.tasks.length);assert.equal(nextNumber(s.tasks,'analysis','Serie'),9);});
test('ICS parser unfolds text and parses UTC and Zurich timestamps',()=>{const text='BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:a\r\nSUMMARY:Quiz 06: Inter\r\n polation opens\r\nDTSTART:20261029T111500Z\r\nCATEGORIES:401-0663-00L 2026W\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:b\r\nSUMMARY:Serie 5 ist fällig.\r\nDTSTART;TZID=Europe/Zurich:20261030T120000\r\nCATEGORIES:401-0213-16L 2026W\r\nEND:VEVENT\r\nEND:VCALENDAR';const e=parseICS(text);assert.equal(e[0].title,'Quiz 06: Interpolation opens');assert.equal(e[1].at,'2026-10-30T11:00:00.000Z');assert.equal(zurichISO('2026-10-26T08:00'),'2026-10-26T07:00:00.000Z');assert.throws(()=>parseICS('bad'));});

test('Migration preserves files, logs, custom tasks and edits; adds completed history once',()=>{const legacy=seedState();delete legacy.schemaVersion;legacy.rules=[];legacy.subjectInfo={analysis:{professors:'My professor'}};legacy.tasks=legacy.tasks.filter(t=>!['numerical-codeexpert-2','hodl-notebook-1','spca-assignment-1'].includes(t.id));const current=legacy.tasks.find(t=>t.id==='numerical-codeexpert-4');current.status='In progress';current.files=['actual-file'];legacy.tasks.push({id:'custom',title:'My task',subject:'russian',files:[],status:'Not started',due:null});const s=migrateState(legacy);assert.equal(s.tasks.find(t=>t.id==='numerical-codeexpert-4').status,'In progress');assert.deepEqual(s.tasks.find(t=>t.id==='numerical-codeexpert-4').files,['actual-file']);assert.equal(s.logs,legacy.logs);assert.equal(s.tasks.find(t=>t.id==='numerical-codeexpert-2').status,'Done');assert.equal(s.tasks.find(t=>t.id==='hodl-notebook-1').status,'Done');assert.equal(s.tasks.find(t=>t.id==='custom').title,'My task');assert.equal(s.rules.length,5);assert.equal(migrateState(s),s);s.tasks.find(t=>t.id==='spca-assignment-2').due='2026-10-14T20:00Z';assert.equal(migrateState(s).tasks.find(t=>t.id==='spca-assignment-2').due,'2026-10-14T20:00Z');assert.equal(courseInfo(s,'analysis').professors,'My professor');});
test('Confirmed CodeExpert deadlines generate correct names, times, no fabricated releases and no later auto-completion',()=>{const s=generateRecurring(seedState(),new Date('2026-10-13T10:00Z'));assert.equal(s.tasks.find(t=>t.id==='numerical-codeexpert-4').title,'serie04');assert.equal(s.tasks.find(t=>t.id==='numerical-codeexpert-4').due,'2026-10-19T06:00:00.000Z');assert.equal(s.tasks.find(t=>t.id==='numerical-codeexpert-5').due,'2026-10-26T07:00:00.000Z');for(const p of ['notebook','challenge']){assert.equal(s.tasks.find(t=>t.id===`hodl-${p}-2`).due,'2026-10-12T21:59:00.000Z');assert.equal(s.tasks.find(t=>t.id===`hodl-${p}-3`).due,'2026-10-26T22:59:00.000Z');assert.equal(s.tasks.find(t=>t.id===`hodl-${p}-3`).release,null);assert.equal(s.tasks.find(t=>t.id===`hodl-${p}-3`).status,'Not started');}assert.equal(s.tasks.find(t=>t.id==='spca-assignment-2').due,'2026-10-13T21:59:00.000Z');assert.equal(s.tasks.find(t=>t.id==='spca-assignment-2').exercises.length,8);assert.equal(s.rules.some(r=>r.subject==='spca'),false);const later=generateRecurring(s,new Date('2026-11-10T10:00Z'));assert.equal(later.tasks.find(t=>t.id==='hodl-notebook-3').status,'Not started');assert.equal(new Set(later.tasks.map(t=>t.id)).size,later.tasks.length);});
test('Moodle imports retain the online quiz behavior and exact supplied course links',()=>{const s=mergeCalendar(seedState(),events);assert.equal(pendingUploads(s,new Date('2026-10-20T10:00Z')).some(t=>/quiz/i.test(t.title)),false);assert.equal(courseInfo(s,'theory').moodle,'https://moodle-app2.let.ethz.ch/course/view.php?id=29077');assert.equal(courseInfo(s,'spca').moodle,'https://moodle-app2.let.ethz.ch/course/view.php?id=29124');});

test('TI weekly schedules migrate saved data once and reuse existing Moodle records across DST',()=>{
 const legacy=mergeCalendar(seedState(),events);legacy.schemaVersion=2;legacy.rules=legacy.rules.filter(r=>r.subject!=='theory');
 const sheet=legacy.tasks.find(t=>t.id==='theory-sheet-4');sheet.files=['my-sheet'];sheet.status='In progress';
 const quiz=legacy.tasks.find(t=>t.id==='theory-quiz-4');const release=quiz.release;
 const migrated=migrateState(legacy);assert.equal(migrated.schemaVersion,5);assert.equal(migrated.tasks.find(t=>t.id===sheet.id).status,'In progress');assert.deepEqual(migrated.tasks.find(t=>t.id===sheet.id).files,['my-sheet']);assert.equal(migrated.tasks.find(t=>t.id===quiz.id).release,release);assert.equal(migrated.tasks.find(t=>t.id===quiz.id).status,'Done');
 const state=generateRecurring(migrated,new Date('2026-10-13T10:00Z'));
 for(const [id,date] of [['theory-quiz-5','2026-10-20T08:00'],['theory-quiz-6','2026-10-27T08:00'],['theory-sheet-5','2026-10-23T11:00'],['theory-sheet-6','2026-10-30T11:00']]){const t=state.tasks.find(t=>t.id===id);assert.equal(t.due,zurichISO(date));assert.equal(t.release,null);assert.equal(t.status,'Not started');}
 assert.equal(state.tasks.find(t=>t.id==='theory-quiz-5').title,'Moodle Quiz Woche 5');assert.equal(supportsUploads(state.tasks.find(t=>t.id==='theory-quiz-5')),true);assert.equal(supportsUploads(state.tasks.find(t=>t.id==='theory-sheet-5')),true);
 assert.equal(new Set(state.tasks.map(t=>t.id)).size,state.tasks.length);assert.equal(mergeCalendar(state,events).tasks.length,state.tasks.length);assert.equal(migrateState(state),state);
 const custom=state.tasks.find(t=>t.id==='theory-sheet-5');custom.due=zurichISO('2026-10-24T12:00');custom.source='You';state.schemaVersion=2;state.rules.find(r=>r.id==='theory-quizzes').active=false;
 const again=migrateState(state);assert.equal(again.tasks.find(t=>t.id===custom.id).due,custom.due);assert.equal(again.rules.find(r=>r.id==='theory-quizzes').active,false);assert.equal(again.rules.length,5);
});

test('Assignment calendar spans full Monday-first weeks and keeps local due dates across month and DST boundaries',()=>{
 const october=monthDays('2026-10');assert.equal(october[0],'2026-09-28');assert.equal(october.at(-1),'2026-11-01');assert.equal(october.length,35);assert.equal(new Set(october).size,35);
 assert.equal(monthDays('2027-05').length,42);assert.equal(shiftMonth('2026-12',1),'2027-01');assert.equal(shiftMonth('2026-01',-1),'2025-12');
 assert.equal(todayKey(new Date(zurichISO('2026-10-31T23:59'))),'2026-10-31');assert.equal(todayKey(new Date(zurichISO('2026-10-25T00:15'))),'2026-10-25');
});


test('Deadline cleanup upgrades saved records once without losing work or changing later edits',()=>{
 const legacy=seedState();legacy.schemaVersion=3;
 const russian=legacy.tasks.find(t=>t.id==='russian-wortschatz');
 russian.title='Wortschatz 13\u2013End…';russian.due=zurichISO('2026-10-14T23:59');russian.dateOnly=true;russian.status='In progress';russian.files=['kept-file'];
 const analysis=legacy.tasks.find(t=>t.id==='analysis-serie-2');analysis.dateOnly=true;
 const chapter=legacy.tasks.find(t=>t.id==='spca-codeexpert-1');chapter.due=null;chapter.dateOnly=true;
 const s=migrateState(legacy);
 assert.equal(s.schemaVersion,5);
 assert.equal(s.tasks.find(t=>t.id===russian.id).title,'Wortschatz 13-End…');
 assert.equal(wallTime(s.tasks.find(t=>t.id===russian.id).due),'2026-10-14T12:15');
 assert.equal(wallTime(s.tasks.find(t=>t.id===analysis.id).due),'2026-10-02T23:59');
 assert.equal(wallTime(s.tasks.find(t=>t.id===chapter.id).due),'2026-09-30T23:59');
 assert.equal(s.tasks.find(t=>t.id===chapter.id).source,'Confirmed by you');
 assert.equal(s.tasks.find(t=>t.id===russian.id).status,'In progress');
 assert.deepEqual(s.tasks.find(t=>t.id===russian.id).files,['kept-file']);
 assert.ok(s.tasks.every(t=>t.due&&!t.dateOnly));
 assert.equal(s.logs,legacy.logs);assert.equal(s.revisions,legacy.revisions);
 s.tasks.find(t=>t.id===russian.id).due=zurichISO('2026-10-14T10:00');
 assert.equal(migrateState(s),s);
 assert.equal(wallTime(migrateState(s).tasks.find(t=>t.id===russian.id).due),'2026-10-14T10:00');
 assert.equal(plainDashes('A\u2014B and 12:15\u201314:00'),'A-B and 12:15-14:00');
 const imported=mergeCalendar(s,[{uid:'dash-title',title:'Quiz 99: A\u2014B closes',course:'401-0663-00L',at:zurichISO('2026-12-01T08:00')}]);
 assert.equal(imported.tasks.find(t=>t.id==='numerical-quiz-99').title,'Quiz 99: A-B');
});


test('Converting an assignment to repeating keeps the original and numbers future work once',()=>{
 const now=new Date('2026-10-13T10:00Z');let s=mergeCalendar(seedState(),events);
 const anchor={...s.tasks.find(t=>t.id==='analysis-serie-4'),status:'In progress',files:['original']};
 assert.ok(anchor.id);
 const options={every:1,availableFrom:'2026-10-09T12:00',until:'2026-11-13'};
 s=saveAssignment(s,anchor,options,now);
 const rule=repeatRuleForTask(s,anchor);assert.ok(rule);assert.equal(s.rules.length,6);
 assert.equal(s.tasks.filter(t=>t.id===anchor.id).length,1);
 assert.deepEqual(s.tasks.find(t=>t.id===anchor.id).files,['original']);
 assert.equal(s.tasks.find(t=>t.id===anchor.id).status,'In progress');
 const next=s.tasks.find(t=>t.id==='analysis-serie-5');assert.equal(next.title,'Serie 5');assert.equal(next.status,'Not started');assert.deepEqual(next.files,[]);
 assert.equal(wallTime(next.due),'2026-10-23T23:59');assert.equal(wallTime(repeatRelease(rule,next)),'2026-10-16T12:00');
 const afterDST=s.tasks.find(t=>t.id==='analysis-serie-7');assert.equal(wallTime(repeatRelease(rule,afterDST)),'2026-10-30T12:00');
 const again=saveAssignment(s,s.tasks.find(t=>t.id===anchor.id),options,now);assert.equal(again.tasks.length,s.tasks.length);assert.equal(again.rules.length,s.rules.length);
 const cleared=saveAssignment(again,again.tasks.find(t=>t.id===anchor.id),{...options,availableFrom:''},now);
 assert.equal(repeatRelease(repeatRuleForTask(cleared,anchor),next),null);
 assert.equal(cleared.tasks.find(t=>t.id===anchor.id).release,null);
 assert.throws(()=>createRepeatRule(anchor,{...options,availableFrom:'2026-10-17T12:00'}),/before the deadline/);
 assert.throws(()=>createRepeatRule(anchor,{...options,until:'2026-10-01'}),/must include/);
});

test('One-off opening dates never notify, paused repeats stop notifying, and legacy schedules retain their timing',()=>{
 const now=new Date('2026-10-13T10:00Z');let s=seedState();
 const one={id:'one-off',subject:'analysis',title:'Extra work',kind:'file',due:zurichISO('2026-10-14T23:59'),release:zurichISO('2026-10-12T12:00'),status:'Not started',files:[],noFile:false};
 s.tasks.push(one);assert.equal(pendingUploads(s,now).some(t=>t.id===one.id),false);
 s=saveAssignment(s,one,null,now);assert.equal(s.tasks.find(t=>t.id===one.id).release,null);
 s=saveAssignment(s,one,{every:2,availableFrom:'2026-10-12T12:00',until:'2026-11-30'},now);
 assert.equal(pendingUploads(s,new Date('2026-10-12T09:59Z')).some(t=>t.id===one.id),false);
 assert.equal(pendingUploads(s,new Date('2026-10-12T10:00Z')).some(t=>t.id===one.id),true);
 repeatRuleForTask(s,one).active=false;assert.equal(pendingUploads(s,now).some(t=>t.id===one.id),false);
 const old={id:'old',subject:'analysis',prefix:'Exercise',startNumber:1,every:1,firstDate:'2026-10-12',endDate:'2026-10-26',releaseTime:'12:00',dueDays:7,dueTime:'23:59'};
 let legacy=generateRecurring({...seedState(),rules:[old]},now);const t=legacy.tasks.find(t=>t.id==='rule-old-0');
 assert.equal(wallTime(repeatRelease(old,t)),'2026-10-12T12:00');assert.ok(pendingUploads(legacy,now).some(x=>x.id===t.id));
 legacy=saveAssignment(legacy,t,{every:1,availableFrom:'',until:'2026-11-30'},now);assert.equal(repeatRelease(repeatRuleForTask(legacy,t),t),null);
});

test('Changing a repeating interval uses the selected assignment as its anchor; Off stops untouched future repeats',()=>{
 const now=new Date('2026-10-20T10:00Z');let s=mergeCalendar(seedState(),events);
 const anchor=s.tasks.find(t=>t.id==='theory-sheet-4');
 s=saveAssignment(s,anchor,{every:2,availableFrom:'',until:'2026-12-18'},now);
 const rule=repeatRuleForTask(s,anchor);
 assert.equal(rule.every,2);
 assert.equal(rule.firstDate,'2026-10-16');
 assert.equal(wallTime(s.tasks.find(t=>t.id==='theory-sheet-5').due),'2026-10-30T11:00');
 assert.equal(s.tasks.some(t=>t.id==='theory-sheet-6'),true);
 const edited={...s.tasks.find(t=>t.id==='theory-sheet-5'),files:['work.pdf'],status:'In progress'};
 s=saveAssignment(s,edited,null,now);
 const off=saveAssignment(s,anchor,{every:0},now);
 assert.equal(repeatRuleForTask(off,anchor),null);
 assert.equal(off.tasks.find(t=>t.id==='theory-sheet-5').status,'In progress');
 assert.deepEqual(off.tasks.find(t=>t.id==='theory-sheet-5').files,['work.pdf']);
 assert.equal(off.tasks.some(t=>t.id==='theory-sheet-6'),false);
 assert.equal(off.tasks.find(t=>t.id==='theory-sheet-4').status,anchor.status);
});

test('Changing a repeating assignment subject updates its series and untouched future entries',()=>{
 const now=new Date('2026-10-20T10:00Z');let s=mergeCalendar(seedState(),events);
 const anchor=s.tasks.find(t=>t.id==='theory-sheet-4');
 s=saveAssignment(s,anchor,{every:1,availableFrom:'',until:'2026-12-18'},now);
 const edited={...s.tasks.find(t=>t.id===anchor.id),subject:'russian'};
 s=saveAssignment(s,edited,{every:1,availableFrom:'',until:'2026-12-18'},now);
 assert.equal(repeatRuleForTask(s,edited).subject,'russian');
 assert.equal(s.tasks.find(t=>t.id===anchor.id).subject,'russian');
 assert.equal(s.tasks.find(t=>t.id==='theory-sheet-5').subject,'russian');
});

test('Relative availability follows the chosen weekday and time across each repeat',()=>{
 const now=new Date('2026-10-13T10:00Z');let s=mergeCalendar(seedState(),events);
 const anchor=s.tasks.find(t=>t.id==='analysis-serie-4');
 s=saveAssignment(s,anchor,{every:2,availableOffset:9,availableTime:'12:00',until:'2026-11-20'},now);
 const rule=repeatRuleForTask(s,anchor);
 assert.equal(wallTime(repeatRelease(rule,anchor)),'2026-10-07T12:00');
 assert.equal(wallTime(repeatRelease(rule,s.tasks.find(t=>t.id==='analysis-serie-5'))),'2026-10-21T12:00');
 assert.throws(()=>createRepeatRule(anchor,{every:1,availableOffset:8,availableTime:'12:00',until:'2026-11-20'}),/valid day and time/);
});
