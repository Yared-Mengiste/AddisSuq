"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/providers/auth-context";
import { CartProvider } from "@/components/providers/cart-context";
import { LangProvider } from "@/components/providers/lang-context";

/** Composes the client-side providers + the toast host. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <AuthProvider>
        <CartProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#1c3a32",
                color: "#f8f6f1",
                border: "1px solid #122820",
                borderRadius: "14px",
              },
            }}
          />
        </CartProvider>
      </AuthProvider>
    </LangProvider>
  );
}
