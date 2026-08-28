"use client";

/**
 * Simulated auth (no real login): the header exposes a role switcher and a
 * "current demo user" picker. The selection lives in localStorage and this
 * context hydrates the matching records from the JSON API.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/client";
import type { Customer, Role, Shop } from "@/types";

interface AuthContextValue {
  ready: boolean;
  role: Role;
  setRole: (role: Role) => void;
  /** All demo customers, for the picker. */
  customers: Pick<Customer, "id" | "name" | "phone">[];
  /** The current customer record (defaults to cust_01). */
  customer: Customer | null;
  customerId: string;
  setCustomerId: (id: string) => void;
  refreshCustomer: () => void;
  /** All shops (any status), for the vendor picker. */
  shops: Shop[];
  vendorShopId: string;
  vendorShop: Shop | null;
  setVendorShopId: (id: string) => void;
  refreshShops: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const KEYS = {
  role: "addissuq.role",
  customerId: "addissuq.customerId",
  vendorShopId: "addissuq.vendorShopId",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [role, setRoleState] = useState<Role>("customer");
  const [customers, setCustomers] = useState<AuthContextValue["customers"]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerId, setCustomerIdState] = useState("cust_01");
  const [customerTick, setCustomerTick] = useState(0);
  const [shops, setShops] = useState<Shop[]>([]);
  const [vendorShopId, setVendorShopIdState] = useState("shop_01");
  const [shopTick, setShopTick] = useState(0);

  // Hydrate persisted selections after mount (SSR renders the defaults).
  useEffect(() => {
    const savedRole = window.localStorage.getItem(KEYS.role);
    if (savedRole === "customer" || savedRole === "vendor" || savedRole === "admin") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRoleState(savedRole);
    }
    const savedCustomer = window.localStorage.getItem(KEYS.customerId);
     
    if (savedCustomer) setCustomerIdState(savedCustomer);
    const savedShop = window.localStorage.getItem(KEYS.vendorShopId);
     
    if (savedShop) setVendorShopIdState(savedShop);
     
    setReady(true);
  }, []);

  // Picker lists + records.
  useEffect(() => {
    let cancelled = false;
    api<Pick<Customer, "id" | "name" | "phone">[]>("/api/customers")
      .then((list) => {
        if (cancelled) return;
         
        setCustomers(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<Shop[]>("/api/shops?status=all")
      .then((list) => {
        if (cancelled) return;
         
        setShops(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [shopTick]);

  useEffect(() => {
    let cancelled = false;
    api<Customer>(`/api/customers/${customerId}`)
      .then((c) => {
        if (cancelled) return;
         
        setCustomer(c);
      })
      .catch(() => {
        if (!cancelled) {
           
          setCustomer(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, customerTick]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      role,
      setRole: (next) => {
        setRoleState(next);
        window.localStorage.setItem(KEYS.role, next);
      },
      customers,
      customer,
      customerId,
      setCustomerId: (id) => {
        setCustomerIdState(id);
        window.localStorage.setItem(KEYS.customerId, id);
      },
      refreshCustomer: () => setCustomerTick((t) => t + 1),
      shops,
      vendorShopId,
      vendorShop: shops.find((s) => s.id === vendorShopId) ?? null,
      setVendorShopId: (id) => {
        setVendorShopIdState(id);
        window.localStorage.setItem(KEYS.vendorShopId, id);
      },
      refreshShops: () => setShopTick((t) => t + 1),
    }),
    [ready, role, customers, customer, customerId, shops, vendorShopId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
