import * as THREE from 'three';
import { loadModel, disposeModel } from './modelLoader';
import { startEmergenceAnimation, updateIdleAnimation } from './animationController';
import { AnimalModel } from '../App';

// MindAR types (since the library doesn't provide TypeScript definitions)
interface MindARThreeInstance {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  start: () => Promise<void>;
  stop: () => void;
  addAnchor: (index: number) => MindARAnchor;
}

interface MindARAnchor {
  group: THREE.Group & {
    addEventListener(event: 'targetFound', listener: () => void): void;
    addEventListener(event: 'targetLost', listener: () => void): void;
  };
  onTargetFound?: () => void;
  onTargetLost?: () => void;
}

// Global reference to MindAR loaded from CDN
declare global {
  interface Window {
    MindARThree?: any;
  }
}

let mindarThree: MindARThreeInstance | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.Camera | null = null;
let anchor: MindARAnchor | null = null;
let currentModel: THREE.Object3D | null = null;
let animationFrameId: number | null = null;
let isTracking = false;
let cameraStream: MediaStream | null = null;

// Lighting setup
let ambientLight: THREE.AmbientLight | null = null;
let directionalLight: THREE.DirectionalLight | null = null;
let shadowPlane: THREE.Mesh | null = null;

/**
 * Wait for MindAR library to load from CDN
 */
async function waitForMindAR(): Promise<void> {
  console.log('[AR] Waiting for MindAR library to load from CDN...');
  
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.MindARThree) {
      console.log('[AR] MindAR library already loaded');
      resolve();
      return;
    }

    // Wait for script to load (max 10 seconds)
    let attempts = 0;
    const maxAttempts = 100;
    const checkInterval = setInterval(() => {
      attempts++;
      if (window.MindARThree) {
        clearInterval(checkInterval);
        console.log('[AR] MindAR library loaded successfully');
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.error('[AR] MindAR library failed to load from CDN after 10 seconds');
        reject(new Error('MindAR library failed to load from CDN. Please check your internet connection.'));
      }
    }, 100);
  });
}

/**
 * Validate that required AR assets exist before initialization
 */
async function validateAssets(): Promise<{ success: boolean; error?: { type: string; message: string } }> {
  console.log('[AR] Validating AR assets...');
  
  try {
    // Validate target file exists
    const targetPath = '/targets/shirt-target.mind';
    console.log(`[AR] Checking target file: ${targetPath}`);
    
    const targetResponse = await fetch(targetPath, { method: 'HEAD' });
    if (!targetResponse.ok) {
      console.error(`[AR] Target file not found or inaccessible: ${targetPath} (status: ${targetResponse.status})`);
      return {
        success: false,
        error: {
          type: 'validation',
          message: `AR tracking file is missing (${targetPath}). Please ensure the target file is properly deployed.`
        }
      };
    }
    console.log('[AR] Target file validated successfully');

    // Validate model files exist
    const modelPaths = [
      '/models/AlexBird-1.glb',
      '/models/Bear-1.glb',
      '/models/Deer-1.glb'
    ];

    for (const modelPath of modelPaths) {
      console.log(`[AR] Checking model file: ${modelPath}`);
      const modelResponse = await fetch(modelPath, { method: 'HEAD' });
      if (!modelResponse.ok) {
        console.error(`[AR] Model file not found or inaccessible: ${modelPath} (status: ${modelResponse.status})`);
        return {
          success: false,
          error: {
            type: 'validation',
            message: `3D model file is missing (${modelPath}). Please ensure all model files are properly deployed.`
          }
        };
      }
    }
    console.log('[AR] All model files validated successfully');

    console.log('[AR] Asset validation complete - all assets present');
    return { success: true };
  } catch (error: any) {
    console.error('[AR] Asset validation failed with error:', error);
    return {
      success: false,
      error: {
        type: 'validation',
        message: `Failed to validate AR assets: ${error.message || 'Network error'}. Please check your internet connection.`
      }
    };
  }
}

/**
 * Check for WebGL support
 */
function checkWebGLSupport(): { success: boolean; error?: { type: string; message: string } } {
  console.log('[AR] Checking WebGL support...');
  
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      console.error('[AR] WebGL is not supported on this device/browser');
      return {
        success: false,
        error: {
          type: 'webgl',
          message: 'WebGL is not supported on this device. Please try using a modern browser like Chrome, Firefox, or Safari.'
        }
      };
    }
    
    console.log('[AR] WebGL is supported');
    return { success: true };
  } catch (error: any) {
    console.error('[AR] WebGL check failed:', error);
    return {
      success: false,
      error: {
        type: 'webgl',
        message: 'Failed to initialize WebGL. Your device may not support AR experiences.'
      }
    };
  }
}

/**
 * Request camera permission before initializing AR
 */
async function requestCameraPermission(): Promise<{ success: boolean; error?: { type: string; message: string } }> {
  console.log('[AR] Requesting camera permission...');
  
  try {
    // Request camera access
    cameraStream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    });
    
    console.log('[AR] Camera permission granted');
    
    // Stop the stream immediately - MindAR will handle the actual camera
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('[AR] Camera permission error:', error);
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      console.error('[AR] Camera access denied by user');
      return {
        success: false,
        error: {
          type: 'permission',
          message: 'Camera access denied. Please enable camera permissions in your browser settings and refresh the page.'
        }
      };
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      console.error('[AR] No camera device found');
      return {
        success: false,
        error: {
          type: 'not-found',
          message: 'No camera found on your device. Please ensure your device has a camera.'
        }
      };
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      console.error('[AR] Camera is in use by another application');
      return {
        success: false,
        error: {
          type: 'in-use',
          message: 'Camera is already in use by another application. Please close other apps using the camera and try again.'
        }
      };
    } else {
      console.error('[AR] Unknown camera error:', error.message);
      return {
        success: false,
        error: {
          type: 'unknown',
          message: `Failed to access camera: ${error.message || 'Unknown error'}. Please check your browser settings and try again.`
        }
      };
    }
  }
}

/**
 * Initialize the AR system with MindAR image tracking
 */
export async function initializeAR(container: HTMLElement): Promise<{ success: boolean; error?: { type: string; message: string } }> {
  console.log('[AR] Starting AR initialization...');
  
  try {
    // Step 1: Check WebGL support
    const webglCheck = checkWebGLSupport();
    if (!webglCheck.success) {
      return webglCheck;
    }

    // Step 2: Validate assets exist
    const assetValidation = await validateAssets();
    if (!assetValidation.success) {
      return assetValidation;
    }

    // Step 3: Wait for MindAR library to load from CDN
    try {
      await waitForMindAR();
    } catch (error: any) {
      console.error('[AR] Failed to load MindAR library:', error);
      return {
        success: false,
        error: {
          type: 'library',
          message: error.message || 'AR library failed to load. Please refresh the page and check your internet connection.'
        }
      };
    }
    
    if (!window.MindARThree) {
      console.error('[AR] MindAR library not available after loading');
      return {
        success: false,
        error: {
          type: 'library',
          message: 'AR library failed to load. Please refresh the page.'
        }
      };
    }

    // Step 4: Request camera permission
    const permissionResult = await requestCameraPermission();
    if (!permissionResult.success) {
      return permissionResult;
    }

    // Step 5: Create MindAR instance
    console.log('[AR] Creating MindAR instance...');
    try {
      mindarThree = new window.MindARThree({
        container: container,
        imageTargetSrc: '/targets/shirt-target.mind',
      }) as MindARThreeInstance;
      
      console.log('[AR] MindAR instance created successfully');
    } catch (error: any) {
      console.error('[AR] Failed to create MindAR instance:', error);
      
      // Check for specific MindAR errors
      if (error.message && error.message.includes('target')) {
        return {
          success: false,
          error: {
            type: 'initialization',
            message: 'Invalid AR target file. The tracking image may be corrupted. Please refresh the page.'
          }
        };
      }
      
      return {
        success: false,
        error: {
          type: 'initialization',
          message: `Failed to initialize AR tracking: ${error.message || 'Unknown error'}. Please refresh the page.`
        }
      };
    }

    // Step 6: Setup Three.js scene
    console.log('[AR] Setting up Three.js scene...');
    try {
      renderer = mindarThree.renderer;
      scene = mindarThree.scene;
      camera = mindarThree.camera;

      // Configure renderer for physically correct rendering
      if (renderer) {
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        console.log('[AR] Renderer configured successfully');
      } else {
        console.error('[AR] Renderer not available from MindAR instance');
        throw new Error('Failed to initialize renderer');
      }

      // Add anchor for image target (index 0)
      console.log('[AR] Adding anchor for image target...');
      anchor = mindarThree.addAnchor(0);
      
      if (!anchor) {
        console.error('[AR] Failed to create anchor');
        throw new Error('Failed to create AR anchor');
      }
      console.log('[AR] Anchor created successfully');

      // Setup physically correct lighting
      setupLighting();

      // Setup shadow plane
      setupShadowPlane();

      // Handle target found/lost events
      if (anchor) {
        anchor.group.addEventListener('targetFound', () => {
          console.log('[AR] Target found - starting emergence animation');
          isTracking = true;
          if (currentModel) {
            startEmergenceAnimation(currentModel);
          }
        });

        anchor.group.addEventListener('targetLost', () => {
          console.log('[AR] Target lost');
          isTracking = false;
        });
      }

      console.log('[AR] Scene setup complete');
    } catch (error: any) {
      console.error('[AR] Scene setup failed:', error);
      return {
        success: false,
        error: {
          type: 'initialization',
          message: `Failed to setup AR scene: ${error.message || 'Unknown error'}. Please refresh the page.`
        }
      };
    }

    console.log('[AR] Initialization complete - AR system ready');
    return { success: true };
  } catch (error: any) {
    console.error('[AR] Unexpected error during initialization:', error);
    return {
      success: false,
      error: {
        type: 'initialization',
        message: `Unexpected error: ${error.message || 'Unknown error'}. Please refresh the page and try again.`
      }
    };
  }
}

/**
 * Setup physically correct lighting system
 */
function setupLighting() {
  if (!scene) {
    console.error('[AR] Cannot setup lighting - scene not available');
    return;
  }

  console.log('[AR] Setting up lighting...');

  // Ambient light for overall illumination
  ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // Directional light for shadows and depth
  directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(2, 4, 3);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 10;
  scene.add(directionalLight);
  
  console.log('[AR] Lighting setup complete');
}

/**
 * Setup soft shadow plane beneath models
 */
function setupShadowPlane() {
  if (!anchor) {
    console.error('[AR] Cannot setup shadow plane - anchor not available');
    return;
  }

  console.log('[AR] Setting up shadow plane...');

  const geometry = new THREE.PlaneGeometry(1.5, 1.5);
  const material = new THREE.ShadowMaterial({
    opacity: 0.3,
    transparent: true,
  });

  shadowPlane = new THREE.Mesh(geometry, material);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -0.01; // Slightly below model base
  shadowPlane.receiveShadow = true;

  anchor.group.add(shadowPlane);
  
  console.log('[AR] Shadow plane setup complete');
}

/**
 * Start the AR experience
 */
export async function startAR() {
  console.log('[AR] Starting AR tracking...');
  
  if (!mindarThree) {
    console.error('[AR] Cannot start AR - MindAR instance not initialized');
    throw new Error('AR system not initialized. Please refresh the page.');
  }

  try {
    await mindarThree.start();
    console.log('[AR] MindAR tracking started successfully');

    // Start render loop
    startRenderLoop();
    console.log('[AR] Render loop started');
  } catch (error: any) {
    console.error('[AR] Failed to start MindAR tracking:', error);
    
    // Provide specific error messages for common MindAR start failures
    if (error.message && error.message.includes('camera')) {
      throw new Error('Failed to access camera for AR tracking. Please check camera permissions.');
    } else if (error.message && error.message.includes('target')) {
      throw new Error('Failed to load AR target. The tracking image may be invalid.');
    } else {
      throw new Error(`Failed to start AR tracking: ${error.message || 'Unknown error'}`);
    }
  }
}

/**
 * Stop the AR experience
 */
export function stopAR() {
  console.log('[AR] Stopping AR experience...');
  
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    console.log('[AR] Render loop stopped');
  }

  if (mindarThree) {
    mindarThree.stop();
    console.log('[AR] MindAR tracking stopped');
  }

  if (currentModel) {
    disposeModel(currentModel);
    currentModel = null;
    console.log('[AR] Current model disposed');
  }

  // Clean up camera stream if any
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    console.log('[AR] Camera stream cleaned up');
  }
  
  console.log('[AR] AR experience stopped');
}

/**
 * Switch to a different animal model
 */
export async function switchModel(modelName: AnimalModel) {
  console.log(`[AR] Switching to model: ${modelName}`);
  
  if (!anchor) {
    console.error('[AR] Cannot switch model - anchor not available');
    return;
  }

  // Remove current model
  if (currentModel) {
    anchor.group.remove(currentModel);
    disposeModel(currentModel);
    currentModel = null;
    console.log('[AR] Previous model removed');
  }

  // Load new model
  try {
    const model = await loadModel(modelName);
    if (!model) {
      console.error(`[AR] Failed to load model: ${modelName}`);
      return;
    }
    
    console.log(`[AR] Model loaded: ${modelName}`);

    // Configure model for AR display
    model.position.set(0, 0, 0);
    model.scale.set(0.01, 0.01, 0.01); // Start small for emergence animation

    // Enable shadows on model
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        // Ensure proper material properties for PBR
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => {
              if (mat instanceof THREE.MeshStandardMaterial) {
                mat.needsUpdate = true;
              }
            });
          } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
            mesh.material.needsUpdate = true;
          }
        }
      }
    });

    anchor.group.add(model);
    currentModel = model;
    console.log(`[AR] Model added to scene: ${modelName}`);

    // Start emergence animation if tracking
    if (isTracking) {
      console.log('[AR] Starting emergence animation for new model');
      startEmergenceAnimation(model);
    }
  } catch (error: any) {
    console.error(`[AR] Error switching to model ${modelName}:`, error);
  }
}

/**
 * Optimized render loop - only updates when necessary
 */
function startRenderLoop() {
  const clock = new THREE.Clock();

  function animate() {
    animationFrameId = requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // Update idle animation if model is present and tracking
    if (currentModel && isTracking) {
      updateIdleAnimation(currentModel, delta);
    }

    // Render scene
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  animate();
}

/**
 * Get the current renderer for capture functionality
 */
export function getRenderer(): THREE.WebGLRenderer | null {
  return renderer;
}
