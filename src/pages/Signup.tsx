import SignupForm from "../components/SignupForm";
import PageTransition from "../components/PageTransition";

export default function Signup() {
  return (
    <PageTransition>
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-sidebar to-background opacity-90"
          aria-hidden
        />
        <div className="relative w-full max-w-[420px]">
          <SignupForm />

          <footer className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[10px] font-semibold uppercase tracking-wider text-textMuted">
            <button type="button" className="hover:text-textSecondary">
              Security protocol
            </button>
            <button type="button" className="hover:text-textSecondary">
              API documentation
            </button>
            <button type="button" className="hover:text-textSecondary">
              Privacy systems
            </button>
          </footer>
        </div>
      </div>
    </PageTransition>
  );
}
