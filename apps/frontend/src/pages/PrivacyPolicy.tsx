import { Link } from 'react-router-dom';

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-xl p-8">
        <Link to="/" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-white mb-6">Privacy Policy</h1>
        <p className="text-gray-400 mb-8">Last updated: December 13, 2025</p>

        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">1. Information We Collect</h2>
            <p className="mb-3">
              When you use our Pong game application, we collect the following information:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Account Information:</strong> Email address, username, and password (encrypted)</li>
              <li><strong>Profile Information:</strong> Avatar/profile picture you choose to upload</li>
              <li><strong>Game Data:</strong> Match history, scores, win/loss records, and game statistics</li>
              <li><strong>Usage Data:</strong> Online status, game sessions, and interaction with other players</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
            <p className="mb-3">We use the collected information for:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Providing and maintaining the game service</li>
              <li>Managing user accounts and authentication</li>
              <li>Tracking game statistics and leaderboards</li>
              <li>Enabling multiplayer matchmaking and tournaments</li>
              <li>Displaying your profile to other players</li>
              <li>Improving user experience and game features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">3. Data Storage and Security</h2>
            <p className="mb-3">
              Your data is stored securely in our database with the following measures:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Passwords are hashed using bcrypt encryption</li>
              <li>Secure session management with HttpOnly cookies</li>
              <li>HTTPS encryption for all data transmission</li>
              <li>Regular security audits and updates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">4. Information Sharing</h2>
            <p className="mb-3">
              We do NOT share your personal information with third parties. However, the following information
              is visible to other users:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Username and avatar</li>
              <li>Game statistics (wins, losses, ranking)</li>
              <li>Match history</li>
              <li>Online/offline status</li>
            </ul>
            <p className="mt-3">
              Your email address and password remain private and are never shown to other users.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">5. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access your personal data</li>
              <li>Update or correct your information</li>
              <li>Delete your account and associated data</li>
              <li>Export your game statistics</li>
              <li>Opt-out of certain data collection</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">6. Cookies and Sessions</h2>
            <p>
              We use session cookies to maintain your logged-in state. These cookies are essential for the
              application to function properly. Session cookies expire after 7 days of inactivity or when
              you log out.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">7. Data Retention</h2>
            <p>
              We retain your account information and game history for as long as your account is active.
              If you delete your account, your personal information will be permanently removed from our
              database within 30 days. Game statistics may be anonymized and retained for analytical purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">8. Children's Privacy</h2>
            <p>
              Our service is not intended for users under the age of 13. We do not knowingly collect
              personal information from children under 13. If you are a parent or guardian and believe
              your child has provided us with personal information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify users of any significant
              changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our data practices, please contact us
              through the application settings or at the GitHub repository.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-700">
          <Link to="/terms" className="text-blue-400 hover:text-blue-300">
            View Terms of Service →
          </Link>
        </div>
      </div>
    </div>
  );
}
