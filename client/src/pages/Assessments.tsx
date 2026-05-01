/* Assessments — 9 nurturing self-assessments for adoptees.
 * Design: warm watercolor editorial. No dark mode. Soft cards on paper bg.
 * Voice: Oracle Lover - tender, direct, body-aware, no toxic positivity.
 * Each assessment is interactive (questions + scoring + nurturing interpretation).
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";

type Question = { id: string; text: string };
type Assessment = {
  slug: string;
  title: string;
  subtitle: string;
  intro: string;
  category: string;
  questions: Question[];
  /** Each band: low/mid/high inclusive thresholds + nurturing interpretation. */
  bands: { min: number; max: number; label: string; body: string; nextStep?: { href: string; label: string } }[];
  closingNote: string;
};

const SCALE = [
  { v: 0, label: "Never" },
  { v: 1, label: "Rarely" },
  { v: 2, label: "Sometimes" },
  { v: 3, label: "Often" },
  { v: 4, label: "Almost always" },
];

const ASSESSMENTS: Assessment[] = [
  {
    slug: "primal-wound-felt-sense",
    title: "The Primal Wound Felt-Sense",
    subtitle: "How present is the original loss in your body, today?",
    intro: "This is not diagnostic. It is a soft mirror. Read each line, breathe, then choose the answer your body picks first.",
    category: "Primal Wound",
    questions: [
      { id: "q1", text: "I feel a low background ache I can't always name." },
      { id: "q2", text: "Loud goodbyes (anyone leaving) put my chest in a clench." },
      { id: "q3", text: "I scan rooms for the exit before I scan them for friends." },
      { id: "q4", text: "Loneliness feels older than my actual life." },
      { id: "q5", text: "Tenderness from someone safe still makes me brace." },
      { id: "q6", text: "I avoid stories or films about babies being separated from mothers." },
      { id: "q7", text: "There is a quiet I sometimes long for that I can't quite remember." },
      { id: "q8", text: "I downplay how heavy this all actually is." },
    ],
    bands: [
      {
        min: 0, max: 9, label: "The wound is quiet today",
        body: "Your nervous system has resources right now. That doesn't mean nothing is there. It means today, you have ground. Honor it.",
      },
      {
        min: 10, max: 19, label: "The wound is humming under things",
        body: "You're holding a steady ache. Not in crisis, not in ease. This is the long middle, where most healing happens. Slow practices help here, not big efforts.",
        nextStep: { href: "/articles/preverbal-grief-adopted-infants", label: "Read: What preverbal grief actually looks like" },
      },
      {
        min: 20, max: 32, label: "The wound is loud right now",
        body: "Your body is asking for tenderness, not strategy. Don't try to fix this today. Find one safe person, one safe place, one safe practice. That's enough.",
        nextStep: { href: "/toolkit", label: "Visit the Toolkit" },
      },
    ],
    closingNote: "Whatever number came up, you're not broken. The body remembers what words can't. That memory is data, not damage.",
  },
  {
    slug: "reunion-readiness",
    title: "Reunion Readiness Map",
    subtitle: "Before you reach out, write the letter, or open the door.",
    intro: "Honest answers serve you. There's no right score. Some of us are ready in our 20s, some at 60, some not at all. All of those are valid.",
    category: "Reunion",
    questions: [
      { id: "q1", text: "I can imagine being rejected and still recognize my own worth afterward." },
      { id: "q2", text: "I have at least one person I'd debrief with in the first 48 hours." },
      { id: "q3", text: "I'm searching for me, not to fix them." },
      { id: "q4", text: "I can hold the possibility they're not who I imagined." },
      { id: "q5", text: "I have a therapist or somatic practitioner I trust." },
      { id: "q6", text: "I've grieved the fantasy version at least once." },
      { id: "q7", text: "I know what I will and won't share in the first conversation." },
      { id: "q8", text: "I can wait days for a reply without spiraling." },
      { id: "q9", text: "I have a plan for the first night after contact." },
    ],
    bands: [
      {
        min: 0, max: 12, label: "The fantasy is still louder than the readiness",
        body: "That's information, not failure. The fantasy stage is sacred. Don't rush yourself out of it. You can still search slowly while you grow the support that holds you in any outcome.",
        nextStep: { href: "/articles/fantasy-birth-mother-grieving-the-imagined", label: "Read: Grieving the imagined birth mother" },
      },
      {
        min: 13, max: 24, label: "You're close, but uneven",
        body: "You're ready in some areas (search, identity) and not in others (rejection tolerance, support net). Spend the next month building the weakest piece. Then re-take this.",
      },
      {
        min: 25, max: 36, label: "You're as ready as anyone gets",
        body: "Ready doesn't mean it won't gut you. It means you have the scaffolding. Take the next step. We're behind you.",
        nextStep: { href: "/articles/reunion-trauma-when-finding-your-birth-family", label: "Read: Reunion trauma, when finding your birth family is its own loss" },
      },
    ],
    closingNote: "Reunion is not a single event. It's a years-long unfolding. You can pause at any point and still be doing this right.",
  },
  {
    slug: "nervous-system-baseline",
    title: "Nervous System Baseline",
    subtitle: "Where does your body live most of the time?",
    intro: "Adoptees often live in subtle survival states. Naming the state is the first soothing.",
    category: "Body & Nervous System",
    questions: [
      { id: "q1", text: "I startle easily at sounds others find normal." },
      { id: "q2", text: "I freeze in conflict, then think of what to say hours later." },
      { id: "q3", text: "I find it hard to nap, even when exhausted." },
      { id: "q4", text: "Slow breathing makes me MORE anxious for the first minute or two." },
      { id: "q5", text: "I feel safer when I'm a little hidden (back to a wall, edge of a room)." },
      { id: "q6", text: "I numb out scrolling instead of resting." },
      { id: "q7", text: "I have shoulders/jaw/hip tension I can't fully release." },
      { id: "q8", text: "I get sick after long stretches of being 'fine.'" },
    ],
    bands: [
      {
        min: 0, max: 9, label: "Mostly regulated, with some edges",
        body: "Your baseline is workable. The work now is widening your window of tolerance, not chasing perfect calm. Tend the edges with body practices, not big breakthroughs.",
      },
      {
        min: 10, max: 19, label: "Frequent activation, partial regulation",
        body: "You're spending real time in fight/flight or freeze. This is exhausting and you're probably under-resting. Two-minute body practices done five times a day will outperform one big practice once a week.",
        nextStep: { href: "/articles/the-felt-sense-pause-when-the-fog-rolls-in", label: "Try: the felt-sense pause" },
      },
      {
        min: 20, max: 32, label: "Living in survival physiology",
        body: "Please be gentle. Your body is doing what it learned to do early. This is not a personality flaw. Find a somatic-trained therapist if you can, and let yourself rest more than feels reasonable.",
        nextStep: { href: "/category/body-and-nervous-system", label: "Browse: Body & Nervous System" },
      },
    ],
    closingNote: "Your nervous system isn't broken. It's a witness. Treat it like one.",
  },
  {
    slug: "identity-coherence",
    title: "Identity Coherence Check",
    subtitle: "How whole does the story of you feel?",
    intro: "Adoptees often carry fragmented identity narratives. This isn't a deficit. It's the inheritance of relinquishment.",
    category: "Identity & Search",
    questions: [
      { id: "q1", text: "I can tell my own life story from start to now without major gaps." },
      { id: "q2", text: "I know where my facial features come from." },
      { id: "q3", text: "I feel rooted in a culture, lineage, or land." },
      { id: "q4", text: "I have a clear answer to 'who are your people?'" },
      { id: "q5", text: "My medical history feels usable, not dangerous." },
      { id: "q6", text: "I don't shape-shift around different family members." },
      { id: "q7", text: "When asked 'what are you?' I have a true answer, not a deflection." },
      { id: "q8", text: "I feel I belong to my own body." },
    ],
    bands: [
      {
        min: 0, max: 9, label: "Significant fragmentation",
        body: "The gaps in your story aren't a failure of yours. They're the architecture of closed adoption. The work is building scaffolding around the unknowns, not erasing them.",
        nextStep: { href: "/articles/the-adoption-narrative-rewrite-your-story", label: "Read: The adoption narrative rewrite" },
      },
      {
        min: 10, max: 19, label: "Partial coherence, with soft spots",
        body: "You have some pieces, you're missing others. Identify the one most painful gap. Spend a season just there, with curiosity, not urgency.",
      },
      {
        min: 20, max: 32, label: "Strong narrative integration",
        body: "You've done real work. The story holds. Keep updating it as new information arrives. Identity is a living document.",
      },
    ],
    closingNote: "A coherent identity isn't a closed identity. It's one that can hold mystery without flying apart.",
  },
  {
    slug: "fog-thickness",
    title: "Adoption Fog Thickness",
    subtitle: "How much of your story is behind glass right now?",
    intro: "The fog is the protective dissociation many adoptees carry. Lifting it is not a one-time event. It happens in waves.",
    category: "Identity & Search",
    questions: [
      { id: "q1", text: "I can name the losses adoption involved without minimizing them." },
      { id: "q2", text: "When I read adoptee-written work, it lands in my body, not just my head." },
      { id: "q3", text: "I no longer say 'I'm one of the lucky ones.'" },
      { id: "q4", text: "I can be angry without immediately apologizing for it." },
      { id: "q5", text: "I can hold love for adoptive parents AND grief about being separated, at the same time." },
      { id: "q6", text: "I notice when adoption tropes in films or media bother me." },
      { id: "q7", text: "I no longer perform the 'grateful adoptee' role." },
      { id: "q8", text: "I've cried about adoption itself, not just specific events." },
    ],
    bands: [
      {
        min: 0, max: 9, label: "Deep in the fog",
        body: "You may be reading this and thinking 'this isn't me.' That itself is the fog. Stay curious, not convinced. Just notice. Reading is enough today.",
        nextStep: { href: "/articles/coming-out-of-the-adoption-fog-the-first-six-months", label: "Read: Coming out of the adoption fog" },
      },
      {
        min: 10, max: 19, label: "Coming out in waves",
        body: "You're in the active disorientation phase. This is when adoptees often feel worse before better. That's not a sign you're failing. It's a sign the system is updating.",
      },
      {
        min: 20, max: 32, label: "Mostly clear-eyed",
        body: "You see it. The work now isn't more lifting. It's living with what you see, with kindness, and helping other adoptees who haven't gotten here yet.",
      },
    ],
    closingNote: "Coming out of the fog is not a loss. It's the return of feeling. Feeling is messy. It is also yours.",
  },
  {
    slug: "self-loyalty-vs-self-betrayal",
    title: "Self-Loyalty vs. Self-Betrayal",
    subtitle: "Whose voice do you hear first when you make a choice?",
    intro: "Adoptees often inherit a strong loyalty to others' comfort over their own truth. This assessment names that pattern.",
    category: "Healing Practices",
    questions: [
      { id: "q1", text: "I say yes to keep peace, then resent it later." },
      { id: "q2", text: "I downplay my needs to avoid being 'too much.'" },
      { id: "q3", text: "I apologize for crying." },
      { id: "q4", text: "I rehearse what I will say to avoid upsetting anyone." },
      { id: "q5", text: "I shape-shift around my adoptive family more than my friends." },
      { id: "q6", text: "I believe I have to earn love." },
      { id: "q7", text: "I criticize myself before anyone else can." },
      { id: "q8", text: "I find it easier to receive criticism than praise." },
    ],
    bands: [
      {
        min: 0, max: 9, label: "Strong self-loyalty",
        body: "You've built real ground. Keep practicing the small no's, the small truths. They are the muscles.",
      },
      {
        min: 10, max: 19, label: "Self-loyalty is partial",
        body: "You have it in some areas (work, friendships) but lose it in others (family, intimate partners). The pattern is information, not failure.",
        nextStep: { href: "/articles/adoptee-boundaries-language-without-apology", label: "Read: Boundaries without apology" },
      },
      {
        min: 20, max: 32, label: "Self-betrayal is a daily habit",
        body: "This pattern likely saved you in childhood. It's no longer needed and it's exhausting you. Start small. One 'no' a day. One unrehearsed sentence. The body learns it can survive the choice.",
      },
    ],
    closingNote: "Self-loyalty is not selfishness. It's the practice of staying in the room with yourself even when others would prefer you weren't.",
  },
  {
    slug: "support-network",
    title: "Support Network Inventory",
    subtitle: "Who actually shows up for you in the hard hours?",
    intro: "Many adoptees carry alone. This counts the actual people. Not the imagined ones.",
    category: "Healing Practices",
    questions: [
      { id: "q1", text: "I have at least one person I'd call at 2am in a crisis." },
      { id: "q2", text: "I have at least one adoptee in my life who 'gets it' without translation." },
      { id: "q3", text: "I have a therapist or healer who knows my adoption story." },
      { id: "q4", text: "I have a body practitioner (acupuncturist, massage, somatic, yoga) I see regularly." },
      { id: "q5", text: "I have a spiritual or contemplative practice I do at least weekly." },
      { id: "q6", text: "I have at least one friend who has read about adoption to understand me better." },
      { id: "q7", text: "I have a way to be in nature regularly." },
      { id: "q8", text: "I have a creative outlet I tend." },
    ],
    bands: [
      {
        min: 0, max: 9, label: "Carrying mostly alone",
        body: "This is real and it's not your fault. The work isn't to manufacture a community overnight. It's to add ONE pillar in the next 30 days. Pick the easiest one. Start there.",
      },
      {
        min: 10, max: 19, label: "Partial scaffolding",
        body: "You have pieces, with notable gaps. Look at the lowest-scoring item. That's likely your highest-leverage move this season.",
      },
      {
        min: 20, max: 32, label: "Strong scaffolding",
        body: "You've built a real holding environment. Don't take it for granted. Tend it weekly the way you'd tend a garden.",
      },
    ],
    closingNote: "Healing happens in relationship, not in isolation. The fact that you're reading this is itself a relationship. It counts.",
  },
  {
    slug: "rage-relationship",
    title: "Your Relationship With Rage",
    subtitle: "Adoptee rage is a sacred fire. Where is yours, today?",
    intro: "Rage is not the enemy. Suppressed rage is. This is a check on how alive your fire is.",
    category: "Primal Wound",
    questions: [
      { id: "q1", text: "I let myself feel anger about adoption, not just sadness." },
      { id: "q2", text: "I can stay with my anger for at least 5 minutes without flipping it into shame." },
      { id: "q3", text: "I move my body when I'm angry (walk, dance, shake) instead of stewing." },
      { id: "q4", text: "I can be angry with someone I love and still love them." },
      { id: "q5", text: "I can name what (specifically) I'm angry about." },
      { id: "q6", text: "I notice anger as heat in my body before I label it." },
      { id: "q7", text: "I let myself swear out loud when needed." },
      { id: "q8", text: "I don't believe my anger is dangerous." },
    ],
    bands: [
      {
        min: 0, max: 9, label: "Rage is buried",
        body: "Likely your rage went underground early because expressing it felt dangerous. That's a survival adaptation, not a flaw. Begin with bodily sensations of heat, not stories about anger.",
        nextStep: { href: "/articles/adoptee-rage-the-sacred-fire", label: "Read: Adoptee rage, the sacred fire" },
      },
      {
        min: 10, max: 19, label: "Rage is leaking, not flowing",
        body: "Your rage shows up sideways, in irritability, sarcasm, or sudden flares. The work is making it conscious. Daily journal, body movement, naming it directly.",
      },
      {
        min: 20, max: 32, label: "Rage is integrated",
        body: "You've made friends with your fire. That's rare. Help others find theirs. Your example is medicine.",
      },
    ],
    closingNote: "Rage that has been honored, moved, and witnessed becomes power. Rage that has been shamed becomes depression. Choose the first path, slowly.",
  },
  {
    slug: "daily-practice-fit",
    title: "Daily Practice Fit",
    subtitle: "What's already working in your life that we can build on?",
    intro: "The best practice is the one you'll actually do. This identifies your natural openings.",
    category: "Healing Practices",
    questions: [
      { id: "q1", text: "I tend to wake before 7am with energy." },
      { id: "q2", text: "I love being outside in the early morning." },
      { id: "q3", text: "I'm more myself after physical movement." },
      { id: "q4", text: "I can sit still for 10+ minutes without crawling out of my skin." },
      { id: "q5", text: "I find writing easier than talking." },
      { id: "q6", text: "I can fall asleep within 30 minutes of lying down." },
      { id: "q7", text: "I cook for myself at least 3 times a week." },
      { id: "q8", text: "I know what foods make me feel grounded vs. depleted." },
    ],
    bands: [
      {
        min: 0, max: 9, label: "The basics need rebuilding",
        body: "Don't add a 'practice' yet. Pick ONE basic - sleep window, one home-cooked meal a week, ten minutes outside daily. The basics ARE the practice for now.",
        nextStep: { href: "/toolkit", label: "Visit the Toolkit" },
      },
      {
        min: 10, max: 19, label: "Some openings exist",
        body: "Look at your two highest-scoring items. Build a 5-minute practice that uses them. Example: if you score high on movement + outside, do a daily 5-min walk before phone time.",
      },
      {
        min: 20, max: 32, label: "Strong daily fabric",
        body: "You have the structure. Now layer in one tender practice (like meditation, breath, or somatic check-in) once a day. You'll feel the difference within 2 weeks.",
      },
    ],
    closingNote: "Practice is not about discipline. It's about making space, daily, for the part of you that adoption asked to disappear.",
  },
];

function totalScore(answers: Record<string, number | undefined>) {
  return Object.values(answers).reduce<number>((s, v) => s + (typeof v === "number" ? v : 0), 0);
}

function bandFor(a: Assessment, score: number) {
  return a.bands.find((b) => score >= b.min && score <= b.max) || a.bands[a.bands.length - 1];
}

function AssessmentCard({ a }: { a: Assessment }) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number | undefined>>({});
  const allAnswered = a.questions.every((q) => typeof answers[q.id] === "number");
  const score = useMemo(() => totalScore(answers), [answers]);
  const band = useMemo(() => (allAnswered ? bandFor(a, score) : null), [a, score, allAnswered]);

  return (
    <article id={a.slug} className="rounded-2xl bg-card ring-1 ring-border overflow-hidden transition hover:ring-[var(--teal)]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-6 md:p-7 flex items-start justify-between gap-4 group"
        aria-expanded={open}
      >
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--teal)] mb-2">{a.category}</div>
          <h2 className="text-xl md:text-2xl font-medium mb-2 group-hover:text-[var(--clay)]" style={{ fontFamily: "var(--font-display)" }}>
            {a.title}
          </h2>
          <p className="text-sm text-foreground/75">{a.subtitle}</p>
        </div>
        <div className="shrink-0 mt-1 text-[var(--teal)]">{open ? <ChevronUp size={22} /> : <ChevronDown size={22} />}</div>
      </button>

      {open && (
        <div className="px-6 md:px-7 pb-7 border-t border-border bg-[var(--paper)]">
          <p className="text-sm text-foreground/80 mt-5 mb-6 leading-relaxed italic">{a.intro}</p>
          <ol className="space-y-5">
            {a.questions.map((q, i) => (
              <li key={q.id} className="rounded-xl bg-card ring-1 ring-border p-4">
                <div className="text-[11px] uppercase tracking-[0.14em] text-foreground/55 mb-1">Q{i + 1}</div>
                <div className="text-[15px] mb-3">{q.text}</div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {SCALE.map((s) => {
                    const active = answers[q.id] === s.v;
                    return (
                      <button
                        key={s.v}
                        type="button"
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: s.v }))}
                        className={`text-xs px-3 py-2 rounded-lg border transition ${
                          active
                            ? "bg-[var(--teal)] text-white border-[var(--teal)]"
                            : "bg-background text-foreground/70 border-border hover:border-[var(--teal)]"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-7 rounded-2xl bg-[var(--cream)] ring-1 ring-[var(--clay-soft)] p-6">
            {allAnswered && band ? (
              <>
                <div className="flex items-center gap-2 mb-2 text-[var(--clay)]">
                  <Sparkles size={18} />
                  <div className="text-[11px] uppercase tracking-[0.16em]">Your felt-sense reading</div>
                </div>
                <div className="text-[13px] text-foreground/65 mb-1">Score: {score} of {a.questions.length * 4}</div>
                <h3 className="text-xl md:text-2xl font-medium mb-3" style={{ fontFamily: "var(--font-display)" }}>
                  {band.label}
                </h3>
                <p className="text-[15px] leading-relaxed text-foreground/85 mb-4">{band.body}</p>
                {band.nextStep && (
                  <Link href={band.nextStep.href} className="inline-block text-sm text-[var(--teal)] underline underline-offset-4 hover:text-[var(--clay)]">
                    {band.nextStep.label} →
                  </Link>
                )}
                <p className="text-[13px] text-foreground/65 italic mt-5 pt-4 border-t border-[var(--clay-soft)]">{a.closingNote}</p>
              </>
            ) : (
              <div className="text-sm text-foreground/65">
                Answer all {a.questions.length} questions to see your nurturing reading.
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export default function Assessments() {
  return (
    <div>
      {/* Header */}
      <header className="border-b border-border bg-[var(--paper)]">
        <div className="container py-12 md:py-20 max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--clay)] mb-3">Self-Assessments for Adoptees</div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-tight" style={{ fontFamily: "var(--font-display)" }}>
            Nine soft mirrors. <span className="text-[var(--clay)]">No diagnoses. No grades.</span>
          </h1>
          <p className="text-foreground/75 mt-5 text-lg leading-relaxed">
            These are nurturing self-assessments, not clinical instruments. Answer with your body's first response, not your most flattering one. The point isn't a number. The point is to see what's actually here, with kindness.
          </p>
          <p className="text-foreground/60 mt-4 text-sm leading-relaxed">
            Each assessment takes 3-7 minutes. Your answers stay on this page only, never saved or sent anywhere. Take one a day, not all in one sitting. Some of these will land hard.
          </p>
        </div>
      </header>

      {/* Index of all 9 */}
      <section className="container py-10 md:py-12">
        <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--teal)] mb-3">All Nine Assessments</div>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-12 text-sm">
          {ASSESSMENTS.map((a, i) => (
            <li key={a.slug}>
              <a
                href={`#${a.slug}`}
                className="block rounded-xl bg-card ring-1 ring-border p-4 hover:ring-[var(--teal)] transition"
              >
                <div className="text-[11px] uppercase tracking-[0.14em] text-foreground/55 mb-1">№ {String(i + 1).padStart(2, "0")}</div>
                <div className="font-medium leading-snug" style={{ fontFamily: "var(--font-display)" }}>{a.title}</div>
              </a>
            </li>
          ))}
        </ul>

        {/* Cards */}
        <div className="space-y-5">
          {ASSESSMENTS.map((a) => (
            <AssessmentCard key={a.slug} a={a} />
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-14 max-w-2xl mx-auto text-center">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--clay)] mb-3">A note on these instruments</div>
          <p className="text-sm text-foreground/70 leading-relaxed">
            These assessments are written in the Oracle Lover voice for adult adoptees doing inner work. They are not validated psychometric tools. If anything you read here brings up acute distress, please reach with someone you trust, a therapist who specializes in adoption, or call/text the 988 Suicide & Crisis Lifeline.
          </p>
        </div>
      </section>
    </div>
  );
}
