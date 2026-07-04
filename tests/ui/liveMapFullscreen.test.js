import { openFullscreenMap, closeFullscreenMap, isFullscreenOpen } from '../../src/ui/liveMapFullscreen.js';
import * as THREE from 'three';

describe('liveMapFullscreen', () => {
  let scene, renderer;

  beforeEach(() => {
    scene = new THREE.Scene();
    const canvas = document.createElement('canvas');
    renderer = new THREE.WebGLRenderer({ canvas });
  });

  afterEach(() => {
    closeFullscreenMap();
    renderer.dispose();
  });

  test('openFullscreenMap creates overlay', () => {
    const playerPos = { x: 0, z: 0 };
    const remotePlayers = [];
    const getPin = () => null;
    const setPin = jest.fn();

    openFullscreenMap(scene, renderer, playerPos, remotePlayers, getPin, setPin);

    expect(isFullscreenOpen()).toBe(true);
    const overlay = document.getElementById('live-map-fullscreen');
    expect(overlay).toBeTruthy();
  });

  test('closeFullscreenMap removes overlay', () => {
    openFullscreenMap(scene, renderer, {x:0,z:0}, [], ()=>null, ()=>{});
    closeFullscreenMap();

    expect(isFullscreenOpen()).toBe(false);
    const overlay = document.getElementById('live-map-fullscreen');
    expect(overlay).toBeFalsy();
  });
});
