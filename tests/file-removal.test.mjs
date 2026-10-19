import test from 'node:test';
import assert from 'node:assert/strict';
import {withoutFile} from '../lib/file-removal.mjs';

test('deleting a saved file removes its library record and every assignment link',()=>{
 const original={files:[{id:'gone',name:'sheet.pdf'},{id:'keep',name:'notes.pdf'}],tasks:[{id:'one',files:['gone','keep']},{id:'two',files:['gone']}],logs:[{id:'study'}]};
 const next=withoutFile(original,'gone');
 assert.deepEqual(next.files,[original.files[1]]);
 assert.deepEqual(next.tasks.map(task=>task.files),[['keep'],[]]);
 assert.deepEqual(next.logs,original.logs);
 assert.deepEqual(original.tasks[0].files,['gone','keep']);
});
