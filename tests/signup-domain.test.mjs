import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalAuthEmail,emailMatchesSignupDomain,signupDomains} from '../lib/signup-domain.mjs';

test('open sign-up accepts only the exact configured email domain',()=>{
 assert.equal(emailMatchesSignupDomain('student@ethz.ch','ethz.ch'),true);
 assert.equal(emailMatchesSignupDomain(' Student@ETHZ.CH ','ETHZ.CH'),true);
 for(const email of ['student@sub.ethz.ch','student@ethz.ch.evil.test','student@other.ch','student@@ethz.ch','student @ethz.ch']){
  assert.equal(emailMatchesSignupDomain(email,'ethz.ch'),false,email);
 }
 assert.equal(emailMatchesSignupDomain('student@ethz.ch',''),false);
});

test('ETH student mail alias resolves to one account without changing other domains',()=>{
 assert.equal(canonicalAuthEmail(' Ethan@Student.ETHZ.CH '),'ethan@ethz.ch');
 assert.equal(canonicalAuthEmail('ethan@ethz.ch'),'ethan@ethz.ch');
 assert.equal(canonicalAuthEmail('ethan@etu.unige.ch'),'ethan@etu.unige.ch');
 assert.equal(canonicalAuthEmail('ethan@fake-student.ethz.ch'),'ethan@fake-student.ethz.ch');
});

test('ETH and UniGe student domains can register without broadening other addresses',()=>{
 const allowed='ethz.ch,etu.unige.ch';
 assert.deepEqual(signupDomains(' ETHZ.CH, etu.unige.ch '),['ethz.ch','etu.unige.ch']);
 assert.equal(emailMatchesSignupDomain('student@ethz.ch',allowed),true);
 assert.equal(emailMatchesSignupDomain('student@etu.unige.ch',allowed),true);
 for(const email of ['student@unige.ch','student@staff.unige.ch','student@sub.etu.unige.ch','student@etu.unige.ch.evil.test']){
  assert.equal(emailMatchesSignupDomain(email,allowed),false,email);
 }
});
