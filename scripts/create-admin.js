require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createAdmin() {
  const email = 'admin@primamateria.co.jp';
  const password = 'admin123'; // 開発用パスワード
  const name = '管理者';
  const role = 'super_admin';

  try {
    // Check if admin exists
    const existing = await pool.query('SELECT id FROM admins WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log('Admin already exists:', email);
      await pool.end();
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert admin
    const result = await pool.query(
      'INSERT INTO admins (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, passwordHash, name, role]
    );

    console.log('Admin created:', result.rows[0]);
    console.log('Login credentials:');
    console.log('  Email:', email);
    console.log('  Password:', password);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

createAdmin();
