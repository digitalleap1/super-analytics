import Link from "next/link";
import { BarChart3 } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden h-full flex-col bg-gradient-to-br from-[#192250] via-[#5b1f5d] to-[#ee2770] p-10 text-white lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_55%)]" />
        <Link
          href="/"
          className="relative z-20 flex items-center text-lg font-semibold"
        >
          <BarChart3 className="mr-2 h-6 w-6" />
          SEO Dashboard
        </Link>
        <div className="relative z-20 mt-auto space-y-4">
          <blockquote className="space-y-2">
            <p className="text-lg leading-relaxed">
              &ldquo;The reporting layer my agency was missing. GSC, GA4, and
              rank tracking in one place — and clients love the polish.&rdquo;
            </p>
            <footer className="text-sm text-white/70">— Agency owner</footer>
          </blockquote>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 lg:p-10">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
