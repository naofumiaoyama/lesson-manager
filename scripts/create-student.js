require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createStudent() {
  const email = 'student@example.com';
  const password = 'student123'; // 開発用パスワード
  const name = 'テスト生徒';
  const plan = 'monthly';
  const stripeCustomerId = 'test_' + Date.now();

  try {
    // Check if student exists
    const existing = await pool.query('SELECT id FROM students WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log('Student already exists:', email);
      await pool.end();
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert student
    const result = await pool.query(
      `INSERT INTO students (email, password_hash, name, plan, stripe_customer_id, status)
       VALUES ($1, $2, $3, $4, $5, 'active') RETURNING id, email, name, status`,
      [email, passwordHash, name, plan, stripeCustomerId]
    );

    console.log('Student created:', result.rows[0]);
    console.log('Login credentials:');
    console.log('  Email:', email);
    console.log('  Password:', password);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

createStudent();
