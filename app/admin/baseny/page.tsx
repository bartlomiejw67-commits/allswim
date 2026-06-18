"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SimpleCrud, Field } from "@/components/admin/SimpleCrud";

const fields: Field[] = [
  { key: "name", label: "Nazwa basenu" },
  { key: "address", label: "Adres", optional: true },
];

export default function Page() {
  const items = useQuery(api.pools.list);
  const create = useMutation(api.pools.create);
  const update = useMutation(api.pools.update);
  const remove = useMutation(api.pools.remove);
  return (
    <SimpleCrud
      title="Baseny"
      subtitle="Lokalizacje, w których odbywają się zajęcia. Używane w grafiku i filtrach."
      items={items}
      fields={fields}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onCreate={(v) => create(v as any)}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onUpdate={(id, v) => update({ id: id as Id<"pools">, ...(v as any) })}
      onRemove={(id) => remove({ id: id as Id<"pools"> })}
    />
  );
}
