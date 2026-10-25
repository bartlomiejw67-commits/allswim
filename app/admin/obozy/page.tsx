"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { A, card, input, label, btnPrimary, btnSecondary, btnDanger, pageTitle, pageDesc } from "@/components/admin/ui";
import { compressImage } from "@/components/imageCompress";
import { CAMPS_EMPTY_TITLE, CAMPS_EMPTY_TEXT, CAMPS_PHOTOS_HEADING } from "@/components/campsDefaults";
import { SaveBar } from "@/components/admin/Controls";

// Wszystko o obozach w jednym miejscu: czy jest oferta, treść „wkrótce", sama oferta, plakat, PDF, zdjęcia.
type CampForm = {
  campsBadge: string;
  campsTitle: string;
  campsDescription: string;
  campsDates: string;
  campsLocation: string;
  campsPrice: string;
  campsUpcomingHeading: string;
  campsEmptyText: string;
  campsPhotosHeading: string;
};

const EMPTY: CampForm = {
  campsBadge: "",
  campsTitle: "",
  campsDescription: "",
  campsDates: "",
  campsLocation: "",
  campsPrice: "",
  campsUpcomingHeading: "",
  campsEmptyText: "",
  campsPhotosHeading: "",
};

const hint: React.CSSProperties = { color: A.grey, fontSize: 13, margin: "0 0 14px", lineHeight: 1.5 };

export default function Page() {
  const settings = useQuery(api.settings.get);
  const update = useMutation(api.settings.update);
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const setPdf = useMutation(api.settings.setCampsOfferPdf);
  const setPoster = useMutation(api.settings.setCampsPoster);
  const campPhotos = useQuery(api.images.list, { category: "camps" });

  const [form, setForm] = useState<CampForm>(EMPTY);
  const [initial, setInitial] = useState<CampForm>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [switching, setSwitching] = useState(false);
  const pdfRef = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLInputElement>(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [posterUploading, setPosterUploading] = useState(false);

  useEffect(() => {
    if (settings !== undefined && !loaded) {
      const f: CampForm = {
        campsBadge: settings?.campsBadge ?? "",
        campsTitle: settings?.campsTitle ?? "",
        campsDescription: settings?.campsDescription ?? "",
        campsDates: settings?.campsDates ?? "",
        campsLocation: settings?.campsLocation ?? "",
        campsPrice: settings?.campsPrice ?? "",
        campsUpcomingHeading: settings?.campsUpcomingHeading ?? "",
        campsEmptyText: settings?.campsEmptyText ?? "",
        campsPhotosHeading: settings?.campsPhotosHeading ?? "",
      };
      setForm(f);
      setInitial(f);
      setLoaded(true);
    }
  }, [settings, loaded]);

  const active = settings?.campsOfferActive ?? false;
  const pdfUrl = settings?.campsOfferPdfUrl ?? null;
  const posterUrl = settings?.campsPosterUrl ?? null;

  function set<K extends keyof CampForm>(k: K, v: CampForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  }

  const dirty = loaded && JSON.stringify(form) !== JSON.stringify(initial);

  async function save() {
    setSaving(true);
    try {
      await update(form);
      setInitial(form);
      setSaved(true);
    } catch (e) {
      alert((e as { data?: string; message?: string }).data ?? "Nie udało się zapisać.");
    } finally {
      setSaving(false);
    }
  }

  async function setActive(next: boolean) {
    if (next === active) return;
    setSwitching(true);
    try {
      await update({ campsOfferActive: next });
    } catch (e) {
      alert((e as { data?: string; message?: string }).data ?? "Nie udało się przełączyć.");
    } finally {
      setSwitching(false);
    }
  }

  async function onPdf(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setPdfUploading(true);
    try {
      const url = await generateUploadUrl();
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type || "application/pdf" }, body: file });
      const json = (await res.json()) as { storageId: string };
      await setPdf({ storageId: json.storageId as Id<"_storage"> });
    } catch (e) {
      alert((e as { data?: string; message?: string }).data ?? "Nie udało się wgrać PDF.");
    } finally {
      setPdfUploading(false);
      if (pdfRef.current) pdfRef.current.value = "";
    }
  }

  async function onPoster(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setPosterUploading(true);
    try {
      const blob = await compressImage(file, 1400, 0.85);
      const url = await generateUploadUrl();
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": blob.type || file.type }, body: blob });
      const json = (await res.json()) as { storageId: string };
      await setPoster({ storageId: json.storageId as Id<"_storage"> });
    } catch (e) {
      alert((e as { data?: string; message?: string }).data ?? "Nie udało się wgrać plakatu.");
    } finally {
      setPosterUploading(false);
      if (posterRef.current) posterRef.current.value = "";
    }
  }

  const modeBtn = (on: boolean): React.CSSProperties => ({
    flex: "1 1 260px",
    textAlign: "left",
    cursor: switching ? "default" : "pointer",
    borderRadius: 14,
    padding: "16px 18px",
    border: `2px solid ${on ? A.navy : A.line}`,
    background: on ? "#eef6fc" : "#fff",
    fontFamily: "inherit",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 820 }}>
      <div>
        <h1 className="font-fredoka" style={pageTitle}>Obozy</h1>
        <p style={{ ...pageDesc, margin: 0 }}>Wszystko o sekcji obozów w jednym miejscu: czy jest aktualna oferta, treść na czas bez oferty, sama oferta, plakat, PDF i zdjęcia.</p>
      </div>

      {/* 1. Czy jest oferta */}
      <div style={card}>
        <h2 className="font-fredoka" style={{ fontSize: 18, color: A.navy, margin: "0 0 6px" }}>Czy jest aktualna oferta obozu?</h2>
        <p style={hint}>Przełączenie działa od razu na stronie. Ofertę możesz przygotować wcześniej (niżej) i włączyć, gdy będzie gotowa.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" disabled={switching} onClick={() => setActive(false)} style={modeBtn(!active)}>
            <div style={{ fontWeight: 800, fontSize: 15, color: !active ? A.navy : "#1b3a4b" }}>{!active ? "● " : "○ "}Brak oferty</div>
            <div style={{ fontSize: 13, color: A.grey, marginTop: 6, lineHeight: 1.5 }}>Na stronie: opis „nowe obozy wkrótce” i duża galeria zdjęć z poprzednich obozów. Plakat, termin, cena i PDF są ukryte.</div>
          </button>
          <button type="button" disabled={switching} onClick={() => setActive(true)} style={modeBtn(active)}>
            <div style={{ fontWeight: 800, fontSize: 15, color: active ? A.navy : "#1b3a4b" }}>{active ? "● " : "○ "}Oferta aktywna</div>
            <div style={{ fontSize: 13, color: A.grey, marginTop: 6, lineHeight: 1.5 }}>Na stronie: pełna oferta — opis, termin, miejsce, cena, plakat i przycisk pobrania PDF.</div>
          </button>
        </div>
      </div>

      {/* 2. Treść, gdy brak oferty */}
      <div style={{ ...card, opacity: active ? 0.75 : 1 }}>
        <h2 className="font-fredoka" style={{ fontSize: 17, color: A.navy, margin: "0 0 6px" }}>Treść, gdy brak oferty</h2>
        <p style={hint}>Puste pole = tekst domyślny (widoczny w polu jako podpowiedź).</p>
        <label style={label}>Tytuł</label>
        <input value={form.campsUpcomingHeading} onChange={(e) => set("campsUpcomingHeading", e.target.value)} style={input} placeholder={CAMPS_EMPTY_TITLE} />
        <div style={{ height: 12 }} />
        <label style={label}>Opis <span style={{ fontWeight: 400, color: A.grey }}>(pusta linia = nowy akapit)</span></label>
        <textarea value={form.campsEmptyText} onChange={(e) => set("campsEmptyText", e.target.value)} rows={7} style={{ ...input, resize: "vertical", lineHeight: 1.5 }} placeholder={CAMPS_EMPTY_TEXT} />
      </div>

      {/* 3. Oferta obozu */}
      <div style={{ ...card, opacity: active ? 1 : 0.9 }}>
        <h2 className="font-fredoka" style={{ fontSize: 17, color: A.navy, margin: "0 0 6px" }}>Oferta obozu</h2>
        <p style={hint}>{active ? "Widoczna teraz na stronie." : "Ukryta na stronie — pokaże się po wybraniu „Oferta aktywna”. Możesz ją spokojnie przygotować."}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
          <div><label style={label}>Etykieta</label><input value={form.campsBadge} onChange={(e) => set("campsBadge", e.target.value)} style={input} placeholder="np. Lato 2027" /></div>
          <div><label style={label}>Tytuł</label><input value={form.campsTitle} onChange={(e) => set("campsTitle", e.target.value)} style={input} placeholder="np. Kolonie letnie nad jeziorem" /></div>
        </div>
        <div style={{ height: 12 }} />
        <label style={label}>Opis <span style={{ fontWeight: 400, color: A.grey }}>(Enter = nowy akapit)</span></label>
        <textarea value={form.campsDescription} onChange={(e) => set("campsDescription", e.target.value)} rows={7} style={{ ...input, resize: "vertical", lineHeight: 1.5 }} />
        <div style={{ height: 12 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div><label style={label}>Termin</label><input value={form.campsDates} onChange={(e) => set("campsDates", e.target.value)} style={input} placeholder="np. 5–12 lipca" /></div>
          <div><label style={label}>Miejscowość</label><input value={form.campsLocation} onChange={(e) => set("campsLocation", e.target.value)} style={input} placeholder="np. Łapino" /></div>
          <div><label style={label}>Cena</label><input value={form.campsPrice} onChange={(e) => set("campsPrice", e.target.value)} style={input} placeholder="np. 2450 zł" /></div>
        </div>

        <div style={{ height: 18 }} />
        <label style={label}>Plakat</label>
        <input ref={posterRef} type="file" accept="image/*" onChange={(e) => onPoster(e.target.files)} style={{ display: "none" }} />
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          {posterUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={posterUrl} alt="" style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 10, border: "1px solid #d6e7f2" }} />
          )}
          <button type="button" style={btnSecondary} disabled={posterUploading} onClick={() => posterRef.current?.click()}>{posterUploading ? "Wgrywanie…" : posterUrl ? "Wymień plakat" : "Wgraj plakat"}</button>
          {posterUrl && <button type="button" style={btnDanger} onClick={() => { if (confirm("Usunąć plakat?")) setPoster({}); }}>Usuń plakat</button>}
          {!posterUrl && <span style={{ color: A.grey, fontSize: 13 }}>Brak plakatu — w ofercie pokaże się zdjęcie z obozu.</span>}
        </div>

        <div style={{ height: 18 }} />
        <label style={label}>Oferta do pobrania (PDF)</label>
        <input ref={pdfRef} type="file" accept="application/pdf,.pdf" onChange={(e) => onPdf(e.target.files)} style={{ display: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button type="button" style={btnSecondary} disabled={pdfUploading} onClick={() => pdfRef.current?.click()}>{pdfUploading ? "Wgrywanie…" : pdfUrl ? "Wymień PDF" : "Wgraj PDF"}</button>
          {pdfUrl && (
            <>
              <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ ...btnSecondary, textDecoration: "none" }}>Otwórz aktualny</a>
              <button type="button" style={btnDanger} onClick={() => { if (confirm("Usunąć PDF z ofertą obozów?")) setPdf({}); }}>Usuń PDF</button>
            </>
          )}
          {!pdfUrl && <span style={{ color: A.grey, fontSize: 13 }}>Brak pliku — przycisk pobierania ukryty.</span>}
        </div>
      </div>

      {/* 4. Zdjęcia */}
      <div style={card}>
        <h2 className="font-fredoka" style={{ fontSize: 17, color: A.navy, margin: "0 0 6px" }}>Zdjęcia z obozów</h2>
        <p style={hint}>
          Widoczne zawsze (w wersji „brak oferty” są główną treścią sekcji). Teraz: <strong>{campPhotos?.length ?? "…"}</strong> zdjęć.{" "}
          <Link href="/admin/galeria" style={{ color: A.navy, fontWeight: 700 }}>Dodaj lub usuń w Galerii → zakładka „Obozy”</Link>
        </p>
        <label style={label}>Nagłówek nad zdjęciami</label>
        <input value={form.campsPhotosHeading} onChange={(e) => set("campsPhotosHeading", e.target.value)} style={input} placeholder={CAMPS_PHOTOS_HEADING} />
      </div>

      <SaveBar dirty={dirty} saving={saving} saved={saved} onSave={save} onReset={() => { setForm(initial); setSaved(false); }} />
    </div>
  );
}
