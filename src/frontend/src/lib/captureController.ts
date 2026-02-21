import { getRenderer } from './arController';
import { AnimalModel } from '../App';
import { toast } from 'sonner';

let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];

/**
 * Capture a photo of the AR scene (excluding UI overlay)
 */
export function capturePhoto(modelName: AnimalModel) {
  const renderer = getRenderer();
  if (!renderer) {
    toast.error('AR not initialized');
    return;
  }

  try {
    // Hide UI elements during capture
    hideUIElements();

    // Small delay to ensure UI is hidden
    setTimeout(() => {
      // Capture canvas as image
      const canvas = renderer.domElement;
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Failed to capture photo');
          showUIElements();
          return;
        }

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        link.download = `ar-tshirt-${modelName}-${timestamp}.jpg`;
        link.href = url;
        link.click();

        // Cleanup
        URL.revokeObjectURL(url);
        showUIElements();

        toast.success('Photo captured!');
      }, 'image/jpeg', 0.95);
    }, 50);
  } catch (error) {
    console.error('Photo capture failed:', error);
    toast.error('Failed to capture photo');
    showUIElements();
  }
}

/**
 * Start video recording of the AR scene
 */
export function startVideoRecording() {
  const renderer = getRenderer();
  if (!renderer) {
    toast.error('AR not initialized');
    return;
  }

  try {
    // Hide UI elements during recording
    hideUIElements();

    const canvas = renderer.domElement;
    const stream = canvas.captureStream(30); // 30 FPS

    // Setup MediaRecorder
    const options = {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5000000, // 5 Mbps for high quality
    };

    // Fallback to vp8 if vp9 not supported
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'video/webm;codecs=vp8';
    }

    mediaRecorder = new MediaRecorder(stream, options);
    recordedChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.start();
    toast.success('Recording started');
  } catch (error) {
    console.error('Video recording failed:', error);
    toast.error('Failed to start recording');
    showUIElements();
  }
}

/**
 * Stop video recording and download the file
 */
export function stopVideoRecording(modelName: AnimalModel) {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    toast.error('No active recording');
    return;
  }

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    link.download = `ar-tshirt-${modelName}-${timestamp}.webm`;
    link.href = url;
    link.click();

    // Cleanup
    URL.revokeObjectURL(url);
    recordedChunks = [];
    showUIElements();

    toast.success('Video saved!');
  };

  mediaRecorder.stop();
}

/**
 * Hide UI overlay elements during capture
 */
function hideUIElements() {
  const elements = document.querySelectorAll('.capture-controls, footer');
  elements.forEach((el) => {
    (el as HTMLElement).style.opacity = '0';
    (el as HTMLElement).style.pointerEvents = 'none';
  });
}

/**
 * Show UI overlay elements after capture
 */
function showUIElements() {
  const elements = document.querySelectorAll('.capture-controls, footer');
  elements.forEach((el) => {
    (el as HTMLElement).style.opacity = '1';
    (el as HTMLElement).style.pointerEvents = 'auto';
  });
}
