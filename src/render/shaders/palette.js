// Palette + corruption shader. The whole look is driven by one `uIntegrity` uniform (0..1).

export const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
uniform sampler2D tScene;   // the 320x180 game picture drawn by the 2D canvas
uniform vec2 uRes;          // internal resolution in pixels
uniform float uIntegrity;   // system integrity 0..1: 0 = muted, few colours; 1 = vivid full palette
uniform float uTime;        // seconds, drives the glitch flicker
uniform float uGlitch;      // short corruption pulse 0..1 (boot, story, bounce-back, repairs)
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// Ordered (Bayer 4x4) dither threshold in 0..1.
float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }

vec3 fetch(vec2 p) {
  vec2 q = clamp(p, vec2(0.0), uRes - 1.0);
  return texture2D(tScene, (q + 0.5) / uRes).rgb;
}

void main() {
  // Idle corruption is faint; the big effects come from the uGlitch pulses.
  float idle = (1.0 - uIntegrity) * 0.25;
  float g = clamp(idle + uGlitch, 0.0, 1.0);

  vec2 px = floor(vUv * uRes);

  // Block shifts: 8 or 16 pixel tiles jump around a few times a second.
  float tick = floor(uTime * 7.0);
  float blockSize = hash(vec2(tick, 1.7)) > 0.5 ? 16.0 : 8.0;
  vec2 cell = floor(px / blockSize);
  float roll = hash(cell + tick * 1.31);
  float shiftOn = step(1.0 - (idle * 0.012 + uGlitch * 0.2), roll);
  vec2 offset = floor((vec2(hash(cell + tick + 3.0), hash(cell + tick + 7.0)) - 0.5) * 2.0 * blockSize);
  vec2 p = px + offset * shiftOn;

  // Colour channel offset (only during pulses).
  float split = floor(uGlitch * 3.0 + 0.5);
  vec3 c = vec3(fetch(p + vec2(split, 0.0)).r, fetch(p).g, fetch(p - vec2(split, 0.0)).b);

  // Healing: colours start muted with few levels per channel, and unlock as integrity rises.
  float d = bayer4(px) - 0.5;
  float ditherAmount = (1.0 - uIntegrity) * 0.12 + uGlitch * 0.3;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  float sat = mix(0.72, 1.0, uIntegrity);
  vec3 tint = mix(vec3(0.95, 1.0, 0.98), vec3(1.0), uIntegrity);
  vec3 muted = mix(vec3(lum), c, sat) * tint;
  float levels = floor(mix(6.0, 16.0, uIntegrity));
  vec3 outc = floor(muted * levels + d * ditherAmount + 0.5) / levels;

  // Very light scanlines.
  outc *= 1.0 - 0.04 * mod(px.y, 2.0);
  gl_FragColor = vec4(outc, 1.0);
}
`;
