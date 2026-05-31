"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TransactionMonitorPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin_dash/transactions?view=monitor");
    return;
  }, []);

  return null;
}