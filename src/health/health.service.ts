import { Inject, Injectable } from '@nestjs/common';
import { SQLITE_CLIENT } from '@db/database.constants';
import type { SQLiteClient } from '@db/database.types';
import { loadRuntimeConfig } from '@/config/env.validation';

type HealthCheckResult = {
  ok: boolean;
  error?: string;
};

type ReadinessPayload = {
  status: 'ready' | 'not_ready';
  timestamp: string;
  checks: {
    env: HealthCheckResult;
    database: HealthCheckResult;
  };
};

@Injectable()
export class HealthService {
  constructor(@Inject(SQLITE_CLIENT) private readonly sqlite: SQLiteClient) {}

  getLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  getReadiness(): ReadinessPayload {
    const envCheck = this.checkEnv();
    const dbCheck = this.checkDatabase();

    const isReady = envCheck.ok && dbCheck.ok;
    return {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        env: envCheck,
        database: dbCheck,
      },
    };
  }

  private checkEnv(): HealthCheckResult {
    try {
      loadRuntimeConfig();
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    }
  }

  private checkDatabase(): HealthCheckResult {
    try {
      this.sqlite.prepare('SELECT 1 AS ok').get();
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    }
  }
}
