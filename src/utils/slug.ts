export function createTaskSlug(task: { id: string; title: string }): string {
  const cleanTitle = (task.title || '')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (cleanTitle) {
    return `${cleanTitle}-${task.id}`;
  }
  return task.id;
}
