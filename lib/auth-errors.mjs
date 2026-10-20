export function isPasskeyCancellation(error){
 const name=error?.name||error?.cause?.name||'';
 const code=error?.code||error?.cause?.code||'';
 const message=String(error?.message||'').toLowerCase();
 return name==='AbortError'||name==='NotAllowedError'||code==='ERROR_CEREMONY_ABORTED'||
  /user denied permission|user cancelled|user canceled|request is not allowed by the user agent/.test(message);
}

export function emailCodeError(error){
 const code=error?.code||error?.error_code;
 const message=String(error?.message||'');
 if(code==='otp_expired'||/token has expired or is invalid/i.test(message))
  return 'That code is invalid or expired. Use the newest email or request another code.';
 return message||'The code could not be checked. Try again.';
}
