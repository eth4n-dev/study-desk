export function signupDomains(value){
 return String(value||'').split(',').map(domain=>domain.trim().toLowerCase()).filter(domain=>/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(domain));
}

export function emailMatchesSignupDomain(email, domains){
 const address=String(email||'').trim().toLowerCase();
 return /^[^@\s]+@[^@\s]+$/.test(address)&&signupDomains(domains).includes(address.slice(address.lastIndexOf('@')+1));
}
