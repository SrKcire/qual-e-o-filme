export function StatsBar({ items }: { items: [label: string, value: string | number][] }) {
  return (
    <dl className="grid grid-cols-4 gap-2">
      {items.map(([label, value]) => (
        <div key={label} className="card flex flex-col items-center gap-0.5 px-2 py-2.5">
          {/* ": valor" escondido mantém a leitura "Rótulo: valor" para leitores de tela */}
          <dt className="order-last text-[10px] font-semibold tracking-[0.14em] text-zinc-500 uppercase">
            {label}
            <span className="sr-only">: {value}</span>
          </dt>
          <dd aria-hidden className="font-display text-2xl leading-none tracking-wide text-zinc-50">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
