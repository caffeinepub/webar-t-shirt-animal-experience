import { useEffect, useRef, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import ModelSelector from './components/ModelSelector';
import ScanInstructions from './components/ScanInstructions';
import CaptureControls from './components/CaptureControls';
import LoadingProgress from './components/LoadingProgress';
import { initializeAR, startAR, stopAR, switchModel } from './lib/arController';
import { preloadAllModels } from './lib/modelLoader';
import { capturePhoto, startVideoRecording, stopVideoRecording } from './lib/captureController';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type AnimalModel = 'AlexBird' | 'Bear' | 'Deer';

// Error types for different failure scenarios
type ErrorType = 'permission' | 'camera' | 'initialization';

interface AppError {
  type: ErrorType;
  message: string;
}

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isARStarted, setIsARStarted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [selectedModel, setSelectedModel] = useState<AnimalModel>('Bear');
  const [loadingProgress, setLoadingProgress] = useState<{ model: string; progress: number } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<AppError | null>(null);

  /**
   * Convert backend error to AppError with proper type
   */
  function toAppError(error: { type: string; message: string }): AppError {
    // Ensure the type is one of our ErrorType values
    const validTypes: ErrorType[] = ['permission', 'camera', 'initialization'];
    const errorType = validTypes.includes(error.type as ErrorType) ? (error.type as ErrorType) : 'initialization';
    
    return {
      type: errorType,
      message: error.message
    };
  }

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    async function init() {
      try {
        setIsInitializing(true);
        setInitError(null);
        
        // Initialize AR system (includes camera permission request and asset validation)
        const result = await initializeAR(containerRef.current!);

        if (!mounted) return;

        if (!result.success) {
          console.error('AR initialization failed:', result.error);
          setInitError(result.error ? toAppError(result.error) : { type: 'initialization', message: 'Failed to initialize AR' });
          return;
        }

        // Preload all models in background
        await preloadAllModels((model, progress) => {
          if (mounted) {
            setLoadingProgress({ model, progress });
            if (progress === 100) {
              setTimeout(() => {
                if (mounted) setLoadingProgress(null);
              }, 500);
            }
          }
        });
      } catch (error: any) {
        console.error('Failed to initialize AR:', error);
        if (mounted) {
          // Provide user-friendly error messages based on error type
          let errorMessage = 'Failed to initialize AR experience';
          let errorType: ErrorType = 'initialization';

          if (error.message) {
            if (error.message.includes('camera')) {
              errorType = 'camera';
              errorMessage = 'Camera access failed. Please check your camera permissions and try again.';
            } else if (error.message.includes('permission')) {
              errorType = 'permission';
              errorMessage = 'Camera permission denied. Please enable camera access in your browser settings.';
            } else {
              errorMessage = error.message;
            }
          }

          setInitError({ type: errorType, message: errorMessage });
        }
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
      stopAR();
    };
  }, []);

  const handleStartAR = async () => {
    try {
      setInitError(null);
      
      await startAR();
      setIsARStarted(true);
      setShowInstructions(false);
    } catch (error: any) {
      console.error('Failed to start AR:', error);
      
      // Provide specific error message based on error type
      let errorMessage = 'Failed to start AR tracking';
      let errorType: ErrorType = 'initialization';
      
      if (error.message) {
        if (error.message.includes('camera')) {
          errorType = 'camera';
          errorMessage = 'Camera access denied. Please enable camera permissions and try again.';
        } else if (error.message.includes('permission')) {
          errorType = 'permission';
          errorMessage = 'Camera permission denied. Please enable camera access in your browser settings.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
      setInitError({ type: errorType, message: errorMessage });
    }
  };

  const handleDismissInstructions = () => {
    setShowInstructions(false);
  };

  const handleRetry = async () => {
    // Clear error and reinitialize
    setInitError(null);
    setIsInitializing(true);
    
    try {
      const result = await initializeAR(containerRef.current!);
      
      if (!result.success) {
        console.error('AR retry failed:', result.error);
        setInitError(result.error ? toAppError(result.error) : { type: 'initialization', message: 'Failed to initialize AR' });
        return;
      }

      // Preload models
      await preloadAllModels((model, progress) => {
        setLoadingProgress({ model, progress });
        if (progress === 100) {
          setTimeout(() => setLoadingProgress(null), 500);
        }
      });
      
      // Reset to show instructions
      setShowInstructions(true);
    } catch (error: any) {
      console.error('Retry failed:', error);
      setInitError({ 
        type: 'initialization', 
        message: error.message || 'Failed to initialize AR. Please refresh the page.' 
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleModelSelect = async (model: AnimalModel) => {
    setSelectedModel(model);
    await switchModel(model);
  };

  const handleCapturePhoto = () => {
    capturePhoto(selectedModel);
  };

  const handleStartRecording = () => {
    startVideoRecording();
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    stopVideoRecording(selectedModel);
    setIsRecording(false);
  };

  // Helper to get user-friendly error title
  const getErrorTitle = (type: ErrorType): string => {
    switch (type) {
      case 'permission':
      case 'camera':
        return 'Camera Permission Required';
      case 'initialization':
        return 'AR Initialization Failed';
      default:
        return 'Error';
    }
  };

  // Helper to get recovery suggestion text
  const getRecoverySuggestion = (type: ErrorType): string => {
    switch (type) {
      case 'permission':
      case 'camera':
        return 'Please enable camera permissions in your browser settings.';
      default:
        return 'Please try again or refresh the page.';
    }
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <div className="relative w-screen h-screen overflow-hidden bg-black">
        {/* AR Container */}
        <div ref={containerRef} id="ar-container" className="absolute inset-0" />

        {/* Initialization Error with Retry */}
        {initError && !isInitializing && (
          <div className="absolute top-4 left-4 right-4 z-40 max-w-md mx-auto">
            <Alert className="bg-red-500/10 border-red-500/30 backdrop-blur-md">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200 text-sm">
                <div className="font-semibold mb-1">{getErrorTitle(initError.type)}</div>
                <div className="mb-2">{initError.message}</div>
                <div className="text-xs text-red-300 mb-3">{getRecoverySuggestion(initError.type)}</div>
                <Button 
                  onClick={handleRetry}
                  size="sm"
                  variant="outline"
                  className="bg-red-500/20 border-red-500/50 text-red-100 hover:bg-red-500/30 hover:text-white"
                >
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Loading Progress */}
        {loadingProgress && (
          <LoadingProgress 
            model={loadingProgress.model}
            progress={loadingProgress.progress}
          />
        )}

        {/* Scan Instructions Overlay */}
        {showInstructions && !isInitializing && !initError && (
          <ScanInstructions 
            onStart={handleStartAR} 
            onDismiss={handleDismissInstructions}
          />
        )}

        {/* Model Selector */}
        {isARStarted && (
          <ModelSelector
            selectedModel={selectedModel}
            onSelectModel={handleModelSelect}
          />
        )}

        {/* Capture Controls */}
        {isARStarted && (
          <CaptureControls
            isRecording={isRecording}
            onCapturePhoto={handleCapturePhoto}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
          />
        )}

        {/* Toast Notifications */}
        <Toaster position="top-center" />
      </div>
    </ThemeProvider>
  );
}

export default App;
