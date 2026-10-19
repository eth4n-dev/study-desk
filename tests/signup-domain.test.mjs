import test from 'node:test';
import assert from 'node:assert/strict';
import {emailMatchesSignupDomain} from '../lib/signup-domain.mjs';

test('open sign-up accepts only the exact configured email domain',()=>{
 assert.equal(emailMatchesSignupDomain('student@ethz.ch','ethz.ch'),true);
 assert.equal(emailMatchesSignupDomain(' Student@ETHZ.CH ','ETHZ.CH'),true);
 for(const email of ['student@sub.ethz.ch','student@ethz.ch.evil.test','student@other.ch','student@@ethz.ch','student @ethz.ch']){
  assert.equal(emailMatchesSignupDomain(email,'ethz.ch'),false,email);
 }
 assert.equal(emailMatchesSignupDomain('student@ethz.ch',''),false);
});
