import { db } from '../db/index.js';
import { decryptText, encryptText } from '../utils/crypto.js';

function whereForOwner(owner) {
  if (owner?.userId) {
    return {
      sql: 'user_id = ?',
      value: owner.userId,
    };
  }
  return {
    sql: 'session_key = ?',
    value: owner.sessionKey,
  };
}

function valuesForInsert(owner) {
  if (owner?.userId) {
    return {
      userId: owner.userId,
      sessionKey: null,
    };
  }
  return {
    userId: null,
    sessionKey: owner.sessionKey,
  };
}

export function saveUserToken({ owner, token, note = '' }) {
  const encryptedToken = encryptText(token);
  const where = whereForOwner(owner);
  const existing = db.prepare(`SELECT id FROM user_tokens WHERE ${where.sql}`).get(where.value);

  if (existing) {
    db.prepare(`
      UPDATE user_tokens
      SET encrypted_token = ?, token_note = ?, updated_at = CURRENT_TIMESTAMP
      WHERE ${where.sql}
    `).run(encryptedToken, note, where.value);
  } else {
    const ownerValues = valuesForInsert(owner);
    db.prepare(`
      INSERT INTO user_tokens (user_id, session_key, encrypted_token, token_note)
      VALUES (?, ?, ?, ?)
    `).run(ownerValues.userId, ownerValues.sessionKey, encryptedToken, note);
  }
}

export function getUserTokenRecord(owner) {
  const where = whereForOwner(owner);
  return db.prepare(`SELECT * FROM user_tokens WHERE ${where.sql}`).get(where.value);
}

export function getDecryptedUserToken(owner) {
  const record = getUserTokenRecord(owner);
  if (!record) return null;
  return {
    ...record,
    token: decryptText(record.encrypted_token),
  };
}

export function markUserTokenValidated(owner) {
  const where = whereForOwner(owner);
  db.prepare(`
    UPDATE user_tokens
    SET last_validated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE ${where.sql}
  `).run(where.value);
}

export function deleteUserToken(owner) {
  const where = whereForOwner(owner);
  db.prepare(`DELETE FROM user_tokens WHERE ${where.sql}`).run(where.value);
}
