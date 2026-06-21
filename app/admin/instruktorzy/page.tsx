"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { A, card, input, label, btnPrimary, btnDanger, btnSecondary } from "@/components/admin/ui";

type Instructor = {
  _id: string;
  name: string;
  role: string | null;
  bio: string | null;
  order: number;
  photoUrls: string[];
};

export default function Page() {
  const items = useQuery(api.instructors.list);
  const create = useMutation(api.instructors.create);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim()) { alert("Podaj imię i nazwisko."); return; }
    setBusy(true);
    try { await create({ name: name.trim() }); setName(""); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <h1 className="font-fredoka" style={{ fontSize: 28, color: A.navy, margin: "0 0 4px" }}>Instruktorzy</h1>
      <p style={{ color: A.grey, fontSize: 14, margin: "0 0 20px", maxWidth: 760 }}>
        Profile pokazują się w sekcji <strong>„O nas”</strong> na stronie. Pierwsza osoba (Ola) pochodzi z zakładki
        <strong> Ustawienia → sekcja o nas</strong> (a jej zdjęcia z <strong>Galeria → „O nas”</strong>); tutaj dodajesz
        <strong> kolejnych instruktorów</strong> — każdemu można wgrać <strong>do 3 zdjęć</strong> (tworzą kolaż).
      </p>

      <div style={{ ...card, marginBottom: 22, maxWidth: 760, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={label}>Imię i nazwisko nowego instruktora</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Kasia Nowak" style={input} />
        </div>
        <button style={btnPrimary} disabled={busy} onClick={add}>{busy ? "Dodawanie…" : "+ Dodaj instruktora"}</button>
      </div>

      {items === undefined && <p style={{ color: A.grey }}>Ładowanie…</p>}
      {items && items.length === 0 && (
        <div style={{ ...card, color: A.grey }}>Brak dodatkowych instruktorów. Na stronie pokazuje się tylko profil główny (Ola).</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}>
        {items?.map((it) => <InstructorCard key={it._id} it={it} />)}
      </div>
    </div>
  );
}

function InstructorCard({ it }: { it: Instructor }) {
  const update = useMutation(api.instructors.update);
  const remove = useMutation(api.instructors.remove);
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const addPhoto = useMutation(api.instructors.addPhoto);
  const removePhotoAt = useMutation(api.instructors.removePhotoAt);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const free = 3 - it.photoUrls.length;
      for (const file of Array.from(files).slice(0, Math.max(0, free))) {
        const url = await generateUploadUrl();
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
        const json = (await res.json()) as { storageId: string };
        await addPhoto({ id: it._id as Id<"instructors">, storageId: json.storageId as Id<"_storage"> });
      }
    } catch (e) {
      alert((e as { data?: string; message?: string }).data ?? "Nie udało się wgrać zdjęcia.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const canAdd = it.photoUrls.length < 3;

  return (
    <div style={{ ...card, display: "flex", gap: 16, flexWrap: "wrap" }}>
      <div style={{ flex: "none", width: 200 }}>
        <label style={label}>Zdjęcia (maks. 3)</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {it.photoUrls.map((u, i) => (
            <div key={i} style={{ position: "relative", width: 88, height: 88, borderRadius: 12, overflow: "hidden", border: "1px solid #d6e7f2", background: "#eaf4fb" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button title="Usuń zdjęcie" onClick={() => { if (confirm("Usunąć to zdjęcie?")) removePhotoAt({ id: it._id as Id<"instructors">, index: i }); }} style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: "50%", border: "none", background: "rgba(180,35,42,0.92)", color: "#fff", cursor: "pointer", fontWeight: 800, lineHeight: 1, fontSize: 14 }}>×</button>
            </div>
          ))}
          {it.photoUrls.length === 0 && (
            <div style={{ width: 88, height: 88, borderRadius: 12, background: "#eaf4fb", border: "1px solid #d6e7f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, opacity: 0.5 }}>🧑‍🏫</div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} style={{ display: "none" }} />
        <button style={{ ...btnSecondary, width: "100%", marginTop: 8, padding: "7px 10px", fontSize: 13, opacity: canAdd ? 1 : 0.5 }} disabled={uploading || !canAdd} onClick={() => fileRef.current?.click()}>
          {uploading ? "Wgrywanie…" : canAdd ? `+ Dodaj zdjęcie (${it.photoUrls.length}/3)` : "Komplet (3/3)"}
        </button>
      </div>

      <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <label style={label}>Imię i nazwisko</label>
          <input defaultValue={it.name} style={input} onBlur={(e) => { if (e.target.value.trim() && e.target.value !== it.name) update({ id: it._id as Id<"instructors">, name: e.target.value.trim() }); }} />
        </div>
        <div>
          <label style={label}>Rola / funkcja</label>
          <input defaultValue={it.role ?? ""} placeholder="np. Instruktorka pływania" style={input} onBlur={(e) => { if (e.target.value !== (it.role ?? "")) update({ id: it._id as Id<"instructors">, role: e.target.value }); }} />
        </div>
        <div>
          <label style={label}>Krótki opis</label>
          <textarea defaultValue={it.bio ?? ""} rows={3} placeholder="Kilka zdań o instruktorze…" style={{ ...input, resize: "vertical" }} onBlur={(e) => { if (e.target.value !== (it.bio ?? "")) update({ id: it._id as Id<"instructors">, bio: e.target.value }); }} />
        </div>
        <button style={{ ...btnDanger, alignSelf: "flex-start", padding: "8px 16px" }} onClick={() => { if (confirm(`Usunąć instruktora „${it.name}”?`)) remove({ id: it._id as Id<"instructors"> }); }}>Usuń instruktora</button>
      </div>
    </div>
  );
}
