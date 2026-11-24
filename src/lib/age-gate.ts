// Client-safe 18+ cookie helpers shared by AgeGateModal and AfterDarkGate,
// plus the head script that hides the gate for returning visitors before paint.
export const AGE_COOKIE = "dub_age_verified_18"
export const AGE_TTL_DAYS = 30
export const AGE_OK_CLASS = "dub-age-ok"

export function hasAgeCookie(cookieString: string): boolean {
  return cookieString
    .split(";")
    .map((c) => c.trim())
    .some((c) => c === `${AGE_COOKIE}=1`)
}

export function setAgeVerifiedCookie(): void {
  if (typeof document === "undefined") return
  const ttl = AGE_TTL_DAYS * 24 * 60 * 60
  document.cookie = `${AGE_COOKIE}=1; path=/; max-age=${ttl}; SameSite=Lax`
}

// ES5-safe and self-contained: same exact-part match as hasAgeCookie.
// Deliberately ONE plain string literal (no template literals, no `+`): the
// production minifier mangled the string + template concatenation and dropped
// part of the script. src/lib/age-gate.test.ts pins it to AGE_COOKIE / AGE_OK_CLASS.
export const AGE_BOOTSTRAP_SCRIPT =
  '(function(){try{var p=document.cookie.split(";");for(var i=0;i<p.length;i++){if(p[i].trim()==="dub_age_verified_18=1"){document.documentElement.classList.add("dub-age-ok");break}}}catch(e){}})();'
