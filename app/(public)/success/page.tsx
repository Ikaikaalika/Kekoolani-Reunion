import Link from 'next/link';

export default function SuccessPage({ searchParams }: { searchParams: { order?: string } }) {
  const { order } = searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="rounded-full bg-fern-500/10 p-6">
        <svg className="h-12 w-12 text-fern-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
        </svg>
      </div>
      <h1 className="text-4xl font-bold text-slate-900">Mahalo nui loa!</h1>
      <p className="max-w-xl text-lg text-slate-600">
        Your registration is confirmed. A receipt and event details are on the way to your inbox.
      </p>
      {order && (
        <div className="rounded-3xl border border-slate-100 bg-white px-6 py-4 text-sm text-slate-600 shadow">
          Order reference: <span className="font-semibold text-slate-900">{order}</span>
        </div>
      )}
      <Link
        href="/"
        className="rounded-full bg-ocean-500 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-ocean-600"
      >
        Return Home
      </Link>
    </div>
  );
}
