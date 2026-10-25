"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SimpleCrud, Field } from "@/components/admin/SimpleCrud";

const fields: Field[] = [
  { key: "name", label: "Nazwa pakietu" },
  { key: "amount", label: "Cena (np. 320 zł)" },
  { key: "unit", label: "Jednostka (np. / mies.)", optional: true },
  { key: "description", label: "Opis", type: "textarea", optional: true },
  { key: "popular", label: "Wyróżnij jako „Najczęściej wybierany”", type: "checkbox" },
];

export default function Page() {
  const items = useQuery(api.prices.list);
  const create = useMutation(api.prices.create);
  const update = useMutation(api.prices.update);
  const remove = useMutation(api.prices.remove);
  return (
    <SimpleCrud
      title="Cennik"
      subtitle="Pakiety i ceny widoczne w sekcji „Cennik”."
      items={items}
      fields={fields}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onCreate={(v) => create(v as any)}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onUpdate={(id, v) => update({ id: id as Id<"prices">, ...(v as any) })}
      onRemove={(id) => remove({ id: id as Id<"prices"> })}
      addLabel="Dodaj pakiet"
      summarize={(it) => ({
        title: String(it.name ?? "") || "(bez nazwy)",
        subtitle: [it.popular ? "Najczęściej wybierany" : "", String(it.description ?? "")].filter(Boolean).join(" · ") || undefined,
        right: (
          <span style={{ fontSize: 17, fontWeight: 700, color: "#0b3a5e", whiteSpace: "nowrap" }}>
            {String(it.amount ?? "")} <span style={{ fontSize: 13, fontWeight: 600, color: "#5f7380" }}>{String(it.unit ?? "")}</span>
          </span>
        ),
      })}
    />
  );
}
