import test from 'node:test';
import assert from 'node:assert/strict';
import {directTheoryDestination,uploadProposal} from '../lib/file-upload-routing.mjs';

const subjects=[{id:'analysis',name:'Analysis II',short:'Analysis II'},{id:'theory',name:'Theoretical Computer Science',short:'Theoretical CS'}];
const tasks=[{id:'sheet4',subject:'theory',title:'Sheet 4',due:'2026-10-16T09:00:00.000Z'}];
const context={subjects,tasks,timeZone:'Europe/Zurich',selectedSubject:'all',fileKind:'theory'};
const file=name=>({name,size:1000,type:'application/pdf'});

test('a named subject’s Theory & notes destination saves without PDF inspection',()=>{
 assert.equal(directTheoryDestination('analysis','theory'),true);
 assert.equal(directTheoryDestination('all','theory'),false);
 assert.equal(directTheoryDestination('analysis','assignment'),false);
});

test('mixed batches save clear files and reserve ambiguous ones for review',()=>{
 const note=uploadProposal(file('Analysis II notes.pdf'),'Analysis II\nLecture notes',{...context});
 const unclear=uploadProposal(file('document.pdf'),'Untitled document',{...context});
 const assignment=uploadProposal(file('Sheet 4.pdf'),'Theoretical Computer Science\nSheet 4',{...context});
 assert.equal(note.autoReady,true);
 assert.equal(note.kind,'theory');
 assert.equal(unclear.autoReady,false);
 assert.equal(assignment.autoReady,true);
 assert.equal(assignment.taskId,'sheet4');
});

test('a subject-specific assignment upload uses its selected subject but reviews conflicts',()=>{
 const selected={...context,selectedSubject:'analysis',fileKind:'assignment'};
 const clear=uploadProposal(file('Serie 5.pdf'),'Serie 5\nDue: 20 October 2026, 23:59',selected);
 const wrongSubject=uploadProposal(file('Theoretical CS Sheet 4.pdf'),'Theoretical Computer Science\nSheet 4',selected);
 assert.equal(clear.subject,'analysis');
 assert.equal(clear.autoReady,true);
 assert.equal(wrongSubject.autoReady,false);
 const changedDeadline=uploadProposal(file('Sheet 4.pdf'),'Theoretical Computer Science\nSheet 4\nDue: 16 October 2026, 12:00',{...context,selectedSubject:'theory',fileKind:'assignment'});
 assert.equal(changedDeadline.autoReady,false);
 assert.equal(changedDeadline.dueConflict,true);
});
