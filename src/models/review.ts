export function newReview(
  authorName: string,
  email: string,
  rating: number,
  body: string,
  projectId: string | null = null,
) {
  return {
    author_name: authorName,
    email,
    rating,
    body,
    is_approved: false,
    project_id: projectId,
    created_at: new Date(),
  };
}
