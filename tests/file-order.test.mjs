import test from 'node:test';
import assert from 'node:assert/strict';
import {moveFileInOrder,sortedFiles} from '../lib/file-order.mjs';

const files=[
 {id:'older',added:'2026-10-14T09:00:00Z'},
 {id:'newer',added:'2026-10-20T09:00:00Z'},
 {id:'middle',added:'2026-10-16T09:00:00Z'}
];

test('file library defaults to newest and can sort oldest first',()=>{
 assert.deepEqual(sortedFiles(files).map(file=>file.id),['newer','middle','older']);
 assert.deepEqual(sortedFiles(files,{mode:'oldest'}).map(file=>file.id),['older','middle','newer']);
});

test('custom order persists by stable file IDs and includes new uploads',()=>{
 const order=moveFileInOrder(['newer','middle','older'],'older','newer');
 assert.deepEqual(order,['older','newer','middle']);
 assert.deepEqual(sortedFiles([...files,{id:'latest',added:'2026-10-21T09:00:00Z'}],{mode:'custom',order}).map(file=>file.id),['older','newer','middle','latest']);
});
