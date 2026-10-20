import test from 'node:test';
import assert from 'node:assert/strict';
import {emailCodeError,isPasskeyCancellation} from '../lib/auth-errors.mjs';

test('canceling a passkey prompt does not become a sign-in error',()=>{
 assert.equal(isPasskeyCancellation({name:'NotAllowedError',message:'The user denied permission.'}),true);
 assert.equal(isPasskeyCancellation({name:'AbortError'}),true);
 assert.equal(isPasskeyCancellation({name:'WebAuthnError',code:'ERROR_CEREMONY_ABORTED'}),true);
 assert.equal(isPasskeyCancellation({name:'AuthApiError',message:'Incorrect password'}),false);
});

test('expired email codes offer a clear recovery action',()=>{
 assert.match(emailCodeError({code:'otp_expired'}),/request another code/);
 assert.equal(emailCodeError({message:'Email rate limit exceeded'}),'Email rate limit exceeded');
});
