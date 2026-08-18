/**
 * Lowercase, hyphen-separated slug for public catalog URLs.
 *
 * Deliberately mirrors the SQL expression used to backfill slugs in the
 * `class_taxonomy_and_program_sku` migration, so a slug generated at runtime
 * matches what that migration produced for pre-existing rows.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
