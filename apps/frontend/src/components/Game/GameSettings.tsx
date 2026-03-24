import { GameSettings as GameSettingsType } from '../../game/GameEngine';

interface GameSettingsProps {
  settings: Partial<GameSettingsType>;
  onChange: (settings: Partial<GameSettingsType>) => void;
  onClose: () => void;
}

export function GameSettings({ settings, onChange, onClose }: GameSettingsProps) {
  const handleChange = (key: keyof GameSettingsType, value: number | string) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Game Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Ball Speed */}
          <div>
            <label className="block text-white text-sm font-semibold mb-2">
              Ball Speed: {settings.ballSpeed ?? 5}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={settings.ballSpeed ?? 5}
              onChange={(e) => handleChange('ballSpeed', Number(e.target.value))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Slow</span>
              <span>Fast</span>
            </div>
          </div>

          {/* Paddle Size */}
          <div>
            <label className="block text-white text-sm font-semibold mb-2">
              Paddle Size: {settings.paddleSize ?? 100}
            </label>
            <input
              type="range"
              min="50"
              max="200"
              value={settings.paddleSize ?? 100}
              onChange={(e) => handleChange('paddleSize', Number(e.target.value))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Small</span>
              <span>Large</span>
            </div>
          </div>

          {/* Win Score */}
          <div>
            <label className="block text-white text-sm font-semibold mb-2">
              Win Score: {settings.winScore ?? 5}
            </label>
            <input
              type="range"
              min="3"
              max="10"
              value={settings.winScore ?? 5}
              onChange={(e) => handleChange('winScore', Number(e.target.value))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Quick</span>
              <span>Long</span>
            </div>
          </div>

          {/* Ball Size */}
          <div>
            <label className="block text-white text-sm font-semibold mb-2">
              Ball Size: {settings.ballSize ?? 10}
            </label>
            <input
              type="range"
              min="5"
              max="20"
              value={settings.ballSize ?? 10}
              onChange={(e) => handleChange('ballSize', Number(e.target.value))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Small</span>
              <span>Large</span>
            </div>
          </div>

          {/* Ball Acceleration */}
          <div>
            <label className="block text-white text-sm font-semibold mb-2">
              Ball Acceleration: {(settings.ballAcceleration ?? 1.05).toFixed(2)}
            </label>
            <input
              type="range"
              min="1.0"
              max="1.1"
              step="0.01"
              value={settings.ballAcceleration ?? 1.05}
              onChange={(e) => handleChange('ballAcceleration', Number(e.target.value))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1.0</span>
              <span>1.1</span>
            </div>
          </div>

          {/* Paddle Speed */}
          <div>
            <label className="block text-white text-sm font-semibold mb-2">
              Paddle Speed: {settings.paddleSpeed ?? 10}
            </label>
            <input
              type="range"
              min="5"
              max="15"
              value={settings.paddleSpeed ?? 10}
              onChange={(e) => handleChange('paddleSpeed', Number(e.target.value))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Slow</span>
              <span>Fast</span>
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-white text-sm font-semibold mb-2">
              Theme
            </label>
            <select
              value={settings.theme ?? 'classic'}
              onChange={(e) => handleChange('theme', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-purple-500"
            >
              <option value="classic">Classic</option>
              <option value="neon">Neon</option>
              <option value="retro">Retro</option>
              <option value="xerath">Xerath (제라스)</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              onChange({
                ballSpeed: 5,
                paddleSize: 100,
                winScore: 5,
                ballSize: 10,
                ballAcceleration: 1.05,
                paddleSpeed: 10,
                theme: 'classic',
              });
            }}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
          >
            Reset to Default
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
