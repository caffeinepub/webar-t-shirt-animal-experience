import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Camera, Scan, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ScanInstructionsProps {
  onStart: () => void;
  onDismiss: () => void;
}

export default function ScanInstructions({ onStart, onDismiss }: ScanInstructionsProps) {
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);

  useEffect(() => {
    checkCameraPermission();
  }, []);

  const checkCameraPermission = async () => {
    setIsCheckingPermission(true);
    
    try {
      // Check if Permissions API is available
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setPermissionState(result.state as 'prompt' | 'granted' | 'denied');
        
        // Listen for permission changes
        result.addEventListener('change', () => {
          setPermissionState(result.state as 'prompt' | 'granted' | 'denied');
        });
      } else {
        // Fallback: try to enumerate devices to check if camera exists
        const nav = navigator as any;
        if (nav.mediaDevices && nav.mediaDevices.enumerateDevices) {
          try {
            const devices = await nav.mediaDevices.enumerateDevices();
            const hasCamera = devices.some((device: MediaDeviceInfo) => device.kind === 'videoinput');
            setPermissionState(hasCamera ? 'prompt' : 'denied');
          } catch {
            setPermissionState('prompt');
          }
        } else {
          setPermissionState('prompt');
        }
      }
    } catch (error) {
      console.error('Error checking camera permission:', error);
      setPermissionState('prompt');
    } finally {
      setIsCheckingPermission(false);
    }
  };

  const handleRetry = () => {
    checkCameraPermission();
  };

  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-30 flex items-center justify-center p-6">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          aria-label="Close instructions"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
            <Scan size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">AR T-Shirt Experience</h1>
          <p className="text-white/70">Watch animals come to life!</p>
        </div>

        {permissionState === 'denied' && !isCheckingPermission && (
          <Alert className="mb-6 bg-red-500/10 border-red-500/30">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-200 text-sm">
              <strong className="block mb-2">Camera Access Blocked</strong>
              <p className="mb-2">To enable camera access:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Chrome/Edge:</strong> Click the camera icon in the address bar</li>
                <li><strong>Safari:</strong> Go to Settings → Safari → Camera</li>
                <li><strong>Firefox:</strong> Click the lock icon → Permissions → Camera</li>
              </ul>
              <Button
                onClick={handleRetry}
                variant="outline"
                size="sm"
                className="mt-3 w-full bg-red-500/20 border-red-500/30 text-red-200 hover:bg-red-500/30"
              >
                Check Again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">
              1
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Allow Camera Access</h3>
              <p className="text-white/60 text-sm">Grant permission to use your device camera</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold">
              2
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Point at T-Shirt Print</h3>
              <p className="text-white/60 text-sm">Aim your camera at the kids T-shirt design</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-pink-500/20 rounded-full flex items-center justify-center text-pink-400 font-bold">
              3
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Watch Animals Emerge</h3>
              <p className="text-white/60 text-sm">See 3D animals pop out from the shirt!</p>
            </div>
          </div>
        </div>

        <Button
          onClick={onStart}
          size="lg"
          disabled={isCheckingPermission}
          className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera className="mr-2" size={24} />
          {isCheckingPermission ? 'Checking Camera...' : 'Start AR Experience'}
        </Button>
      </div>
    </div>
  );
}
