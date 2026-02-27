const DEFAULT_DATABASE_URL = './data/app.db';

export const DEFAULT_ALERT_TIMEZONE = 'Asia/Phnom_Penh';
export const DEFAULT_TELEGRAM_REQUEST_TIMEOUT_MS = 5000;
export const DEFAULT_TELEGRAM_MAX_RETRIES = 3;
export const DEFAULT_TELEGRAM_RETRY_BASE_DELAY_MS = 500;

const MIN_REQUEST_TIMEOUT_MS = 100;
const MIN_RETRY_BASE_DELAY_MS = 50;
const MAX_RETRIES_LIMIT = 10;

type EnvSource = NodeJS.ProcessEnv;

export type RuntimeConfig = {
  databaseUrl: string;
  alertTimezone: string;
  telegramBotToken: string;
  telegramChatId: string;
  adminApiKey: string;
  telegramRequestTimeoutMs: number;
  telegramMaxRetries: number;
  telegramRetryBaseDelayMs: number;
};

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function parseIntegerEnv(
  env: EnvSource,
  key: string,
  fallback: number,
  minValue: number,
  errors: string[],
): number {
  const rawValue = env[key];
  if (rawValue === undefined || rawValue.trim() === '') {
    return fallback;
  }

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < minValue) {
    errors.push(`${key} must be an integer >= ${minValue}.`);
    return fallback;
  }

  return value;
}

export function loadRuntimeConfig(env: EnvSource = process.env): RuntimeConfig {
  const errors: string[] = [];

  const databaseUrl = env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
  const alertTimezone = env.ALERT_TIMEZONE?.trim() || DEFAULT_ALERT_TIMEZONE;
  const telegramBotToken = env.TELEGRAM_BOT_TOKEN?.trim() ?? '';
  const telegramChatId = env.TELEGRAM_CHAT_ID?.trim() ?? '';
  const adminApiKey = env.ADMIN_API_KEY?.trim() ?? '';

  if (!databaseUrl) {
    errors.push('DATABASE_URL must not be empty.');
  }

  if (!isValidTimezone(alertTimezone)) {
    errors.push(`ALERT_TIMEZONE is invalid: ${alertTimezone}`);
  }

  if (!telegramBotToken) {
    errors.push('TELEGRAM_BOT_TOKEN is required.');
  }

  if (!telegramChatId) {
    errors.push('TELEGRAM_CHAT_ID is required.');
  }

  if (!adminApiKey) {
    errors.push('ADMIN_API_KEY is required.');
  }

  const telegramRequestTimeoutMs = parseIntegerEnv(
    env,
    'TELEGRAM_REQUEST_TIMEOUT_MS',
    DEFAULT_TELEGRAM_REQUEST_TIMEOUT_MS,
    MIN_REQUEST_TIMEOUT_MS,
    errors,
  );

  const telegramMaxRetries = parseIntegerEnv(
    env,
    'TELEGRAM_MAX_RETRIES',
    DEFAULT_TELEGRAM_MAX_RETRIES,
    1,
    errors,
  );

  if (telegramMaxRetries > MAX_RETRIES_LIMIT) {
    errors.push(`TELEGRAM_MAX_RETRIES must be <= ${MAX_RETRIES_LIMIT}.`);
  }

  const telegramRetryBaseDelayMs = parseIntegerEnv(
    env,
    'TELEGRAM_RETRY_BASE_DELAY_MS',
    DEFAULT_TELEGRAM_RETRY_BASE_DELAY_MS,
    MIN_RETRY_BASE_DELAY_MS,
    errors,
  );

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n- ${errors.join('\n- ')}`,
    );
  }

  return {
    databaseUrl,
    alertTimezone,
    telegramBotToken,
    telegramChatId,
    adminApiKey,
    telegramRequestTimeoutMs,
    telegramMaxRetries,
    telegramRetryBaseDelayMs,
  };
}
