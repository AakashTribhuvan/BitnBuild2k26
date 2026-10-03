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
        UNIQUE (user_id, event_id)
      );

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
