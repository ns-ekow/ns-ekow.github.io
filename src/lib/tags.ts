// Normalize a display tag ("Full Stack", "AI") into a URL/filter-safe slug
// ("full-stack", "ai"). Used by the project list, filter bar, and detail chips.
export function tagSlug(tag: string): string {
  return tag.toLowerCase().trim().replace(/\s+/g, '-');
}
