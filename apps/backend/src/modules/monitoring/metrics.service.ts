import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, register, collectDefaultMetrics } from 'prom-client';

collectDefaultMetrics();

@Injectable()
export class MetricsService {
  private readonly activeMatches: Gauge;
  private readonly wsConnections: Gauge;
  private readonly matchesTotal: Counter;
  private readonly matchDuration: Histogram;
  private readonly registrations: Counter;
  private readonly logins: Counter;
  private readonly apiKeyRequests: Counter;
  private readonly httpRequestsTotal: Counter;
  private readonly httpRequestDuration: Histogram;

  constructor() {
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'status', 'path'] as const,
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'status', 'path'] as const,
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    });

    this.activeMatches = new Gauge({
      name: 'game_active_matches',
      help: 'Number of currently active game matches',
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
  }

  setActiveMatches(count: number) {
    this.activeMatches.set(count);
  }

  incWebSocketConnections() {
    this.wsConnections.inc();
  }

  decWebSocketConnections() {
    this.wsConnections.dec();
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

  incHttpRequests(method: string, status: number, path: string) {
    this.httpRequestsTotal.inc({ method, status: String(status), path });
  }

  observeHttpDuration(seconds: number, method: string, status: number, path: string) {
    this.httpRequestDuration.observe({ method, status: String(status), path }, seconds);
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  getContentType(): string {
    return register.contentType;
  }
}
