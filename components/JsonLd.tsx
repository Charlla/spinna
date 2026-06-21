// Server-rendered JSON-LD injector. Renders a <script type="application/ld+json">
// into the HTML so search engines and LLM fetchers read structured data without
// executing any client JS.
export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
