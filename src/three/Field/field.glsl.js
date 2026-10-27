// A true 3D volume of matter: three depth layers that fill the camera frustum at every depth,
// moved by a smooth domain-warped flow field. Stateless (computed on the GPU from per-particle
// randoms), so there are no buffers to ping-pong and nothing allocated per frame.
//
// Layers (r.y): fine far dust 66%, mid-field 30%, a restrained 4% of brighter near "focal" particles.
// The field is built relative to the camera (FL_CAMZ) so it fills the viewport on any aspect ratio.
export const FIELD_GLSL = /* glsl */ `
  uniform float uSettle;

  const float FL_CAMZ = 16.0;   // camera distance the field is composed for
  const float FL_TAN = 0.3443;  // tan(fov / 2) for the 38 degree camera

  // coherent, low-frequency flow (sums of offset sines): smooth and divergence-light, no straight lanes
  vec3 flFlow(vec3 p, float t) {
    return vec3(
      sin(p.y * 0.93 + t * 0.060) + 0.6 * sin(p.z * 1.31 - t * 0.045 + 1.7),
      sin(p.z * 0.83 + t * 0.050 + 2.3) + 0.6 * sin(p.x * 1.19 - t * 0.040),
      sin(p.x * 0.77 + t * 0.055 + 4.1) + 0.6 * sin(p.y * 1.07 + t * 0.035 + 0.6)
    );
  }

  // Home position of a particle inside the volume.
  // layer: 0 dust, 1 mid, 2 focal.  D: distance from the camera plane.
  vec3 fieldHome(vec4 r, float t, float service, float aspect, float settle, out float layer, out float D) {
    float k;
    float z;
    if (r.y < 0.66) { layer = 0.0; k = r.y / 0.66; z = mix(-34.0, -12.0, k); }
    else if (r.y < 0.96) { layer = 1.0; k = (r.y - 0.66) / 0.30; z = mix(-12.0, 2.0, k); }
    else { layer = 2.0; k = (r.y - 0.96) / 0.04; z = mix(2.0, 8.0, k); }
    D = FL_CAMZ - z;

    // fill the frustum at this depth (+18 % margin so nothing ends at the screen edge)
    float hx = D * FL_TAN * 1.18 * aspect;
    float hy = D * FL_TAN * 1.18;
    vec3 p = vec3((r.x * 2.0 - 1.0) * hx, (r.z * 2.0 - 1.0) * hy, z);

    // scroll evolves the flow itself (phase) and pans the camera through the volume (parallax)
    float tt = t + service * 4.0;
    vec3 q = p * 0.17;
    vec3 w = flFlow(q, tt);
    vec3 d = flFlow(q * 1.9 + w * 0.8, tt * 1.3);
    float amp = (0.11 * D + 1.4) * (1.0 - 0.35 * settle); // large warp: density gathers into clouds and voids
    p += (w * 0.6 + d * 0.5) * amp;

    float pan = service * 1.4 + t * 0.05;
    p.x = mod(p.x - pan + hx, 2.0 * hx) - hx; // wraps beyond the screen edge, never visibly
    return p;
  }
`;
