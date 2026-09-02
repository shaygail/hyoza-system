"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";

export type LoginState = { error?: string } | null;

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), isActive: true },
    include: { userRoles: { include: { role: true } } },
  });
  const isCustomer = user?.userRoles.some((ur) => ur.role.code === "customer");
  const redirectTo = isCustomer ? "/portal" : "/app/dashboard";

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }

  return null;
}
