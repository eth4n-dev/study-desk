import test from 'node:test';
import assert from 'node:assert/strict';
import {displayDate,parseDisplayDate,normalizeTime} from '../lib/date-input.mjs';
test('Dates are day-first and invalid calendar dates cannot silently roll over',()=>{
 assert.equal(displayDate('2026-10-14'),'14/10/26');
 assert.equal(parseDisplayDate('14/10/26'),'2026-10-14');
 assert.equal(parseDisplayDate('1/2/2027'),'2027-02-01');
 assert.equal(parseDisplayDate('29/02/28'),'2028-02-29');
 for(const text of ['29/02/26','31/04/26','10/14/26','00/01/26','13-10-26'])assert.equal(parseDisplayDate(text),null);
});
test('24-hour times allow compact typing and reject incomplete or out-of-range values',()=>{
 assert.equal(normalizeTime('8:00'),'08:00');assert.equal(normalizeTime('1215'),'12:15');assert.equal(normalizeTime('23:59'),'23:59');
 for(const text of ['24:00','12:60','12:','abc',''])assert.equal(normalizeTime(text),null);
});
