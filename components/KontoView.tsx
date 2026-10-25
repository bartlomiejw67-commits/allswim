"use client";

// Widok konta rodzica (tylko prezentacja). Dane dostaje z app/konto/page.tsx.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon, IconName } from "@/components/Icons";

const DAY_NAMES = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const DAY_SHORT = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

export const KC = { navy: "#0f5b8f", navyDeep: "#0b3a5e", orange: "#e9a13b", grey: "#5f7380", line: "#e3ebf1", text: "#1b3a4b" };
const C = KC;

const STATUS: Record<string, { label: string; color: string; bg: string; step: number; info: string; icon: IconName }> = {
  pending: { label: "Czeka na decyzję", color: "#9a6a00", bg: "#fff3da", step: 1, icon: "hourglass", info: "Zgłoszenie do nas dotarło i czeka na rozpatrzenie. Damy znać mailem, gdy przydzielimy grupę." },
  reserve: { label: "Lista rezerwowa", color: "#6b4bbd", bg: "#efeafc", step: 2, icon: "clock", info: "Na ten moment grupy są pełne. Jesteście na liście rezerwowej — odezwiemy się jako pierwsi, gdy zwolni się miejsce." },
  approved: { label: "Przyjęte", color: "#1f7a52", bg: "#e5f5ec", step: 3, icon: "check", info: "" },
  rejected: { label: "Nieprzyjęte", color: "#b4232a", bg: "#fdecec", step: 2, icon: "info", info: "Niestety nie możemy obecnie przyjąć zgłoszenia. Zapraszamy przy kolejnym naborze." },
  resigned: { label: "Zajęcia zakończone", color: "#5f7380", bg: "#eef2f5", step: 0, icon: "info", info: "Rezygnacja z zajęć została przyjęta, a miejsce w grupie zwolnione. Dziękujemy za wspólne pływanie!" },
};

export const kontoCard: React.CSSProperties = {
  background: "#fff",
  borderRadius: 20,
  border: `1px solid ${C.line}`,
  boxShadow: "0 1px 2px rgba(16,42,67,0.04), 0 10px 28px rgba(16,42,67,0.06)",
};
const card = kontoCard;

export type KontoEnrollment = {
  _id: string;
  name: string;
  status: string;
  levelLabel: string | null;
  assignedGroupName: string | null;
  decisionNote: string | null;
  createdAt: number;
};

export type KontoSession = {
  _id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  groupName: string | null;
  poolName: string | null;
  instructor: string | null;
  children: string[];
};

const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return (h || 0) * 60 + (m || 0); };

export function KontoView({ email, firstName, enrollments, schedule: rawSchedule, contactPhone, contactEmail, onSignOut }: {
  email: string;
  firstName?: string;
  enrollments: KontoEnrollment[] | undefined;
  schedule: KontoSession[] | undefined;
  contactPhone: string;
  contactEmail: string;
  onSignOut: () => void;
}) {
  // Dzień i godzina liczone w przeglądarce (do „najbliższych zajęć" i wyróżnienia dziś).
  const [now, setNow] = useState<{ day: number; min: number } | null>(null);
  useEffect(() => { const d = new Date(); setNow({ day: (d.getDay() + 6) % 7, min: d.getHours() * 60 + d.getMinutes() }); }, []);

  const schedule = rawSchedule ? [...rawSchedule].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)) : [];
  const children = enrollments ?? [];
  const activeKids = children.filter((e) => e.status !== "resigned").length; // bez dzieci po rezygnacji

  // Najbliższe zajęcia: pierwszy termin po „teraz" w tym tygodniu, a jak brak — pierwszy w następnym.
  let next: KontoSession | null = null;
  if (now && schedule.length) {
    next = schedule.find((r) => r.dayOfWeek > now.day || (r.dayOfWeek === now.day && toMin(r.startTime) > now.min)) ?? schedule[0];
  }
  const nextLabel = next ? (now && next.dayOfWeek === now.day ? "Dziś" : now && next.dayOfWeek === (now.day + 1) % 7 ? "Jutro" : DAY_NAMES[next.dayOfWeek]) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#f2f6fa", fontFamily: "var(--font-nunito), sans-serif", color: C.text }}>
      {/* Górny pasek */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "10px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" aria-label="Strona główna" style={{ display: "flex", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ALL SWIM" style={{ height: 38, display: "block" }} />
          </Link>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/" className="konto-hide-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: C.grey, textDecoration: "none", fontWeight: 600, padding: "8px 10px" }}>
              <Icon name="externalLink" size={16} /> Strona główna
            </Link>
            <button onClick={onSignOut} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "inherit", fontWeight: 600, fontSize: 14, color: C.navy, background: "#eef3f7", border: "none", borderRadius: 10, padding: "9px 14px", cursor: "pointer" }}>
              <Icon name="logOut" size={16} /> Wyloguj
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px 64px" }}>
        {/* Powitanie + podsumowanie */}
        <section style={{ position: "relative", overflow: "hidden", borderRadius: 24, color: "#fff", padding: "26px 26px 22px", background: "radial-gradient(120% 90% at 100% 0%, rgba(143,211,246,0.5), transparent 55%), linear-gradient(160deg,#2b8bcb 0%,#0f5b8f 55%,#0a3f63 100%)", boxShadow: "0 18px 44px rgba(11,58,94,0.25)" }}>
          <div aria-hidden style={{ position: "absolute", right: -18, top: -18, color: "rgba(255,255,255,0.1)" }}><Icon name="waves" size={150} stroke={1.2} /></div>
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", overflowWrap: "anywhere" }}>Zalogowano jako {email}</div>
            <h1 className="font-fredoka" style={{ fontSize: "clamp(26px,4vw,34px)", margin: "4px 0 0", fontWeight: 600 }}>Cześć{firstName ? `, ${firstName}` : ""}!</h1>
            <div className="konto-stats" style={{ marginTop: 18 }}>
              <Stat icon="users" value={String(activeKids)} label={activeKids === 1 ? "dziecko" : "dzieci"} />
              <Stat icon="calendar" value={String(schedule.length)} label="zajęć w tygodniu" />
              <Stat icon="clock" value={next ? `${nextLabel}, ${next.startTime}` : "—"} label={next ? `najbliższe · ${next.children.join(", ")}` : "najbliższe zajęcia"} wide />
            </div>
          </div>
        </section>

        {/* Dzieci */}
        <h2 className="font-fredoka" style={{ fontSize: 21, color: C.navyDeep, margin: "30px 0 12px" }}>Twoje dzieci</h2>
        {enrollments === undefined ? (
          <p style={{ color: C.grey }}>Ładowanie…</p>
        ) : children.length === 0 ? (
          <div style={{ ...card, padding: "30px 24px", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", color: "#9fb4c2", marginBottom: 10 }}><Icon name="inbox" size={34} stroke={1.6} /></div>
            <p style={{ color: C.grey, margin: "0 0 6px", fontSize: 15.5 }}>Nie widzimy jeszcze zgłoszeń na Twój e-mail.</p>
            <p style={{ color: C.grey, margin: "0 0 18px", fontSize: 14 }}>Jeśli zgłoszenie wysłano na inny adres, napisz do nas — połączymy je z kontem.</p>
            <Link href="/#nabor" className="font-fredoka" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", fontWeight: 600, color: "#fff", background: C.orange, borderRadius: 12, padding: "12px 22px" }}>Wypełnij formularz naboru <Icon name="arrowRight" size={17} stroke={2} /></Link>
          </div>
        ) : (
          <div className="konto-kids">
            {children.map((e) => {
              const st = STATUS[e.status] ?? STATUS.pending;
              const date = new Date(e.createdAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
              const initials = e.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
              const times = schedule.filter((r) => r.children.includes(e.name));
              const first = times[0];
              return (
                <article key={e._id} style={{ ...card, padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "18px 20px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                      <div aria-hidden style={{ width: 46, height: 46, borderRadius: 13, flex: "none", background: st.bg, color: st.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16 }}>{initials || "?"}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="font-fredoka" style={{ fontWeight: 600, fontSize: 19, color: C.navyDeep, lineHeight: 1.2 }}>{e.name}</div>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 5, fontSize: 12.5, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 999, padding: "3px 10px" }}>
                          <Icon name={st.icon} size={13} stroke={2.2} /> {st.label}
                        </span>
                      </div>
                    </div>

                    {e.status !== "resigned" && <Steps step={e.status === "approved" && e.assignedGroupName ? 3 : e.status === "approved" ? 2 : st.step} failed={e.status === "rejected"} />}

                    {e.status === "approved" && e.assignedGroupName ? (
                      <div style={{ marginTop: 14, background: "#f3f8fc", border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: C.grey }}>Grupa</div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: C.navyDeep, marginTop: 2 }}>{e.assignedGroupName}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 6, fontSize: 13.5, color: C.grey }}>
                          {first?.poolName && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="mapPin" size={14} /> {first.poolName}</span>}
                          {first?.instructor && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="whistle" size={14} /> {first.instructor}</span>}
                        </div>
                        {times.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                            {times.map((r) => (
                              <span key={r._id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: C.navy, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 9, padding: "5px 10px" }}>
                                <Icon name="calendar" size={14} /> {DAY_SHORT[r.dayOfWeek]} {r.startTime}–{r.endTime}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : e.status === "approved" ? (
                      <Note tone="#9a6a00" bg="#fff8e8">Zgłoszenie przyjęte. Grupę i godziny zajęć prześlemy wkrótce mailem — pojawią się też tutaj.</Note>
                    ) : (
                      <Note tone={st.color} bg={st.bg}>{st.info}</Note>
                    )}

                    {e.decisionNote && (
                      <div style={{ display: "flex", gap: 8, marginTop: 10, fontSize: 14, lineHeight: 1.5, color: "#33495a" }}>
                        <span style={{ color: C.orange, flex: "none", marginTop: 2 }}><Icon name="message" size={15} /></span>
                        <span>{e.decisionNote}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", padding: "10px 20px", background: "#f8fbfd", borderTop: `1px solid ${C.line}`, fontSize: 13, color: "#7d8f9b" }}>
                    {e.levelLabel && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="layers" size={14} /> {e.levelLabel}</span>}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="inbox" size={14} /> Zgłoszono {date}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Plan tygodnia */}
        <h2 className="font-fredoka" style={{ fontSize: 21, color: C.navyDeep, margin: "32px 0 12px" }}>Plan tygodnia</h2>
        {schedule.length === 0 ? (
          <div style={{ ...card, padding: "22px 22px", color: C.grey, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ color: "#9fb4c2", flex: "none" }}><Icon name="calendar" size={24} stroke={1.7} /></span>
            <span style={{ lineHeight: 1.55 }}>Gdy dziecko zostanie przydzielone do grupy, zobaczysz tu dni i godziny zajęć.</span>
          </div>
        ) : (
          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            {DAY_NAMES.map((d, i) => {
              const rows = schedule.filter((r) => r.dayOfWeek === i);
              if (rows.length === 0) return null;
              const today = now?.day === i;
              return (
                <div key={i} className="konto-day" style={{ borderTop: `1px solid ${C.line}`, background: today ? "#fffaf0" : undefined }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: C.navyDeep }}>{d}</span>
                    {today && <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", background: C.orange, borderRadius: 999, padding: "2px 9px" }}>Dziś</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {rows.map((r) => (
                      <div key={r._id} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                        <span style={{ minWidth: 98, fontWeight: 700, fontSize: 16, color: C.navy, fontVariantNumeric: "tabular-nums" }}>{r.startTime}–{r.endTime}</span>
                        <span style={{ fontSize: 14.5, lineHeight: 1.45 }}>
                          <strong style={{ fontWeight: 700 }}>{r.children.join(", ")}</strong>
                          <span style={{ color: C.grey }}>{r.poolName ? ` · ${r.poolName}` : ""}{r.instructor ? ` · ${r.instructor}` : ""}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Kontakt i akcje */}
        <div className="konto-foot" style={{ marginTop: 30 }}>
          <div style={{ ...card, padding: "20px 22px" }}>
            <div className="font-fredoka" style={{ fontWeight: 600, fontSize: 18, color: C.navyDeep }}>Masz pytanie?</div>
            <p style={{ fontSize: 14, color: C.grey, margin: "4px 0 12px" }}>Nieobecność, zmiana grupy, płatności — napisz lub zadzwoń.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 15 }}>
              {contactPhone && <a href={`tel:${contactPhone.replace(/[^+\d]/g, "")}`} style={{ display: "inline-flex", alignItems: "center", gap: 9, color: C.navy, fontWeight: 700, textDecoration: "none" }}><Icon name="phone" size={17} /> {contactPhone}</a>}
              {contactEmail && <a href={`mailto:${contactEmail}`} style={{ display: "inline-flex", alignItems: "center", gap: 9, color: C.navy, fontWeight: 700, textDecoration: "none", overflowWrap: "anywhere" }}><Icon name="mail" size={17} /> {contactEmail}</a>}
            </div>
          </div>
          <div style={{ ...card, padding: "20px 22px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div className="font-fredoka" style={{ fontWeight: 600, fontSize: 18, color: C.navyDeep }}>Kolejne dziecko?</div>
              <p style={{ fontSize: 14, color: C.grey, margin: "4px 0 0" }}>Wypełnij formularz na ten sam e-mail — zgłoszenie pojawi się na tym koncie.</p>
            </div>
            <Link href="/#nabor" className="font-fredoka" style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", fontWeight: 600, color: "#fff", background: C.orange, borderRadius: 12, padding: "11px 20px" }}>
              Zapisz dziecko <Icon name="arrowRight" size={17} stroke={2} />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ icon, value, label, wide }: { icon: IconName; value: string; label: string; wide?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.13)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 16, padding: "11px 14px", gridColumn: wide ? "span 2" : undefined, minWidth: 0 }}>
      <span style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(255,210,122,0.22)", color: "#ffd27a", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name={icon} size={19} /></span>
      <div style={{ minWidth: 0 }}>
        <div className="font-fredoka" style={{ fontWeight: 600, fontSize: 19, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.3, color: "rgba(255,255,255,0.82)", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function Steps({ step, failed }: { step: number; failed?: boolean }) {
  const labels = ["Zgłoszenie", "Decyzja", "Grupa"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 16 }} aria-label="Postęp zgłoszenia">
      {labels.map((l, i) => {
        const done = i < step;
        const col = failed && i === 1 ? "#d14343" : done ? "#2fa36b" : "#c9d6df";
        return (
          <div key={l} style={{ flex: 1, minWidth: 0 }}>
            <div style={{ height: 5, borderRadius: 999, background: col }} />
            <div style={{ fontSize: 11.5, fontWeight: 600, color: done ? "#33495a" : "#9aabb5", marginTop: 5 }}>{l}</div>
          </div>
        );
      })}
    </div>
  );
}

function Note({ children, tone, bg }: { children: React.ReactNode; tone: string; bg: string }) {
  return (
    <div style={{ marginTop: 14, fontSize: 14, lineHeight: 1.55, color: tone, background: bg, borderRadius: 12, padding: "10px 13px" }}>{children}</div>
  );
}
