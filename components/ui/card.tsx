export function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs uppercase text-neutral-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`rounded bg-black px-4 py-2 text-white disabled:opacity-50 ${props.className ?? ""}`} />;
}

export function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border px-2 py-0.5 text-xs">{children}</span>;
}
