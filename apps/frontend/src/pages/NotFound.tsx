import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <p className="text-xl text-gray-300 mb-8">Page not found</p>
        <Link
          to="/"
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
