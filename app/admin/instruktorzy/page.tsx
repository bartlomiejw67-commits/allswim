"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { A, card, input, label, btnPrimary, btnDanger, btnSecondary, btnGhost } from "@/components/admin/ui";

type Instructor = {
  _id: string;
  name: string;
  role: string | null;
  bio: string | null;
  order: number;
  photoUrl: string | null;
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
        <strong> Ustawienia → sekcja o nas</strong>; tutaj dodajesz <strong>kolejnych instruktorów</strong> (zdjęcie, imię, rola, opis).
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
  const setPhoto = useMutation(api.instructors.setPhoto);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFile(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const url = await generateUploadUrl();
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": files[0].type }, body: files[0] });
      const json = (await res.json()) as { storageId: string };
      await setPhoto({ id: it._id as Id<"instructors">, storageId: json.storageId as Id<"_storage"> });
    } catch (e) {
      alert((e as { data?: string; message?: string }).data ?? "Nie udało się wgrać zdjęcia.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div style={{ ...card, display: "flex", gap: 16, flexWrap: "wrap" }}>
      <div style={{ flex: "none", width: 120 }}>
        <div style={{ width: 120, height: 120, borderRadius: 14, overflow: "hidden", background: "#eaf4fb", border: "1px solid #d6e7f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {it.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={it.photoUrl} alt={it.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 32, opacity: 0.5 }} aria-hidden>🧑‍🏫</span>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={(e) => onFile(e.target.files)} style={{ display: "none" }} />
        <button style={{ ...btnSecondary, width: "100%", marginTop: 8, padding: "7px 10px", fontSize: 13 }} disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? "Wgrywanie…" : it.photoUrl ? "Wymień zdjęcie" : "Wgraj zdjęcie"}
        </button>
        {it.photoUrl && (
          <button style={{ ...btnGhost, width: "100%", marginTop: 6, padding: "6px 10px", fontSize: 12 }} onClick={() => { if (confirm("Usunąć zdjęcie?")) setPhoto({ id: it._id as Id<"instructors"> }); }}>Usuń zdjęcie</button>
        )}
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
