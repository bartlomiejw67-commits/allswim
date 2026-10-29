"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { A, card, input, label, btnPrimary, btnSecondary, btnDanger, pageTitle, pageDesc } from "@/components/admin/ui";
import { compressImage } from "@/components/imageCompress";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { Switch, SectionTabs, SaveBar, Fld, Section, Grid2 } from "@/components/admin/Controls";
import Hint from "@/components/admin/Hint";
import { NaborPreview, MODES, DEF, type NaborMode } from "@/components/admin/NaborPreview";

type Form = {
  recruitmentMode: NaborMode;
  recruitmentOpen: boolean;
  recruitmentTitle: string;
  recruitmentInfo: string;
  recruitmentSoonTitle: string;
  recruitmentSoonText: string;
  recruitmentClosedText: string;
  heroEyebrow: string;
  heroLine1: string;
  heroLine2: string;
  heroSubtitle: string;
  heroStat1Value: string;
  heroStat1Label: string;
  heroStat2Value: string;
  heroStat2Label: string;
  aboutEyebrow: string;
  aboutTitle: string;
  aboutRole: string;
  aboutText: string;
  aboutBadge: string;
  instructorsHeading: string;
  gridEyebrow: string;
  gridTitle: string;
  pricesEyebrow: string;
  pricesTitle: string;
  pricesIntro: string;
  siblingDiscounts: string;
  paymentAccount: string;
  paymentDeadline: string;
  paymentNote: string;
  galleryEyebrow: string;
  galleryTitle: string;
  regulationsEyebrow: string;
  regulationsTitle: string;
  formTitle: string;
  formSubtitle: string;
  formBenefit1: string;
  formBenefit2: string;
  formBenefit3: string;
  formSuccessTitle: string;
  formSuccessText: string;
  footerAbout: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
};

const EMPTY: Form = {
  recruitmentMode: "soon",
  recruitmentOpen: false,
  recruitmentTitle: "",
  recruitmentInfo: "",
  recruitmentSoonTitle: "",
  recruitmentSoonText: "",
  recruitmentClosedText: "",
  heroEyebrow: "",
  heroLine1: "",
  heroLine2: "",
  heroSubtitle: "",
  heroStat1Value: "",
  heroStat1Label: "",
  heroStat2Value: "",
  heroStat2Label: "",
  aboutEyebrow: "",
  aboutTitle: "",
  aboutRole: "",
  aboutText: "",
  aboutBadge: "",
  instructorsHeading: "",
  gridEyebrow: "",
  gridTitle: "",
  pricesEyebrow: "",
  pricesTitle: "",
  pricesIntro: "",
  siblingDiscounts: "",
  paymentAccount: "",
  paymentDeadline: "",
  paymentNote: "",
  galleryEyebrow: "",
  galleryTitle: "",
  regulationsEyebrow: "",
  regulationsTitle: "",
  formTitle: "",
  formSubtitle: "",
  formBenefit1: "",
  formBenefit2: "",
  formBenefit3: "",
  formSuccessTitle: "",
  formSuccessText: "",
  footerAbout: "",
  contactEmail: "",
  contactPhone: "",
  contactAddress: "",
  instagramUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
  youtubeUrl: "",
};

function WaitlistCard() {
  const list = useQuery(api.waitlist.list);
  const remove = useMutation(api.waitlist.remove);

  return (
    <div style={card}>
      <h2 className="font-fredoka" style={{ fontSize: 17, color: A.navy, margin: "0 0 4px" }}>
        Lista oczekujących{list && list.length ? ` (${list.length})` : ""}
      </h2>
      <p style={{ color: A.grey, fontSize: 13, margin: "0 0 12px" }}>
        E-maile rodziców zostawione przyciskiem „Powiadom mnie", gdy nabór jest zamknięty. Po otwarciu naboru możesz ich powiadomić.
      </p>
      {list === undefined ? (
        <p style={{ color: A.grey, fontSize: 14 }}>Ładowanie…</p>
      ) : list.length === 0 ? (
        <p style={{ color: A.grey, fontSize: 14 }}>Brak zapisów.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((w) => (
            <div key={w._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "#f8fcff", border: "1px solid #eaf2f8", borderRadius: 10, padding: "8px 12px" }}>
              <span style={{ fontSize: 14, color: "#1b3a4b" }}>{w.email}</span>
              <button style={{ ...btnDanger, padding: "5px 12px" }} onClick={() => { if (confirm("Usunąć z listy?")) remove({ id: w._id as Id<"waitlist"> }); }}>Usuń</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminSettings() {
  const settings = useQuery(api.settings.get);
  const update = useMutation(api.settings.update);
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const aboutPhotos = useQuery(api.images.list, { category: "about" });
  const addImage = useMutation(api.images.add);
  const removeImage = useMutation(api.images.remove);
  const [form, setForm] = useState<Form>(EMPTY);
  const [initial, setInitial] = useState<Form>(EMPTY);
  const waitlist = useQuery(api.waitlist.list);
  const waitingCount = (waitlist ?? []).filter((w) => !w.notified).length;
  const [tab, setTab] = useState<"nabor" | "glowna" | "formularz" | "cennik" | "kontakt">("nabor");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const aboutFileRef = useRef<HTMLInputElement>(null);
  const [aboutUploading, setAboutUploading] = useState(false);
  async function onAboutPhotos(files: FileList | null) {
    if (!files || !files.length) return;
    const free = Math.max(0, 3 - (aboutPhotos?.length ?? 0));
    if (free === 0) return;
    setAboutUploading(true);
    try {
      for (const file of Array.from(files).slice(0, free)) {
        const blob = await compressImage(file);
        const url = await generateUploadUrl();
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": blob.type || file.type }, body: blob });
        const json = (await res.json()) as { storageId: string };
        await addImage({ storageId: json.storageId as Id<"_storage">, category: "about" });
      }
    } catch (e) {
      alert((e as { data?: string; message?: string }).data ?? "Nie udało się wgrać zdjęcia.");
    } finally {
      setAboutUploading(false);
      if (aboutFileRef.current) aboutFileRef.current.value = "";
    }
  }

  useEffect(() => {
    if (settings !== undefined && !loaded) {
      const f: Form = {
        recruitmentMode: settings?.recruitmentMode ?? (settings?.recruitmentOpen ? "open" : "soon"),
        recruitmentOpen: settings?.recruitmentOpen ?? false,
        recruitmentTitle: settings?.recruitmentTitle ?? "",
        recruitmentInfo: settings?.recruitmentInfo ?? "",
        recruitmentSoonTitle: settings?.recruitmentSoonTitle ?? "",
        recruitmentSoonText: settings?.recruitmentSoonText ?? "",
        recruitmentClosedText: settings?.recruitmentClosedText ?? "",
        heroEyebrow: settings?.heroEyebrow ?? "",
        heroLine1: settings?.heroLine1 ?? "",
        heroLine2: settings?.heroLine2 ?? "",
        heroSubtitle: settings?.heroSubtitle ?? "",
        heroStat1Value: settings?.heroStat1Value ?? "",
        heroStat1Label: settings?.heroStat1Label ?? "",
        heroStat2Value: settings?.heroStat2Value ?? "",
        heroStat2Label: settings?.heroStat2Label ?? "",
        aboutEyebrow: settings?.aboutEyebrow ?? "",
        aboutTitle: settings?.aboutTitle ?? "",
        aboutRole: settings?.aboutRole ?? "",
        aboutText: settings?.aboutText ?? "",
        aboutBadge: settings?.aboutBadge ?? "",
        instructorsHeading: settings?.instructorsHeading ?? "",
        gridEyebrow: settings?.gridEyebrow ?? "",
        gridTitle: settings?.gridTitle ?? "",
        pricesEyebrow: settings?.pricesEyebrow ?? "",
        pricesTitle: settings?.pricesTitle ?? "",
        pricesIntro: settings?.pricesIntro ?? "",
        siblingDiscounts: settings?.siblingDiscounts ?? "",
        paymentAccount: settings?.paymentAccount ?? "",
        paymentDeadline: settings?.paymentDeadline ?? "",
        paymentNote: settings?.paymentNote ?? "",
        galleryEyebrow: settings?.galleryEyebrow ?? "",
        galleryTitle: settings?.galleryTitle ?? "",
        regulationsEyebrow: settings?.regulationsEyebrow ?? "",
        regulationsTitle: settings?.regulationsTitle ?? "",
        formTitle: settings?.formTitle ?? "",
        formSubtitle: settings?.formSubtitle ?? "",
        formBenefit1: settings?.formBenefit1 ?? "",
        formBenefit2: settings?.formBenefit2 ?? "",
        formBenefit3: settings?.formBenefit3 ?? "",
        formSuccessTitle: settings?.formSuccessTitle ?? "",
        formSuccessText: settings?.formSuccessText ?? "",
        footerAbout: settings?.footerAbout ?? "",
        contactEmail: settings?.contactEmail ?? "",
        contactPhone: settings?.contactPhone ?? "",
        contactAddress: settings?.contactAddress ?? "",
        instagramUrl: settings?.instagramUrl ?? "",
        facebookUrl: settings?.facebookUrl ?? "",
        tiktokUrl: settings?.tiktokUrl ?? "",
        youtubeUrl: settings?.youtubeUrl ?? "",
      };
      setForm(f);
      setInitial(f);
      setLoaded(true);
    }
  }, [settings, loaded]);

  // Tryb okienka ustawia też formularz: „Trwa nabór” = otwarty, „Nabór wkrótce” = zamknięty,
  // „Ukryte” = zamknięty (można włączyć przełącznikiem zapisy w trakcie sezonu).
  function setMode(m: NaborMode) {
    setForm((f) => ({ ...f, recruitmentMode: m, recruitmentOpen: m === "open" }));
    setSaved(false);
  }

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  }

  // Czy są niezapisane zmiany (porównanie z ostatnio zapisanym stanem).
  const dirty = loaded && JSON.stringify(form) !== JSON.stringify(initial);

  async function save() {
    const opening = form.recruitmentOpen && !initial.recruitmentOpen;
    if (opening && waitingCount > 0 && !confirm(`Otwierasz zapisy. Osoby z listy oczekujących (${waitingCount}) dostaną teraz maila, że nabór ruszył. Zapisać?`)) return;
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

  if (!loaded) return <p style={{ color: A.grey }}>Ładowanie…</p>;

  const photoCount = aboutPhotos?.length ?? 0;

  return (
    <div style={{ maxWidth: 860 }}>
      <h1 className="font-fredoka" style={pageTitle}>Ustawienia i nabór</h1>
      <p style={pageDesc}>
        Treści widoczne na stronie głównej. Wybierz zakładkę, wprowadź zmiany i kliknij <strong>Zapisz zmiany</strong> w pasku na dole ekranu — jest zawsze widoczny.
      </p>

      <SectionTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "nabor", label: "Nabór", icon: "megaphone" },
          { key: "glowna", label: "Strona główna", icon: "sparkle" },
          { key: "formularz", label: "Formularz i stopka", icon: "fileText" },
          { key: "cennik", label: "Cennik i płatności", icon: "tag" },
          { key: "kontakt", label: "Kontakt", icon: "phone" },
        ]}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {tab === "nabor" && (
          <>
            <Hint id="nabor-tryb">
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
                <li><strong>W trakcie sezonu</strong> wybierz „Ukryte” — okienko znika ze strony głównej.</li>
                <li><strong>Przed nowym sezonem</strong> (np. w czerwcu) wybierz „Nabór wkrótce” i wpisz, kiedy ruszają zapisy. Rodzice mogą zostawić e-mail.</li>
                <li><strong>Start zapisów</strong>: „Trwa nabór” — formularz zaczyna przyjmować zgłoszenia, a osoby z listy oczekujących dostają maila.</li>
                <li>Zmiana działa po kliknięciu <strong>Zapisz zmiany</strong> na dole ekranu. Puste pola = tekst domyślny (widać go w podglądzie).</li>
              </ul>
            </Hint>
            <Section title="Okienko naboru na stronie głównej" description="Wybierz, co widzą rodzice pod sekcją powitalną.">
              <div className="adm-mode-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                {MODES.map((m) => {
                  const on = form.recruitmentMode === m.key;
                  return (
                    <button key={m.key} type="button" role="radio" aria-checked={on} onClick={() => setMode(m.key)} style={{ textAlign: "left", cursor: "pointer", fontFamily: "inherit", background: on ? m.bg : "#f6f9fb", border: `2px solid ${on ? m.color : A.line}`, borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: 15.5, color: on ? m.color : A.text }}>
                        <span aria-hidden style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${on ? m.color : "#b9c8d3"}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                          {on && <span style={{ width: 8, height: 8, borderRadius: "50%", background: m.color }} />}
                        </span>
                        {m.label}
                      </span>
                      <span style={{ fontSize: 13, color: A.grey, lineHeight: 1.45 }}>{m.desc}</span>
                    </button>
                  );
                })}
              </div>

              {form.recruitmentMode === "open" && (
                <>
                  <Fld label="Nagłówek" value={form.recruitmentTitle} onChange={(v) => set("recruitmentTitle", v)} placeholder={DEF.openTitle} />
                  <Fld label="Treść" rows={2} value={form.recruitmentInfo} onChange={(v) => set("recruitmentInfo", v)} placeholder="np. Wolne miejsca w grupach początkujących · zapisy do 15 września" />
                </>
              )}
              {form.recruitmentMode === "soon" && (
                <>
                  <Fld label="Nagłówek" value={form.recruitmentSoonTitle} onChange={(v) => set("recruitmentSoonTitle", v)} placeholder={DEF.soonTitle} />
                  <Fld label="Treść" hint="Napisz, kiedy ruszają zapisy — np. „Start rekrutacji na sezon 2027/2028: 1 lipca”." rows={3} value={form.recruitmentSoonText} onChange={(v) => set("recruitmentSoonText", v)} placeholder={DEF.soonText} />
                </>
              )}
              {form.recruitmentMode === "hidden" && (
                <>
                  <Switch checked={form.recruitmentOpen} onChange={(v) => set("recruitmentOpen", v)} title="Przyjmuj zgłoszenia w trakcie sezonu" description="Włączone: formularz na dole strony nadal działa (np. na wolne miejsca), tylko okienka nie widać. Wyłączone: zamiast formularza krótka informacja poniżej." />
                  {!form.recruitmentOpen && (
                    <Fld label="Informacja zamiast formularza" rows={2} value={form.recruitmentClosedText} onChange={(v) => set("recruitmentClosedText", v)} placeholder={DEF.closedText} />
                  )}
                </>
              )}

              <NaborPreview form={form} />

              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: form.recruitmentOpen ? "#1f6b47" : "#8a5c00", background: form.recruitmentOpen ? "#e9f6ef" : "#fff4e0", borderRadius: 10, padding: "9px 12px" }}>
                <Icon name={form.recruitmentOpen ? "check" : "info"} size={16} />
                {form.recruitmentOpen ? "Formularz zgłoszeń przyjmuje zapisy." : "Formularz zgłoszeń zamknięty — rodzice mogą zostawić e-mail („Powiadom mnie”)."}
                {form.recruitmentOpen && !initial.recruitmentOpen && waitingCount > 0 && <strong style={{ marginLeft: 4 }}>Po zapisaniu {waitingCount} os. z listy oczekujących dostanie maila.</strong>}
              </div>
            </Section>
            <WaitlistCard />
          </>
        )}

        {tab === "glowna" && (
          <>
            <Section title="Sekcja powitalna" description="Duży napis i zdjęcia na samej górze strony.">
              <Fld label="Etykieta nad hasłem" value={form.heroEyebrow} onChange={(v) => set("heroEyebrow", v)} placeholder="np. Szkółka pływacka · Tczew" />
              <Grid2>
                <Fld label="Hasło — część biała" value={form.heroLine1} onChange={(v) => set("heroLine1", v)} placeholder="Pierwszy ruch w wodzie" />
                <Fld label="Hasło — część złota" value={form.heroLine2} onChange={(v) => set("heroLine2", v)} placeholder="zostaje na całe życie" />
              </Grid2>
              <Fld label="Opis pod hasłem" rows={3} value={form.heroSubtitle} onChange={(v) => set("heroSubtitle", v)} />
              <Grid2>
                <Fld label="Wyróżnik 1 — wartość" value={form.heroStat1Value} onChange={(v) => set("heroStat1Value", v)} placeholder="do 6" />
                <Fld label="Wyróżnik 1 — opis" value={form.heroStat1Label} onChange={(v) => set("heroStat1Label", v)} placeholder="dzieci w grupie" />
                <Fld label="Wyróżnik 2 — wartość" value={form.heroStat2Value} onChange={(v) => set("heroStat2Value", v)} placeholder="2 baseny" />
                <Fld label="Wyróżnik 2 — opis" value={form.heroStat2Label} onChange={(v) => set("heroStat2Label", v)} placeholder="w Tczewie" />
              </Grid2>
            </Section>

            <Section title="Sekcja „O mnie”" description="Przedstawienie instruktorki: zdjęcia, tytuł i tekst.">
              <div>
                <label style={label}>Zdjęcia (kolaż, do 3) <span style={{ fontWeight: 400, color: A.grey }}>— zapisują się od razu, najlepiej pionowe</span></label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {(aboutPhotos ?? []).map((img) => (
                    <div key={img._id} style={{ position: "relative", width: 96, height: 96, borderRadius: 12, overflow: "hidden", border: `1px solid ${A.line}`, background: "#eef4f8" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url ?? ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button type="button" title="Usuń zdjęcie" aria-label="Usuń zdjęcie" onClick={() => { if (confirm("Usunąć to zdjęcie?")) removeImage({ id: img._id as Id<"images"> }); }} style={{ position: "absolute", top: 5, right: 5, width: 26, height: 26, borderRadius: "50%", border: "none", background: "rgba(180,35,42,0.92)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={14} stroke={2.4} /></button>
                    </div>
                  ))}
                  {photoCount === 0 && settings?.aboutImageUrl && (
                    <div style={{ width: 96, height: 96, borderRadius: 12, overflow: "hidden", border: `1px solid ${A.line}` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={settings.aboutImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                  {photoCount < 3 && (
                    <button type="button" disabled={aboutUploading} onClick={() => aboutFileRef.current?.click()} style={{ width: 96, height: 96, borderRadius: 12, border: "1.5px dashed #b9cddb", background: "#f7fafc", color: A.navy, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}>
                      <Icon name="plus" size={20} stroke={2} />
                      {aboutUploading ? "Wgrywanie…" : `Dodaj (${photoCount}/3)`}
                    </button>
                  )}
                </div>
                <input ref={aboutFileRef} type="file" accept="image/*" multiple onChange={(e) => onAboutPhotos(e.target.files)} style={{ display: "none" }} />
              </div>
              <Grid2>
                <Fld label="Etykieta nad tytułem" value={form.aboutEyebrow} onChange={(v) => set("aboutEyebrow", v)} placeholder="O mnie" />
                <Fld label="Tytuł" value={form.aboutTitle} onChange={(v) => set("aboutTitle", v)} placeholder="Cześć, jestem Ola!" />
              </Grid2>
              <Fld label="Podtytuł / rola" value={form.aboutRole} onChange={(v) => set("aboutRole", v)} placeholder="Trener i instruktor pływania • Ratownik wodny" />
              <Fld label="Tekst" hint="akapity oddziel pustą linią" rows={6} value={form.aboutText} onChange={(v) => set("aboutText", v)} />
              <Grid2>
                <Fld label="Plakietka na zdjęciu" value={form.aboutBadge} onChange={(v) => set("aboutBadge", v)} placeholder="Ratownik wodny" />
                <Fld label="Nagłówek nad pozostałymi instruktorami" value={form.instructorsHeading} onChange={(v) => set("instructorsHeading", v)} placeholder="Pozostali instruktorzy" />
              </Grid2>
            </Section>

            <Section title="Nagłówki sekcji" description="Mała etykieta i duży tytuł nad poszczególnymi sekcjami strony. Puste pole = tekst domyślny.">
              <Grid2>
                <Fld label="Grafik — etykieta" value={form.gridEyebrow} onChange={(v) => set("gridEyebrow", v)} />
                <Fld label="Grafik — tytuł" value={form.gridTitle} onChange={(v) => set("gridTitle", v)} />
                <Fld label="Cennik — etykieta" value={form.pricesEyebrow} onChange={(v) => set("pricesEyebrow", v)} />
                <Fld label="Cennik — tytuł" value={form.pricesTitle} onChange={(v) => set("pricesTitle", v)} />
                <Fld label="Galeria — etykieta" value={form.galleryEyebrow} onChange={(v) => set("galleryEyebrow", v)} />
                <Fld label="Galeria — tytuł" value={form.galleryTitle} onChange={(v) => set("galleryTitle", v)} />
                <Fld label="Dokumenty — etykieta" value={form.regulationsEyebrow} onChange={(v) => set("regulationsEyebrow", v)} />
                <Fld label="Dokumenty — tytuł" value={form.regulationsTitle} onChange={(v) => set("regulationsTitle", v)} />
              </Grid2>
              <p style={{ color: A.grey, fontSize: 13.5, margin: 0 }}>
                Sekcja obozów ma własną zakładkę: <Link href="/admin/obozy" style={{ color: A.navy, fontWeight: 700 }}>Obozy →</Link>
              </p>
            </Section>
          </>
        )}

        {tab === "formularz" && (
          <>
            <Section title="Formularz zgłoszeń" description="Lewy panel formularza i ekran po wysłaniu zgłoszenia.">
              <Grid2>
                <Fld label="Tytuł" value={form.formTitle} onChange={(v) => set("formTitle", v)} />
                <Fld label="Podtytuł" value={form.formSubtitle} onChange={(v) => set("formSubtitle", v)} />
              </Grid2>
              <div>
                <label style={label}>Korzyści (3 punkty z ptaszkiem)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input value={form.formBenefit1} onChange={(e) => set("formBenefit1", e.target.value)} style={input} placeholder="Punkt 1" />
                  <input value={form.formBenefit2} onChange={(e) => set("formBenefit2", e.target.value)} style={input} placeholder="Punkt 2" />
                  <input value={form.formBenefit3} onChange={(e) => set("formBenefit3", e.target.value)} style={input} placeholder="Punkt 3" />
                </div>
              </div>
              <Grid2>
                <Fld label="Po wysłaniu — tytuł" value={form.formSuccessTitle} onChange={(v) => set("formSuccessTitle", v)} />
                <Fld label="Po wysłaniu — tekst" value={form.formSuccessText} onChange={(v) => set("formSuccessText", v)} />
              </Grid2>
            </Section>
            <Section title="Stopka" description="Krótki tekst o szkółce w stopce strony.">
              <Fld label="Tekst w stopce" rows={3} value={form.footerAbout} onChange={(v) => set("footerAbout", v)} />
            </Section>
          </>
        )}

        {tab === "cennik" && (
          <Section title="Cennik, zniżki i płatności" description={<>Teksty wokół cennika. Same pakiety i ceny edytujesz w zakładce <Link href="/admin/cennik" style={{ color: A.navy, fontWeight: 700 }}>Cennik</Link>.</>}>
            <Fld label="Wstęp pod tytułem cennika" rows={2} value={form.pricesIntro} onChange={(v) => set("pricesIntro", v)} placeholder="np. Inwestycja w umiejętności… aktualne pakiety w sezonie 2026/2027." />
            <Fld label="Zniżki dla rodzeństwa" hint="każda w osobnej linii" rows={3} value={form.siblingDiscounts} onChange={(v) => set("siblingDiscounts", v)} placeholder={"Dwójka rodzeństwa: 200 zł / mies. za dziecko\nTrzecie dziecko: 195 zł / mies."} />
            <Grid2>
              <Fld label="Numer konta" value={form.paymentAccount} onChange={(v) => set("paymentAccount", v)} placeholder="PL00 0000 0000 0000 0000 0000 0000" />
              <Fld label="Termin płatności" value={form.paymentDeadline} onChange={(v) => set("paymentDeadline", v)} placeholder="do 10. dnia każdego miesiąca" />
            </Grid2>
            <Fld label="Dodatkowa uwaga o płatnościach" hint="opcjonalnie" value={form.paymentNote} onChange={(v) => set("paymentNote", v)} placeholder="np. w tytule przelewu: imię i nazwisko dziecka" />
          </Section>
        )}

        {tab === "kontakt" && (
          <>
            <Section title="Kontakt" description="Dane kontaktowe w stopce, sekcji obozów i formularzu. Na ten e-mail przychodzą też powiadomienia o nowych zgłoszeniach.">
              <Grid2>
                <Fld label="E-mail" type="email" value={form.contactEmail} onChange={(v) => set("contactEmail", v)} />
                <Fld label="Telefon" type="tel" value={form.contactPhone} onChange={(v) => set("contactPhone", v)} />
              </Grid2>
              <Fld label="Adres / lokalizacja" value={form.contactAddress} onChange={(v) => set("contactAddress", v)} />
            </Section>
            <Section title="Media społecznościowe" description="Linki do profili (ikony w stopce). Puste pole = brak ikony.">
              <Grid2>
                <Fld label="Instagram" value={form.instagramUrl} onChange={(v) => set("instagramUrl", v)} placeholder="https://instagram.com/..." />
                <Fld label="Facebook" value={form.facebookUrl} onChange={(v) => set("facebookUrl", v)} placeholder="https://facebook.com/..." />
                <Fld label="TikTok" value={form.tiktokUrl} onChange={(v) => set("tiktokUrl", v)} placeholder="https://tiktok.com/@..." />
                <Fld label="YouTube" value={form.youtubeUrl} onChange={(v) => set("youtubeUrl", v)} placeholder="https://youtube.com/..." />
              </Grid2>
            </Section>
          </>
        )}
      </div>

      <SaveBar dirty={dirty} saving={saving} saved={saved} onSave={save} onReset={() => { setForm(initial); setSaved(false); }} />
    </div>
  );
}
