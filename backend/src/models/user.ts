export function newUser(email: string, passwordHash: string, role = 'client', name = '') {
  const now = new Date();
  return {
    email,
    password_hash: passwordHash,
    role,
    name,
    phone: null as string | null,
    created_at: now,
    updated_at: now,
    is_active: true,
  };
}
