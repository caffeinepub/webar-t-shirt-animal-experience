/**
 * UI Controller - Manages UI interactions and state coordination
 * This module coordinates between UI components and AR/animation controllers
 */

import { AnimalModel } from '../App';

// UI state management
let currentUIState: {
  isARActive: boolean;
  selectedModel: AnimalModel;
  isRecording: boolean;
  showInstructions: boolean;
} = {
  isARActive: false,
  selectedModel: 'Bear',
  isRecording: false,
  showInstructions: true,
};

/**
 * Get current UI state
 */
export function getUIState() {
  return { ...currentUIState };
}

/**
 * Update UI state
 */
export function updateUIState(updates: Partial<typeof currentUIState>) {
  currentUIState = { ...currentUIState, ...updates };
}

/**
 * Handle model selection with validation
 */
export function handleModelSelection(model: AnimalModel): boolean {
  if (!currentUIState.isARActive) {
    console.warn('Cannot select model: AR not active');
    return false;
  }

  currentUIState.selectedModel = model;
  return true;
}

/**
 * Handle AR start with state updates
 */
export function handleARStart(): boolean {
  if (currentUIState.isARActive) {
    console.warn('AR already active');
    return false;
  }

  currentUIState.isARActive = true;
  currentUIState.showInstructions = false;
  return true;
}

/**
 * Handle capture actions with state validation
 */
export function handleCaptureAction(action: 'photo' | 'video-start' | 'video-stop'): boolean {
  if (!currentUIState.isARActive) {
    console.warn('Cannot capture: AR not active');
    return false;
  }

  if (action === 'video-start') {
    if (currentUIState.isRecording) {
      console.warn('Already recording');
      return false;
    }
    currentUIState.isRecording = true;
  } else if (action === 'video-stop') {
    if (!currentUIState.isRecording) {
      console.warn('Not recording');
      return false;
    }
    currentUIState.isRecording = false;
  }

  return true;
}
