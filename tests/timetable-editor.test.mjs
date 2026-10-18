import test from 'node:test';
import assert from 'node:assert/strict';
import {selectSessionRange,sessionRecord} from '../lib/timetable-editor.mjs';
import {emptyWorkspace,scheduleSlots} from '../lib/model.mjs';
import {canPlacePlan} from '../lib/planner.mjs';
const draft={subject:'math',date:'2026-10-20',start:615,end:720,type:'Exercise',room:' F42 ',repeat:'2',startDate:'2026-10-20',endDate:'2026-11-30'};

test('selecting a timetable range in either direction keeps quarter-hour boundaries inside the day',()=>{
 assert.deepEqual(selectSessionRange(615,718),{start:615,end:720});
 assert.deepEqual(selectSessionRange(718,615),{start:615,end:720});
 assert.deepEqual(selectSessionRange(400,1500),{start:420,end:1320});
});
test('a chosen fortnightly session appears in the intended weeks and reserves planner time',()=>{
 const {value,mode}=sessionRecord(draft,'exercise');
 assert.equal(mode,'repeat');assert.equal(value.room,'F42');
 const state={...emptyWorkspace(),scheduleRules:[value]};
 assert.equal(scheduleSlots(state,'2026-10-19')[0].date,'2026-10-20');
 assert.equal(scheduleSlots(state,'2026-10-26').length,0);
 assert.equal(scheduleSlots(state,'2026-11-02')[0].date,'2026-11-03');
 assert.equal(canPlacePlan({date:'2026-10-20',start:630,duration:60},[],'2026-10-19',null,[],state),false);
});
test('editing a room keeps an existing alternating schedule and attendance group',()=>{
 const original={id:'lab',subject:'math',weekday:1,start:615,end:720,type:'Exercise',room:'Old',everyWeeks:2,anchorWeek:'2026-10-19',startDate:'2026-09-14',endDate:'2027-01-31',attendanceGroupId:'exercise-group'};
 const {value}=sessionRecord({...draft,original,date:'2026-10-27',startDate:original.startDate,endDate:original.endDate},original.id);
 assert.equal(value.anchorWeek,original.anchorWeek);assert.equal(value.attendanceGroupId,'exercise-group');
 const state={...emptyWorkspace(),scheduleRules:[value]};
 assert.equal(scheduleSlots(state,'2026-10-26').length,0);
 assert.equal(scheduleSlots(state,'2026-11-02')[0].seriesId,'exercise-group');
});
test('a single date remains a single date and can be converted back to a recurring session',()=>{
 const once=sessionRecord({...draft,repeat:'once'},'extra');
 assert.equal(once.mode,'once');
 const state={...emptyWorkspace(),scheduleEvents:[once.value]};
 assert.equal(scheduleSlots(state,'2026-10-19').length,1);
 assert.equal(scheduleSlots(state,'2026-10-26').length,0);
 const repeating=sessionRecord({...draft,original:once.value,repeat:'1'},'extra');
 assert.equal(repeating.mode,'repeat');assert.equal(repeating.value.date,undefined);
 assert.equal(scheduleSlots({...emptyWorkspace(),scheduleRules:[repeating.value]},'2026-10-26').length,1);
});
test('invalid times and a range with no matching weekday cannot be saved',()=>{
 assert.throws(()=>sessionRecord({...draft,end:600},'bad'),/end time/);
 assert.throws(()=>sessionRecord({...draft,start:NaN},'bad'),/end time/);
 assert.throws(()=>sessionRecord({...draft,startDate:'2026-10-21',endDate:'2026-10-22'},'bad'),/weekday/);
 assert.throws(()=>sessionRecord({...draft,endDate:'2026-10-01'},'bad'),/last date/);
});
