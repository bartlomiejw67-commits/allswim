"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { A, card, input, label, btnPrimary, btnDanger, btnSecondary, btnGhost } from "@/components/admin/ui";

type Cat = "gallery" | "camps";

export default function Page() {
  const [cat, setCat] = useState<Cat>("gallery");
  const images = useQuery(api.images.list, { category: cat });
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const add = useMutation(api.images.add);
  const update = useMutation(api.images.update);
  const remove = useMutation(api.images.remove);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await generateUploadUrl();
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
        const json = (await res.json()) as { storageId: string };
        await add({ storageId: json.storageId as Id<"_storage">, category: cat, featured: cat === "gallery" });
      }
    } catch (e) {
      alert((e as { data?: string; message?: string }).data ?? "Nie udało się wgrać zdjęcia.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <h1 className="font-fredoka" style={{ fontSize: 28, color: A.navy, margin: "0 0 4px" }}>Galeria</h1>
      <p style={{ color: A.grey, fontSize: 14, margin: "0 0 20px" }}>Wgrywaj zdjęcia do galerii lub do sekcji obozów. „Na głównej” oznacza wyświetlanie wśród pierwszych 6 zdjęć.</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <button onClick={() => setCat("gallery")} style={{ ...btnGhost, ...(cat === "gallery" ? { background: A.navy, color: "#fff" } : {}) }}>Galeria</button>
        <button onClick={() => setCat("camps")} style={{ ...btnGhost, ...(cat === "camps" ? { background: A.navy, color: "#fff" } : {}) }}>Obozy</button>
      </div>

      <div style={{ ...card, borderStyle: "dashed", borderColor: "#c3d4df", marginBottom: 20 }}>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} style={{ display: "none" }} />
        <button style={btnPrimary} disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? "Wgrywanie…" : "+ Wgraj zdjęcia"}</button>
      </div>

      {images === undefined && <p style={{ color: A.grey }}>Ładowanie…</p>}
      {images && images.length === 0 && <div style={{ ...card, textAlign: "center", color: A.grey }}>Brak zdjęć w tej kategorii.</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16 }}>
        {images?.map((img) => (
          <div key={img._id} style={{ ...card, padding: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {img.url && <img src={img.url} alt={img.caption ?? ""} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 12, display: "block" }} />}
            <input defaultValue={img.caption ?? ""} placeholder="Podpis (opcjonalnie)" style={{ ...input, marginTop: 10 }} onBlur={(e) => { if (e.target.value !== (img.caption ?? "")) update({ id: img._id as Id<"images">, caption: e.target.value }); }} />
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#1b3a4b", marginTop: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={img.featured} onChange={(e) => update({ id: img._id as Id<"images">, featured: e.target.checked })} /> Na głównej
            </label>
            <button style={{ ...btnDanger, marginTop: 10, width: "100%" }} onClick={() => { if (confirm("Usunąć zdjęcie?")) remove({ id: img._id as Id<"images"> }); }}>Usuń</button>
          </div>
        ))}
      </div>
    </div>
  );
}
