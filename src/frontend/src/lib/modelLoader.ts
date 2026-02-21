import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { AnimalModel } from '../App';

// Model cache for preloaded models
const modelCache: Map<AnimalModel, THREE.Object3D> = new Map();

// GLTF and DRACO loaders
let gltfLoader: GLTFLoader | null = null;
let dracoLoader: DRACOLoader | null = null;

/**
 * Initialize loaders with DRACO compression support
 */
function initializeLoaders() {
  if (gltfLoader) return;

  console.log('[ModelLoader] Initializing GLTF and DRACO loaders...');

  // Setup DRACO loader for compressed models
  dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
  dracoLoader.setDecoderConfig({ type: 'js' });

  // Setup GLTF loader
  gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);
  
  console.log('[ModelLoader] Loaders initialized');
}

/**
 * Model paths configuration
 */
const modelPaths: Record<AnimalModel, string> = {
  AlexBird: '/models/AlexBird-1.glb',
  Bear: '/models/Bear-1.glb',
  Deer: '/models/Deer-1.glb',
};

/**
 * Load a single model with progress tracking
 */
export async function loadModel(
  modelName: AnimalModel,
  onProgress?: (progress: number) => void
): Promise<THREE.Object3D | null> {
  initializeLoaders();

  console.log(`[ModelLoader] Loading model: ${modelName}`);

  // Return cached model if available
  if (modelCache.has(modelName)) {
    console.log(`[ModelLoader] Returning cached model: ${modelName}`);
    const cached = modelCache.get(modelName)!;
    if (onProgress) onProgress(100);
    return cached.clone();
  }

  if (!gltfLoader) {
    console.error('[ModelLoader] GLTF loader not initialized');
    return null;
  }

  const modelPath = modelPaths[modelName];
  console.log(`[ModelLoader] Loading from path: ${modelPath}`);

  try {
    const gltf = await new Promise<any>((resolve, reject) => {
      gltfLoader!.load(
        modelPath,
        (gltf) => {
          console.log(`[ModelLoader] Model loaded successfully: ${modelName}`);
          resolve(gltf);
        },
        (xhr) => {
          if (onProgress && xhr.lengthComputable) {
            const progress = (xhr.loaded / xhr.total) * 100;
            onProgress(progress);
          }
        },
        (error) => {
          console.error(`[ModelLoader] Failed to load model ${modelName} from ${modelPath}:`, error);
          reject(new Error(`Failed to load 3D model "${modelName}" from ${modelPath}. The file may be missing or corrupted.`));
        }
      );
    });

    const model = gltf.scene;

    // Cache the model for future use
    modelCache.set(modelName, model);
    console.log(`[ModelLoader] Model cached: ${modelName}`);

    if (onProgress) onProgress(100);
    return model.clone();
  } catch (error: any) {
    console.error(`[ModelLoader] Error loading model ${modelName}:`, error);

    // Create fallback placeholder model
    console.log(`[ModelLoader] Creating fallback placeholder for ${modelName}`);
    const fallback = createPlaceholderModel(modelName);
    
    // Don't cache fallback models
    if (onProgress) onProgress(100);
    return fallback;
  }
}

/**
 * Create a simple placeholder model when loading fails
 */
function createPlaceholderModel(modelName: AnimalModel): THREE.Object3D {
  console.log(`[ModelLoader] Creating placeholder model for ${modelName}`);
  
  const group = new THREE.Group();

  // Create a simple colored cube as placeholder
  const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const material = new THREE.MeshStandardMaterial({
    color: modelName === 'AlexBird' ? 0x3b82f6 : modelName === 'Bear' ? 0x8b4513 : 0x22c55e,
    roughness: 0.7,
    metalness: 0.3,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  group.add(mesh);

  return group;
}

/**
 * Preload all models in the background
 */
export async function preloadAllModels(
  onProgress?: (modelName: string, progress: number) => void
): Promise<void> {
  console.log('[ModelLoader] Starting preload of all models...');
  
  const models: AnimalModel[] = ['AlexBird', 'Bear', 'Deer'];

  for (const modelName of models) {
    try {
      console.log(`[ModelLoader] Preloading ${modelName}...`);
      await loadModel(modelName, (progress) => {
        if (onProgress) {
          onProgress(modelName, progress);
        }
      });
      console.log(`[ModelLoader] ${modelName} preloaded successfully`);
    } catch (error: any) {
      console.error(`[ModelLoader] Failed to preload ${modelName}:`, error);
      // Continue with other models even if one fails
    }
  }
  
  console.log('[ModelLoader] All models preload complete');
}

/**
 * Dispose of a model and free memory
 */
export function disposeModel(model: THREE.Object3D) {
  console.log('[ModelLoader] Disposing model...');
  
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;

      // Dispose geometry
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }

      // Dispose materials
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    }
  });
  
  console.log('[ModelLoader] Model disposed');
}

/**
 * Clear the model cache
 */
export function clearModelCache() {
  console.log('[ModelLoader] Clearing model cache...');
  
  modelCache.forEach((model, name) => {
    console.log(`[ModelLoader] Disposing cached model: ${name}`);
    disposeModel(model);
  });
  
  modelCache.clear();
  console.log('[ModelLoader] Model cache cleared');
}
