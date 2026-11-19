// Low-resolution renderer: a 320x180 2D canvas is the "framebuffer", three.js post-processes it
// and CSS scales the result up with pixelated filtering. Falls back to the raw canvas if WebGL fails.
import * as THREE from 'three';
import { VIEW } from '../config.js';
import { createPostFx } from './postfx.js';

export function createRenderer(root) {
  const source = document.createElement('canvas');
  source.width = VIEW.width;
  source.height = VIEW.height;
  const g = source.getContext('2d', { alpha: false });
  g.imageSmoothingEnabled = false;

  let webgl = null;
  let postfx = null;
  let output = source;
  try {
    webgl = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    webgl.setPixelRatio(1);
    webgl.setSize(VIEW.width, VIEW.height, false);
    postfx = createPostFx(source);
    output = webgl.domElement;
  } catch (e) {
    webgl = null;
    postfx = { pulse() {}, update() {}, dispose() {} };
  }
  root.appendChild(output);

  // Integer scale when it fits, so every game pixel is the same size on screen.
  function resize() {
    const fit = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
    const scale = fit >= 1 ? Math.floor(fit) : fit;
    output.style.width = Math.floor(VIEW.width * scale) + 'px';
    output.style.height = Math.floor(VIEW.height * scale) + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  return {
    canvas: output,
    g,
    postfx,
    toGame(clientX, clientY) {
      const r = output.getBoundingClientRect();
      return {
        x: ((clientX - r.left) / r.width) * VIEW.width,
        y: ((clientY - r.top) / r.height) * VIEW.height,
      };
    },
    present(dt, integrity) {
      postfx.update(dt, integrity);
      if (webgl) webgl.render(postfx.scene, postfx.camera);
    },
  };
}
