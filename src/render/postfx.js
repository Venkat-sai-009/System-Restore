// Post-processing pass: draws the 2D canvas texture through the palette/corruption shader.
import * as THREE from 'three';
import { VIEW, FLOW } from '../config.js';
import { vertexShader, fragmentShader } from './shaders/palette.js';

export function createPostFx(sourceCanvas) {
  const texture = new THREE.CanvasTexture(sourceCanvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      tScene: { value: texture },
      uRes: { value: new THREE.Vector2(VIEW.width, VIEW.height) },
      uIntegrity: { value: 0 },
      uTime: { value: 0 },
      uGlitch: { value: 0 },
    },
    depthTest: false,
    depthWrite: false,
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(geometry, material));
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let time = 0;
  let glitch = 0;

  return {
    scene,
    camera,
    // Kick a short corruption burst (0..1).
    pulse(amount) {
      glitch = Math.max(glitch, amount);
    },
    update(dt, integrity) {
      time += dt;
      glitch = Math.max(0, glitch - FLOW.glitchDecay * dt);
      material.uniforms.uTime.value = time;
      material.uniforms.uGlitch.value = glitch;
      material.uniforms.uIntegrity.value = integrity;
      texture.needsUpdate = true;
    },
    dispose() {
      texture.dispose();
      material.dispose();
      geometry.dispose();
    },
  };
}
