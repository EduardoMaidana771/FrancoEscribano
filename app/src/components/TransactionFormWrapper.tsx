"use client";

import { useState, useEffect } from "react";
import TransactionForm from "./TransactionForm";

interface Props {
  userId: string;
  nextMatriz: number;
  nextFolio: number;
}

export default function TransactionFormWrapper({ userId, nextMatriz, nextFolio }: Props) {
  const [initialData, setInitialData] = useState<Record<string, unknown> | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("prefill_compraventa");
    if (raw) {
      try {
        setInitialData(JSON.parse(raw));
      } catch {
        // ignore invalid JSON
      }
      sessionStorage.removeItem("prefill_compraventa");
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <TransactionForm
      userId={userId}
      nextMatriz={nextMatriz}
      nextFolio={nextFolio}
      initialData={initialData}
    />
  );
}
