"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SimpleCrud, Field } from "@/components/admin/SimpleCrud";

const fields: Field[] = [
  { key: "name", label: "Nazwa poziomu" },
  { key: "description", label: "Opis", type: "textarea", optional: true },
];

export default function Page() {
  const items = useQuery(api.levels.list);
  const create = useMutation(api.levels.create);
  const update = useMutation(api.levels.update);
  const remove = useMutation(api.levels.remove);
  return (
    <SimpleCrud
      title="Poziomy zaawansowania"
      subtitle="Poziomy widoczne w formularzu naboru i przy grupach."
      items={items}
      fields={fields}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onCreate={(v) => create(v as any)}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onUpdate={(id, v) => update({ id: id as Id<"levels">, ...(v as any) })}
      onRemove={(id) => remove({ id: id as Id<"levels"> })}
    />
  );
}
