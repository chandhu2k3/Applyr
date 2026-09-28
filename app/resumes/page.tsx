export default function ResumesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Resumes — PM / SDE families</h1>
      <p className="text-sm text-neutral-500">Files go to R2/local object storage; Postgres stores metadata + storage_key only (§5).</p>
      <form action="/api/resumes" method="post" encType="multipart/form-data" className="flex flex-wrap items-end gap-3 rounded border p-4">
        <label className="text-sm">Name<input name="name" className="mt-1 block rounded border px-2 py-1" placeholder="SDE Resume v1" /></label>
        <label className="text-sm">Family<select name="roleFamily" className="mt-1 block rounded border px-2 py-1"><option>PM</option><option>SDE</option></select></label>
        <label className="text-sm">PDF<input name="file" type="file" accept="application/pdf" className="mt-1 block" /></label>
        <button className="rounded bg-black px-4 py-2 text-white">Upload</button>
      </form>
    </div>
  );
}
