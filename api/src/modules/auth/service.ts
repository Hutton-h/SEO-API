import { db } from '../../shared/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { generateToken, type JwtPayload } from '../../shared/middleware/auth.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginResult {
  user: User;
  token: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function register(
  data: {
    email: string;
    password: string;
    name: string;
  },
): Promise<LoginResult> {
  // Check if user exists
  const existing = await db('users').where('email', data.email).first();
  if (existing) {
    throw new Error('User with this email already exists');
  }

  const id = uuidv4();
  const hashedPassword = await bcrypt.hash(data.password, 12);

  const [user] = await db('users')
    .insert({
      id,
      email: data.email,
      password_hash: hashedPassword,
      name: data.name,
      role: 'user',
    })
    .returning(['id', 'email', 'name', 'role', 'avatar_url', 'created_at', 'updated_at']);

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: formatUser(user),
    token,
  };
}

export async function login(
  data: {
    email: string;
    password: string;
  },
): Promise<LoginResult> {
  const user = await db('users').where('email', data.email).first();
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const u = user as Record<string, unknown>;
  const passwordHash = u['password_hash'] as string;

  const isValid = await bcrypt.compare(data.password, passwordHash);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  const token = generateToken({
    userId: u['id'] as string,
    email: u['email'] as string,
    role: u['role'] as string,
  });

  return {
    user: formatUser(u),
    token,
  };
}

export async function getMe(userId: string): Promise<User | null> {
  const user = await db('users')
    .where('id', userId)
    .select('id', 'email', 'name', 'role', 'avatar_url', 'created_at', 'updated_at')
    .first();

  return user ? formatUser(user) : null;
}

export async function updateProfile(
  userId: string,
  data: {
    name?: string;
    avatar_url?: string;
  },
): Promise<User | null> {
  const updateData: Record<string, unknown> = { updated_at: db.fn.now() };
  if (data.name !== undefined) updateData['name'] = data.name;
  if (data.avatar_url !== undefined) updateData['avatar_url'] = data.avatar_url;

  const [user] = await db('users')
    .where('id', userId)
    .update(updateData)
    .returning(['id', 'email', 'name', 'role', 'avatar_url', 'created_at', 'updated_at']);

  return user ? formatUser(user) : null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUser(raw: Record<string, unknown>): User {
  return {
    id: raw['id'] as string,
    email: raw['email'] as string,
    name: raw['name'] as string,
    role: raw['role'] as string,
    avatar_url: (raw['avatar_url'] as string) ?? null,
    created_at: raw['created_at'] as string,
    updated_at: raw['updated_at'] as string,
  };
}

export default {
  register,
  login,
  getMe,
  updateProfile,
};