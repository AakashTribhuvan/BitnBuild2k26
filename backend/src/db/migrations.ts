import { pool } from '../config/database';

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        is_verified BOOLEAN DEFAULT FALSE,
        is_admin BOOLEAN DEFAULT FALSE,
        device_fingerprint VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
      CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique
        ON users (google_sub) WHERE google_sub IS NOT NULL;

      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        total_seats INTEGER NOT NULL,
        sale_start TIMESTAMP,
        sale_end TIMESTAMP,
        purchase_limit_per_user INTEGER DEFAULT 2,
        status VARCHAR(50) DEFAULT 'upcoming',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS seats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES events(id),
        seat_number INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'available',
        held_by_user_id UUID REFERENCES users(id),
        hold_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (event_id, seat_number)
      );

      CREATE TABLE IF NOT EXISTS queue_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        event_id UUID REFERENCES events(id),
        token VARCHAR(255),
        position INTEGER,
        status VARCHAR(50) DEFAULT 'waiting',
        queue_order INTEGER,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        admitted_at TIMESTAMP,
        admission_expires_at TIMESTAMP,
        admission_consumed_at TIMESTAMP,
        human_score INTEGER NOT NULL DEFAULT 20,
        captcha_verified BOOLEAN NOT NULL DEFAULT FALSE,
        status_requests INTEGER NOT NULL DEFAULT 0,
        rapid_requests INTEGER NOT NULL DEFAULT 0,
        last_status_at TIMESTAMP,
        behavior_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
        UNIQUE (user_id, event_id)
      );
      ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS admission_expires_at TIMESTAMP;
      ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS admission_consumed_at TIMESTAMP;
      ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS human_score INTEGER NOT NULL DEFAULT 20;
      ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS captcha_verified BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS status_requests INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS rapid_requests INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS last_status_at TIMESTAMP;
      ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS behavior_signals JSONB NOT NULL DEFAULT '{}'::jsonb;
      UPDATE queue_entries
      SET admission_expires_at = NOW() + INTERVAL '10 minutes'
      WHERE status = 'admitted' AND admission_expires_at IS NULL;
      CREATE INDEX IF NOT EXISTS queue_entries_admission_batch_idx
        ON queue_entries (event_id, status, admission_expires_at);

      CREATE TABLE IF NOT EXISTS reservations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        event_id UUID REFERENCES events(id),
        seat_id UUID REFERENCES seats(id),
        status VARCHAR(50) DEFAULT 'pending',
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reservation_id UUID REFERENCES reservations(id),
        user_id UUID REFERENCES users(id),
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        payment_intent_id VARCHAR(255),
        mock_scan_token_hash VARCHAR(64),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS mock_scan_token_hash VARCHAR(64);
      CREATE UNIQUE INDEX IF NOT EXISTS payments_mock_scan_token_hash_unique
        ON payments (mock_scan_token_hash) WHERE mock_scan_token_hash IS NOT NULL;

      CREATE TABLE IF NOT EXISTS payment_reservations (
        payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
        reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
        PRIMARY KEY (payment_id, reservation_id)
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        action VARCHAR(255),
        entity_type VARCHAR(255),
        entity_id UUID,
        metadata JSONB,
        ip_address VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS risk_flags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        event_id UUID REFERENCES events(id),
        flag_type VARCHAR(255),
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS queue_batches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES events(id),
        candidate_count INTEGER NOT NULL,
        admitted_count INTEGER NOT NULL,
        average_human_score INTEGER NOT NULL,
        admitted_average_human_score INTEGER NOT NULL,
        available_seats INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS queue_batches_event_created_idx
        ON queue_batches (event_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS simulation_runs (
        id UUID PRIMARY KEY,
        event_name VARCHAR(255) NOT NULL,
        status VARCHAR(32) NOT NULL,
        human_count INTEGER NOT NULL,
        bot_count INTEGER NOT NULL,
        human_admitted INTEGER NOT NULL,
        bot_admitted INTEGER NOT NULL,
        human_average_score INTEGER NOT NULL,
        bot_average_score INTEGER NOT NULL,
        maximum_batch_admitted INTEGER NOT NULL,
        batch_count INTEGER NOT NULL,
        request_count INTEGER NOT NULL,
        request_errors INTEGER NOT NULL,
        duration_seconds INTEGER NOT NULL,
        seat_count INTEGER NOT NULL DEFAULT 15,
        configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE simulation_runs ADD COLUMN IF NOT EXISTS seat_count INTEGER NOT NULL DEFAULT 15;
      ALTER TABLE simulation_runs ADD COLUMN IF NOT EXISTS configuration JSONB NOT NULL DEFAULT '{}'::jsonb;
      CREATE INDEX IF NOT EXISTS simulation_runs_created_idx
        ON simulation_runs (created_at DESC);
    `);
    console.log('Migrations executed successfully');
  } catch (error) {
    console.error('Error executing migrations', error);
    process.exitCode = 1;
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
