// Renders a JSON-LD <script> tag for a schema.org object. Escaping "<" stops
// content (e.g. an admin-authored plan description) from breaking out of the
// script tag if it ever contains "</script>".
export function StructuredData({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
}
