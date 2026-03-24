export function TournamentEndOverlay({
  tournamentEnd,
  onClose,
}: {
  tournamentEnd: any;
  onClose: () => void;
}) {
  if (!tournamentEnd) return null;

  const ranks = tournamentEnd.rankings || {};
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900/95 via-indigo-950/95 to-gray-900/95 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="text-center bg-gray-800/90 p-10 rounded-3xl shadow-[0_0_50px_rgba(234,179,8,0.2)] border border-yellow-500/20 backdrop-blur-md max-w-md w-full xerath-card">
        <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-200 to-yellow-500 mb-8 animate-pulse">
          🏆 Tournament Over!
        </h2>
        
        <div className="space-y-3 mb-8 text-left">
          <div className="p-3 bg-yellow-900/30 border border-yellow-500/20 rounded-xl flex items-center justify-between">
            <span className="text-yellow-300 font-bold">🥇 1st Place</span>
            <span className="text-white font-semibold">{ranks.first?.username || '-'}</span>
          </div>
          <div className="p-3 bg-gray-700/30 border border-gray-500/20 rounded-xl flex items-center justify-between">
            <span className="text-gray-300 font-bold">🥈 2nd Place</span>
            <span className="text-white font-semibold">{ranks.second?.username || '-'}</span>
          </div>
          <div className="p-3 bg-amber-900/30 border border-amber-500/20 rounded-xl flex items-center justify-between">
            <span className="text-amber-200 font-bold">🥉 3rd Place</span>
            <span className="text-white font-semibold">{ranks.third?.username || '-'}</span>
          </div>
          <div className="p-3 bg-gray-800/40 border border-gray-700/30 rounded-xl flex items-center justify-between">
            <span className="text-gray-400 font-bold">🏅 4th Place</span>
            <span className="text-gray-200 font-semibold">{ranks.fourth?.username || '-'}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-gray-900 font-bold rounded-xl transition-all shadow-lg hover:shadow-yellow-500/30"
          >
            Leave Match
          </button>
        </div>
      </div>
    </div>
  );
}
