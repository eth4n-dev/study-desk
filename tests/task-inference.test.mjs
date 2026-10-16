import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestTaskDetails,suggestFileTask} from '../lib/task-inference.mjs';

const examples=[
 {id:'a',title:'Serie 3',subject:'analysis',kind:'file'},
 {id:'n',title:'serie04',subject:'numerical',kind:'codeexpert'},
 {id:'t',title:'Sheet 4',subject:'theory',kind:'file'},
 {id:'s',title:'Assignment 02: C Programming',subject:'spca',kind:'codeexpert'},
 {id:'h',title:'Notebook 02',subject:'hodl',kind:'codeexpert'},
 {id:'r',title:'Wortschatz 13',subject:'russian',kind:'file'},
 {id:'q1',title:'Quiz 03',subject:'numerical',kind:'quiz'},
 {id:'q2',title:'Quiz 04',subject:'theory',kind:'quiz'},
];

test('assignment examples distinguish close naming patterns without guessing ambiguous quizzes',()=>{
 assert.equal(suggestTaskDetails('Serie 4',examples)?.subject,'analysis');
 assert.equal(suggestTaskDetails('serie05',examples)?.subject,'numerical');
 assert.equal(suggestTaskDetails('Sheet 5',examples)?.subject,'theory');
 assert.equal(suggestTaskDetails('Assignment 03: C Programming',examples)?.subject,'spca');
 assert.equal(suggestTaskDetails('Notebook 03',examples)?.subject,'hodl');
 assert.equal(suggestTaskDetails('Wortschatz 14',examples)?.subject,'russian');
 assert.equal(suggestTaskDetails('Quiz 05',examples),null);
});

test('filenames or first-page text identify subjects and exact assignments when unique',()=>{
 assert.deepEqual(suggestFileTask('Sheet_4.pdf',examples),{subject:'theory',taskId:'t',reason:'Matches Sheet 4'});
 assert.deepEqual(suggestFileTask('Analysis II - Serie 3.pdf',examples),{subject:'analysis',taskId:'a',reason:'Matches Serie 3'});
 assert.deepEqual(suggestFileTask('document.pdf',examples,'Theoretical Computer Science Exercise Sheet 4'),{subject:'theory',taskId:'t',reason:'Matches Sheet 4'});
 assert.equal(suggestFileTask('Quiz_05.pdf',examples),null);
 assert.equal(suggestFileTask('Analysis II - Serie 3.pdf',examples,'Numerical Methods'),null);
});
