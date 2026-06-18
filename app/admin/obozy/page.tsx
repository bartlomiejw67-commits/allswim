"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SimpleCrud, Field } from "@/components/admin/SimpleCrud";

const fields: Field[] = [
  { key: "title", label: "Nazwa / tytuł obozu" },
  { key: "description", label: "Opis", type: "textarea", optional: true },
  { key: "period", label: "Termin (np. 1–12 lipca 2026)", optional: true },
  { key: "location", label: "Lokalizacja", optional: true },
  { key: "price", label: "Cena", optional: true },
  { key: "contactNote", label: "Informacja kontaktowa", optional: true },
];

export default function Page() {
  const items = useQuery(api.camps.list);
  const create = useMutation(api.camps.create);
  const update = useMutation(api.camps.update);
  const remove = useMutation(api.camps.remove);
  return (
    <SimpleCrud
      title="Obozy letnie"
      subtitle="Turnusy obozów (sekcja informacyjna na stronie)."
      items={items}
      fields={fields}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onCreate={(v) => create(v as any)}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onUpdate={(id, v) => update({ id: id as Id<"camps">, ...(v as any) })}
      onRemove={(id) => remove({ id: id as Id<"camps"> })}
    />
  );
}
