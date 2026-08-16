import { Link } from "react-router-dom";
import SignupForm from "../components/SignupForm";
import PageTransition from "../components/PageTransition";
import { useDocumentSEO } from "../hooks/useDocumentSEO";

export default function Signup() {
  useDocumentSEO({
    title: "Sign Up",
    description: "Initialize your operative account and get access to the AI interface.",
  });

  return (
    <PageTransition>
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-sidebar to-background opacity-90"
          aria-hidden
        />
        <div className="relative w-full max-w-[420px]">
          <SignupForm />

          <footer className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] font-semibold uppercase tracking-wider text-textMuted">
            <Link to="/terms" className="hover:text-primary transition-colors">
              Terms & Conditions
            </Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            {/* <Link to="/refund-policy" className="hover:text-primary transition-colors">
              Refund Policy
            </Link> */}
            {/* <Link to="/contact-us" className="hover:text-primary transition-colors">
              Contact Us
            </Link> */}
          </footer>
        </div>
      </div>
    </PageTransition>
  );
}
