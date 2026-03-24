import { Link } from 'react-router-dom';

export function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-xl p-8">
        <Link to="/" className="text-purple-400 hover:text-purple-300 mb-4 inline-block">
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-white mb-6">Terms of Service</h1>
        <p className="text-gray-400 mb-8">Last updated: December 13, 2025</p>

        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using this Pong game application ("the Service"), you accept and agree to be
              bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">2. User Accounts</h2>
            <p className="mb-3">To use certain features of the Service, you must create an account:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>You must provide accurate and complete information during registration</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must be at least 13 years old to create an account</li>
              <li>One person may only create one account</li>
              <li>You are responsible for all activities that occur under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">3. Acceptable Use</h2>
            <p className="mb-3">When using the Service, you agree NOT to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Use offensive, inappropriate, or abusive usernames or profile content</li>
              <li>Harass, threaten, or abuse other users</li>
              <li>Cheat, exploit bugs, or use automated tools to gain unfair advantages</li>
              <li>Attempt to hack, disrupt, or compromise the Service's security</li>
              <li>Impersonate other users or create fake accounts</li>
              <li>Share or distribute malicious content</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">4. Game Rules and Fair Play</h2>
            <p className="mb-3">Players must adhere to fair play standards:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>No cheating or exploitation of game mechanics</li>
              <li>No intentional disconnection to avoid losses</li>
              <li>Respect tournament rules and match schedules</li>
              <li>Play competitively but respectfully</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">5. User Content</h2>
            <p className="mb-3">
              You retain ownership of content you upload (such as avatars), but you grant us a license to use,
              display, and store this content as necessary to provide the Service.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>You must have the right to upload any content you submit</li>
              <li>Content must not violate copyrights or other intellectual property rights</li>
              <li>We reserve the right to remove inappropriate content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">6. Account Suspension and Termination</h2>
            <p className="mb-3">
              We reserve the right to suspend or terminate your account if you:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Violate these Terms of Service</li>
              <li>Engage in cheating or unfair play</li>
              <li>Harass or abuse other users</li>
              <li>Attempt to compromise the Service's security</li>
              <li>Create multiple accounts to evade restrictions</li>
            </ul>
            <p className="mt-3">
              You may also delete your account at any time through the account settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">7. Service Availability</h2>
            <p>
              We strive to keep the Service available 24/7, but we do not guarantee uninterrupted access.
              The Service may be temporarily unavailable due to maintenance, updates, or technical issues.
              We are not liable for any losses resulting from service interruptions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">8. Intellectual Property</h2>
            <p>
              The Service, including its design, code, graphics, and game mechanics, is owned by the project
              creators and protected by copyright laws. You may not copy, modify, distribute, or reverse
              engineer any part of the Service without permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">9. Limitation of Liability</h2>
            <p>
              This Service is provided as a student project for educational purposes. We provide the Service
              "as is" without warranties of any kind. We are not liable for any damages arising from your use
              of the Service, including but not limited to loss of data, game progress, or ranking.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">10. Dispute Resolution</h2>
            <p>
              If you have a dispute with another user, you should try to resolve it amicably. If you have
              a complaint about the Service, please contact us through the appropriate channels. We will
              investigate and respond to legitimate concerns.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">11. Changes to Terms</h2>
            <p>
              We may modify these Terms of Service at any time. We will notify users of significant changes
              by posting an announcement or updating the "Last updated" date. Continued use of the Service
              after changes constitutes acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">12. Educational Purpose</h2>
            <p>
              This application is created as part of the 42 school curriculum (ft_transcendence project).
              It is a learning project and should be treated as such. While we take security and user
              experience seriously, this is primarily an educational endeavor.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">13. Contact Information</h2>
            <p>
              For questions, concerns, or reports regarding these Terms of Service, please contact us
              through the GitHub repository or application settings.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-700">
          <Link to="/privacy" className="text-purple-400 hover:text-purple-300">
            View Privacy Policy →
          </Link>
        </div>
      </div>
    </div>
  );
}
