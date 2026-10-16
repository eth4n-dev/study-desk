import test from 'node:test';
import assert from 'node:assert/strict';
import {lectureFilesForSlot,validateLecturePdfs} from '../lib/lecture-files.mjs';

test('Lecture files belong to one class occurrence and remain theory material',()=>{
 const slot={id:'2026-10-14-russian-735',subject:'russian'};
 const files=[
  {id:'one',kind:'theory',subject:'russian',lectureId:slot.id},
  {id:'other-class',kind:'theory',subject:'russian',lectureId:'2026-10-21-russian-735'},
  {id:'other-subject',kind:'theory',subject:'analysis',lectureId:slot.id},
  {id:'assignment',kind:'assignment',subject:'russian',lectureId:slot.id}
 ];
 assert.deepEqual(lectureFilesForSlot(files,slot).map(file=>file.id),['one']);
 assert.equal(files.filter(file=>file.kind==='theory'&&file.subject==='russian').length,2);
});

test('Class uploads accept actual PDFs, including browsers without a MIME type',async()=>{
 const pdf=new Blob(['%PDF-1.7\nexample'],{type:'application/pdf'});
 const valid={name:'notes.PDF',slice:pdf.slice.bind(pdf)};
 await assert.doesNotReject(validateLecturePdfs([valid,valid]));
 const disguised=new Blob(['not a pdf']);
 await assert.rejects(validateLecturePdfs([{name:'fake.pdf',slice:disguised.slice.bind(disguised)}]),/not a valid PDF/);
 await assert.rejects(validateLecturePdfs([{name:'notes.txt',slice:pdf.slice.bind(pdf)}]),/Choose PDF files/);
});
