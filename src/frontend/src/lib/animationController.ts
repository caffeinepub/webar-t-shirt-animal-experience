import * as THREE from 'three';

// Animation state
const animationState = new Map<THREE.Object3D, {
  emergenceProgress: number;
  idleTime: number;
  targetScale: number;
  targetY: number;
}>();

/**
 * Easing function for smooth emergence animation (easeOutBack)
 */
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * Start the emergence animation for a model
 * Models start small and slightly inside the shirt, then emerge outward with scale-up
 */
export function startEmergenceAnimation(model: THREE.Object3D) {
  // Initialize animation state
  animationState.set(model, {
    emergenceProgress: 0,
    idleTime: 0,
    targetScale: 0.3, // Final scale
    targetY: 0.15, // Final Y position (above shirt surface)
  });

  // Set initial state (small and slightly recessed)
  model.scale.set(0.01, 0.01, 0.01);
  model.position.y = -0.05; // Slightly inside shirt
  model.position.z = 0; // Z-offset for emergence effect
}

/**
 * Update animations each frame
 */
export function updateIdleAnimation(model: THREE.Object3D, delta: number) {
  const state = animationState.get(model);
  if (!state) return;

  // Emergence animation (first 1.5 seconds)
  if (state.emergenceProgress < 1) {
    state.emergenceProgress += delta * 0.8; // Animation speed

    if (state.emergenceProgress > 1) {
      state.emergenceProgress = 1;
    }

    // Apply easing
    const easedProgress = easeOutBack(state.emergenceProgress);

    // Scale up
    const scale = 0.01 + (state.targetScale - 0.01) * easedProgress;
    model.scale.set(scale, scale, scale);

    // Move upward
    const y = -0.05 + (state.targetY + 0.05) * easedProgress;
    model.position.y = y;

    // Z-offset for "coming out" effect
    const z = 0.1 * easedProgress;
    model.position.z = z;

    // Subtle bounce at the end
    if (state.emergenceProgress > 0.8) {
      const bounceProgress = (state.emergenceProgress - 0.8) / 0.2;
      const bounce = Math.sin(bounceProgress * Math.PI) * 0.02;
      model.position.y += bounce;
    }
  } else {
    // Idle animation (breathing/bobbing)
    state.idleTime += delta;

    // Gentle breathing motion
    const breathScale = Math.sin(state.idleTime * 1.5) * 0.01;
    const currentScale = state.targetScale + breathScale;
    model.scale.set(currentScale, currentScale, currentScale);

    // Subtle bobbing motion
    const bob = Math.sin(state.idleTime * 2) * 0.008;
    model.position.y = state.targetY + bob;

    // Gentle rotation
    model.rotation.y = Math.sin(state.idleTime * 0.5) * 0.1;
  }
}
