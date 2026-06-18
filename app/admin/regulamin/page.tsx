"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SimpleCrud, Field } from "@/components/admin/SimpleCrud";
import { A, card, btnPrimary, btnDanger, btnSecondary } from "@/components/admin/ui";

const fields: Field[] = [
  { key: "title", label: "Tytuł sekcji" },
  { key: "content", label: "Treść", type: "textarea" },
];

export default function Page() {
  const items = useQuery(api.regulations.list);
  const create = useMutation(api.regulations.create);
  const update = useMutation(api.regulations.update);
  const remove = useMutation(api.regulations.remove);

  const settings = useQuery(api.settings.get);
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const setPdf = useMutation(api.settings.setRegulationsPdf);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFile(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const url = await generateUploadUrl();
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": files[0].type || "application/pdf" }, body: files[0] });
      const json = (await res.json()) as { storageId: string };
      await setPdf({ storageId: json.storageId as Id<"_storage"> });
    } catch (e) {
      alert((e as { data?: string; message?: string }).data ?? "Nie udało się wgrać PDF.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const pdfUrl = settings?.regulationsPdfUrl ?? null;

  return (
    <div>
      <div style={{ ...card, marginBottom: 22, maxWidth: 720 }}>
        <h2 className="font-fredoka" style={{ fontSize: 18, color: A.navy, margin: "0 0 6px" }}>Regulamin do pobrania (PDF)</h2>
        <p style={{ color: A.grey, fontSize: 13, margin: "0 0 14px" }}>Plik PDF, który pojawi się na stronie jako przycisk „Pobierz regulamin (PDF)”.</p>
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={(e) => onFile(e.target.files)} style={{ display: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button style={btnPrimary} disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? "Wgrywanie…" : pdfUrl ? "Wymień PDF" : "Wgraj PDF"}</button>
          {pdfUrl && (
            <>
              <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ ...btnSecondary, textDecoration: "none" }}>Otwórz aktualny</a>
              <button style={btnDanger} onClick={() => { if (confirm("Usunąć PDF regulaminu?")) setPdf({}); }}>Usuń PDF</button>
            </>
          )}
          {!pdfUrl && <span style={{ color: A.grey, fontSize: 13 }}>Brak wgranego pliku.</span>}
        </div>
      </div>

      <SimpleCrud
        title="Regulamin — sekcje rozwijane"
        subtitle="Treść regulaminu w formie rozwijanych sekcji na stronie."
        items={items}
        fields={fields}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onCreate={(v) => create(v as any)}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onUpdate={(id, v) => update({ id: id as Id<"regulationSections">, ...(v as any) })}
        onRemove={(id) => remove({ id: id as Id<"regulationSections"> })}
      />
    </div>
  );
}
