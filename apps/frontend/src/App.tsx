import { Routes, Route } from 'react-router-dom';
import { Home, GamePage, OnlineGame, Login, Register, Profile, Settings, Leaderboard, Friends, PrivacyPolicy, TermsOfService, NotFound, LobbyList, RoomView, ForgotPassword, AuthCallback } from './pages';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/lobby" element={<LobbyList />} />
        <Route path="/rooms/:id" element={<RoomView />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/game/:matchId" element={<OnlineGame />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
