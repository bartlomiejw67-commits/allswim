"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { FunctionReference } from "convex/server";
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

  return (
    <div>
      <h1 className="font-fredoka" style={{ fontSize: 28, color: A.navy, margin: "0 0 4px" }}>Dokumenty</h1>
      <p style={{ color: A.grey, fontSize: 14, margin: "0 0 18px" }}>Pliki PDF do pobrania na stronie (regulamin, umowa) oraz treść regulaminu w rozwijanych sekcjach.</p>

      <PdfCard
        title="Regulamin do pobrania (PDF)"
        subtitle="Pojawi się na stronie jako przycisk „Pobierz regulamin (PDF)”."
        buttonName="regulaminu"
        url={settings?.regulationsPdfUrl ?? null}
        setMutation={api.settings.setRegulationsPdf}
      />
      <PdfCard
        title="Umowa do pobrania (PDF)"
        subtitle="Pojawi się na stronie jako przycisk „Pobierz umowę (PDF)”. Usuń plik, aby ukryć przycisk."
        buttonName="umowy"
        url={settings?.contractPdfUrl ?? null}
        setMutation={api.settings.setContractPdf}
      />

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

function PdfCard({
  title,
  subtitle,
  buttonName,
  url,
  setMutation,
}: {
  title: string;
  subtitle: string;
  buttonName: string;
  url: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setMutation: FunctionReference<"mutation", "public", { storageId?: Id<"_storage"> }, any>;
}) {
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const setPdf = useMutation(setMutation);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFile(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": files[0].type || "application/pdf" }, body: files[0] });
      const json = (await res.json()) as { storageId: string };
      await setPdf({ storageId: json.storageId as Id<"_storage"> });
    } catch (e) {
      alert((e as { data?: string; message?: string }).data ?? "Nie udało się wgrać PDF.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div style={{ ...card, marginBottom: 16, maxWidth: 720 }}>
      <h2 className="font-fredoka" style={{ fontSize: 18, color: A.navy, margin: "0 0 6px" }}>{title}</h2>
      <p style={{ color: A.grey, fontSize: 13, margin: "0 0 14px" }}>{subtitle}</p>
      <input ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={(e) => onFile(e.target.files)} style={{ display: "none" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button style={btnPrimary} disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? "Wgrywanie…" : url ? "Wymień PDF" : "Wgraj PDF"}</button>
        {url && (
          <>
            <a href={url} target="_blank" rel="noreferrer" style={{ ...btnSecondary, textDecoration: "none" }}>Otwórz aktualny</a>
            <button style={btnDanger} onClick={() => { if (confirm(`Usunąć PDF ${buttonName}?`)) setPdf({}); }}>Usuń PDF</button>
          </>
        )}
        {!url && <span style={{ color: A.grey, fontSize: 13 }}>Brak wgranego pliku.</span>}
      </div>
    </div>
  );
}
