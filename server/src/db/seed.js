import { hashPassword } from '../services/password.js';
import { pool } from './pool.js';

const MOCK_ACCOUNTS = [
  { username: 'zhugexu', password: 'zhugexu', name: 'zhugexu', email: 'zhugexu@mock.local' },
  { username: 'liyunqi', password: 'liyunqi', name: 'liyunqi', email: 'liyunqi@mock.local' },
];
const WELCOME_CREDITS = 1000;

export async function seedMockAccounts() {
  for (const account of MOCK_ACCOUNTS) {
    await seedMockAccount(account);
  }
}

async function seedMockAccount(account) {
  const passwordHash = hashPassword(account.password);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO users (
         username, username_normalized, email, email_normalized, name, password_hash, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       ON CONFLICT (username_normalized) DO UPDATE SET
         status = 'active',
         updated_at = users.updated_at
       RETURNING id`,
      [
        account.username,
        account.username.toLowerCase(),
        account.email,
        account.email.toLowerCase(),
        account.name,
        passwordHash,
      ],
    );
    const userId = rows[0].id;
    const { rows: accountRows } = await client.query(
      `INSERT INTO credit_accounts (user_id, balance)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO NOTHING
       RETURNING user_id`,
      [userId, WELCOME_CREDITS],
    );
    if (accountRows[0]) {
      await client.query(
        `INSERT INTO credit_ledger (
           user_id, type, amount_delta, balance_after, idempotency_key,
           reference_type, reference_id, description
         )
         VALUES ($1, 'welcome_grant', $2, $2, $3, 'user', $4, 'mock 账户初始积分')
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [userId, WELCOME_CREDITS, `welcome:${account.username}`, userId],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export { MOCK_ACCOUNTS, WELCOME_CREDITS };
