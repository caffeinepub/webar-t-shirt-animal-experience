import { Button } from '@/components/ui/button';
import { AnimalModel } from '../App';

interface ModelSelectorProps {
  selectedModel: AnimalModel;
  onSelectModel: (model: AnimalModel) => void;
}

const models: { id: AnimalModel; label: string; emoji: string }[] = [
  { id: 'AlexBird', label: 'Bird', emoji: '🦅' },
  { id: 'Bear', label: 'Bear', emoji: '🐻' },
  { id: 'Deer', label: 'Deer', emoji: '🦌' },
];

export default function ModelSelector({ selectedModel, onSelectModel }: ModelSelectorProps) {
  return (
    <div className="absolute bottom-20 left-0 right-0 flex justify-center z-20 px-4">
      <div className="bg-black/80 backdrop-blur-md rounded-full px-4 py-3 flex gap-2 shadow-2xl border border-white/10">
        {models.map((model) => (
          <Button
            key={model.id}
            onClick={() => onSelectModel(model.id)}
            variant={selectedModel === model.id ? 'default' : 'ghost'}
            size="lg"
            className={`min-w-[60px] h-14 flex flex-col items-center justify-center gap-1 rounded-full transition-all ${
              selectedModel === model.id
                ? 'bg-white text-black hover:bg-white/90 scale-110'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="text-2xl">{model.emoji}</span>
            <span className="text-[10px] font-medium">{model.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
