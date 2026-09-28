export default function ApplicationDetail({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Application {params.id}</h1>
      <p className="text-sm text-neutral-500">Job · resume used · answers · timeline · agent run · verification evidence.</p>
    </div>
  );
}
