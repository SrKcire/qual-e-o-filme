export function StatsBar({ items }: { items: [label: string, value: string | number][] }) {
  return (
    <dl className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-zinc-400">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="inline">{label}: </dt>
          <dd className="inline font-semibold text-zinc-100">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
