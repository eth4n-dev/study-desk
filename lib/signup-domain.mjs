export function emailMatchesSignupDomain(email, domain){
 const address=String(email||'').trim().toLowerCase();
 const allowed=String(domain||'').trim().toLowerCase();
 return Boolean(allowed)&&/^[^@\s]+@[^@\s]+$/.test(address)&&address.slice(address.lastIndexOf('@')+1)===allowed;
}
