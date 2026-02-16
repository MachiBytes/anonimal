import { query } from './db';
import { User } from '@/types/database';

export async function findUserByCognitoId(cognitoId: string): Promise<User | null> {
  const result = await query(
    'SELECT * FROM users WHERE cognito_id = $1',
    [cognitoId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

export async function createUser(
  fullName: string,
  email: string,
  cognitoId: string
): Promise<User> {
  const result = await query(
    `INSERT INTO users (full_name, email, cognito_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [fullName, email, cognitoId]
  );

  return result.rows[0];
}

export async function updateUser(
  cognitoId: string,
  fullName: string,
  email: string
): Promise<User> {
  const result = await query(
    `UPDATE users
     SET full_name = $1, email = $2
     WHERE cognito_id = $3
     RETURNING *`,
    [fullName, email, cognitoId]
  );

  return result.rows[0];
}

export async function findOrCreateUser(
  fullName: string,
  email: string,
  cognitoId: string
): Promise<User> {
  const existingUser = await findUserByCognitoId(cognitoId);

  if (existingUser) {
    // Update user info in case it changed in Cognito
    return updateUser(cognitoId, fullName, email);
  }

  return createUser(fullName, email, cognitoId);
}
