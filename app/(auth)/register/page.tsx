import { Suspense } from "react";
import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
  title: "Register — Super Analytics",
};

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Get started in under a minute
        </p>
      </div>
      <Suspense fallback={<div className="h-64" />}>
        <RegisterForm />
      </Suspense>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
