"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { A, card, input, label, btnPrimary, btnDanger, btnSecondary, pageTitle, pageDesc } from "@/components/admin/ui";
import { Icon } from "@/components/Icons";
import { compressImage } from "@/components/imageCompress";

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
      <h1 className="font-fredoka" style={pageTitle}>Instruktorzy</h1>
      <p style={pageDesc}>
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
  const [flash, setFlash] = useState(false);

  // Zapis automatyczny po wyjściu z pola + krótkie potwierdzenie „Zapisano".
  async function save(patch: { name?: string; role?: string; bio?: string }) {
    try {
      await update({ id: it._id as Id<"instructors">, ...patch });
      setFlash(true);
      setTimeout(() => setFlash(false), 2200);
    } catch (e) {
      alert((e as { data?: string }).data ?? "Nie udało się zapisać.");
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const free = 3 - it.photoUrls.length;
      for (const file of Array.from(files).slice(0, Math.max(0, free))) {
        const blob = await compressImage(file);
        const url = await generateUploadUrl();
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": blob.type || file.type }, body: blob });
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
              <button title="Usuń zdjęcie" onClick={() => { if (confirm("Usunąć to zdjęcie?")) removePhotoAt({ id: it._id as Id<"instructors">, index: i }); }} style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: "50%", border: "none", background: "rgba(180,35,42,0.92)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={13} stroke={2.4} /></button>
            </div>
          ))}
          {it.photoUrls.length === 0 && (
            <div style={{ width: 88, height: 88, borderRadius: 12, background: "#eaf4fb", border: "1px solid #d6e7f2", display: "flex", alignItems: "center", justifyContent: "center", color: "#8fb4cc" }}><Icon name="user" size={30} stroke={1.6} /></div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} style={{ display: "none" }} />
        <button style={{ ...btnSecondary, width: "100%", marginTop: 8, padding: "7px 10px", fontSize: 13, opacity: canAdd ? 1 : 0.5 }} disabled={uploading || !canAdd} onClick={() => fileRef.current?.click()}>
          {uploading ? "Wgrywanie…" : canAdd ? `+ Dodaj zdjęcie (${it.photoUrls.length}/3)` : "Komplet (3/3)"}
        </button>
      </div>

      <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 12.5, color: A.grey }}>
          <span>Zmiany zapisują się automatycznie po wyjściu z pola.</span>
          {flash && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#1f8a5b", fontWeight: 600, fontSize: 13.5 }}><Icon name="check" size={15} stroke={2.2} /> Zapisano</span>}
        </div>
        <div>
          <label style={label}>Imię i nazwisko</label>
          <input defaultValue={it.name} style={input} onBlur={(e) => { if (e.target.value.trim() && e.target.value !== it.name) save({ name: e.target.value.trim() }); }} />
        </div>
        <div>
          <label style={label}>Rola / funkcja</label>
          <input defaultValue={it.role ?? ""} placeholder="np. Instruktorka pływania" style={input} onBlur={(e) => { if (e.target.value !== (it.role ?? "")) save({ role: e.target.value }); }} />
        </div>
        <div>
          <label style={label}>Krótki opis</label>
          <textarea defaultValue={it.bio ?? ""} rows={4} placeholder="Kilka zdań o instruktorze…" style={{ ...input, resize: "vertical", lineHeight: 1.5 }} onBlur={(e) => { if (e.target.value !== (it.bio ?? "")) save({ bio: e.target.value }); }} />
        </div>
        <button style={{ ...btnDanger, alignSelf: "flex-start" }} onClick={() => { if (confirm(`Usunąć instruktora „${it.name}”?`)) remove({ id: it._id as Id<"instructors"> }); }}><Icon name="trash" size={15} /> Usuń instruktora</button>
      </div>
    </div>
  );
}
