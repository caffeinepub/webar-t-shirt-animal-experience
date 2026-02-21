import { Button } from '@/components/ui/button';
import { Camera, Video, Square } from 'lucide-react';

interface CaptureControlsProps {
  onCapturePhoto: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  isRecording: boolean;
}

export default function CaptureControls({
  onCapturePhoto,
  onStartRecording,
  onStopRecording,
  isRecording,
}: CaptureControlsProps) {
  return (
    <div className="absolute top-6 right-6 flex flex-col gap-3 z-20 capture-controls">
      <Button
        onClick={onCapturePhoto}
        size="icon"
        className="w-14 h-14 rounded-full bg-white/90 hover:bg-white text-black shadow-lg backdrop-blur-sm"
        aria-label="Capture photo"
      >
        <Camera size={24} />
      </Button>

      {!isRecording ? (
        <Button
          onClick={onStartRecording}
          size="icon"
          className="w-14 h-14 rounded-full bg-red-500/90 hover:bg-red-600 text-white shadow-lg backdrop-blur-sm"
          aria-label="Start recording"
        >
          <Video size={24} />
        </Button>
      ) : (
        <Button
          onClick={onStopRecording}
          size="icon"
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg backdrop-blur-sm animate-pulse"
          aria-label="Stop recording"
        >
          <Square size={24} fill="currentColor" />
        </Button>
      )}
    </div>
  );
}
