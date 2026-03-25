export function newProject(title: string, clientId: string, description = '', categories: string[] = []) {
  const now = new Date();
  return {
    title,
    description,
    client_id: clientId,
    status: 'active',
    cover_image_key: null as string | null,
    categories,
    share_link_token: null as string | null,
    share_link_expires_at: null as Date | null,
    project_expires_at: null as Date | null,
    created_at: now,
    updated_at: now,
  };
}
