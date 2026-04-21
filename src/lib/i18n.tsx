import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "en" | "sw";

const dict = {
  en: {
    "nav.features": "Features",
    "nav.how": "How it works",
    "nav.faq": "FAQ",
    "nav.signin": "Sign in",
    "nav.start": "Get started",
    "hero.badge": "Digital Chama for modern Tanzania",
    "hero.title": "Save together. Grow together.",
    "hero.subtitle": "ROSCA digitizes your mchezo — track contributions, automate payouts, and keep every cycle transparent for every member.",
    "hero.cta": "Start your group",
    "hero.secondary": "See how it works",
    "stats.groups": "Active chamas",
    "stats.members": "Members saving",
    "stats.cycles": "Cycles completed",
    "stats.tzs": "TZS rotated",
    "features.title": "Everything your chama needs",
    "features.subtitle": "Built for trust. Designed for clarity.",
    "f1.title": "Cycle automation",
    "f1.desc": "Each cycle equals your member count. New cycles begin automatically — full history kept forever.",
    "f2.title": "Smart reminders",
    "f2.desc": "Two reminders per day before salary, on payday, and during the 3-day grace period. Never miss a contribution.",
    "f3.title": "Transparent payouts",
    "f3.desc": "Every member sees the rotation order, who paid, and who receives next. Zero ambiguity.",
    "f4.title": "Roles that fit",
    "f4.desc": "Group Admins manage members and payouts. Members contribute and track their turn.",
    "f5.title": "WhatsApp link",
    "f5.desc": "Connect your group's WhatsApp directly from the dashboard for quick coordination.",
    "f6.title": "Reports & exports",
    "f6.desc": "Cycle-by-cycle breakdowns, member compliance, and CSV/PDF exports anytime.",
    "how.title": "How a cycle works",
    "how.s1.title": "Create your group",
    "how.s1.desc": "Set the contribution amount, add members, and define the payout order.",
    "how.s2.title": "Contribute monthly",
    "how.s2.desc": "Each member pays the agreed amount at the end of the month. Track status in real time.",
    "how.s3.title": "Receive your turn",
    "how.s3.desc": "One member receives the full pool each month. After the last member, a new cycle begins.",
    "cta.title": "Bring your chama into the digital age",
    "cta.subtitle": "Free to start. Built for groups of 3 to 50 members.",
    "cta.button": "Create your first group",
    "footer.tag": "Mfumo wa mchezo wa kisasa",
  },
  sw: {
    "nav.features": "Vipengele",
    "nav.how": "Inavyofanya kazi",
    "nav.faq": "Maswali",
    "nav.signin": "Ingia",
    "nav.start": "Anza sasa",
    "hero.badge": "Chama cha kidijitali kwa Tanzania ya kisasa",
    "hero.title": "Wekeni pamoja. Kueni pamoja.",
    "hero.subtitle": "ROSCA inadigitisha mchezo wako — fuatilia michango, panga malipo kiotomatiki, na hifadhi uwazi kwa kila mwanachama.",
    "hero.cta": "Anzisha kikundi chako",
    "hero.secondary": "Ona inavyofanya kazi",
    "stats.groups": "Vyama hai",
    "stats.members": "Wanachama",
    "stats.cycles": "Mizunguko iliyokamilika",
    "stats.tzs": "TZS zilizozunguka",
    "features.title": "Kila kitu chama chako kinahitaji",
    "features.subtitle": "Imejengwa kwa imani. Imeundwa kwa uwazi.",
    "f1.title": "Mizunguko ya kiotomatiki",
    "f1.desc": "Kila mzunguko ni sawa na idadi ya wanachama. Mzunguko mpya unaanza wenyewe — historia inahifadhiwa milele.",
    "f2.title": "Vikumbusho mahiri",
    "f2.desc": "Vikumbusho viwili kwa siku kabla ya mshahara, siku ya malipo, na ndani ya siku 3 za neema. Usisahau mchango.",
    "f3.title": "Malipo ya wazi",
    "f3.desc": "Kila mwanachama anaona mpangilio, aliyelipa, na atakayepokea baadaye. Hakuna utata.",
    "f4.title": "Majukumu yanayofaa",
    "f4.desc": "Msimamizi husimamia wanachama na malipo. Wanachama wanachanga na kufuatilia zamu zao.",
    "f5.title": "Kiungo cha WhatsApp",
    "f5.desc": "Unganisha WhatsApp ya kikundi moja kwa moja kutoka dashibodi kwa mawasiliano ya haraka.",
    "f6.title": "Ripoti na hamisho",
    "f6.desc": "Mchanganuo wa mzunguko, ufuasi wa wanachama, na hamisho la CSV/PDF wakati wowote.",
    "how.title": "Mzunguko unavyofanya kazi",
    "how.s1.title": "Anzisha kikundi",
    "how.s1.desc": "Weka kiasi cha mchango, ongeza wanachama, na panga mpangilio wa malipo.",
    "how.s2.title": "Changia kila mwezi",
    "how.s2.desc": "Kila mwanachama analipa kiasi kilichokubaliwa mwisho wa mwezi. Fuatilia hali kwa wakati halisi.",
    "how.s3.title": "Pokea zamu yako",
    "how.s3.desc": "Mwanachama mmoja anapokea pesa zote kila mwezi. Baada ya wa mwisho, mzunguko mpya unaanza.",
    "cta.title": "Leta chama chako katika enzi ya kidijitali",
    "cta.subtitle": "Bure kuanza. Imejengwa kwa vikundi vya wanachama 3 hadi 50.",
    "cta.button": "Tengeneza kikundi chako cha kwanza",
    "footer.tag": "Mfumo wa mchezo wa kisasa",
  },
} as const;

type Key = keyof typeof dict.en;

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem("rosca.lang") as Lang | null;
    if (stored === "en" || stored === "sw") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("rosca.lang", l);
  };

  const t = (k: Key) => dict[lang][k] ?? k;

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
