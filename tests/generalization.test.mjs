import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyWorkspace,migrateState,scheduleSlots,weekSlots,seedState,attendanceKey} from '../lib/model.mjs';
import {canPlacePlan} from '../lib/planner.mjs';
import {parseTimetableICS,timetablePreview,mergeTimetable} from '../lib/calendar-import.mjs';
import {inferPdfAssignment} from '../lib/pdf-task.mjs';
import {savePracticeEvent,activityEntries,activitySummary} from '../lib/activity.mjs';

test('new workspaces have no personal courses; migrating an existing workspace preserves its classes',()=>{
 const fresh=emptyWorkspace();assert.deepEqual(fresh.subjects,[]);assert.deepEqual(scheduleSlots(fresh,'2026-10-12'),[]);
 const existing=migrateState(seedState());
 assert.equal(existing.subjects.find(item=>item.id==='spca').name,'Systems Programming & Computer Architecture');
 assert.deepEqual(scheduleSlots(existing,'2026-10-12').map(item=>[item.id,item.start,item.end]),weekSlots('2026-10-12').map(item=>[item.id,item.start,item.end]));
 assert.equal(scheduleSlots(existing,'2026-10-12').find(item=>item.subject==='hodl').end,825);
 assert.equal(scheduleSlots(existing,'2026-10-19').find(item=>item.subject==='hodl').end,960);
 assert.equal(attendanceKey(scheduleSlots(existing,'2026-10-12').find(item=>item.subject==='hodl')),'series:legacy-hodl');
});

test('timetable import converts UTC and named zones across daylight saving and excludes cancelled dates',()=>{
 const ics=`BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:utc-class\nSUMMARY:Chemistry Lecture\nDTSTART:20261020T090000Z\nDTEND:20261020T100000Z\nEND:VEVENT\nBEGIN:VEVENT\nUID:repeat-class\nSUMMARY:Chemistry Exercise\nDTSTART;TZID=Europe/Zurich:20261020T110000\nDTEND;TZID=Europe/Zurich:20261020T120000\nRRULE:FREQ=WEEKLY;COUNT=3\nEND:VEVENT\nBEGIN:VEVENT\nUID:repeat-class\nRECURRENCE-ID;TZID=Europe/Zurich:20261027T110000\nSTATUS:CANCELLED\nDTSTART;TZID=Europe/Zurich:20261027T110000\nDTEND;TZID=Europe/Zurich:20261027T120000\nEND:VEVENT\nEND:VCALENDAR`;
 const events=parseTimetableICS(ics,{timeZone:'America/New_York'});
 assert.deepEqual(events.filter(item=>item.uid==='utc-class').map(item=>[item.date,item.start]),[['2026-10-20',300]]);
 assert.deepEqual(events.filter(item=>item.uid==='repeat-class').map(item=>item.date),['2026-10-20','2026-11-03']);
 assert.deepEqual(events.filter(item=>item.uid==='repeat-class').map(item=>item.start),[300,300]);
});

test('manual and one-off classes protect planner time, including weekends',()=>{
 const state={...emptyWorkspace(),subjects:[{id:'chem',name:'Chemistry',short:'Chemistry',color:'#77bbff'}],scheduleRules:[{id:'lab',subject:'chem',weekday:5,start:600,end:720,type:'Practical',room:'Lab',everyWeeks:2,anchorWeek:'2026-10-12',startDate:'2026-10-12',endDate:'2026-12-31'}],scheduleEvents:[{id:'extra',subject:'chem',date:'2026-10-18',start:800,end:850,type:'Lecture',room:'Room'}]};
 assert.deepEqual(scheduleSlots(state,'2026-10-12').map(item=>item.date),['2026-10-17','2026-10-18']);
 assert.equal(scheduleSlots(state,'2026-10-19').length,0);
 assert.equal(canPlacePlan({date:'2026-10-17',start:630,duration:60},[],'2026-10-12',null,[],state),false);
 assert.equal(canPlacePlan({date:'2026-10-17',start:720,duration:60},[],'2026-10-12',null,[],state),true);
});

test('timetable import offers one overlapping exercise group or no room and reimports without duplicates',()=>{
 const ics=`BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:lecture\nSUMMARY:Chemistry Lecture\nDTSTART;TZID=Europe/Zurich:20261019T090000\nDTEND;TZID=Europe/Zurich:20261019T100000\nLOCATION:Main hall\nEND:VEVENT\nBEGIN:VEVENT\nUID:group-a\nSUMMARY:Chemistry Exercise\nDTSTART;TZID=Europe/Zurich:20261020T110000\nDTEND;TZID=Europe/Zurich:20261020T120000\nLOCATION:Room A\nEND:VEVENT\nBEGIN:VEVENT\nUID:group-b\nSUMMARY:Chemistry Exercise\nDTSTART;TZID=Europe/Zurich:20261020T110000\nDTEND;TZID=Europe/Zurich:20261020T120000\nLOCATION:Room B\nEND:VEVENT\nEND:VCALENDAR`;
 const parsed=parseTimetableICS(ics),preview=timetablePreview(parsed);
 assert.equal(preview.choices.length,1);
 const unresolved=mergeTimetable(emptyWorkspace(),preview,{groupChoices:{[preview.choices[0].id]:'none'}});
 assert.equal(unresolved.subjects.length,1);assert.equal(unresolved.scheduleEvents.length,1);
 assert.equal(unresolved.calendarSources[0].pendingGroups.length,1);
 const choice=preview.choices[0].options.find(item=>item.label.includes('Room B'));
 const selected=mergeTimetable(unresolved,preview,{subjectsByCourse:{[preview.courses[0].key]:unresolved.subjects[0].id},groupChoices:{[preview.choices[0].id]:choice.id}});
 assert.equal(selected.scheduleEvents.length,2);
 assert.equal(selected.scheduleEvents.find(item=>item.type==='Exercise').room,'Room B');
 const again=mergeTimetable(selected,preview,{subjectsByCourse:{[preview.courses[0].key]:selected.subjects[0].id},groupChoices:{[preview.choices[0].id]:choice.id}});
 assert.equal(again.scheduleEvents.length,2);
});

test('PDF proposal detects the sample assignment, and asks for missing metadata',()=>{
 const subjects=[{id:'spca',name:'Systems Programming & Computer Architecture',short:'SPCA',color:'#77bbff'}];
 const text='Fall semester 2026\nSYSTEMS PROGRAMMING AND COMPUTER ARCHITECTURE\nAssignment 3: malloc\nAssigned on: 14th Oct 2026\nDue by: 27th Oct 2026, 23:59';
 const found=inferPdfAssignment('assignment3.pdf',text,subjects,[]);
 assert.equal(found.title,'Assignment 3: malloc');assert.equal(found.subjectId,'spca');assert.equal(found.due,'2026-10-27T22:59:00.000Z');assert.equal(found.role,'assignment');
 const missing=inferPdfAssignment('assignment4.pdf','Assignment 4: pointers',subjects,[]);
 assert.equal(missing.title,'Assignment 4: pointers');assert.equal(missing.subjectId,null);assert.equal(missing.due,null);
});

test('user-defined activities are logged without changing assignment status',()=>{
 const state={...emptyWorkspace(),activityTypes:[{id:'piano',label:'Practised piano',subject:null,color:'#accbbe'}]};
 const next=savePracticeEvent(state,{type:'activity',activityId:'piano',at:'2026-10-15T14:00:00Z',eventId:'log-1'});
 assert.equal(next.logs[0].label,'Practised piano');assert.equal(next.logs[0].subject,null);
 assert.equal(activitySummary(activityEntries(next),'2026-10').activities.piano,1);
});
