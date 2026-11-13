/* ---- Mobil: Wasser-Knöpfe ----
   ONE shared WebGL context (WebGL 1: every current iPhone and Android phone has it) draws the water drop of every
   visible button into an atlas; each button owns a small 2D canvas helper (.w3-drop, aria-hidden, pointer-events
   none) that receives its part of the atlas. The shader samples the current landscape image, aligned to the
   viewport like the page paints it (object-fit cover, object-position, scrolling, CSS zoom, the darkening of
   .m-bg::after), and bends it through an organic drop: flowing outline, lens at the rim, slow ripples, one
   highlight, a shadow, and a ring that runs from the finger.

   What lies between a button and the landscape (a card, a sheet) is never assumed: it is read from the computed
   styles at run time (see underOf) and re-read once a second and after class changes. The tab bar (.m-tabs) is
   neither styled nor observed.

   Without WebGL, with ?fallback=1, after a lost context or after an error the plain glass of look.css stays.
   Test aids: ?w3flat=1 (plain copy, to check the alignment), ?w3prof=1 (frame cost in window.__w3.prof).
   App: window.__w3.destroy() removes everything again (call it when the mobile shell unmounts). */
(function () {
  'use strict';
  if (window.__w3) return;
  var W3 = window.__w3 = { state: 'init', level: 0 };
  if (/[?&]fallback=1(&|$)/.test(location.search)) { W3.state = 'fallback (forced)'; return; }

  var SEL = '.btn:not(.btn--ghost), .m-ico';   // looked up inside .m-shell only, never inside .m-tabs
  var PAD = 14;                       // local css px the helper reaches beyond the button (== --w3-pad)
  var MAX_PX_ONE = 340000;            // device px per drop
  var MAX_PX_ALL = 1500000;           // device px for all visible drops together
  var TEX_W = 2048, TEX_H = 1024;     // landscape texture (power of two, mip-mapped)
  var SLEEP_AFTER = 30000;            // ms without touch or scroll until the water comes to rest (0 frames a second)
  var DPR_CAP = 3;                    // sharp on 3x phones
  var LEVELS = [                      // stepped down when pictures keep eating more than 80 % of their time slot for 3 s:
    { fps: 60, idle: 15, q: 1 },      // 60 pictures a second while a drop is touched (and 2 s after), 15 while the water only flows
    { fps: 30, idle: 15, q: 1 },      // first fewer pictures,
    { fps: 15, idle: 12, q: 1 },
    { fps: 15, idle: 12, q: 0.67 },   // then fewer pixels (a 3x phone draws like a 2x phone);
    { fps: 12, idle: 12, q: 0.5 },    // this level is left only when one picture takes longer than 100 ms
    { fps: 0, idle: 0, q: 0.5 }       // at last a still drop that only follows scrolling and presses
  ];
  var TINT = [[1, 1, 1, 0], [1, 0.72, 0.38, 0.7], [0.74, 0.12, 0.16, 0.72]];   // clear, amber (primary), red (danger)
  var FLAT = /[?&]w3flat=1(&|$)/.test(location.search);
  var PROF = /[?&]w3prof=1(&|$)/.test(location.search);
  var STILL_T = 2.4;                  // frozen water time for reduced motion

  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var reduced = function () { return mqReduce.matches || document.documentElement.getAttribute('data-motion') === 'reduziert'; };

  var shell = null, home = null, modal = null;
  var recs = new Map();               // button -> record
  var seedN = 0, frameNo = 0;
  var gl = null, glc = null, prog = null, U = {}, tex = null, texReady = false, lost = false, deriv = false;
  var scene = { el: null, src: '', nw: 1280, nh: 720, pos: null, wait: null };
  var grad = { col: [8 / 255, 12 / 255, 24 / 255], stops: [0, 0.35, 0.3, 0.15, 0.7, 0.55, 1, 0.85], key: '' };
  var raf = 0, timer = 0, lastFrame = 0, lastTick = 0, vt = 0, speed = 1, dirty = true, restyle = false, needOne = true;
  var followUntil = 0, nextStyle = 0, lastInput = performance.now(), slow = 0;
  var io = null, ro = null, mo = null, offs = [];
  var bgCache = new Map(), rng = document.createRange(), probe = null, texCv = null;

  /* ------------------------------------------------------------------ shader */
  var VS = 'attribute vec2 aP; void main(){ gl_Position = vec4(aP, 0., 1.); }';
  var FS = [
    // (look.js puts "#define DERIV" and the extension line in front when OES_standard_derivatives exists - everywhere in practice)
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform sampler2D uTex;',
    'uniform vec4 uVp;',      // x, top edge (gl y), w, h of this drop inside the atlas, device px
    'uniform float uPx;',     // device px per local css px
    'uniform vec2 uHalf;',    // half size of the button box, local px
    'uniform float uRad;',    // corner radius, local px
    'uniform vec2 uCtr;',     // button centre, screen css px
    'uniform float uZoom;',   // screen css px per local px (CSS zoom / transforms)
    'uniform vec4 uImg;',     // where the landscape image is painted: x, y, w, h in screen css px
    'uniform vec2 uBgY;',     // top and height of .m-bg (for its darkening gradient)
    'uniform vec4 uG0;',      // darkening stops: pos0, a0, pos1, a1
    'uniform vec4 uG1;',      //                  pos2, a2, pos3, a3
    'uniform vec3 uGCol;',
    'uniform float uTime;',
    'uniform float uSeed;',
    'uniform vec4 uTint;',    // rgb + amount in the middle of the drop (amber for primary, red for danger)
    'uniform vec4 uUnder;',   // the sheet between button and landscape: rgb + how much of it stays visible in the drop
    'uniform float uWet;',    // 0 = free over the landscape, 1 = the drop lies on a sheet
    'uniform vec4 uPress;',   // touch x, y (local px), press amount, age of the ring in s
    'uniform float uRipA;',   // ring amplitude
    'uniform float uInk;',    // 1 = light label, 0 = dark label
    'uniform vec4 uLab;',     // where the label sits: centre x, y, half width, half height (local px)
    'uniform vec4 uNbL;',     // neighbouring drop on the left: centre x, y, half width, half height (half width 0 = none)
    'uniform vec4 uNbR;',     // ... on the right
    'uniform float uFlat;',   // test aid (?w3flat=1): plain copy of the landscape, to check the alignment
    '',
    'float sdBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }',
    'float smin(float a, float b, float k){ float h = clamp(.5 + .5*(b - a)/k, 0., 1.); return mix(b, a, h) - k*h*(1. - h); }',
    // two drops next to each other: the facing flanks swell towards each other (surface tension reaching over),
    // but 4 px of dry glass always stay between them - also while one of them is pressed and spreads
    'float lean(float d, float box, vec2 p, vec4 nb){',
    '  float dn = sdBox(p - nb.xy, nb.zw, min(nb.z, nb.w));',
    '  d -= 2.6*(1. - smoothstep(2., 15., dn));',
    '  return -smin(-d, -((box - dn)*.5 + 2.), 2.);',
    '}',
    '',
    // organic outline: the pill of the button, breathing through three slow wave fields, plus a swelling that
    // wanders along the lower edge and a smaller one along the upper edge. Spreads when pressed.
    'float sdf(vec2 p){',
    '  float t = uTime, s = uSeed*6.2832;',
    '  float n = sin(p.x*.062 + p.y*.085 + t*.52 + s)',
    '          + .45*sin(p.x*.105 - p.y*.071 - t*.41 + s*1.9)',
    '          + .5*sin(-p.x*.047 + p.y*.132 + t*.33 + s*.5);',
    '  float box = sdBox(p, uHalf, uRad);',
    '  float d = box - (.45 + .95*n);',
    '  float run = max(uHalf.x - uRad, 0.);',
    '  float rb = uHalf.y*.62;',
    '  float wide = 1. + clamp(run/max(uRad, 1.), 0., 1.5)*.7;',   // long drops get long, flat swellings
    '  float trav = max(run + uRad*.3 - rb*wide, 2.5);',          // ... that never reach the round ends
    '  vec2 c1 = vec2(sin(t*.23 + s*.7)*trav, uHalf.y - rb + 2.1);',
    '  d = smin(d, length((p - c1)/vec2(wide, 1.)) - rb, 10.);',
    '  vec2 c2 = vec2(sin(t*.17 + s*1.4 + 2.)*trav, -(uHalf.y - rb*.8) - 1.2);',
    '  d = smin(d, length((p - c2)/vec2(wide, 1.)) - rb*.8, 9.);',
    '  d -= uPress.z*2.6;',
    '  if (uNbL.z > .5) d = lean(d, box, p, uNbL);',
    '  if (uNbR.z > .5) d = lean(d, box, p, uNbR);',
    '  return d;',
    '}',
    // 1 where the label sits, 0 towards the rim: there the water rests calmer and is kept readable
    'float lab(vec2 p){ return 1. - smoothstep(-2., 10., sdBox(p - uLab.xy, uLab.zw, min(uLab.z, uLab.w))); }',
    '',
    // height of the water surface above the glass, local px: a steep rim (surface tension) and a flat dome (gH),
    // plus the fine part that hgt() returns: small waves, the ring from the finger, the dimple under it
    'float gH;',              // dome
    'float gB;',              // its exact slope along the distance to the outline
    'float gW;',              // the small waves alone (for their shimmer)
    'float gR;',              // the ring from the finger alone (for its lit and shaded slope)
    'float hgt(vec2 p, float d){',
    '  float hy = min(uHalf.y, 22.);',
    '  float a1 = clamp(-d/(hy*.52), 0., 1.), a2 = clamp(-d/hy, 0., 1.);',
    '  float k1 = 1. - a1, k2 = 1. - a2;',
    '  float prof = 1. - k1*k1*k1, flat_ = 1. - .3*uPress.z;',
    '  gH = (hy*.25*prof + hy*.2*(1. - k2*k2))*flat_;',
    '  gB = -(1.4423*k1*k1*step(1e-4, a1)*step(a1, .9999) + .4*k2*step(1e-4, a2)*step(a2, .9999))*flat_;',
    '  float t = uTime;',
    '  float w = .55*sin(dot(p, vec2(.19, .11)) - t*1.2 + uSeed*19.)',
    '          + .45*sin(dot(p, vec2(-.10, .23)) - t*.92 + uSeed*31.)',
    '          + .35*sin(length(p - vec2(uHalf.x*.6, -uHalf.y*2.2))*.27 - t*1.45);',
    '  gW = w*prof*(1. - .75*lab(p));',
    '  float r = length(p - uPress.xy);',
    '  float fr = 5. + uPress.w*66.;',
    '  float q = (r - fr)/7.5;',
    '  gR = uRipA*exp(-q*q)*cos((r - fr)*.46)*prof;',
    '  return .42*gW + gR - uPress.z*hy*.2*exp(-r*r/(uHalf.y*uHalf.y*1.3))*prof;',
    '}',
    '',
    'float darkA(float y){',
    '  float f = clamp((y - uBgY.x)/uBgY.y, 0., 1.);',
    '  float a = mix(uG0.y, uG0.w, clamp((f - uG0.x)/max(uG0.z - uG0.x, 1e-4), 0., 1.));',
    '  a = mix(a, uG1.y, clamp((f - uG0.z)/max(uG1.x - uG0.z, 1e-4), 0., 1.));',
    '  a = mix(a, uG1.w, clamp((f - uG1.x)/max(uG1.z - uG1.x, 1e-4), 0., 1.));',
    '  return a;',
    '}',
    'vec3 scene(vec2 sp, float lod){',
    '  vec2 uv = (sp - uImg.xy)/uImg.zw;',
    '  vec3 c = texture2D(uTex, clamp(uv, 0., 1.), lod).rgb;',
    '  return mix(c, uGCol, darkA(sp.y)*(1. - .5*uWet));',
    '}',
    // what a SHEET (card, panel) shows where the drop lies: the landscape as soft as the sheet's backdrop blur
    // (about 32 local px wide), with the page's full darkening, under the sheet's own colour at opacity a
    'vec3 sheet(vec2 sp, float a){',
    '  vec3 c = texture2D(uTex, clamp((sp - uImg.xy)/uImg.zw, 0., 1.), 5. + log2(uPx)).rgb;',
    '  return mix(mix(c, uGCol, darkA(sp.y)), uUnder.rgb, a);',
    '}',
    '',
    'void main(){',
    '  vec2 fc = vec2(gl_FragCoord.x - uVp.x, uVp.y - gl_FragCoord.y);',
    '  vec2 p = (fc - .5*uVp.zw)/uPx;',
    '  float d = sdf(p);',
    '  gH = 0.; gB = 0.; gW = 0.; gR = 0.;',
    '  float h0 = 0.; if (d < .5) h0 = hgt(p, d);',           // outside the outline the surface is flat
    '  float w0 = gW; float r0 = gR;',
    // slope of the water surface (points uphill = into the drop), of the small waves and of the ring.
    // With screen-space derivatives the surface is evaluated once per pixel instead of three times; the steep dome
    // is differentiated exactly (its slope times the direction of the outline), so the rim stays smooth.
    '#ifdef DERIV',
    '  vec2 g = (gB*vec2(dFdx(d), -dFdy(d)) + vec2(dFdx(h0), -dFdy(h0)))*uPx;',
    '  vec2 gw = vec2(dFdx(w0), -dFdy(w0))*uPx, gr = vec2(dFdx(r0), -dFdy(r0))*uPx;',
    '#else',
    '  float e = .8; h0 += gH;',
    '  float hx = hgt(p + vec2(e, 0.), sdf(p + vec2(e, 0.))) + gH; vec2 gw = vec2(gW - w0, 0.), gr = vec2(gR - r0, 0.);',
    '  float hz = hgt(p + vec2(0., e), sdf(p + vec2(0., e))) + gH; gw.y = gW - w0; gr.y = gR - r0;',
    '  vec2 g = vec2(hx - h0, hz - h0)/e; gw /= e; gr /= e;',
    '#endif',
    '  if (d > 11.){ gl_FragColor = vec4(0.); return; }',
    '  float aIn = clamp(.5 - d*uPx, 0., 1.);',
    '  vec2 L2 = normalize(vec2(-.5, -.86));',                 // light comes from the upper left
    '  vec3 outC = vec3(0.); float outA = 0.;',
    // shadow and the bright spot the drop throws onto the surface below it
    '  if (aIn < 1.){',
    '    float ds = sdf(p - vec2(1.8, 4.));',
    '    float sh = (1. - smoothstep(-4.5, 6., ds))*.34;',
    '    float cs = (1. - smoothstep(-2., 2.5, ds + 1.))*smoothstep(-1., 2., d)*.17;',
    // on a sheet the drop gathers light into a glint on the floor below its far side (lower right), in the colour
    // of the drop; never a line under the whole width. Under the finger it flares.
    '    if (uWet > 0.){',
    '      float side = smoothstep(uHalf.x - 118., uHalf.x - 50., p.x)*(1. - .55*smoothstep(uHalf.x - 14., uHalf.x + 4., p.x));',
    '      float gl = (1. - smoothstep(-1.5, 3.6 + 2.*uPress.z, ds))*smoothstep(-1., 1.6, d)*side;',
    '      cs = max(cs, gl*(.5 + .45*uPress.z)*uWet);',
    '    }',
    '    vec3 lightC = mix(vec3(.82, .93, 1.), uTint.rgb, uTint.a*.8);',
    '    outA = sh + cs*(1. - sh);',
    '    outC = lightC*cs;',                                   // premultiplied: the shadow itself is black-blue
    '    outC += vec3(.008, .03, .07)*sh*(1. - cs);',
    '  }',
    '  if (uFlat > .5){ gl_FragColor = vec4(scene(uCtr + p*uZoom, 0.)*aIn, aIn); return; }',
    '  if (aIn > 0.){',
    '    float hy = min(uHalf.y, 22.);',
    '    float gLen = length(g);',
    '    g *= min(1., 2.2/max(gLen, 1e-4));',
    '    vec3 n = normalize(vec3(-g, 1.));',
    '    float u = clamp(-d/(hy*.52), 0., 1.);',               // 0 at the outline, 1 where the rim ends
    '    float core = smoothstep(.15, 1., u);',
    '    float zone = lab(p)*core;',
    // refraction: the rim bends the landscape towards the middle, the body magnifies it
    '    vec2 off = g*hy*.2 - p*.07 - (p - uPress.xy)*.07*uPress.z;',
    '    vec2 sp = uCtr + (p + off)*uZoom;',
    // the squeezed rim is sampled softer (no comb of streaks); softer too on a sheet and under a dark label
    '    float lod = uWet*1.6 + (1. - u)*2. + (1. - uInk)*(.8 + .9*zone);',
    '    vec3 col = scene(sp, lod);',
    // no colour fringe at rest (it is water, not a soap bubble); a breath of it while the drop is touched
    '    float disp = .014*uPress.z + .003*uRipA;',
    '    if (disp > .002){',
    '      col.r = scene(uCtr + (p + off*(1. - disp))*uZoom, lod).r;',
    '      col.b = scene(uCtr + (p + off*(1. + disp))*uZoom, lod).b;',
    '    }',
    // a drop on a sheet shows the SHEET, not the landscape behind it: the sheet's own water (soft landscape under
    // the sheet colour), bent and magnified like everything else, and a touch clearer than the water around it
    '    if (uWet > 0.) col = mix(mix(col, uUnder.rgb, uUnder.a), sheet(sp, uUnder.a*.92), uWet);',
    // a breath of sky in the water, so that a drop over dark ground is still a drop (a drop gathers light: more on a sheet)
    '    col += (1. - col)*vec3(.03, .045, .065);',
    // ... and on a sheet the drop is a lens: its lit side stays as dark as the water around it, its far side glows
    '    if (uWet > 0.){',
    '      float far = clamp(dot(p/uHalf, vec2(.3, .95))*.5 + .5, 0., 1.);',
    '      far *= far*(.5 + .5*smoothstep(uHalf.x - 150., uHalf.x - 40., p.x));',   // a long drop glows at its far end, not along its whole length
    '      col = col*(1. + uWet*(-.12 + far)) + vec3(.016, .032, .04)*uWet;',
    '    }',
    '    col *= vec3(.95, .985, 1.);',                          // clear water: a touch of blue-green absorption
    '    float luma = dot(col, vec3(.299, .587, .114));',
    // tinted water (amber = the primary action): the rim stays more see-through than the middle,
    // and over dark ground the tint carries more
    '    float ty = clamp(p.y/uHalf.y*.5 + .5, 0., 1.);',
    '    vec3 tintC = uTint.rgb*mix(vec3(1.05, 1.05, 1.08), vec3(1., .9, .82), ty)*(.94 + .2*luma);',
    '    float tintK = min(uTint.a*mix(.72, 1., core) + (1. - luma)*.22*core, .94)*step(.01, uTint.a);',
    '    col = mix(col, tintC, tintK);',
    // the label stays readable. Light label: where it sits, the water is kept just dark enough for 4.5:1 - as
    // deeper, bluer water, never more than 38 %. Dark label: the water is kept bright enough.
    '    float L = dot(col*col, vec3(.2126, .7152, .0722));',
    '    float k = clamp(sqrt(.21/max(L, 1e-4)), .62, 1.);',
    '    col *= mix(vec3(1.), pow(vec3(.80, .94, 1.07), vec3((1. - k)*3.))*k, zone*uInk);',
    '    col += uTint.rgb*max(.6 - dot(col, vec3(.299, .587, .114)), 0.)*zone*(1. - uInk);',
    // water texture: the small waves catch the light; the ring from the finger has a lit and a shaded slope
    '    col *= 1. + clamp(dot(gw, L2)*1.1, -.09, .13)*(1. - .55*uTint.a);',
    '    float rl = dot(gr, L2);',
    '    col = col*(1. + clamp(rl*.55, -.26, .4)) + vec3(.75, .88, 1.)*clamp(rl*.08, 0., .13);',
    // light gathers on the side away from the light, the lit side gets a thin dark contour
    '    vec2 dir = gLen > 1e-3 ? -g/gLen : vec2(0.);',        // outward
    '    float away = max(dot(dir, -L2), 0.);',
    '    float toward = max(dot(dir, L2), 0.);',
    '    float band = smoothstep(0., .25, u)*(1. - smoothstep(.35, 1., u));',
    '    col += (col*.62 + mix(vec3(.75, .9, 1.), uTint.rgb, min(uTint.a*1.3, 1.))*(.15 + .2*uWet))*band*pow(away, 1.5)*(1. - .6*uTint.a);',
    '    col *= 1. - .3*(1. - smoothstep(0., .45, u))*toward;',
    // reflection of the sky on the steep rim
    '    float fres = pow(max(1. - n.z, 0.), 2.2);',
    '    vec3 sky = mix(vec3(.3, .4, .52), vec3(.92, .97, 1.), smoothstep(-.35, .75, -n.y - n.x*.4));',
    '    col = mix(col, sky, fres*.36);',
    // one crisp highlight and a faint second one
    '    vec3 Lk = normalize(vec3(-.42, -.72, .55));',
    '    vec3 Hk = normalize(Lk + vec3(0., 0., 1.));',
    '    float nh = max(dot(n, Hk), 0.);',
    '    vec3 Hf = normalize(normalize(vec3(.5, .8, .45)) + vec3(0., 0., 1.));',
    '    float sp3 = pow(max(dot(n, Hf), 0.), 40.);',
    '    col += vec3(1.)*(smoothstep(.984, .996, nh)*.9 + pow(nh, 36.)*.1) + mix(vec3(.8, .92, 1.), uTint.rgb, uTint.a*.6)*sp3*.18;',
    // meniscus: one thin light line
    '    float rim = 1. - smoothstep(0., 1.3, -d);',
    '    col += vec3(1.)*rim*(.05 + .46*pow(toward, 2.) + .3*pow(away, 2.));',
    '    col += vec3(1.)*uPress.z*.06;',
    '    col = clamp(col, 0., 1.);',
    // On a sheet the drop is handed over as light and shade LAID OVER the sheet, as see-through as it can be while
    // still giving exactly this picture over the sheet as estimated ("colour to alpha" against est). So whatever the
    // sheet really shows under the drop - its real blur, its depth steps, a row, a ring of light passing by - stays
    // visible through the clear water, and no patch of a different picture can appear. Tinted water hides as much as its tint.
    '    float cov = 1.;',
    '    if (uWet > 0.){',
    '      vec3 est = clamp(sheet(uCtr + p*uZoom, uUnder.a), .004, .98);',
    '      vec3 lo = 1. - col/est, hi = (col - est)/(1. - est);',
    '      cov = mix(1., clamp(max(max(max(lo.r, lo.g), max(lo.b, hi.r)), max(max(hi.g, hi.b), tintK)), 0., 1.), uWet);',
    '      col -= (1. - cov)*est;',                              // premultiplied from here on
    '    }',
    '    outC = col*aIn + outC*(1. - aIn);',
    '    outA = cov*aIn + outA*(1. - aIn);',
    '  }',
    '  gl_FragColor = vec4(outC, outA);',
    '}'
  ].join('\n');
  var UNI = ['uTex', 'uVp', 'uPx', 'uHalf', 'uRad', 'uCtr', 'uZoom', 'uImg', 'uBgY', 'uG0', 'uG1', 'uGCol', 'uTime', 'uSeed', 'uTint', 'uUnder', 'uWet',
    'uPress', 'uRipA', 'uInk', 'uLab', 'uNbL', 'uNbR', 'uFlat'];

  /* ------------------------------------------------------------------ GL setup */
  function initGL() {
    if (gl) return true;
    try {
      glc = document.createElement('canvas'); glc.width = 16; glc.height = 16;
      var opt = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' };
      gl = glc.getContext('webgl', opt) || glc.getContext('experimental-webgl', opt);
      if (!gl) throw new Error('no webgl');
      glc.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; texReady = false; allOff(); W3.state = 'context lost'; });
      glc.addEventListener('webglcontextrestored', function () { lost = false; try { build(); loadScene(true); kick(); } catch (err) { fail(err); } });
      build();
      return true;
    } catch (err) { fail(err); return false; }
  }
  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
    return s;
  }
  function build() {
    deriv = !/[?&]w3noderiv=1(&|$)/.test(location.search) && !!gl.getExtension('OES_standard_derivatives');
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, (deriv ? '#extension GL_OES_standard_derivatives : enable\n#define DERIV 1\n' : '') + FS));
    gl.bindAttribLocation(prog, 0, 'aP'); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    UNI.forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.clearColor(0, 0, 0, 0);
    tex = gl.createTexture(); texReady = false;
    W3.state = 'gl';
  }
  function fail(err) {
    W3.state = 'fallback (' + (err && err.message ? err.message : err) + ')';
    lost = true; recs.forEach(function (r) { detach(r); }); gl = null;      // the plain glass of look.css takes over
    if (window.console) console.warn('[wasser] fallback:', err);
  }
  function allOff() { recs.forEach(function (r) { r.btn.removeAttribute('data-w3'); r.painted = false; }); }

  /* ------------------------------------------------------------------ landscape texture */
  // The app replaces the scene <img> by a NEW element when the tab changes: always look the current one up,
  // keep the old picture until the new one has loaded, then upload it.
  function loadScene(force) {
    var img = shell ? shell.querySelector('.m-bg img') : null;
    scene.el = img;
    if (!img) return;
    if (scene.wait !== img) {             // every image tells us when it (or another srcset candidate) has loaded
      scene.wait = img;
      img.addEventListener('load', function () { if (scene.el === img) { loadScene(false); kick(); } });
    }
    if (!img.complete || !img.naturalWidth) return;
    var src = img.currentSrc || img.src;
    if (!force && src === scene.src && texReady) return;
    if (!gl || lost) return;
    try {
      var max = gl.getParameter(gl.MAX_TEXTURE_SIZE), w = Math.min(TEX_W, max), h = Math.min(TEX_H, max);
      var c = texCv || (texCv = document.createElement('canvas')); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, c);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      scene.src = src; scene.nw = img.naturalWidth; scene.nh = img.naturalHeight; scene.pos = null; texReady = true;
      readGradient();
    } catch (err) { fail(err); }
  }
  // darkening of .m-bg::after, read from the real style so the copy never drifts from the page
  function readGradient() {
    var bg = shell ? shell.querySelector('.m-bg') : null; if (!bg) return;
    var s = getComputedStyle(bg, '::after').backgroundImage || '';
    if (s === grad.key) return; grad.key = s;
    var re = /rgba?\(([^)]+)\)\s*([\d.]+)%/g, m, st = [], col = null;
    while ((m = re.exec(s))) {
      var v = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat);
      if (!col) col = [v[0] / 255, v[1] / 255, v[2] / 255];
      st.push(parseFloat(m[2]) / 100, v.length > 3 ? v[3] : 1);
    }
    if (/^linear-gradient\((?:180deg,\s*|to bottom,\s*)?rgb/.test(s) && st.length === 8) { grad.col = col; grad.stops = st; }
    else if (s === 'none' || !s) { grad.stops = [0, 0, 0.3, 0, 0.7, 0, 1, 0]; }
  }

  /* ------------------------------------------------------------------ what lies under a button */
  function parseCol(s) {
    var m = /(rgba?|color)\(([^()]+)\)/.exec(s || ''); if (!m) return null;
    var v = m[2].split(/[,\s/]+/).filter(Boolean), f = 1 / 255;
    if (m[1] === 'color') { v.shift(); f = 1; }
    v = v.map(parseFloat);
    if (v.length < 3 || v.some(isNaN)) return null;
    return [v[0] * f, v[1] * f, v[2] * f, v.length > 3 ? v[3] : 1];
  }
  // any CSS colour (custom property, as written) -> [r, g, b, a]
  function cssCol(v) {
    if (!probe) probe = document.createElement('canvas').getContext('2d');
    probe.fillStyle = '#010203'; probe.fillStyle = v;
    var s = probe.fillStyle;
    if (s === '#010203') return null;
    if (s.charAt(0) === '#') return [parseInt(s.substr(1, 2), 16) / 255, parseInt(s.substr(3, 2), 16) / 255, parseInt(s.substr(5, 2), 16) / 255, 1];
    return parseCol(s);
  }
  // the paint of one ancestor: its background colour, or the mean of its gradient colours
  function bgOf(el) {
    var c = bgCache.get(el); if (c !== undefined) return c;
    var cs = getComputedStyle(el); c = parseCol(cs.backgroundColor);
    if ((!c || !c[3]) && /gradient\(/.test(cs.backgroundImage)) {
      var re = /rgba?\([^()]+\)/g, m, n = 0, acc = [0, 0, 0, 0], k;
      while ((m = re.exec(cs.backgroundImage))) { k = parseCol(m[0]); if (k) { acc[0] += k[0] * k[3]; acc[1] += k[1] * k[3]; acc[2] += k[2] * k[3]; acc[3] += k[3]; n++; } }
      c = n && acc[3] ? [acc[0] / acc[3], acc[1] / acc[3], acc[2] / acc[3], acc[3] / n] : c;
    }
    bgCache.set(el, c || null); return c || null;
  }
  // Colour and opacity of everything between this button and the landscape. A sheet that paints itself in a way
  // the script cannot read (canvas, pseudo-element, image) states it with the inherited property --water-under.
  // Returns rgb, the share of that colour that stays visible inside the drop, and "lies on a sheet" (0..1).
  function underOf(btn, cs) {
    var v = cs.getPropertyValue('--water-under'), c = v && v.trim() ? cssCol(v.trim()) : null, el, k, a;
    if (!c) {
      c = [0, 0, 0, 0];
      for (el = btn.parentElement; el && el !== shell; el = el.parentElement) {
        k = bgOf(el); if (!k || !(k[3] > 0)) continue;
        a = c[3] + k[3] * (1 - c[3]);                                  // c lies over k
        c = [(c[0] * c[3] + k[0] * k[3] * (1 - c[3])) / a, (c[1] * c[3] + k[1] * k[3] * (1 - c[3])) / a, (c[2] * c[3] + k[2] * k[3] * (1 - c[3])) / a, a];
        if (a > 0.995) break;
      }
    }
    a = Math.max(0, Math.min(1, c[3]));
    // the drop shows the sheet at its real opacity (it no longer turns the sheet clear where it lies)
    return [c[0], c[1], c[2], a, Math.min(1, a * 2.5)];
  }

  /* ------------------------------------------------------------------ helpers per button */
  function attach(btn) {
    var cv = document.createElement('canvas');
    cv.className = 'w3-drop'; cv.setAttribute('aria-hidden', 'true'); cv.width = 2; cv.height = 2;
    var r = { btn: btn, cv: cv, ctx: cv.getContext('2d'), seed: (seedN++ * 0.6180339887) % 1, vis: true, painted: false, behind: false, stale: false,
      w: 0, h: 0, cw: 0, ch: 0, rad: 0, tint: TINT[0], under: [0, 0, 0, 0, 0], ink: 1, lab: [0, 0, 6, 6], parent: null, rect: null, seen: -1, last: '',
      px: 0, py: 0, pv: 0, pvel: 0, ptarget: 0, ripT: -1, ripA: 0 };
    recs.set(btn, r);
    btn.insertBefore(cv, btn.firstChild);
    if (io) io.observe(btn); if (ro) ro.observe(btn);
    measure(r);
    return r;
  }
  function detach(r) {
    recs.delete(r.btn);
    if (io) io.unobserve(r.btn); if (ro) ro.unobserve(r.btn);
    if (r.cv.parentNode) r.cv.parentNode.removeChild(r.cv);
    r.btn.removeAttribute('data-w3');
  }
  function measure(r) {
    var btn = r.btn, cs = getComputedStyle(btn);
    var w = parseFloat(cs.width) || 0, h = parseFloat(cs.height) || 0;
    var bl = parseFloat(cs.borderLeftWidth) || 0, bt = parseFloat(cs.borderTopWidth) || 0;
    r.w = w; r.h = h;
    r.cw = w - 2 * bl + 2 * PAD; r.ch = h - 2 * bt + 2 * PAD;   // the helper hangs on the padding box
    r.rad = Math.min(w, h) / 2;                                 // every drop starts from the pill of its button
    var cl = btn.classList, kind = cl.contains('btn--primary') ? 1 : cl.contains('btn--danger') ? 2 : 0;
    r.tint = TINT[kind]; r.ink = kind === 1 ? 0 : 1;
    r.parent = btn.parentNode; r._cls = btn.className; r.stale = false;
    r.under = underOf(btn, cs);
    // where the label sits (text and icons, not the badge): there the water is calmer and kept readable
    var b = btn.getBoundingClientRect(), z = b.width / (w || 1) || 1, L = 1e9, T = 1e9, R = -1e9, B = -1e9, i, n, q;
    for (i = 0; i < btn.childNodes.length; i++) {
      n = btn.childNodes[i]; q = null;
      if (n === r.cv) continue;
      if (n.nodeType === 3) { if (/\S/.test(n.nodeValue)) { rng.selectNodeContents(n); q = rng.getBoundingClientRect(); } }
      else if (n.nodeType === 1 && !(n.classList && n.classList.contains('badge'))) q = n.getBoundingClientRect();
      if (q && q.width && q.height) { L = Math.min(L, q.left); T = Math.min(T, q.top); R = Math.max(R, q.right); B = Math.max(B, q.bottom); }
    }
    r.lab = R > L ? [((L + R) / 2 - (b.left + b.width / 2)) / z, ((T + B) / 2 - (b.top + b.height / 2)) / z, (R - L) / 2 / z + 2, (B - T) / 2 / z + 2] : [0, 0, 8, 8];
  }
  function measureAll() { bgCache.clear(); recs.forEach(measure); nextStyle = performance.now() + 1000; }

  function scan() {
    dirty = false;
    if (!shell || !shell.isConnected) { shell = document.querySelector('.m-shell'); wire(); }
    var all = shell ? shell.querySelectorAll(SEL) : [], seen = new Set(), i, btn, r, fresh = false;
    if (all.length && !gl && !lost) { if (!initGL()) return; }
    if (lost && !gl) return;
    modal = shell ? shell.querySelector('.sheet') : null;       // an open sheet: the drops behind it rest
    if (restyle) { bgCache.clear(); }
    for (i = 0; i < all.length; i++) {
      btn = all[i];
      if (btn.closest('.m-tabs')) continue;
      seen.add(btn); r = recs.get(btn);
      if (!r) { r = attach(btn); fresh = true; }
      else {
        if (r.cv.parentNode !== btn) btn.insertBefore(r.cv, btn.firstChild);
        if (restyle || r.stale || r.parent !== btn.parentNode || r._cls !== btn.className) measure(r);
      }
      r.behind = !!modal && !modal.contains(btn);
    }
    restyle = false;
    recs.forEach(function (rr, b) { if (!seen.has(b) || !b.isConnected) detach(rr); });
    if (fresh) followUntil = performance.now() + 700;         // new buttons may still slide in (card animation)
    loadScene(false);
  }

  /* ------------------------------------------------------------------ frame */
  function next() { timer = 0; if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
  function kick() { needOne = true; if (timer) clearTimeout(timer); next(); }
  function wake() { lastInput = performance.now(); kick(); }
  function frame(now) {
    raf = 0;
    if (dirty) scan();
    if (lost || !gl || !recs.size) return;
    if (now > nextStyle) measureAll();                          // cards may have changed their paint
    var lv = LEVELS[W3.level], still = reduced() || !lv.fps;
    var tick = Math.min(0.1, Math.max(0, (now - lastTick) / 1000)); lastTick = now;
    // the water comes to rest when nobody has touched the screen for a while and wakes with the next touch
    var awake = !SLEEP_AFTER || now - lastInput < SLEEP_AFTER;
    speed += ((awake ? 1 : 0) - speed) * Math.min(1, tick * (awake ? 5 : 1.3));
    if (!awake && speed < 0.03) speed = 0;
    var active = false;                                         // a pressed drop or a running ring
    recs.forEach(function (r) {
      if (still) { if (r.pv !== r.ptarget || r.ripT >= 0) { r.pv = r.ptarget; r.pvel = 0; r.ripT = -1; needOne = true; } }   // no spring, no ring: the pressed state is one still picture
      else if (r.vis && (r.ptarget || Math.abs(r.pv) > 0.002 || Math.abs(r.pvel) > 0.01 || r.ripT >= 0)) active = true;
    });
    var flowing = !still && (speed > 0 || active), follow = now < followUntil;
    var fps = active ? lv.fps : lv.idle;
    var timeDue = needOne || (flowing && now - lastFrame >= 1000 / fps - 3);
    var any = true;
    if (timeDue || follow) {
      var dt = Math.min(0.1, Math.max(0.001, (now - lastFrame) / 1000));
      var t1 = performance.now(), res;
      try { res = render(now, dt, still, timeDue); } catch (err) { fail(err); return; }
      any = res !== 0;
      if (res === 2) {                                          // a picture was drawn
        var cost = performance.now() - t1;
        W3.ms = W3.ms ? W3.ms * 0.9 + cost * 0.1 : cost;
        // governor: three seconds of pictures that eat more than 80 % of their time slot (or, while a drop is
        // touched, a screen that manages fewer than 20 pictures a second) -> one level down
        if (timeDue && flowing) {
          var last = W3.level >= LEVELS.length - 2;
          if (cost > (last ? 100 : 800 / fps) || (active && !last && tick > 0.05)) { slow += Math.min(dt * 1000, 250); if (slow > 3000 && W3.level < LEVELS.length - 1) { W3.level++; slow = 0; } }
          else slow = Math.max(0, slow - 2 * dt * 1000);
        }
      }
    }
    if ((any && flowing) || active || follow || dirty) {
      // between two pictures of the resting water the page sleeps (about 15 wake-ups a second, not 60)
      var wait = active || follow || dirty || needOne ? 0 : 1000 / fps - (now - lastFrame);
      if (wait > 30) timer = setTimeout(next, wait - 14); else raf = requestAnimationFrame(frame);
    }
  }

  var NONE = [0, 0, 0, 0];
  function neighbour(r, el) {            // the drop next to this one in the same row, in local px of this drop
    var q = el ? recs.get(el) : null;
    if (!q || q.seen !== frameNo) return NONE;
    var z = r.rect.width / r.cw;
    var cx = ((q.rect.left + q.rect.right) - (r.rect.left + r.rect.right)) / 2 / z, cy = ((q.rect.top + q.rect.bottom) - (r.rect.top + r.rect.bottom)) / 2 / z;
    if (Math.abs(cy) > Math.min(r.h, q.h) * 0.5 || Math.abs(cx) - (r.w + q.w) / 2 > 16) return NONE;
    return [cx, cy, q.w / 2, q.h / 2];
  }

  // returns 0 = nothing visible, 1 = nothing changed, 2 = drawn
  function render(now, dt, still, force) {
    if (!texReady) { loadScene(false); if (!texReady) return 0; }   // the image's load event starts the water
    var img = scene.el && scene.el.isConnected ? scene.el : null;
    var bgEl = shell ? shell.querySelector('.m-bg') : null;
    if (!img && !bgEl) return 0;
    var pA = PROF ? performance.now() : 0;
    var dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, DPR_CAP) * LEVELS[W3.level].q);
    var vw = window.innerWidth, vh = window.innerHeight;
    var list = [], total = 0, moved = false, key;
    frameNo++;
    recs.forEach(function (r) {
      if (!r.vis || r.behind || r.w < 6 || r.h < 6) return;
      var b = r.cv.getBoundingClientRect();
      if (b.width < 2 || b.height < 2 || b.bottom < 0 || b.top > vh || b.right < 0 || b.left > vw) return;
      r.rect = b; r.seen = frameNo;
      key = b.left + ',' + b.top + ',' + b.width + ',' + b.height; if (key !== r.last) { r.last = key; moved = true; }
      var s = dpr, a = b.width * b.height * s * s;
      if (a > MAX_PX_ONE) s *= Math.sqrt(MAX_PX_ONE / a);
      else if (a < 17000) s *= Math.min(1.6, Math.sqrt(17000 / a));   // very small canvases may not get a GPU surface
      r.s = s; total += b.width * b.height * s * s;
      list.push(r);
    });
    if (!list.length) return 0;
    if (moved) followUntil = Math.max(followUntil, now + 250);  // something carries the buttons along: keep following while it moves
    else if (!force) return 1;                                  // following a scroll or an animation: nothing moved
    lastFrame = now; needOne = false;
    if (!still) vt += dt * speed;
    var squeeze = total > MAX_PX_ALL ? Math.sqrt(MAX_PX_ALL / total) : 1;
    // shelf packing into a tight, roughly square atlas
    var x = 0, y = 0, rowH = 0, i, r, area = 0, maxW = 0;
    for (i = 0; i < list.length; i++) {
      r = list[i];
      r.bw = Math.max(2, Math.round(r.rect.width * r.s * squeeze)); r.bh = Math.max(2, Math.round(r.rect.height * r.s * squeeze));
      area += r.bw * r.bh; if (r.bw > maxW) maxW = r.bw;
    }
    var AW = Math.max(maxW, Math.min(2048, Math.ceil(Math.sqrt(area) * 1.3))), needW = 0;
    for (i = 0; i < list.length; i++) {
      r = list[i];
      if (x + r.bw > AW && x > 0) { x = 0; y += rowH + 1; rowH = 0; }
      r.ax = x; r.ay = y; x += r.bw + 1; if (r.bh > rowH) rowH = r.bh; if (x > needW) needW = x;
    }
    var needH = y + rowH;
    if (glc.width < needW || glc.height < needH || glc.width * glc.height > needW * needH * 2.5 + 65536) { glc.width = needW; glc.height = needH; }
    var GH = glc.height;

    // where the landscape image is painted (object-fit: cover + object-position)
    var ir = (img || bgEl).getBoundingClientRect(), nw = scene.nw, nh = scene.nh;
    if (!scene.pos && img) {
      var op = (getComputedStyle(img).objectPosition || '50% 50%').split(' ');
      scene.pos = [/%/.test(op[0]) ? parseFloat(op[0]) / 100 : 0.5, /%/.test(op[1] || '') ? parseFloat(op[1]) / 100 : 0.5];
    }
    var fx = scene.pos ? scene.pos[0] : 0.5, fy = scene.pos ? scene.pos[1] : 0.5;
    var sc = Math.max(ir.width / nw, ir.height / nh), dw = nw * sc, dh = nh * sc;
    var br = bgEl ? bgEl.getBoundingClientRect() : ir;
    var time = reduced() ? STILL_T : vt;

    var pB = PROF ? performance.now() : 0;
    gl.useProgram(prog);
    gl.viewport(0, 0, glc.width, glc.height); gl.disable(gl.SCISSOR_TEST); gl.clear(gl.COLOR_BUFFER_BIT); gl.enable(gl.SCISSOR_TEST);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(U.uTex, 0);
    gl.uniform4f(U.uImg, ir.left + (ir.width - dw) * fx, ir.top + (ir.height - dh) * fy, dw, dh);
    gl.uniform2f(U.uBgY, br.top, Math.max(1, br.height));
    var g = grad.stops;
    gl.uniform4f(U.uG0, g[0], g[1], g[2], g[3]); gl.uniform4f(U.uG1, g[4], g[5], g[6], g[7]);
    gl.uniform3f(U.uGCol, grad.col[0], grad.col[1], grad.col[2]);
    gl.uniform1f(U.uTime, time);
    gl.uniform1f(U.uFlat, FLAT ? 1 : 0);

    for (i = 0; i < list.length; i++) {
      r = list[i];
      // press spring (the drop spreads and wobbles back) and the ring from the touch point
      if (!still) {
        var steps = dt > 0.04 ? 4 : 2, hdt = Math.min(dt, 0.066) / steps;
        for (var k = 0; k < steps; k++) { r.pvel += (-(r.pv - r.ptarget) * 210 - r.pvel * 13) * hdt; r.pv += r.pvel * hdt; }
        if (r.ripT >= 0) { r.ripT += dt; if (r.ripT > 2) r.ripT = -1; }
      }
      var ripAge = r.ripT >= 0 ? r.ripT : 0, ripA = r.ripT >= 0 ? r.ripA * Math.exp(-r.ripT * 1.6) * Math.min(1, (2 - r.ripT) * 4) : 0;
      var zoom = r.rect.width / r.cw, yTop = GH - r.ay, nL = neighbour(r, r.btn.previousElementSibling), nR = neighbour(r, r.btn.nextElementSibling);
      gl.viewport(r.ax, yTop - r.bh, r.bw, r.bh); gl.scissor(r.ax, yTop - r.bh, r.bw, r.bh);
      gl.uniform4f(U.uVp, r.ax, yTop, r.bw, r.bh);
      gl.uniform1f(U.uPx, r.bw / r.cw);
      gl.uniform2f(U.uHalf, r.w / 2, r.h / 2);
      gl.uniform1f(U.uRad, r.rad);
      gl.uniform2f(U.uCtr, r.rect.left + r.rect.width / 2, r.rect.top + r.rect.height / 2);
      gl.uniform1f(U.uZoom, zoom);
      gl.uniform1f(U.uSeed, r.seed);
      gl.uniform4f(U.uTint, r.tint[0], r.tint[1], r.tint[2], r.tint[3]);
      gl.uniform4f(U.uUnder, r.under[0], r.under[1], r.under[2], r.under[3]);
      gl.uniform1f(U.uWet, r.under[4]);
      gl.uniform4f(U.uPress, r.px, r.py, r.pv, ripAge);
      gl.uniform1f(U.uRipA, ripA);
      gl.uniform1f(U.uInk, r.ink);
      gl.uniform4f(U.uLab, r.lab[0], r.lab[1], r.lab[2], r.lab[3]);
      gl.uniform4f(U.uNbL, nL[0], nL[1], nL[2], nL[3]);
      gl.uniform4f(U.uNbR, nR[0], nR[1], nR[2], nR[3]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    var pC = 0; if (PROF) { gl.finish(); pC = performance.now(); }
    // hand every drop to its helper canvas (same task, so the GL buffer needs no preserving)
    for (i = 0; i < list.length; i++) {
      r = list[i];
      if (r.cv.width !== r.bw || r.cv.height !== r.bh) { r.cv.width = r.bw; r.cv.height = r.bh; }
      r.ctx.globalCompositeOperation = 'copy';
      r.ctx.drawImage(glc, r.ax, r.ay, r.bw, r.bh, 0, 0, r.bw, r.bh);
      if (!r.painted) { r.painted = true; r.btn.setAttribute('data-w3', 'on'); }
    }
    if (PROF) { var pD = performance.now(), k1 = 0.1; W3.prof = W3.prof || [0, 0, 0]; W3.prof[0] += (pB - pA - W3.prof[0]) * k1; W3.prof[1] += (pC - pB - W3.prof[1]) * k1; W3.prof[2] += (pD - pC - W3.prof[2]) * k1; }
    W3.drops = list.length; W3.px = Math.round(total * squeeze * squeeze); W3.atlas = glc.width + 'x' + glc.height; W3.frames = (W3.frames || 0) + 1;
    return 2;
  }

  /* ------------------------------------------------------------------ wiring */
  function mine(el) { var b = el && el.closest ? el.closest(SEL) : null; return b && recs.has(b) ? b : null; }
  function press(btn, cx, cy) {
    var r = recs.get(btn); if (!r || btn.disabled) return;
    var b = r.cv.getBoundingClientRect(), zoom = b.width / (r.cw || 1) || 1;
    r.px = cx == null ? 0 : (cx - (b.left + b.width / 2)) / zoom;
    r.py = cy == null ? 0 : (cy - (b.top + b.height / 2)) / zoom;
    r.ptarget = 1; r.ripT = 0; r.ripA = 4.2;
  }
  function release() {
    var any = false;
    recs.forEach(function (r) { if (r.ptarget) { r.ptarget = 0; any = true; if (r.ripT < 0 || r.ripT > 0.7) { r.ripT = 0; r.ripA = 2.4; } } });   // long press: a second, smaller ring on release
    if (any) kick();
  }

  // The observer sees the children of the shell except the tab bar, the shell's own child list (main area and
  // sheets come and go), its parent's child list (the shell itself unmounts) and data-motion on <html>.
  function wire() {
    if (!mo) return;
    mo.disconnect();
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    if (shell && shell.parentNode) home = shell.parentNode;
    if (home && home.isConnected) mo.observe(home, { childList: true });
    if (!shell) return;
    mo.observe(shell, { childList: true, attributes: true, attributeFilter: ['class', 'data-look'] });
    for (var el = shell.firstElementChild; el; el = el.nextElementSibling)
      if (!el.classList.contains('m-tabs')) mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'src', 'srcset', 'disabled'] });
  }
  function onMutations(ms) {
    var rewire = false, i, m, r, own;
    for (i = 0; i < ms.length; i++) {
      m = ms[i];
      if (m.type === 'attributes') { restyle = true; dirty = true; continue; }
      own = m.addedNodes.length + m.removedNodes.length === 1 && (m.addedNodes[0] || m.removedNodes[0]).className === 'w3-drop';
      // React reset the content of a button: put the helper back before the next paint (its picture is kept)
      r = recs.get(m.target);
      if (r && r.cv.parentNode !== r.btn && r.btn.isConnected) { r.btn.insertBefore(r.cv, r.btn.firstChild); r.stale = true; dirty = true; continue; }
      if (own && m.addedNodes.length) continue;                // our own insert
      if (r) r.stale = true;
      if (m.target === shell || m.target === home) rewire = true;
      dirty = true;
    }
    if (rewire) wire();
    if (dirty) kick();
  }

  function on(target, name, fn, opt) { target.addEventListener(name, fn, opt); offs.push(function () { target.removeEventListener(name, fn, opt); }); }
  function start() {
    var cap = { capture: true, passive: true };
    shell = document.querySelector('.m-shell');
    if ('IntersectionObserver' in window) io = new IntersectionObserver(function (es) {
      for (var i = 0; i < es.length; i++) { var r = recs.get(es[i].target); if (r) r.vis = es[i].isIntersecting; }
      kick();
    }, { rootMargin: '40px' });
    if ('ResizeObserver' in window) ro = new ResizeObserver(function (es) {
      for (var i = 0; i < es.length; i++) { var r = recs.get(es[i].target); if (r) measure(r); }
      kick();
    });
    mo = new MutationObserver(onMutations); wire();
    on(window, 'scroll', function () { followUntil = performance.now() + 160; wake(); }, cap);       // follow scrolling frame by frame
    on(window, 'resize', function () { scene.pos = null; grad.key = ''; readGradient(); measureAll(); followUntil = performance.now() + 300; wake(); }, { passive: true });
    on(window, 'pointerdown', function (e) { var b = mine(e.target); if (b) press(b, e.clientX, e.clientY); wake(); }, cap);
    ['pointerup', 'pointercancel', 'dragend', 'keyup'].forEach(function (n) { on(window, n, release, cap); });
    on(window, 'blur', function (e) { if (e.target === window) release(); }, cap);   // the window lost focus (not: focus moved from one button to the next)
    on(window, 'keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { var b = mine(e.target); if (b) { press(b, null, null); wake(); } } }, cap);
    // a card that slides or fades in carries its buttons along: follow until it has arrived
    ['animationstart', 'transitionstart'].forEach(function (n) {
      on(window, n, function (e) { var t = e.target; if (shell && t && t.nodeType === 1 && t !== shell && shell.contains(t) && !recs.has(t) && t.querySelector(SEL)) { followUntil = performance.now() + 700; kick(); } }, cap);
    });
    on(document, 'visibilitychange', function () { if (!document.hidden) { lastFrame = lastTick = performance.now(); wake(); } });
    if (mqReduce.addEventListener) on(mqReduce, 'change', kick);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (window.__w3 === W3) { measureAll(); kick(); } });
    kick();
  }
  // for the app: call when the mobile shell unmounts
  W3.destroy = function () {
    if (raf) cancelAnimationFrame(raf); raf = 0; if (timer) clearTimeout(timer); timer = 0;
    if (mo) mo.disconnect(); if (io) io.disconnect(); if (ro) ro.disconnect(); mo = io = ro = null;
    offs.forEach(function (f) { f(); }); offs = [];
    recs.forEach(function (r) { detach(r); });
    var ext = gl && gl.getExtension('WEBGL_lose_context'); lost = true; if (ext) ext.loseContext();
    gl = null; W3.state = 'destroyed'; delete window.__w3;
  };
  start();
})();

/* ---- Karten und Leiste ----
   Everything about cards and tab bar is CSS (look.css). This section only adds the two answers to a touch, both
   transform and opacity only, nothing at rest:
   1. Ring: when a button drop on a card is pressed, ONE thin ring of light runs over the floor of that card, from
      under the finger. Helper <i class="wa-floor"><i class="wa-ring"></i></i> inside the card (aria-hidden, takes no
      clicks, gone after 1.2 s; nothing depends on it, React may throw it away at any time). When the touch turns
      into scrolling (pointercancel) the ring sinks away at once.
   2. Tab bar: the bead that marks the active tab FLOWS to the new tab - its leading edge runs ahead, the body
      stretches, the tail follows, it settles with a small overshoot. Driven only by which button carries class "on"
      (one MutationObserver for class changes); the bead is the bar's ::before and is animated with the Web
      Animations API. Without this script the bead still glides (CSS transition), with reduced motion it jumps.
   App: window.__wa.destroy() removes listeners and observer (call it when the mobile shell unmounts). */
(function () {
  'use strict';
  if (window.__wa) return;
  var RING_ON = '.glass.m-card';                                   // sheets whose floor shows the ring (later e.g. ', .sheet')
  var DROP = '.btn:not(.btn--ghost)';
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function still() { return mq.matches || document.documentElement.getAttribute('data-motion') === 'reduziert'; }

  /* -- 1. ring of light -- */
  var live = null;                                                 // the ring of a press that may still turn into a scroll
  function gone(floor) { if (floor.parentNode) floor.parentNode.removeChild(floor); if (live === floor) live = null; }
  function down(e) {
    var t = e.target, btn = t && t.closest ? t.closest(DROP) : null, card = btn && !btn.disabled ? btn.closest(RING_ON) : null;
    if (!card || !card.closest('.m-shell') || still()) return;
    var r = card.getBoundingClientRect(); if (!r.width || !card.offsetWidth) return;
    var zoom = r.width / card.offsetWidth;                         // CSS zoom or a transform on an ancestor
    var floor = document.createElement('i'), ring = document.createElement('i');
    floor.className = 'wa-floor'; floor.setAttribute('aria-hidden', 'true');
    ring.className = 'wa-ring' + (btn.classList.contains('btn--primary') ? ' wa-ring--primary' : btn.classList.contains('btn--danger') ? ' wa-ring--danger' : '');
    ring.style.left = (e.clientX - r.left) / zoom + 'px'; ring.style.top = (e.clientY - r.top) / zoom + 'px';
    floor.appendChild(ring); card.appendChild(floor); live = floor;
    ring.addEventListener('animationend', function () { gone(floor); }); setTimeout(function () { gone(floor); }, 1700);
  }
  function up() { live = null; }                                   // a real tap: the ring runs to its end
  function cancel() {                                              // the touch became a scroll: no ring
    var f = live; if (!f) return; live = null;
    f.classList.add('wa-floor--hush'); setTimeout(function () { gone(f); }, 220);
  }

  /* -- 2. the bead of the tab bar -- */
  var at = new WeakMap(), fly = null, canPseudo = null;
  function idx(nav) { var b = nav.children, i; for (i = 0; i < b.length; i++) if (b[i].classList && b[i].classList.contains('on')) return i; return -1; }
  function ease(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return 1 - Math.pow(1 - t, 3); }
  function flow(nav) {
    var to = idx(nav), from = at.get(nav); at.set(nav, to);
    if (to < 0 || from === undefined || from < 0 || from === to || still() || !nav.animate) return;
    if (canPseudo === null) { try { var probe = nav.animate([], { pseudoElement: '::before', duration: 1 }); canPseudo = !!probe.effect && probe.effect.pseudoElement === '::before'; probe.cancel(); } catch (err) { canPseudo = false; } }
    if (!canPseudo) return;                                        // the CSS transition alone moves the bead
    // where the bead is right now (a flight may still be under way): its centre in tab widths
    var cs = getComputedStyle(nav, '::before'), w = parseFloat(cs.width), m = /matrix\(([^)]+)\)/.exec(cs.transform || '');
    var pos = m && w ? parseFloat(m[1].split(',')[4]) / w : from;
    if (fly) fly.cancel();
    var d = to - pos, n = Math.abs(d), frames = [], k, t, lead, tail, a, b, sx, sy;
    for (k = 0; k <= 20; k++) {
      t = k / 20;
      lead = ease(t / 0.5) + 0.07 / Math.max(1, n) * Math.sin(Math.min(1, t / 0.86) * Math.PI) * (1 - t);   // the leading edge runs ahead and overshoots a little
      tail = ease((t - 0.14) / 0.66);                                                       // the tail lets go late and catches up
      tail += 0.1 * Math.sin(Math.max(0, Math.min(1, (t - 0.62) / 0.38)) * Math.PI) / Math.max(1, n);   // ... and pushes in: the bead is squeezed before it settles
      a = pos + d * (d > 0 ? tail : lead); b = pos + 1 + d * (d > 0 ? lead : tail);         // left and right edge, in tab widths
      a = Math.max(a, -0.03); b = Math.min(b, nav.children.length + 0.03);                    // the bead never leaves the pool
      sx = Math.max(0.5, b - a); sy = sx > 1 ? 1 - 0.2 * Math.min(1, (sx - 1) / 1.6) : 1 + (1 - sx) * 0.7;   // long and thin while it flows, squat when squeezed
      frames.push({ transform: 'translateX(' + ((a + b) / 2 - 0.5) * 100 + '%) scale(' + sx + ',' + sy + ')' });
    }
    fly = nav.animate(frames, { pseudoElement: '::before', duration: 460 + 70 * Math.min(3, n - 1), easing: 'linear' });
    fly.onfinish = fly.oncancel = function () { fly = null; };
  }
  var mo = new MutationObserver(function (ms) {
    for (var i = 0, seen = null, p; i < ms.length; i++) {
      p = ms[i].target.parentNode;
      if (p && p !== seen && p.classList && p.classList.contains('m-tabs')) { seen = p; flow(p); }
    }
  });
  function watch() {                                               // remember where the bead is; class changes anywhere below <body> are cheap to filter
    var navs = document.querySelectorAll('.m-shell .m-tabs'), i;
    for (i = 0; i < navs.length; i++) if (!at.has(navs[i])) at.set(navs[i], idx(navs[i]));
  }
  function tabDown(e) { var t = e.target; if (t && t.closest && t.closest('.m-tabs')) watch(); }   // a tab bar that mounted later: known before its first change

  function noop() {}
  var cap = { capture: true, passive: true };
  window.addEventListener('pointerdown', down, cap); window.addEventListener('pointerdown', tabDown, cap);
  window.addEventListener('pointerup', up, cap); window.addEventListener('pointercancel', cancel, cap);
  document.addEventListener('touchstart', noop, { passive: true });   // iPhone: Safari shows :active (pressed row, pressed tab) only when a touch listener exists
  mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
  watch();
  window.__wa = { destroy: function () {
    window.removeEventListener('pointerdown', down, cap); window.removeEventListener('pointerdown', tabDown, cap);
    window.removeEventListener('pointerup', up, cap); window.removeEventListener('pointercancel', cancel, cap);
    document.removeEventListener('touchstart', noop); mo.disconnect(); if (fly) fly.cancel();
    var f = document.querySelectorAll('.wa-floor'); for (var i = 0; i < f.length; i++) f[i].parentNode.removeChild(f[i]);
    delete window.__wa;
  } };
})();
