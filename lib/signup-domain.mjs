export function signupDomains(value){
 return String(value||'').split(',').map(domain=>domain.trim().toLowerCase()).filter(domain=>/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(domain));
}

export function emailMatchesSignupDomain(email, domains){
 const address=String(email||'').trim().toLowerCase();
 return /^[^@\s]+@[^@\s]+$/.test(address)&&signupDomains(domains).includes(address.slice(address.lastIndexOf('@')+1));
}

// ETH students receive mail at both addresses. Keep one account identity.
export function canonicalAuthEmail(email){
 const address=String(email||'').trim().toLowerCase();
 return address.replace(/@student\.ethz\.ch$/,'@ethz.ch');
}
