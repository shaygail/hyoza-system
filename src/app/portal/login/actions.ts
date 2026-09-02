"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import type { LoginState } from "@/app/login/actions";

function safeReturnTo(value: string | undefined): string {
  if (!value || !value.startsWith("/portal") && !value.startsWith("/support")) {
    return "/portal";
  }
  if (value.includes("//")) return "/portal";
  return value;
}

export async function portalLoginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();
  const returnTo = safeReturnTo(formData.get("returnTo")?.toString());

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), isActive: true },
    include: { userRoles: { include: { role: true } } },
  });

  const isCustomer = user?.userRoles.some((ur) => ur.role.code === "customer");
  const isAdmin = user?.userRoles.some((ur) => ur.role.code === "administrator");

  if (user && !isCustomer && !isAdmin) {
    return { error: "This sign-in page is for customers. Agents should use the agent console." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: isCustomer ? returnTo : "/portal",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }

  return null;
}
