import { pool } from '../config/database';
import bcrypt from 'bcryptjs';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminRes = await client.query(
      `INSERT INTO users (email, password_hash, name, is_admin, is_verified) 
       VALUES ('admin@fairdrop.com', $1, 'Admin User', true, true)
       ON CONFLICT (email) DO UPDATE SET is_admin = true, is_verified = true
       RETURNING id`,
      [adminPassword]
    );

    // Create test user
    const userPassword = await bcrypt.hash('user123', 10);
    await client.query(
      `INSERT INTO users (email, password_hash, name, is_admin, is_verified) 
       VALUES ('user@fairdrop.com', $1, 'Test User', false, true)
       ON CONFLICT (email) DO UPDATE SET is_verified = true`,
      [userPassword]
    );

    let eventRes = await client.query(
      `SELECT id FROM events WHERE name = 'FairDrop Launch Concert' ORDER BY created_at LIMIT 1`
    );
    if (eventRes.rows.length === 0) {
      eventRes = await client.query(
        `INSERT INTO events (name, total_seats, sale_start, sale_end, status) 
         VALUES ('FairDrop Launch Concert', 500, NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days', 'active') RETURNING id`
      );
    }
    const eventId = eventRes.rows[0].id;

    // Create 500 seats
    const seatValues = [];
    for (let i = 1; i <= 500; i++) {
      seatValues.push(`('${eventId}', ${i}, 'available')`);
    }
    await client.query(
      `INSERT INTO seats (event_id, seat_number, status) VALUES ${seatValues.join(',')}
       ON CONFLICT (event_id, seat_number) DO NOTHING`
    );

    await client.query('COMMIT');
    console.log('Database seeded successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seed error', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
