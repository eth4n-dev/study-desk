import test from 'node:test';
import assert from 'node:assert/strict';
import {readRoute,routeHash} from '../lib/navigation.mjs';

test('workspace destinations survive a URL refresh and invalid subjects fall back safely',()=>{
 const subjects=['theory','russian'];
 assert.deepEqual(readRoute(routeHash('subject','theory'),subjects),{page:'subject',subject:'theory'});
 assert.deepEqual(readRoute(routeHash('files','russian'),subjects),{page:'files',subject:'russian'});
 assert.deepEqual(readRoute(routeHash('tasks','theory'),subjects),{page:'tasks',subject:'theory'});
 assert.deepEqual(readRoute('#subject/unknown',subjects),{page:'home',subject:'all'});
 assert.deepEqual(readRoute('#unknown',subjects),{page:'home',subject:'all'});
 assert.equal(routeHash('home'),'');
});
