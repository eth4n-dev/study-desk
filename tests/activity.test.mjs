import test from 'node:test';
import assert from 'node:assert/strict';
import {changeTaskStatus,activityEntries,activityTimestamp,saveTaskEvent,savePracticeEvent,activitySummary} from '../lib/activity.mjs';

const base={tasks:[{id:'one',title:'Sheet 4',subject:'theory',status:'Not started'}],logs:[]};
test('starting and finishing an assignment records factual timestamps once',()=>{
 const started=changeTaskStatus(base,'one','In progress','2026-10-15T08:30:00Z','start');
 assert.equal(started.tasks[0].status,'In progress');
 assert.deepEqual(started.taskEvents.map(e=>[e.type,e.at,e.date]),[['started','2026-10-15T08:30:00Z','2026-10-15']]);
 assert.strictEqual(changeTaskStatus(started,'one','In progress','2026-10-15T09:00:00Z'),started);
 const finished=changeTaskStatus(started,'one','Done','2026-10-16T12:00:00Z','finish');
 assert.deepEqual(activityEntries(finished).map(e=>e.type),['finished','started']);
 assert.equal(finished.taskEvents[1].date,'2026-10-16');
});
test('existing completed tasks do not gain invented history',()=>{
 const old={...base,tasks:[{...base.tasks[0],status:'Done'}]};
 assert.deepEqual(activityEntries(old),[]);
 assert.strictEqual(changeTaskStatus(old,'one','Done'),old);
});
test('correcting progress keeps one consistent start and finish',()=>{
 const started=changeTaskStatus(base,'one','In progress','2026-10-15T08:00:00Z','start');
 const finished=changeTaskStatus(started,'one','Done','2026-10-15T10:00:00Z','finish');
 const reopened=changeTaskStatus(finished,'one','In progress','2026-10-15T11:00:00Z','reopen');
 assert.deepEqual(reopened.taskEvents.map(event=>event.id),['start']);
 const refinished=changeTaskStatus(reopened,'one','Done','2026-10-15T12:00:00Z','finish-2');
 assert.deepEqual(refinished.taskEvents.map(event=>event.id),['start','finish-2']);
 const reset=changeTaskStatus(refinished,'one','Not started');
 assert.deepEqual(reset.taskEvents,[]);
});
test('past Russian practice and a queued revision can be logged and corrected',()=>{
 const pending={...base,revisions:[{id:'revision-1',subject:'theory',lecture:'lecture-1',label:'TI lecture',date:'2026-10-14'}]};
 const russian=savePracticeEvent(pending,{type:'russian',at:'2026-10-14T19:00:00Z',eventId:'russian-1'});
 const revised=savePracticeEvent(russian,{type:'revised',revisionId:'revision-1',at:'2026-10-14T20:00:00Z',eventId:'revised-1'});
 assert.equal(revised.revisions.length,0);
 assert.deepEqual(activitySummary(activityEntries(revised),'2026-10'),{activeDays:1,started:0,finished:0,russian:1,revisited:1,activities:{}});
 const corrected=savePracticeEvent(revised,{id:'russian-1',type:'russian',at:'2026-10-13T19:00:00Z'});
 assert.equal(corrected.logs.find(log=>log.id==='russian-1').date,'2026-10-13');
});
test('a missed start can be logged in Zurich time and later corrected',()=>{
 const at=activityTimestamp('2026-10-14','21:00',new Date('2026-10-15T08:00:00Z'));
 assert.equal(at,'2026-10-14T19:00:00.000Z');
 const started=saveTaskEvent(base,{taskId:'one',type:'started',at,eventId:'event-1'});
 assert.equal(started.tasks[0].status,'In progress');
 assert.equal(started.taskEvents[0].date,'2026-10-14');
 assert.throws(()=>saveTaskEvent(started,{taskId:'one',type:'started',at}),/already logged/);
 const corrected=saveTaskEvent(started,{id:'event-1',taskId:'one',type:'started',at:'2026-10-14T20:00:00Z'});
 assert.equal(corrected.taskEvents.length,1);
 assert.equal(corrected.taskEvents[0].at,'2026-10-14T20:00:00Z');
 assert.deepEqual(activitySummary(activityEntries(corrected),'2026-10'),{activeDays:1,started:1,finished:0,russian:0,revisited:0,activities:{}});
});
test('backfilled events keep existing completion and cannot reverse time',()=>{
 const completed={...base,tasks:[{...base.tasks[0],status:'Done'}]};
 const finished=saveTaskEvent(completed,{taskId:'one',type:'finished',at:'2026-10-15T12:00:00Z',eventId:'finish'});
 const started=saveTaskEvent(finished,{taskId:'one',type:'started',at:'2026-10-14T19:00:00Z',eventId:'start'});
 assert.equal(started.tasks[0].status,'Done');
 assert.throws(()=>saveTaskEvent(finished,{taskId:'one',type:'started',at:'2026-10-16T12:00:00Z'}),/before the recorded finish/);
 assert.throws(()=>activityTimestamp('2026-10-16','09:00',new Date('2026-10-15T08:00:00Z')),/future/);
 assert.throws(()=>activityTimestamp('2026-02-30','09:00',new Date('2026-10-15T08:00:00Z')),/does not exist/);
});
