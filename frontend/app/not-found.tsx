import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-4 text-center">
      <div className="w-12 h-12 rounded-xl bg-[#111111] border border-[#292929] flex items-center justify-center font-mono font-bold text-white mb-4">
        404
      </div>
      <h2 className="text-xl font-bold tracking-tight mb-2">Page Not Found</h2>
      <p className="text-sm text-[#A3A3A3] max-w-sm mb-6">
        The requested resource or endpoint could not be found.
      </p>
      <Link
        href="/"
        className="px-4 py-2 rounded-lg text-xs font-semibold text-black bg-white hover:bg-[#E5E5E5] transition-colors"
      >
        Return to Downloader
      </Link>
    </div>
  );
}
