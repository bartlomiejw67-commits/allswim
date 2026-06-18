"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { A, card, input, label, btnPrimary } from "@/components/admin/ui";

type Form = {
  recruitmentOpen: boolean;
  recruitmentInfo: string;
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
  campsBadge: string;
  campsTitle: string;
  campsDescription: string;
  campsUpcomingHeading: string;
  campsEmptyText: string;
  campsPhotosHeading: string;
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
  recruitmentOpen: false,
  recruitmentInfo: "",
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
  campsBadge: "",
  campsTitle: "",
  campsDescription: "",
  campsUpcomingHeading: "",
  campsEmptyText: "",
  campsPhotosHeading: "",
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

export default function AdminSettings() {
  const settings = useQuery(api.settings.get);
  const update = useMutation(api.settings.update);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings !== undefined && !loaded) {
      setForm({
        recruitmentOpen: settings?.recruitmentOpen ?? false,
        recruitmentInfo: settings?.recruitmentInfo ?? "",
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
        campsBadge: settings?.campsBadge ?? "",
        campsTitle: settings?.campsTitle ?? "",
        campsDescription: settings?.campsDescription ?? "",
        campsUpcomingHeading: settings?.campsUpcomingHeading ?? "",
        campsEmptyText: settings?.campsEmptyText ?? "",
        campsPhotosHeading: settings?.campsPhotosHeading ?? "",
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
      });
      setLoaded(true);
    }
  }, [settings, loaded]);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      await update(form);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return <p style={{ color: A.grey }}>Ładowanie…</p>;

  return (
    <div>
      <h1 className="font-fredoka" style={{ fontSize: 28, color: A.navy, margin: "0 0 4px" }}>Ustawienia i nabór</h1>
      <p style={{ color: A.grey, fontSize: 14, margin: "0 0 20px" }}>Te dane pojawiają się na stronie głównej (baner naboru, stopka, kontakt).</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontWeight: 800, fontSize: 15, color: "#1b3a4b" }}>
              <input type="checkbox" checked={form.recruitmentOpen} onChange={(e) => set("recruitmentOpen", e.target.checked)} style={{ width: 18, height: 18 }} />
              Nabór otwarty (formularz aktywny, baner „Trwa nabór")
            </label>
          </div>
          <label style={label}>Treść banera naboru</label>
          <textarea value={form.recruitmentInfo} onChange={(e) => set("recruitmentInfo", e.target.value)} rows={2} style={{ ...input, resize: "vertical" }} placeholder="np. Wolne miejsca w grupach początkujących · zapisy do 15 września" />
        </div>

        <div style={card}>
          <h2 className="font-fredoka" style={{ fontSize: 17, color: A.navy, margin: "0 0 12px" }}>Sekcja powitalna (hero)</h2>
          <label style={label}>Nadtytuł (mała kreska)</label>
          <input value={form.heroEyebrow} onChange={(e) => set("heroEyebrow", e.target.value)} style={input} placeholder="np. Szkółka pływacka · Tczew" />
          <div style={{ height: 12 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={label}>Hasło — część biała</label><input value={form.heroLine1} onChange={(e) => set("heroLine1", e.target.value)} style={input} placeholder="Pierwszy ruch w wodzie" /></div>
            <div><label style={label}>Hasło — część żółta</label><input value={form.heroLine2} onChange={(e) => set("heroLine2", e.target.value)} style={input} placeholder="zostaje na całe życie" /></div>
          </div>
          <div style={{ height: 12 }} />
          <label style={label}>Opis pod hasłem</label>
          <textarea value={form.heroSubtitle} onChange={(e) => set("heroSubtitle", e.target.value)} rows={3} style={{ ...input, resize: "vertical" }} />
          <div style={{ height: 12 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={label}>Statystyka 1 — wartość</label><input value={form.heroStat1Value} onChange={(e) => set("heroStat1Value", e.target.value)} style={input} placeholder="do 6" /></div>
            <div><label style={label}>Statystyka 1 — opis</label><input value={form.heroStat1Label} onChange={(e) => set("heroStat1Label", e.target.value)} style={input} placeholder="dzieci w grupie" /></div>
            <div><label style={label}>Statystyka 2 — wartość</label><input value={form.heroStat2Value} onChange={(e) => set("heroStat2Value", e.target.value)} style={input} placeholder="2 baseny" /></div>
            <div><label style={label}>Statystyka 2 — opis</label><input value={form.heroStat2Label} onChange={(e) => set("heroStat2Label", e.target.value)} style={input} placeholder="w Tczewie" /></div>
          </div>
        </div>

        <div style={card}>
          <h2 className="font-fredoka" style={{ fontSize: 17, color: A.navy, margin: "0 0 12px" }}>Sekcja „O mnie”</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={label}>Nadtytuł</label><input value={form.aboutEyebrow} onChange={(e) => set("aboutEyebrow", e.target.value)} style={input} placeholder="O mnie" /></div>
            <div><label style={label}>Tytuł</label><input value={form.aboutTitle} onChange={(e) => set("aboutTitle", e.target.value)} style={input} placeholder="Cześć, jestem Ola!" /></div>
          </div>
          <div style={{ height: 12 }} />
          <label style={label}>Podtytuł / rola</label>
          <input value={form.aboutRole} onChange={(e) => set("aboutRole", e.target.value)} style={input} placeholder="Trener i instruktor pływania • Ratownik wodny" />
          <div style={{ height: 12 }} />
          <label style={label}>Tekst (akapity oddziel pustą linią)</label>
          <textarea value={form.aboutText} onChange={(e) => set("aboutText", e.target.value)} rows={6} style={{ ...input, resize: "vertical" }} placeholder="Pierwszy akapit...&#10;&#10;Drugi akapit..." />
          <div style={{ height: 12 }} />
          <label style={label}>Plakietka na zdjęciu</label>
          <input value={form.aboutBadge} onChange={(e) => set("aboutBadge", e.target.value)} style={input} placeholder="🏅 Ratownik wodny" />
        </div>

        <div style={card}>
          <h2 className="font-fredoka" style={{ fontSize: 17, color: A.navy, margin: "0 0 12px" }}>Nagłówki sekcji</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={label}>Grafik — nadtytuł</label><input value={form.gridEyebrow} onChange={(e) => set("gridEyebrow", e.target.value)} style={input} /></div>
            <div><label style={label}>Grafik — tytuł</label><input value={form.gridTitle} onChange={(e) => set("gridTitle", e.target.value)} style={input} /></div>
            <div><label style={label}>Cennik — nadtytuł</label><input value={form.pricesEyebrow} onChange={(e) => set("pricesEyebrow", e.target.value)} style={input} /></div>
            <div><label style={label}>Cennik — tytuł</label><input value={form.pricesTitle} onChange={(e) => set("pricesTitle", e.target.value)} style={input} /></div>
            <div><label style={label}>Galeria — nadtytuł</label><input value={form.galleryEyebrow} onChange={(e) => set("galleryEyebrow", e.target.value)} style={input} /></div>
            <div><label style={label}>Galeria — tytuł</label><input value={form.galleryTitle} onChange={(e) => set("galleryTitle", e.target.value)} style={input} /></div>
            <div><label style={label}>Regulamin — nadtytuł</label><input value={form.regulationsEyebrow} onChange={(e) => set("regulationsEyebrow", e.target.value)} style={input} /></div>
            <div><label style={label}>Regulamin — tytuł</label><input value={form.regulationsTitle} onChange={(e) => set("regulationsTitle", e.target.value)} style={input} /></div>
          </div>
          <div style={{ height: 14 }} />
          <div style={{ fontWeight: 800, fontSize: 13, color: A.navy, marginBottom: 8 }}>Sekcja Obozy</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={label}>Badge</label><input value={form.campsBadge} onChange={(e) => set("campsBadge", e.target.value)} style={input} placeholder="☀️ Lato 2026" /></div>
            <div><label style={label}>Tytuł</label><input value={form.campsTitle} onChange={(e) => set("campsTitle", e.target.value)} style={input} /></div>
          </div>
          <div style={{ height: 12 }} />
          <label style={label}>Opis obozów</label>
          <textarea value={form.campsDescription} onChange={(e) => set("campsDescription", e.target.value)} rows={2} style={{ ...input, resize: "vertical" }} />
          <div style={{ height: 12 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={label}>Nagłówek „turnusy”</label><input value={form.campsUpcomingHeading} onChange={(e) => set("campsUpcomingHeading", e.target.value)} style={input} /></div>
            <div><label style={label}>Nagłówek „zdjęcia”</label><input value={form.campsPhotosHeading} onChange={(e) => set("campsPhotosHeading", e.target.value)} style={input} /></div>
          </div>
          <div style={{ height: 12 }} />
          <label style={label}>Komunikat, gdy brak turnusów</label>
          <textarea value={form.campsEmptyText} onChange={(e) => set("campsEmptyText", e.target.value)} rows={2} style={{ ...input, resize: "vertical" }} />
        </div>

        <div style={card}>
          <h2 className="font-fredoka" style={{ fontSize: 17, color: A.navy, margin: "0 0 12px" }}>Formularz naboru i stopka</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={label}>Formularz — tytuł</label><input value={form.formTitle} onChange={(e) => set("formTitle", e.target.value)} style={input} /></div>
            <div><label style={label}>Formularz — podtytuł</label><input value={form.formSubtitle} onChange={(e) => set("formSubtitle", e.target.value)} style={input} /></div>
          </div>
          <div style={{ height: 12 }} />
          <label style={label}>Korzyści (3 punkty)</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input value={form.formBenefit1} onChange={(e) => set("formBenefit1", e.target.value)} style={input} />
            <input value={form.formBenefit2} onChange={(e) => set("formBenefit2", e.target.value)} style={input} />
            <input value={form.formBenefit3} onChange={(e) => set("formBenefit3", e.target.value)} style={input} />
          </div>
          <div style={{ height: 12 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={label}>Ekran sukcesu — tytuł</label><input value={form.formSuccessTitle} onChange={(e) => set("formSuccessTitle", e.target.value)} style={input} /></div>
            <div><label style={label}>Ekran sukcesu — tekst</label><input value={form.formSuccessText} onChange={(e) => set("formSuccessText", e.target.value)} style={input} /></div>
          </div>
          <div style={{ height: 12 }} />
          <label style={label}>Tekst w stopce (o szkółce)</label>
          <textarea value={form.footerAbout} onChange={(e) => set("footerAbout", e.target.value)} rows={3} style={{ ...input, resize: "vertical" }} />
        </div>

        <div style={card}>
          <h2 className="font-fredoka" style={{ fontSize: 17, color: A.navy, margin: "0 0 12px" }}>Cennik, zniżki i płatności</h2>
          <label style={label}>Wstęp pod tytułem cennika</label>
          <textarea value={form.pricesIntro} onChange={(e) => set("pricesIntro", e.target.value)} rows={2} style={{ ...input, resize: "vertical" }} placeholder="np. Inwestycja w umiejętności… aktualne pakiety miesięczne w sezonie 2025/2026." />
          <div style={{ height: 12 }} />
          <label style={label}>Zniżki dla rodzeństwa (każda w osobnej linii)</label>
          <textarea value={form.siblingDiscounts} onChange={(e) => set("siblingDiscounts", e.target.value)} rows={3} style={{ ...input, resize: "vertical" }} placeholder={"Dwójka rodzeństwa: 200 zł / mies. za dziecko\nTrzecie dziecko: 195 zł / mies."} />
          <div style={{ height: 12 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={label}>Numer konta</label><input value={form.paymentAccount} onChange={(e) => set("paymentAccount", e.target.value)} style={input} placeholder="PL00 0000 0000 0000 0000 0000 0000" /></div>
            <div><label style={label}>Termin płatności</label><input value={form.paymentDeadline} onChange={(e) => set("paymentDeadline", e.target.value)} style={input} placeholder="do 10. dnia każdego miesiąca" /></div>
          </div>
          <div style={{ height: 12 }} />
          <label style={label}>Dodatkowa uwaga o płatnościach (opcjonalnie)</label>
          <input value={form.paymentNote} onChange={(e) => set("paymentNote", e.target.value)} style={input} placeholder="np. w tytule przelewu: imię i nazwisko dziecka" />
        </div>

        <div style={card}>
          <h2 className="font-fredoka" style={{ fontSize: 17, color: A.navy, margin: "0 0 12px" }}>Kontakt</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={label}>E-mail</label><input value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} style={input} /></div>
            <div><label style={label}>Telefon</label><input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} style={input} /></div>
          </div>
          <div style={{ height: 12 }} />
          <label style={label}>Adres / lokalizacja</label>
          <input value={form.contactAddress} onChange={(e) => set("contactAddress", e.target.value)} style={input} />
        </div>

        <div style={card}>
          <h2 className="font-fredoka" style={{ fontSize: 17, color: A.navy, margin: "0 0 12px" }}>Media społecznościowe</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={label}>Instagram (URL)</label><input value={form.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} style={input} placeholder="https://instagram.com/..." /></div>
            <div><label style={label}>Facebook (URL)</label><input value={form.facebookUrl} onChange={(e) => set("facebookUrl", e.target.value)} style={input} placeholder="https://facebook.com/..." /></div>
            <div><label style={label}>TikTok (URL)</label><input value={form.tiktokUrl} onChange={(e) => set("tiktokUrl", e.target.value)} style={input} /></div>
            <div><label style={label}>YouTube (URL)</label><input value={form.youtubeUrl} onChange={(e) => set("youtubeUrl", e.target.value)} style={input} /></div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={save} disabled={saving} style={btnPrimary}>{saving ? "Zapisywanie…" : "Zapisz zmiany"}</button>
          {saved && <span style={{ color: "#1f8a5b", fontWeight: 700, fontSize: 14 }}>✓ Zapisano</span>}
        </div>
      </div>
    </div>
  );
}
