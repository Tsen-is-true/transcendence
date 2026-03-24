import { Routes, Route } from 'react-router-dom';
import { Home, GamePage, OnlineGame, Login, Register, Profile, Settings, Leaderboard, Friends, PrivacyPolicy, TermsOfService, NotFound, LobbyList, RoomView } from './pages';
import { AuthProvider } from './contexts/AuthContext';
import { GuestRoute, ProtectedRoute } from './routes/AuthGuards';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/login"
          element={(
            <GuestRoute>
              <Login />
            </GuestRoute>
          )}
        />
        <Route
          path="/register"
          element={(
            <GuestRoute>
              <Register />
            </GuestRoute>
          )}
        />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route
          path="/settings"
          element={(
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          )}
        />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route
          path="/friends"
          element={(
            <ProtectedRoute>
              <Friends />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/lobby"
          element={(
            <ProtectedRoute>
              <LobbyList />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/rooms/:id"
          element={(
            <ProtectedRoute>
              <RoomView />
            </ProtectedRoute>
          )}
        />
        <Route path="/game" element={<GamePage />} />
        <Route
          path="/game/:matchId"
          element={(
            <ProtectedRoute>
              <OnlineGame />
            </ProtectedRoute>
          )}
        />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
