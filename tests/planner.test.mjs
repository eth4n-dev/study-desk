import test from 'node:test';
import assert from 'node:assert/strict';
import {canPlacePlan,clampPlanStart,firstPlanOpening,planDates,planOverlaps,resizePlanBlock} from '../lib/planner.mjs';
import {attendanceKey,isUnattended,weekSlots} from '../lib/model.mjs';
import {parseBackup} from '../lib/backup.mjs';

test('planner dates span the requested Monday through Sunday',()=>{
 assert.deepEqual(planDates('2026-10-14'),['2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-17','2026-10-18']);
});
test('sessions snap to quarter hours and stay inside the day',()=>{
 assert.equal(clampPlanStart(8*60+7,60),8*60);
 assert.equal(clampPlanStart(24*60,60),23*60);
 assert.equal(clampPlanStart(0,60),7*60);
});
test('either edge can resize a short block while preserving the opposite edge',()=>{
 const block={id:'b',date:'2026-10-16',start:18*60+45,duration:45};
 assert.deepEqual([resizePlanBlock(block,'start',15).start,resizePlanBlock(block,'start',15).duration],[19*60,30]);
 assert.deepEqual([resizePlanBlock(block,'end',-15).start,resizePlanBlock(block,'end',-15).duration],[18*60+45,30]);
 assert.equal(resizePlanBlock(block,'start',90).duration,30);
 assert.equal(resizePlanBlock(block,'end',-90).duration,30);
});
test('classes and other sessions are protected from overlap',()=>{
 const week='2026-10-12',date='2026-10-12';
 assert.equal(canPlacePlan({date,start:8*60+30,duration:60},[],week),false);
 const blocks=[{id:'a',date,start:12*60,duration:60}];
 assert.equal(canPlacePlan({date,start:12*60+45,duration:60},blocks,week),false);
 assert.equal(canPlacePlan({date,start:13*60,duration:60},blocks,week),true);
 assert.equal(canPlacePlan({...blocks[0],duration:75},blocks,week,'a'),true);
 assert.equal(planOverlaps(blocks[0],{date,start:13*60,duration:60}),false);
});
test('a tap can find the next free opening',()=>{
 const week='2026-10-12',date='2026-10-12';
 assert.equal(firstPlanOpening(date,[],week,60,8*60),12*60);
});
test('a skipped weekly class is greyed consistently and frees planner time',()=>{
 const mondayClass=weekSlots('2026-10-12').find(s=>s.subject==='numerical'&&s.type==='Lecture');
 const nextMondayClass=weekSlots('2026-10-19').find(s=>s.subject==='numerical'&&s.type==='Lecture');
 const skipped=[attendanceKey(mondayClass)];
 assert.equal(attendanceKey(nextMondayClass),skipped[0]);
 assert.equal(isUnattended(nextMondayClass,skipped),true);
 assert.equal(canPlacePlan({date:'2026-10-19',start:8*60+15,duration:60},[],'2026-10-19'),false);
 assert.equal(canPlacePlan({date:'2026-10-19',start:8*60+15,duration:60},[],'2026-10-19',null,skipped),true);
});
test('skipping one class date frees only that occurrence',()=>{
 const first=weekSlots('2026-10-12').find(slot=>slot.subject==='numerical'&&slot.type==='Lecture');
 const next=weekSlots('2026-10-19').find(slot=>slot.subject==='numerical'&&slot.type==='Lecture');
 assert.equal(isUnattended(first,[first.id]),true);
 assert.equal(isUnattended(next,[first.id]),false);
 assert.equal(canPlacePlan({date:first.date,start:8*60+15,duration:60},[],'2026-10-12',null,[first.id]),true);
 assert.equal(canPlacePlan({date:next.date,start:8*60+15,duration:60},[],'2026-10-19',null,[first.id]),false);
});
test('backups preserve a one-date absence and a title-only personal task',async()=>{
 const task={id:'mine',subject:'personal',kind:'personal',title:'Read chapter notes',due:null,release:null,status:'Not started',files:[]};
 const state={tasks:[task],files:[],logs:[],revisions:[],rules:[],unattendedSlots:['2026-10-15-numerical-615'],studyBlocks:[]};
 const backup={app:'eth-study',version:1,state,files:[]};
 const restored=await parseBackup({text:async()=>JSON.stringify(backup)});
 assert.deepEqual(restored.state.tasks[0],task);
 assert.deepEqual(restored.state.unattendedSlots,state.unattendedSlots);
});
test('skipping alternating HODL covers both its short and long sessions',()=>{
 const short=weekSlots('2026-10-12').find(s=>s.subject==='hodl');
 const long=weekSlots('2026-10-19').find(s=>s.subject==='hodl');
 assert.notEqual(short.start,long.start);
 assert.equal(attendanceKey(short),attendanceKey(long));
});
test('TI exercise alternates with HODL and preserves attendance choices',()=>{
 const exercise=week=>weekSlots(week).filter(s=>s.subject==='theory'&&s.type==='Exercise');
 const short=exercise('2026-10-12'),long=exercise('2026-10-19'),nextShort=exercise('2026-10-26');
 assert.equal(short.length,1);assert.equal(long.length,1);assert.equal(nextShort.length,1);
 assert.deepEqual([short[0].day,short[0].start,short[0].end,short[0].room],[1,855,960,'CAB G57']);
 assert.deepEqual([long[0].day,long[0].start,long[0].end,long[0].room],[3,975,1080,'CHN D42']);
 assert.deepEqual([nextShort[0].day,nextShort[0].start,nextShort[0].end,nextShort[0].room],[1,855,960,'CAB G57']);
 assert.equal(attendanceKey(short[0]),'theory:3:975');
 assert.equal(isUnattended(long[0],[attendanceKey(short[0])]),true);
 assert.equal(canPlacePlan({date:'2026-10-13',start:855,duration:60},[],'2026-10-12'),false);
 assert.equal(canPlacePlan({date:'2026-10-15',start:975,duration:60},[],'2026-10-12'),true);
 assert.equal(canPlacePlan({date:'2026-10-22',start:975,duration:60},[],'2026-10-19'),false);
});
