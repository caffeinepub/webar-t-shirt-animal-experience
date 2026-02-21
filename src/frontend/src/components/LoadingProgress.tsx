import { Progress } from '@/components/ui/progress';

interface LoadingProgressProps {
  model: string;
  progress: number;
}

export default function LoadingProgress({ model, progress }: LoadingProgressProps) {
  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center">
      <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
            <span className="text-3xl">🎨</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Loading 3D Models</h2>
          <p className="text-white/60 text-sm capitalize">{model}</p>
        </div>

        <Progress value={progress} className="h-2 mb-3" />

        <p className="text-center text-white/80 font-semibold">{Math.round(progress)}%</p>
      </div>
    </div>
  );
}
