#!/bin/bash
# builds the upload-only test variant (direct registration, invite token in the answer, no mail to example.com) into <scratch>/tv
set -e; S="${1:?Zielordner angeben}"; rm -rf $S/tv; mkdir -p $S/tv; cd "$(dirname "$0")/../server"; cp package.json package-lock.json index.js workshops.js $S/tv/; cp -r public $S/tv/public
python3 - "$S/tv" <<'PY'
import sys
d=sys.argv[1]
p=d+'/index.js'; s=open(p,encoding='utf-8').read()
a="  if (!mailReady) {\n    // no mail available: direct registration"; assert s.count(a)==1; s=s.replace(a,"  if (true) {\n    // TEST VARIANT: direct registration"); open(p,'w',encoding='utf-8').write(s)
p=d+'/workshops.js'; s=open(p,encoding='utf-8').read()
a="    try { await sendMail(email, `3Druckwerkbank: Einladung"; assert s.count(a)==1
s=s.replace(a,"    try { if (email.endsWith('@example.com')) throw Object.assign(new Error('skip'), { skip: true }); await sendMail(email, `3Druckwerkbank: Einladung")
a="    catch (e) { await q('DELETE FROM invites WHERE token_hash = ?', [sha256(token)]);"; assert s.count(a)==1
s=s.replace(a,"    catch (e) { if (e.skip) { tell(id, { members: true }); return res.json({ ok: true, testToken: token }); } await q('DELETE FROM invites WHERE token_hash = ?', [sha256(token)]);")
open(p,'w',encoding='utf-8').write(s)
PY
node --check $S/tv/index.js; node --check $S/tv/workshops.js
