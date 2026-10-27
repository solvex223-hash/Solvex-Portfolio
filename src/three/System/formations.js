// Ten procedural "formations" that the particle system (and the connection lines) morph between.
// Shared GLSL so the particles and the lines always agree on where the structure is.
//
// A formation takes r = (u, v, w, q), four uniform randoms per particle, and returns a position.
// Convention: r.x is always the coordinate ALONG the structure, so the line segments
// (r.x -> r.x + du) follow it.  t is flow time; the lines evaluate with t = 0 (static skeleton).
export const FORMATIONS_GLSL = /* glsl */ `
  uniform float uSettle;
  float gA; // per-formation alpha (fades flowing particles at both ends of their path)

  float fxH(float x) { return fract(sin(x * 127.1 + 311.7) * 43758.5453); }
  float fxE(float x) { x = clamp(x, 0.0, 1.0); return x * x * (3.0 - 2.0 * x); }

  // point on the perimeter of a rectangle (cx, cy, hx, hy), u in 0..1
  vec2 fxRect(vec4 c, float u) {
    float s = u * 4.0;
    float e = floor(s);
    float f = fract(s);
    vec2 p;
    if (e < 1.0) p = vec2(-1.0 + 2.0 * f, -1.0);
    else if (e < 2.0) p = vec2(1.0, -1.0 + 2.0 * f);
    else if (e < 3.0) p = vec2(1.0 - 2.0 * f, 1.0);
    else p = vec2(-1.0, 1.0 - 2.0 * f);
    return c.xy + p * c.zw;
  }

  // 01 AI AUTOMATION: repetitive lanes funnel into one coordinated sequence
  vec3 form0(vec4 r, float t) {
    float lane = floor(r.y * 7.0);
    float fp = fract(r.x + t * 0.035);
    float x = fp * 9.4 - 4.7;
    float cv = 1.0 - fxE((x + 0.8) / 4.2) * 0.9;
    float y = (lane - 3.0) * 0.82 * cv + (r.z - 0.5) * 0.07;
    gA = sin(3.14159 * fp);
    return vec3(x, y, (r.w - 0.5) * 1.0);
  }

  // 02 AI AGENTS: a branching decision tree with responsive nodes
  vec3 form1(vec4 r, float t) {
    float lvl = step(0.142857, r.y) + step(0.571429, r.y);
    float lo = lvl < 0.5 ? 0.0 : (lvl < 1.5 ? 0.142857 : 0.571429);
    float hi = lvl < 0.5 ? 0.142857 : (lvl < 1.5 ? 0.571429 : 1.0);
    float fr = (r.y - lo) / (hi - lo);
    float cnt = exp2(lvl);
    float idx = floor(fr * cnt);
    float side = step(0.5, fxH(r.z * 91.7 + r.y * 13.1));
    vec2 a = vec2(-4.2 + lvl * 2.85, ((idx + 0.5) / cnt - 0.5) * 6.0);
    float cidx = idx * 2.0 + side;
    vec2 b = vec2(-4.2 + (lvl + 1.0) * 2.85, ((cidx + 0.5) / (cnt * 2.0) - 0.5) * 6.0);
    vec2 p = vec2(mix(a.x, b.x, r.x), mix(a.y, b.y, fxE(r.x)));
    if (r.w > 0.9) {
      float an = r.x * 43.98;
      float rad = 0.1 + 0.18 * fxH(r.z * 53.0) + 0.04 * sin(t * 2.0 + cidx * 1.7);
      p = b + vec2(cos(an), sin(an)) * rad;
    }
    gA = 1.0;
    return vec3(p, (r.w - 0.5) * 0.8);
  }

  // 03 WHATSAPP AUTOMATION: messages enter an organised workflow through two gates
  vec3 form2(vec4 r, float t) {
    float fp = fract(r.x + t * 0.04);
    float x = fp * 9.6 - 4.8;
    float y0 = (fxH(r.y * 57.3 + r.z * 7.9) - 0.5) * 5.6;
    float slot = (floor(r.z * 5.0) - 2.0) * 0.78;
    float y = mix(y0, slot, fxE((x + 3.4) / 1.8));
    y = mix(y, slot * 0.3, fxE((x - 1.0) / 1.6));
    gA = sin(3.14159 * fp);
    vec3 p = vec3(x, y + (r.w - 0.5) * 0.05, (r.y - 0.5) * 1.0);
    if (r.w > 0.9) {
      float gx = r.w > 0.95 ? -1.2 : 1.6;
      p = vec3(gx, (r.x - 0.5) * 5.4, (r.y - 0.5) * 0.6);
      gA = 1.0;
    }
    return p;
  }

  // 04 AI CHATBOTS & CUSTOMER SUPPORT: enquiries routed toward three useful destinations
  vec3 form3(vec4 r, float t) {
    float fp = fract(r.x + t * 0.05);
    float hub = floor(r.y * 3.0);
    vec2 s = vec2(-4.6 + (r.z - 0.5) * 0.9, (fxH(r.y * 31.0 + r.z * 17.0) - 0.5) * 5.6);
    vec2 e = vec2(3.9, (hub - 1.0) * 2.3);
    vec2 p = vec2(mix(s.x, e.x, fp), mix(s.y, e.y, fxE(fp)));
    p.y += (r.w - 0.5) * 0.18 * sin(3.14159 * fp);
    gA = smoothstep(0.0, 0.1, fp) * smoothstep(1.0, 0.9, fp);
    return vec3(p, (r.w - 0.5) * 1.0);
  }

  vec4 fxRectDef(float i) {
    if (i < 0.5) return vec4(0.0, 0.0, 3.8, 2.6);
    if (i < 1.5) return vec4(0.0, 2.0, 3.6, 0.45);
    if (i < 2.5) return vec4(-2.5, -0.5, 1.0, 1.8);
    if (i < 3.5) return vec4(1.1, 0.55, 2.2, 0.7);
    if (i < 4.5) return vec4(-0.57, -1.35, 0.73, 0.9);
    if (i < 5.5) return vec4(1.1, -1.35, 0.73, 0.9);
    return vec4(2.77, -1.35, 0.73, 0.9);
  }

  // 05 WEBSITES & WEB APPLICATIONS: structural blocks forming one coherent layout
  vec3 form4(vec4 r, float t) {
    float i = floor(r.y * 7.0);
    vec2 p = fxRect(fxRectDef(i), r.x);
    gA = 1.0;
    return vec3(p, i * 0.1 - 0.3 + (r.z - 0.5) * 0.05);
  }

  // 06 CRM & LEAD AUTOMATION: prospects stacked into a pipeline that narrows stage by stage
  vec3 form5(vec4 r, float t) {
    float col = min(floor(pow(r.y, 1.35) * 4.0), 3.0);
    float cx = -3.6 + col * 2.4;
    float hh = 2.9 - col * 0.55;
    float rows = floor(hh * 2.0 / 0.3);
    float y = (floor(r.x * rows) + 0.5) / rows * 2.0 * hh - hh;
    float x = cx + (fxH(r.z * 91.0 + floor(r.x * rows)) - 0.5) * 0.8;
    gA = 1.0;
    if (r.w > 0.8 && col < 3.0) {
      float k = fract(r.x + t * 0.08);
      float e = fxE(k);
      x = mix(cx, cx + 2.4, e) + (r.z - 0.5) * 0.3;
      y = mix(y, y * (hh - 0.55) / hh, e);
      gA = sin(3.14159 * k) * 0.8 + 0.2;
    }
    return vec3(x, y, (r.w - 0.5) * 0.9);
  }

  // 07 LEAD GENERATION: pathways expanding outward toward new opportunities
  vec3 form6(vec4 r, float t) {
    float b = floor(r.y * 9.0);
    float ang = (b - 4.0) / 4.0 * 0.38;
    float grow = fract(r.x + t * 0.045);
    vec2 dir = vec2(cos(ang), sin(ang));
    vec2 o = vec2(-4.5, 0.0);
    vec2 p = o + dir * (8.2 * grow) + vec2(0.0, sin(grow * 3.14159) * sin(b * 1.7 + 1.0) * 0.35);
    float sp = step(0.55, r.w) * step(0.45, grow) * (r.z < 0.5 ? -1.0 : 1.0);
    p.y += sp * (grow - 0.45) * 1.8;
    gA = sin(3.14159 * grow);
    if (r.w > 0.93) {
      vec2 tip = o + dir * 8.2;
      float an = r.x * 62.8;
      p = tip + vec2(cos(an), sin(an)) * (0.06 + 0.12 * fxH(r.z * 41.0));
      gA = 1.0;
    }
    return vec3(p, (r.w - 0.5) * 0.8);
  }

  // 08 DIGITAL MARKETING & SEO: signals converging on a centre, organised in rings of reach
  vec3 form7(vec4 r, float t) {
    vec2 p;
    gA = 1.0;
    if (r.w < 0.62) {
      float ring = floor(r.y * 4.0);
      float a = r.x * 6.28318 + t * 0.06 * (mod(ring, 2.0) < 0.5 ? 1.0 : -1.0);
      p = vec2(cos(a), sin(a)) * (1.1 + ring * 0.8);
    } else if (r.w < 0.9) {
      float a = floor(r.y * 12.0) / 12.0 * 6.28318 + 0.26;
      float fp = fract(r.x + t * 0.06);
      p = vec2(cos(a), sin(a)) * mix(3.6, 0.45, fp);
      gA = sin(3.14159 * fp);
    } else {
      float a = r.x * 18.8496;
      p = vec2(cos(a), sin(a)) * (0.08 + 0.3 * fxH(r.z * 77.0));
    }
    return vec3(p.x, p.y * 0.94, p.y * 0.34 + (r.z - 0.5) * 0.1);
  }

  // 09 BRANDING & CREATIVE DESIGN: precise construction geometry of an identity mark
  vec3 form8(vec4 r, float t) {
    float form = floor(r.y * 5.0);
    float a = r.x * 6.28318;
    vec2 p;
    float z = 0.0;
    gA = 1.0;
    if (form < 0.5) { p = vec2(cos(a), sin(a)) * 2.8; z = 0.25; }
    else if (form < 1.5) { p = vec2(cos(a), sin(a)) * 1.4; }
    else if (form < 2.5) {
      vec2 q = fxRect(vec4(0.0, 0.0, 2.0, 2.0), r.x);
      float c = 0.70711;
      p = vec2(c * q.x - c * q.y, c * q.x + c * q.y);
      z = -0.25;
    }
    else if (form < 3.5) { p = vec2(cos(a), sin(a)) * (0.08 + 0.4 * fxH(r.z * 63.0)); }
    else {
      float s = (r.x - 0.5) * 7.6;
      p = r.z < 0.5 ? vec2(s, 0.0) : vec2(0.0, s * 0.8);
    }
    return vec3(p, z + (r.w - 0.5) * 0.04);
  }

  vec4 fxMod(float i) {
    if (i < 0.5) return vec4(-2.3, 1.4, 1.5, 1.2);
    if (i < 1.5) return vec4(1.5, 1.4, 2.3, 1.2);
    if (i < 2.5) return vec4(-1.7, -1.3, 2.1, 1.3);
    if (i < 3.5) return vec4(1.4, -1.3, 0.8, 1.3);
    return vec4(3.1, -1.3, 0.7, 1.3);
  }

  // 10 CUSTOM DIGITAL SOLUTIONS: separate components assemble into one tailored whole
  vec3 form9(vec4 r, float t) {
    float i = r.y < 0.195 ? 0.0 : (r.y < 0.494 ? 1.0 : (r.y < 0.789 ? 2.0 : (r.y < 0.902 ? 3.0 : 4.0)));
    vec4 c = fxMod(i);
    vec2 off = (vec2(fxH(i * 12.9 + 1.0), fxH(i * 7.3 + 4.0)) - 0.5) * 5.0 * (1.0 - uSettle);
    vec2 p;
    if (r.w < 0.55) p = fxRect(c, r.x);
    else p = c.xy + vec2((r.x * 2.0 - 1.0) * c.z, (r.z * 2.0 - 1.0) * c.w);
    gA = 1.0;
    return vec3(p + off, i * 0.18 - 0.3 + (1.0 - uSettle) * (fxH(i * 3.1) - 0.5) * 2.0);
  }

  vec3 formation(int id, vec4 r, float t) {
    gA = 1.0;
    if (id == 0) return form0(r, t);
    if (id == 1) return form1(r, t);
    if (id == 2) return form2(r, t);
    if (id == 3) return form3(r, t);
    if (id == 4) return form4(r, t);
    if (id == 5) return form5(r, t);
    if (id == 6) return form6(r, t);
    if (id == 7) return form7(r, t);
    if (id == 8) return form8(r, t);
    return form9(r, t);
  }

  // service = 0..9 (fractional while one formation morphs into the next, staggered per particle)
  vec3 fxPlace(vec4 r, float t, float seed, float service, float yawTime, out float ga) {
    float xi = min(floor(service), 9.0);
    float xf = service - xi;
    float xm = clamp(xf * 1.6 - seed * 0.6, 0.0, 1.0);
    xm = xm * xm * (3.0 - 2.0 * xm);
    vec3 fa = formation(int(xi), r, t);
    ga = gA;
    vec3 fb = fa;
    if (xf > 0.001 && xi < 8.5) {
      fb = formation(int(xi) + 1, r, t);
      ga = mix(ga, gA, xm);
    }
    vec3 q = mix(fa, fb, xm);
    float yaw = sin(yawTime * 0.12) * 0.28; // slow, controlled sway for depth
    q.xz = vec2(cos(yaw) * q.x + sin(yaw) * q.z, -sin(yaw) * q.x + cos(yaw) * q.z);
    return q;
  }
`;
