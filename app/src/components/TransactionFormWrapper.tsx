"use client";

import { useState, useEffect } from "react";
import TransactionForm from "./TransactionForm";

interface Props {
  userId: string;
  nextMatriz: number;
  nextFolio: number;
  paperDefaults: {
    paper_series_proto: string;
    paper_number_proto: string;
    paper_series_testimony: string;
    paper_numbers_testimony: string;
  };
}

export default function TransactionFormWrapper({
  userId,
  nextMatriz,
  nextFolio,
  paperDefaults,
}: Props) {
  const [initialData, setInitialData] = useState<Record<string, unknown> | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("prefill_compraventa");
    if (raw) {
      try {
        setInitialData({
          ...paperDefaults,
          ...(JSON.parse(raw) as Record<string, unknown>),
        });
      } catch {
        setInitialData(paperDefaults);
      }
      sessionStorage.removeItem("prefill_compraventa");
    } else {
      setInitialData(paperDefaults);
    }
    setReady(true);
  }, [paperDefaults]);

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
