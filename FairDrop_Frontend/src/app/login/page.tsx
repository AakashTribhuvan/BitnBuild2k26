import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return <main className="mx-auto flex min-h-[74vh] max-w-[1100px] items-center justify-center px-5 py-10"><AuthForm /></main>;
}
