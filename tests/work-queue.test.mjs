import test from 'node:test';
import assert from 'node:assert/strict';
import {groupWork} from '../lib/work-queue.mjs';

test('current work leads while old overdue work is kept separately',()=>{
 const now=new Date('2026-10-15T10:00:00Z');
 const tasks=[
  {id:'old',status:'Not started',due:'2026-10-01T10:00:00Z'},
  {id:'doing',status:'In progress',due:'2026-10-02T10:00:00Z'},
  {id:'recent',status:'Not started',due:'2026-10-13T10:00:00Z'},
  {id:'soon',status:'Not started',due:'2026-10-16T10:00:00Z'},
  {id:'done',status:'Done',due:'2026-10-17T10:00:00Z'},
 ];
 const groups=groupWork(tasks,now);
 assert.deepEqual(groups.inProgress.map(task=>task.id),['doing']);
 assert.deepEqual(groups.upcoming.map(task=>task.id),['recent','soon']);
 assert.deepEqual(groups.overdue.map(task=>task.id),['old']);
});
