// Renders a JSON-LD <script> tag for a schema.org object. Escaping "<" stops
// content (e.g. an admin-authored plan description) from breaking out of the
// script tag if it ever contains "</script>".
export function StructuredData({
  data,
  id,
}: {
  data: Record<string, unknown>;
  /**
   * Distinct id per schema on a page. React treats same-type inline scripts as
   * interchangeable and emits only one of them, which silently dropped the
   * Course/Offer schema on pages that also inherit the Organization schema
   * from the root layout. A unique id keeps each one addressable.
   */
  id?: string;
}) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
