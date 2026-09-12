import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <Image src="/logo-mark.png" alt="" width={40} height={51} className="mx-auto h-10 w-auto opacity-80" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="text-muted mt-2">The papers live on the subject pages — start from home.</p>
      <Link
        href="/"
        className="inline-block mt-6 h-10 px-5 leading-10 rounded-lg bg-accent text-white font-medium hover:bg-accent-soft transition-colors"
      >
        Back home
      </Link>
    </div>
  );
}
