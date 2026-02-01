/**
 * User Service Layer
 * ==================
 * Handles user authentication and management via BigQuery
 * Table: dashboard_users
 */

const { BigQuery } = require('@google-cloud/bigquery');
const bcrypt = require('bcryptjs');

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: process.env.BIGQUERY_PROJECT_ID || 'octup-testing',
});

const DATASET = process.env.BIGQUERY_DATASET || 'hubspot_data';
const PROJECT = process.env.BIGQUERY_PROJECT_ID || 'octup-testing';
const USERS_TABLE = 'dashboard_users';

// Default password for new users
const DEFAULT_PASSWORD = 'Octup2026!';

// Admin email (only this user can access admin panel)
const ADMIN_EMAIL = 'alon@octup.com';

/**
 * Escape string for SQL (prevent injection)
 */
function escapeSQL(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

/**
 * Execute a BigQuery query
 */
async function executeQuery(sql) {
  const options = {
    query: sql,
    location: 'US',
  };

  const [rows] = await bigquery.query(options);
  return rows;
}

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Check if users table exists, create if not
 */
async function ensureUsersTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS \`${PROJECT}.${DATASET}.${USERS_TABLE}\` (
      email STRING NOT NULL,
      password_hash STRING NOT NULL,
      name STRING,
      needs_password_change BOOL DEFAULT TRUE,
      is_active BOOL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
      last_login_at TIMESTAMP
    )
  `;

  try {
    await executeQuery(createTableSQL);
    console.log('Users table ensured');
  } catch (err) {
    // Table might already exist, that's fine
    if (!err.message.includes('Already Exists')) {
      console.error('Error ensuring users table:', err.message);
    }
  }
}

/**
 * Seed initial users if table is empty
 */
async function seedInitialUsers() {
  try {
    // Check if any users exist
    const checkSQL = `SELECT COUNT(*) as count FROM \`${PROJECT}.${DATASET}.${USERS_TABLE}\``;
    const result = await executeQuery(checkSQL);

    if (result && result[0] && result[0].count > 0) {
      console.log('Users already exist, skipping seed');
      return;
    }

    // Seed initial users
    const initialUsers = [
      { email: 'alon@octup.com', name: 'Alon', password: 'Alon@2026', needsChange: false },
      { email: 'hagai@octup.com', name: 'Hagai', password: 'Hagai@2026', needsChange: false },
      { email: 'dror@octup.com', name: 'Dror', password: 'Dror@2026', needsChange: false },
    ];

    for (const user of initialUsers) {
      const hash = await hashPassword(user.password);
      await createUserDirect(user.email, hash, user.name, user.needsChange);
    }

    console.log('Initial users seeded successfully');
  } catch (err) {
    console.error('Error seeding initial users:', err.message);
  }
}

/**
 * Create user directly (for seeding, bypasses existence check)
 */
async function createUserDirect(email, passwordHash, name, needsPasswordChange) {
  const sql = `
    INSERT INTO \`${PROJECT}.${DATASET}.${USERS_TABLE}\`
      (email, password_hash, name, needs_password_change, is_active, created_at, updated_at)
    VALUES
      (${escapeSQL(email.toLowerCase())}, ${escapeSQL(passwordHash)}, ${escapeSQL(name)}, ${needsPasswordChange}, TRUE, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())
  `;
  await executeQuery(sql);
}

/**
 * Authenticate user with email and password
 */
async function authenticateUser(email, password) {
  try {
    const sql = `
      SELECT email, password_hash, name, needs_password_change, is_active
      FROM \`${PROJECT}.${DATASET}.${USERS_TABLE}\`
      WHERE LOWER(email) = LOWER(${escapeSQL(email)})
      LIMIT 1
    `;

    const rows = await executeQuery(sql);

    if (rows.length === 0) {
      return { success: false, error: 'Invalid email or password' };
    }

    const user = rows[0];

    if (!user.is_active) {
      return { success: false, error: 'Account is disabled' };
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Update last login (fire and forget)
    const updateSQL = `
      UPDATE \`${PROJECT}.${DATASET}.${USERS_TABLE}\`
      SET last_login_at = CURRENT_TIMESTAMP()
      WHERE LOWER(email) = LOWER(${escapeSQL(email)})
    `;
    executeQuery(updateSQL).catch(() => {});

    return {
      success: true,
      user: {
        email: user.email,
        name: user.name,
        needsPasswordChange: user.needs_password_change,
        isAdmin: user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
      },
    };
  } catch (err) {
    console.error('Authentication error:', err.message);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Get all users (admin only)
 */
async function getAllUsers() {
  try {
    const sql = `
      SELECT
        email,
        name,
        needs_password_change,
        is_active,
        created_at,
        last_login_at
      FROM \`${PROJECT}.${DATASET}.${USERS_TABLE}\`
      ORDER BY created_at DESC
    `;

    const rows = await executeQuery(sql);

    return rows.map(row => ({
      email: row.email,
      name: row.name || '',
      needsPasswordChange: row.needs_password_change,
      isActive: row.is_active,
      createdAt: row.created_at ? new Date(row.created_at.value || row.created_at).toISOString() : null,
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at.value || row.last_login_at).toISOString() : null,
      isAdmin: row.email.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
    }));
  } catch (err) {
    console.error('Error fetching users:', err.message);
    throw err;
  }
}

/**
 * Create a new user
 */
async function createUser(email, passwordHash, name = null, needsPasswordChange = true) {
  try {
    // Check if user already exists
    const checkSQL = `
      SELECT email FROM \`${PROJECT}.${DATASET}.${USERS_TABLE}\`
      WHERE LOWER(email) = LOWER(${escapeSQL(email)})
    `;
    const existing = await executeQuery(checkSQL);

    if (existing.length > 0) {
      return { success: false, error: 'User already exists' };
    }

    const sql = `
      INSERT INTO \`${PROJECT}.${DATASET}.${USERS_TABLE}\`
        (email, password_hash, name, needs_password_change, is_active, created_at, updated_at)
      VALUES
        (${escapeSQL(email.toLowerCase())}, ${escapeSQL(passwordHash)}, ${escapeSQL(name)}, ${needsPasswordChange}, TRUE, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())
    `;

    await executeQuery(sql);

    return { success: true };
  } catch (err) {
    console.error('Error creating user:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Add a new user with default password (admin function)
 */
async function addUser(email, name = null) {
  try {
    const hash = await hashPassword(DEFAULT_PASSWORD);
    const result = await createUser(email, hash, name, true);
    return result;
  } catch (err) {
    console.error('Error adding user:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Delete a user (admin only)
 */
async function deleteUser(email) {
  try {
    // Prevent deleting the admin
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return { success: false, error: 'Cannot delete admin user' };
    }

    const sql = `
      DELETE FROM \`${PROJECT}.${DATASET}.${USERS_TABLE}\`
      WHERE LOWER(email) = LOWER(${escapeSQL(email)})
    `;

    await executeQuery(sql);

    return { success: true };
  } catch (err) {
    console.error('Error deleting user:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Change user password
 */
async function changePassword(email, newPassword) {
  try {
    const hash = await hashPassword(newPassword);

    const sql = `
      UPDATE \`${PROJECT}.${DATASET}.${USERS_TABLE}\`
      SET
        password_hash = ${escapeSQL(hash)},
        needs_password_change = FALSE,
        updated_at = CURRENT_TIMESTAMP()
      WHERE LOWER(email) = LOWER(${escapeSQL(email)})
    `;

    await executeQuery(sql);

    return { success: true };
  } catch (err) {
    console.error('Error changing password:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Check if user is admin
 */
function isAdmin(email) {
  return email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

module.exports = {
  ensureUsersTable,
  seedInitialUsers,
  authenticateUser,
  getAllUsers,
  addUser,
  deleteUser,
  changePassword,
  isAdmin,
  ADMIN_EMAIL,
};
