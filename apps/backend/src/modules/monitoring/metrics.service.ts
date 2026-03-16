import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, register, collectDefaultMetrics } from 'prom-client';

collectDefaultMetrics();

@Injectable()
export class MetricsService {
  private readonly activeMatches: Gauge;
  private readonly activeTournaments: Gauge;
  private readonly wsConnections: Gauge;
  private readonly matchesTotal: Counter;
  private readonly matchDuration: Histogram;
  private readonly registrations: Counter;
  private readonly logins: Counter;
  private readonly apiKeyRequests: Counter;
  private readonly activeRooms: Gauge;

  constructor() {
    this.activeMatches = new Gauge({
      name: 'game_active_matches',
      help: 'Number of currently active game matches',
    });

    this.activeTournaments = new Gauge({
      name: 'game_active_tournaments',
      help: 'Number of currently active tournaments',
    });

    this.wsConnections = new Gauge({
      name: 'websocket_connections_total',
      help: 'Number of active WebSocket connections',
    });

    this.matchesTotal = new Counter({
      name: 'game_matches_total',
      help: 'Total number of completed matches',
    });

    this.matchDuration = new Histogram({
      name: 'game_match_duration_seconds',
      help: 'Match duration in seconds',
      buckets: [30, 60, 120, 300, 600],
    });

    this.registrations = new Counter({
      name: 'user_registrations_total',
      help: 'Total number of user registrations',
    });

    this.logins = new Counter({
      name: 'auth_login_total',
      help: 'Total number of login attempts',
      labelNames: ['result'] as const,
    });

    this.apiKeyRequests = new Counter({
      name: 'api_key_requests_total',
      help: 'Total number of API key authenticated requests',
    });

    this.activeRooms = new Gauge({
      name: 'rooms_active_total',
      help: 'Number of currently active rooms',
    });
  }

  setActiveMatches(count: number) {
    this.activeMatches.set(count);
  }

  setActiveTournaments(count: number) {
    this.activeTournaments.set(count);
  }

  setWebSocketConnections(count: number) {
    this.wsConnections.set(count);
  }

  incMatchesTotal() {
    this.matchesTotal.inc();
  }

  observeMatchDuration(seconds: number) {
    this.matchDuration.observe(seconds);
  }

  incRegistrations() {
    this.registrations.inc();
  }

  incLogins(result: 'success' | 'failure') {
    this.logins.inc({ result });
  }

  incApiKeyRequests() {
    this.apiKeyRequests.inc();
  }

  setActiveRooms(count: number) {
    this.activeRooms.set(count);
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  getContentType(): string {
    return register.contentType;
  }
}
