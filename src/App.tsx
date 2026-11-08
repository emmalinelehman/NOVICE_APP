import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleUserRound,
  Clock3,
  Compass,
  Edit3,
  Heart,
  Home,
  ListChecks,
  MapPin,
  Menu,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Store,
  Trash2,
  Users,
  WalletCards,
  X,
} from "lucide-react";

type Screen =
  | "onboarding"
  | "home"
  | "list"
  | "explore"
  | "interest"
  | "propose"
  | "plan"
  | "experiences"
  | "profile"
  | "host";
type Intent = "Curious" | "Want to Join" | "Ready";
type Plan = {
  id: number;
  interest: string;
  title: string;
  date: string;
  time: string;
  location: string;
  size: number;
  type: "Spontaneous" | "Community" | "Hosted";
  price?: number;
  host: string;
  joined: boolean;
  participants: string[];
};

const potteryPhoto =
  "https://images.unsplash.com/photo-1676125105332-608345abe20e?auto=format&fit=crop&w=1200&q=85";

const activityPhotos: Record<string, string> = {
  "Wheel pottery":
    "https://images.unsplash.com/photo-1749835521236-d29d0004162d?auto=format&fit=crop&w=900&q=82",
  "Urban foraging":
    "https://images.unsplash.com/photo-1790272688033-d55e4ac86c61?auto=format&fit=crop&w=900&q=82",
  "Partner dancing":
    "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?auto=format&fit=crop&w=900&q=82",
  "Film photography":
    "https://images.unsplash.com/photo-1788072793619-e8268727b63b?auto=format&fit=crop&w=900&q=82",
  Kayaking:
    "https://images.unsplash.com/photo-1670520616431-99e4d37587be?auto=format&fit=crop&w=900&q=82",
  "Sourdough baking":
    "https://images.unsplash.com/photo-1782281914057-95fb85134aa0?auto=format&fit=crop&w=900&q=82",
  Birding:
    "https://images.unsplash.com/photo-1790272687993-e9c456bb96b8?auto=format&fit=crop&w=900&q=82",
  "Improv comedy":
    "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=900&q=82",
  "Sewing a garment":
    "https://images.unsplash.com/photo-1788033955883-e7e938162658?auto=format&fit=crop&w=900&q=82",
  Bouldering:
    "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=900&q=82",
  "Watercolor painting":
    "https://images.unsplash.com/photo-1673252413454-162352c3df01?auto=format&fit=crop&w=900&q=82",
  Pickleball:
    "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=82",
  "Mushroom growing":
    "https://images.unsplash.com/photo-1504545102780-26774c1bb073?auto=format&fit=crop&w=900&q=82",
  "Pasta from scratch":
    "https://images.unsplash.com/photo-1742197682412-44c5c668e10b?auto=format&fit=crop&w=900&q=82",
  "Open-water swimming":
    "https://images.unsplash.com/photo-1600965962361-9035dbfd1c50?auto=format&fit=crop&w=900&q=82",
  Woodworking:
    "https://images.unsplash.com/photo-1569339323175-2f761c3f143b?auto=format&fit=crop&w=900&q=82",
  Stargazing:
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=82",
  "DJ basics":
    "https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?auto=format&fit=crop&w=900&q=82",
  "Community gardening":
    "https://images.unsplash.com/photo-1611322470373-9708127d923f?auto=format&fit=crop&w=900&q=82",
  "Screen printing":
    "https://images.unsplash.com/photo-1673339066658-1b36cea3054c?auto=format&fit=crop&w=900&q=82",
  "Stand-up comedy":
    "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=900&q=82",
  "Trail running":
    "https://images.unsplash.com/photo-1626017038489-a78543725b10?auto=format&fit=crop&w=900&q=82",
};

function photoFor(name: string) {
  return activityPhotos[name] || potteryPhoto;
}

const interestSeeds = [
  ["Wheel pottery", "Make", 24, 18, 10],
  ["Urban foraging", "Outdoors", 31, 14, 8],
  ["Partner dancing", "Move", 27, 21, 12],
  ["Film photography", "Make", 19, 13, 6],
  ["Kayaking", "Outdoors", 36, 22, 15],
  ["Sourdough baking", "Cook", 42, 25, 11],
  ["Birding", "Outdoors", 18, 9, 7],
  ["Improv comedy", "Perform", 29, 16, 9],
  ["Sewing a garment", "Make", 22, 12, 5],
  ["Bouldering", "Move", 34, 28, 17],
  ["Watercolor painting", "Make", 25, 15, 7],
  ["Pickleball", "Move", 38, 23, 14],
  ["Mushroom growing", "Grow", 17, 10, 6],
  ["Pasta from scratch", "Cook", 33, 19, 9],
  ["Open-water swimming", "Move", 15, 8, 4],
  ["Woodworking", "Make", 28, 17, 8],
  ["Stargazing", "Outdoors", 23, 12, 6],
  ["DJ basics", "Perform", 20, 14, 7],
  ["Community gardening", "Grow", 30, 18, 13],
  ["Screen printing", "Make", 16, 11, 5],
  ["Stand-up comedy", "Perform", 21, 13, 8],
  ["Trail running", "Move", 26, 16, 10],
] as const;

const initialPlans: Plan[] = [
  {
    id: 1,
    interest: "Wheel pottery",
    title: "First turn on the wheel",
    date: "2026-05-17",
    time: "10:00",
    location: "Yourist Studio Gallery",
    size: 8,
    type: "Hosted",
    price: 50,
    host: "Yourist Studio Gallery",
    joined: false,
    participants: ["Maya", "Theo", "Jonah", "Simone", "Ari", "Lena", "Cal"],
  },
  {
    id: 2,
    interest: "Wheel pottery",
    title: "Clay afternoon for absolute beginners",
    date: "2026-05-24",
    time: "14:00",
    location: "Potters Guild, Hill St.",
    size: 6,
    type: "Community",
    host: "Nina K.",
    joined: true,
    participants: ["You", "Nina", "Cal", "Owen"],
  },
  {
    id: 3,
    interest: "Urban foraging",
    title: "Edible plants walk",
    date: "2026-06-06",
    time: "09:30",
    location: "Nichols Arboretum",
    size: 10,
    type: "Community",
    host: "Ari D.",
    joined: false,
    participants: ["Ari", "Lena"],
  },
];

const nav = [
  { key: "home", label: "Home", icon: Home },
  { key: "list", label: "My List", icon: ListChecks },
  { key: "explore", label: "Explore", icon: Compass },
  { key: "profile", label: "Profile", icon: CircleUserRound },
] as const;

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function Badge({
  children,
  tone = "sage",
}: {
  children: React.ReactNode;
  tone?: "sage" | "rust" | "ink";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "text";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button type={type} onClick={onClick} className={`btn btn-${variant}`} disabled={disabled}>
      {children}
    </button>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("onboarding");
  const [history, setHistory] = useState<Screen[]>([]);
  const [list, setList] = useState([
    "Wheel pottery",
    "Urban foraging",
    "Partner dancing",
    "Film photography",
  ]);
  const [firsts, setFirsts] = useState(["Baked a sourdough loaf"]);
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [selectedInterest, setSelectedInterest] = useState("Wheel pottery");
  const [selectedPlan, setSelectedPlan] = useState(1);
  const [intent, setIntent] = useState<Intent>("Curious");
  const [hostMode, setHostMode] = useState(false);
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (next: Screen) => {
    setHistory((h) => [...h, screen]);
    setScreen(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => {
    const previous = history.at(-1) || "home";
    setHistory((h) => h.slice(0, -1));
    setScreen(previous);
  };
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const openInterest = (name: string) => {
    setSelectedInterest(name);
    go("interest");
  };
  const openPlan = (id: number) => {
    setSelectedPlan(id);
    go("plan");
  };
  const addPlan = (plan: Omit<Plan, "id" | "joined" | "participants" | "host">) => {
    const next = { ...plan, id: Date.now(), joined: false, participants: [], host: "You" };
    setPlans((p) => [...p, next]);
    setSelectedPlan(next.id);
    notify("Your plan is live");
    go("interest");
  };

  const activeNav =
    screen === "interest" || screen === "propose" || screen === "plan"
      ? "explore"
      : screen === "experiences"
        ? "home"
        : screen;

  if (screen === "onboarding") {
    return (
      <Onboarding
        onComplete={(picks) => {
          if (picks.length) setList(picks);
          setScreen("home");
          notify("Your NOVICE home is ready");
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <nav>
          {nav.map(({ key, label, icon: Icon }) => (
            <button key={key} className={activeNav === key ? "active" : ""} onClick={() => go(key)}>
              <Icon size={19} strokeWidth={1.7} />
              {label}
            </button>
          ))}
        </nav>
        <div className="side-note">
          <p className="eyebrow">In Ann Arbor</p>
          <strong>178 people are trying something new this week.</strong>
        </div>
        <button className="profile-chip" onClick={() => go(hostMode ? "host" : "profile")}>
          <span>MR</span>
          <div>
            <strong>Mara Reed</strong>
            <small>{hostMode ? "Host mode" : "Beginner since 2025"}</small>
          </div>
          <ArrowRight size={16} />
        </button>
      </aside>

      <div className="main-wrap">
        <header className="mobile-header">
          <Logo />
          <button
            className="icon-button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          {menuOpen && (
            <div className="mobile-menu">
              {nav.map(({ key, label }) => (
                <button key={key} onClick={() => go(key)}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </header>

        <main>
          {screen === "home" && (
            <DashboardScreen
              list={list}
              plans={plans}
              openPlan={openPlan}
              openInterest={openInterest}
              goList={() => go("list")}
              goExplore={() => go("explore")}
              goExperiences={() => go("experiences")}
            />
          )}
          {screen === "list" && (
            <ListScreen
              list={list}
              setList={setList}
              firsts={firsts}
              setFirsts={setFirsts}
              openInterest={openInterest}
              notify={notify}
            />
          )}
          {screen === "explore" && (
            <ExploreScreen
              list={list}
              setList={setList}
              openInterest={openInterest}
              notify={notify}
            />
          )}
          {screen === "interest" && (
            <InterestScreen
              name={selectedInterest}
              plans={plans.filter((p) => p.interest === selectedInterest)}
              intent={intent}
              setIntent={setIntent}
              openPlan={openPlan}
              propose={() => go("propose")}
              back={back}
              notify={notify}
            />
          )}
          {screen === "propose" && (
            <ProposeScreen interest={selectedInterest} onSubmit={addPlan} back={back} />
          )}
          {screen === "plan" && (
            <PlanScreen
              plan={plans.find((p) => p.id === selectedPlan)!}
              back={back}
              toggleJoin={() => {
                const current = plans.find((p) => p.id === selectedPlan)!;
                setPlans((all) =>
                  all.map((p) =>
                    p.id === selectedPlan
                      ? {
                          ...p,
                          joined: !p.joined,
                          participants: p.joined
                            ? p.participants.filter((x) => x !== "You")
                            : ["You", ...p.participants],
                        }
                      : p,
                  ),
                );
                notify(
                  current.joined
                    ? "You left the plan"
                    : current.price
                      ? "Spot booked — see you there"
                      : "You joined the plan",
                );
              }}
            />
          )}
          {screen === "experiences" && (
            <ExperiencesScreen plans={plans} openPlan={openPlan} goExplore={() => go("explore")} />
          )}
          {screen === "profile" && (
            <ProfileScreen
              hostMode={hostMode}
              setHostMode={setHostMode}
              goHost={() => go("host")}
              notify={notify}
            />
          )}
          {screen === "host" && (
            <HostScreen
              plans={plans}
              back={() => go("profile")}
              postWorkshop={(plan) => {
                const next = {
                  ...plan,
                  id: Date.now(),
                  joined: false,
                  participants: [],
                  host: "Yourist Studio Gallery",
                } as Plan;
                setPlans((p) => [...p, next]);
                notify("Workshop published to 34 local beginners");
              }}
            />
          )}
        </main>
      </div>

      <nav className="bottom-nav">
        {nav.map(({ key, label, icon: Icon }) => (
          <button key={key} className={activeNav === key ? "active" : ""} onClick={() => go(key)}>
            <Icon size={21} strokeWidth={1.7} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast">
          <Check size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}

function Logo() {
  return (
    <div className="logo">
      <span>NOVICE</span>
      <small>Be new together.</small>
    </div>
  );
}

function Onboarding({ onComplete }: { onComplete: (picks: string[]) => void }) {
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState(["Wheel pottery", "Urban foraging"]);
  const choices = [
    "Wheel pottery",
    "Urban foraging",
    "Partner dancing",
    "Kayaking",
    "Sourdough baking",
    "Bouldering",
  ];
  const toggle = (name: string) =>
    setPicks((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );

  return (
    <div className="onboarding">
      <header>
        <Logo />
        <button onClick={() => onComplete(picks)}>Skip for now</button>
      </header>
      <div className="onboarding-progress">
        {[0, 1, 2].map((item) => (
          <span key={item} className={step >= item ? "active" : ""} />
        ))}
      </div>
      {step === 0 && (
        <section className="welcome-step">
          <div className="welcome-copy">
            <p className="eyebrow">Welcome to NOVICE</p>
            <h1>Be new at something, together.</h1>
            <p>
              Save things you want to try, meet nearby beginners who want the same thing, and turn
              “someday” into an actual plan.
            </p>
            <Button onClick={() => setStep(1)}>
              Show me how <ArrowRight size={18} />
            </Button>
          </div>
          <div className="welcome-photo">
            <img
              src={photoFor("Kayaking")}
              alt="A group of beginners carrying kayaks by the water"
            />
            <div>
              <Users size={18} />
              <span>
                <strong>36 nearby beginners</strong> are curious about kayaking
              </span>
            </div>
          </div>
        </section>
      )}
      {step === 1 && (
        <section className="pick-step">
          <div className="onboarding-title">
            <p className="eyebrow">Start with curiosity</p>
            <h1>What sounds fun?</h1>
            <p>Pick at least two. This isn’t a commitment—you’re just keeping ideas close.</p>
          </div>
          <div className="onboarding-picks">
            {choices.map((name) => (
              <button
                key={name}
                className={picks.includes(name) ? "selected" : ""}
                onClick={() => toggle(name)}
              >
                <img src={photoFor(name)} alt={`People trying ${name.toLowerCase()}`} />
                <span>{name}</span>
                <i>{picks.includes(name) ? <Check size={17} /> : <Plus size={17} />}</i>
              </button>
            ))}
          </div>
          <div className="onboarding-actions">
            <button onClick={() => setStep(0)}>
              <ArrowLeft size={17} /> Back
            </button>
            <Button onClick={() => setStep(2)} disabled={picks.length < 2}>
              Continue with {picks.length} picks
            </Button>
          </div>
        </section>
      )}
      {step === 2 && (
        <section className="ready-step">
          <div className="ready-collage">
            {picks.slice(0, 3).map((name) => (
              <img key={name} src={photoFor(name)} alt={name} />
            ))}
          </div>
          <div>
            <p className="eyebrow">You’re all set in Ann Arbor</p>
            <h1>Your first next step is waiting.</h1>
            <p>
              We found local people exploring your picks. Your home will show what’s gaining
              momentum and plans you can join.
            </p>
            <div className="ready-stat">
              <strong>{picks.length}</strong>
              <span>
                things on your
                <br />
                Never-Done List
              </span>
            </div>
            <Button onClick={() => onComplete(picks)}>
              Go to my home <ArrowRight size={18} />
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function DashboardScreen({
  list,
  plans,
  openPlan,
  openInterest,
  goList,
  goExplore,
  goExperiences,
}: {
  list: string[];
  plans: Plan[];
  openPlan: (id: number) => void;
  openInterest: (name: string) => void;
  goList: () => void;
  goExplore: () => void;
  goExperiences: () => void;
}) {
  const upcoming = plans.find((plan) => plan.joined);
  const momentum = list
    .map((name) => interestSeeds.find((item) => item[0] === name))
    .filter(Boolean)
    .sort((a, b) => Number(b?.[4] || 0) - Number(a?.[4] || 0))
    .slice(0, 3);

  return (
    <div className="page dashboard">
      <div className="dashboard-greeting">
        <div>
          <p className="eyebrow">Tuesday in Ann Arbor</p>
          <h1>What will you try next, Mara?</h1>
        </div>
        <button className="quick-add" onClick={goExplore}>
          <Plus size={19} /> Add something new
        </button>
      </div>
      <section className="home-feature">
        <img
          src={photoFor(upcoming?.interest || "Wheel pottery")}
          alt="People trying pottery together"
        />
        <div className="home-feature-copy">
          <Badge tone="rust">Your next first</Badge>
          {upcoming ? (
            <>
              <h2>{upcoming.title}</h2>
              <p>
                <CalendarDays size={16} /> {formatDate(upcoming.date)} at{" "}
                {formatTime(upcoming.time)}
              </p>
              <p>
                <MapPin size={16} /> {upcoming.location}
              </p>
              <Button onClick={() => openPlan(upcoming.id)}>
                See plan details <ArrowRight size={17} />
              </Button>
              <button className="view-experiences" onClick={goExperiences}>
                View all experiences
              </button>
            </>
          ) : (
            <>
              <h2>Your calendar is open.</h2>
              <p>Find a beginner-friendly plan nearby and make your first “yes.”</p>
              <Button onClick={goExplore}>
                Find a plan <ArrowRight size={17} />
              </Button>
            </>
          )}
        </div>
      </section>
      <section className="home-section">
        <div className="home-section-title">
          <div>
            <p className="eyebrow">Your interests</p>
            <h2>People are ready when you are.</h2>
          </div>
          <button onClick={goList}>
            See your full list <ArrowRight size={16} />
          </button>
        </div>
        <div className="momentum-grid">
          {momentum.map(
            (item) =>
              item && (
                <button key={item[0]} onClick={() => openInterest(item[0])}>
                  <img src={photoFor(item[0])} alt={`People trying ${item[0].toLowerCase()}`} />
                  <div>
                    <h3>{item[0]}</h3>
                    <span>
                      <strong>{item[4]}</strong> people ready to make a plan
                    </span>
                  </div>
                  <ArrowRight size={18} />
                </button>
              ),
          )}
        </div>
      </section>
      <section className="home-how">
        <div>
          <span>1</span>
          <strong>Save an idea</strong>
          <p>Add anything you’d like to try someday.</p>
        </div>
        <div>
          <span>2</span>
          <strong>Show your interest</strong>
          <p>Tell people if you’re browsing or ready now.</p>
        </div>
        <div>
          <span>3</span>
          <strong>Join a first</strong>
          <p>Pick a friendly plan and try it together.</p>
        </div>
      </section>
    </div>
  );
}

function ListScreen({
  list,
  setList,
  firsts,
  setFirsts,
  openInterest,
  notify,
}: {
  list: string[];
  setList: React.Dispatch<React.SetStateAction<string[]>>;
  firsts: string[];
  setFirsts: React.Dispatch<React.SetStateAction<string[]>>;
  openInterest: (x: string) => void;
  notify: (x: string) => void;
}) {
  const [newItem, setNewItem] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [tab, setTab] = useState<"list" | "firsts">("list");
  const suggestions = ["Watercolor painting", "Birding", "Improv comedy", "Pasta from scratch"];

  const add = (item: string) => {
    const clean = item.trim();
    if (!clean || list.includes(clean)) return;
    setList((x) => [...x, clean]);
    setNewItem("");
    notify(`Added “${clean}”`);
  };
  return (
    <div className="page">
      <div className="page-heading split">
        <div>
          <p className="eyebrow">Your curiosity, kept close</p>
          <h1>Never-Done List</h1>
          <p className="lede">
            Name the things you’ve been meaning to try. You don’t need to be ready yet.
          </p>
        </div>
        <div className="list-visual">
          <img
            src={photoFor(list[0] || "Wheel pottery")}
            alt={list.length ? `People trying ${list[0].toLowerCase()}` : "People trying pottery"}
          />
          <div className="list-count">
            <strong>{list.length}</strong>
            <span>
              things waiting
              <br />
              for a first time
            </span>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === "list" ? "active" : ""} onClick={() => setTab("list")}>
          Never done <span>{list.length}</span>
        </button>
        <button className={tab === "firsts" ? "active" : ""} onClick={() => setTab("firsts")}>
          Firsts <span>{firsts.length}</span>
        </button>
      </div>

      {tab === "list" ? (
        <>
          <div className="add-row">
            <Plus size={20} />
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add(newItem)}
              placeholder="Something you've never done…"
            />
            <Button onClick={() => add(newItem)} disabled={!newItem.trim()}>
              Add to list
            </Button>
          </div>
          <section className="list-section">
            <div className="section-line">
              <p className="eyebrow">Your list</p>
              <span>Tap the circle when you’ve done it</span>
            </div>
            {list.length === 0 ? (
              <Empty
                title="Your list has room to wander."
                text="Add an idea above, or borrow one from this week’s suggestions."
              />
            ) : (
              <div className="never-list">
                {list.map((item, i) => (
                  <div className="never-item" key={item}>
                    <button
                      className="complete"
                      aria-label={`Mark ${item} complete`}
                      onClick={() => {
                        setList((x) => x.filter((_, j) => j !== i));
                        setFirsts((x) => [item, ...x]);
                        notify("Moved to Firsts");
                      }}
                    >
                      <Check size={17} />
                    </button>
                    <img
                      className="list-item-photo"
                      src={photoFor(item)}
                      alt=""
                      aria-hidden="true"
                    />
                    {editing === i ? (
                      <input
                        className="inline-edit"
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editText.trim()) {
                            setList((x) => x.map((v, j) => (j === i ? editText.trim() : v)));
                            setEditing(null);
                          }
                        }}
                      />
                    ) : (
                      <button className="item-name" onClick={() => openInterest(item)}>
                        {item}
                        <small>
                          See who else is curious <ArrowRight size={14} />
                        </small>
                      </button>
                    )}
                    <button
                      className="row-icon"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(i);
                        setEditText(item);
                      }}
                    >
                      <Edit3 size={17} />
                    </button>
                    <button
                      className="row-icon"
                      aria-label="Delete"
                      onClick={() => {
                        setList((x) => x.filter((_, j) => j !== i));
                        notify("Item removed");
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="suggestions">
            <p className="eyebrow">A few sparks for this week</p>
            <div className="suggestion-grid">
              {suggestions.map((s, i) => (
                <button key={s} onClick={() => add(s)}>
                  <img src={photoFor(s)} alt="" aria-hidden="true" />
                  <span>0{i + 1}</span>
                  <strong>{s}</strong>
                  <Plus size={18} />
                </button>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="firsts">
          {firsts.map((x, i) => (
            <div key={x}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <Check size={19} />
              <div>
                <strong>{x}</strong>
                <small>A first worth remembering</small>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function ExploreScreen({
  list,
  setList,
  openInterest,
  notify,
}: {
  list: string[];
  setList: React.Dispatch<React.SetStateAction<string[]>>;
  openInterest: (x: string) => void;
  notify: (x: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = ["All", "Make", "Move", "Outdoors", "Cook", "Grow", "Perform"];
  const results = interestSeeds.filter(
    (x) =>
      (category === "All" || x[1] === category) && x[0].toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="page">
      <div className="page-heading">
        <p className="eyebrow">Ann Arbor, Michigan</p>
        <h1>Find your fellow beginners.</h1>
        <p className="lede">
          Curiosity is easier to act on when you’re not the only new person in the room.
        </p>
      </div>
      <div className="search-bar">
        <Search size={20} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search things to try"
        />
        <SlidersHorizontal size={18} />
      </div>
      <div className="filter-row">
        {categories.map((c) => (
          <button key={c} className={category === c ? "active" : ""} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="result-meta">
        <strong>{results.length} things to try nearby</strong>
        <span>Updated from local interest this week</span>
      </div>
      {results.length ? (
        <div className="interest-grid">
          {results.map(([name, cat, curious, join, ready], i) => (
            <article className="interest-card" key={name}>
              <button className="card-main" onClick={() => openInterest(name)}>
                <img
                  className="interest-photo"
                  src={photoFor(name)}
                  alt={`People trying ${name.toLowerCase()}`}
                />
                <div className="card-number">{String(i + 1).padStart(2, "0")}</div>
                <Badge>{cat}</Badge>
                <h3>{name}</h3>
                <p>
                  {ready >= 10 ? "Momentum is building nearby." : "A small group is taking shape."}
                </p>
                <div className="intent-counts">
                  <span>
                    <b>{curious}</b> Curious
                  </span>
                  <span>
                    <b>{join}</b> Want to join
                  </span>
                  <span>
                    <b>{ready}</b> Ready
                  </span>
                </div>
              </button>
              <button
                className={`save-button ${list.includes(name) ? "saved" : ""}`}
                aria-label="Save to list"
                onClick={() => {
                  if (list.includes(name)) setList((x) => x.filter((v) => v !== name));
                  else setList((x) => [...x, name]);
                  notify(
                    list.includes(name)
                      ? "Removed from your list"
                      : "Added to your Never-Done List",
                  );
                }}
              >
                <Heart size={18} fill={list.includes(name) ? "currentColor" : "none"} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="No exact matches yet."
          text="Try another word or clear the category filter to see more local interests."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setCategory("All");
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}
    </div>
  );
}

function InterestScreen({
  name,
  plans,
  intent,
  setIntent,
  openPlan,
  propose,
  back,
  notify,
}: {
  name: string;
  plans: Plan[];
  intent: Intent;
  setIntent: (x: Intent) => void;
  openPlan: (x: number) => void;
  propose: () => void;
  back: () => void;
  notify: (x: string) => void;
}) {
  const seed = interestSeeds.find((x) => x[0] === name) || [name, "Local", 12, 8, 4];
  return (
    <div className="page">
      <Back onClick={back} label="Explore" />
      <div className="interest-hero">
        <div>
          <Badge>{seed[1]}</Badge>
          <h1>{name}</h1>
          <p className="lede">
            Nobody here has to know what they’re doing yet. Pick where you are, and we’ll help you
            find the next step.
          </p>
        </div>
        <img src={photoFor(name)} alt={`Beginners trying ${name.toLowerCase()} together`} />
      </div>
      <section className="intent-panel">
        <div>
          <p className="eyebrow">Where are you right now?</p>
          <span>You can change this anytime.</span>
        </div>
        <div className="intent-options">
          {[
            ["Curious", "I’m exploring the idea", seed[2]],
            ["Want to Join", "Invite me if there’s a plan", seed[3]],
            ["Ready", "I want to pick a time and place", seed[4]],
          ].map(([level, desc, count]) => (
            <button
              key={level}
              className={intent === level ? "selected" : ""}
              onClick={() => {
                setIntent(level as Intent);
                notify(`You’re now ${level.toString().toLowerCase()}`);
              }}
            >
              <span className="radio">{intent === level && <span />}</span>
              <strong>{level}</strong>
              <small>{desc}</small>
              <b>{count} nearby</b>
            </button>
          ))}
        </div>
      </section>
      <div className="section-title">
        <div>
          <p className="eyebrow">Plans taking shape</p>
          <h2>Start with other first-timers.</h2>
        </div>
        <Button onClick={propose}>
          <Plus size={17} /> Propose a plan
        </Button>
      </div>
      {plans.length ? (
        <div className="plan-grid">
          {plans.map((p) => (
            <PlanCard plan={p} key={p.id} onClick={() => openPlan(p.id)} />
          ))}
        </div>
      ) : (
        <Empty
          title="No one has made the first move yet."
          text={`There are ${seed[4]} people ready to try ${name.toLowerCase()}. Propose something simple and see who joins.`}
          action={<Button onClick={propose}>Propose the first plan</Button>}
        />
      )}
    </div>
  );
}

function ProposeScreen({
  interest,
  onSubmit,
  back,
}: {
  interest: string;
  onSubmit: (x: Omit<Plan, "id" | "joined" | "participants" | "host">) => void;
  back: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
    size: "6",
    type: "Community" as Plan["type"],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const update = (key: string, value: string) => setForm((x) => ({ ...x, [key]: value }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.title.trim().length < 4) next.title = "Give your plan a little more detail.";
    if (!form.date) next.date = "Choose a date.";
    else if (new Date(form.date) < new Date(new Date().toDateString()))
      next.date = "Choose a future date.";
    if (!form.time) next.time = "Choose a time.";
    if (!form.location.trim()) next.location = "Add a meeting place.";
    if (+form.size < 2 || +form.size > 30) next.size = "Group size must be between 2 and 30.";
    setErrors(next);
    if (!Object.keys(next).length) onSubmit({ ...form, interest, size: +form.size });
  };
  return (
    <div className="page narrow">
      <Back onClick={back} label={interest} />
      <div className="page-heading">
        <p className="eyebrow">Make the first move</p>
        <h1>Propose a plan</h1>
        <p className="lede">
          Keep it simple. A clear time and place is often all a curious group needs.
        </p>
      </div>
      <form className="plan-form" onSubmit={submit} noValidate>
        <Field label="Plan title" error={errors.title}>
          <input
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder={`First time trying ${interest.toLowerCase()}`}
          />
        </Field>
        <div className="form-two">
          <Field label="Date" error={errors.date}>
            <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
          </Field>
          <Field label="Time" error={errors.time}>
            <input type="time" value={form.time} onChange={(e) => update("time", e.target.value)} />
          </Field>
        </div>
        <Field label="Location" error={errors.location}>
          <div className="input-icon">
            <MapPin size={17} />
            <input
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="e.g. Nichols Arboretum, Ann Arbor"
            />
          </div>
        </Field>
        <div className="form-two">
          <Field label="Group size" error={errors.size}>
            <input
              type="number"
              min="2"
              max="30"
              value={form.size}
              onChange={(e) => update("size", e.target.value)}
            />
          </Field>
          <Field label="Plan type">
            <div className="select-wrap">
              <select value={form.type} onChange={(e) => update("type", e.target.value)}>
                <option>Spontaneous</option>
                <option>Community</option>
                <option>Hosted</option>
              </select>
              <ChevronDown size={17} />
            </div>
          </Field>
        </div>
        {Object.keys(errors).length > 0 && (
          <div className="form-error">
            A few details need your attention before this can go live.
          </div>
        )}
        <div className="form-actions">
          <Button variant="text" onClick={back}>
            Cancel
          </Button>
          <Button type="submit">
            Publish plan <ArrowRight size={17} />
          </Button>
        </div>
      </form>
    </div>
  );
}

function PlanScreen({
  plan,
  back,
  toggleJoin,
}: {
  plan: Plan;
  back: () => void;
  toggleJoin: () => void;
}) {
  const spots = plan.size - plan.participants.length;
  return (
    <div className="page">
      <Back onClick={back} label={plan.interest} />
      <img
        className="plan-cover"
        src={photoFor(plan.interest)}
        alt={`People enjoying ${plan.interest.toLowerCase()}`}
      />
      <div className="plan-detail">
        <section>
          <div className="plan-label">
            <Badge tone={plan.type === "Hosted" ? "rust" : "sage"}>
              {plan.type === "Hosted" ? (
                <>
                  <Store size={13} /> Professionally hosted
                </>
              ) : (
                <>
                  <Users size={13} /> Peer-organized
                </>
              )}
            </Badge>
          </div>
          <p className="plan-type-help">
            {plan.type === "Hosted"
              ? "A local business leads this experience and provides instruction."
              : "A local beginner made this plan. Everyone learns alongside each other."}
          </p>
          <h1>{plan.title}</h1>
          <p className="lede">A relaxed first go, made for people who are learning from zero.</p>
          <div className="detail-list">
            <div>
              <CalendarDays />
              <span>
                <small>Date</small>
                <strong>{formatDate(plan.date)}</strong>
              </span>
            </div>
            <div>
              <Clock3 />
              <span>
                <small>Time</small>
                <strong>{formatTime(plan.time)}</strong>
              </span>
            </div>
            <div>
              <MapPin />
              <span>
                <small>Meet at</small>
                <strong>{plan.location}</strong>
              </span>
            </div>
            <div>
              <Users />
              <span>
                <small>Group</small>
                <strong>
                  {plan.participants.length} joined · {spots} spots left
                </strong>
              </span>
            </div>
          </div>
          <div className="organizer">
            <span>
              {plan.host
                .split(" ")
                .map((x) => x[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <small>{plan.type === "Hosted" ? "Hosted by" : "Organized by"}</small>
              <strong>{plan.host}</strong>
            </div>
          </div>
          <div className="participants">
            <p className="eyebrow">Who’s in</p>
            <div>
              {plan.participants.length ? (
                plan.participants.map((p, i) => (
                  <span key={p} style={{ zIndex: 10 - i }}>
                    {p.slice(0, 1)}
                  </span>
                ))
              ) : (
                <p>Be the first to join.</p>
              )}
            </div>
            {plan.participants.length > 0 && (
              <small>
                {plan.participants.slice(0, 3).join(", ")}
                {plan.participants.length > 3 && ` and ${plan.participants.length - 3} more`}
              </small>
            )}
          </div>
        </section>
        <aside className="booking-card">
          {plan.price ? (
            <div className="price">
              <strong>${plan.price}</strong>
              <span>per person · materials included</span>
            </div>
          ) : (
            <div className="price">
              <strong>Free</strong>
              <span>Bring your curiosity</span>
            </div>
          )}
          <div className="booking-note">
            <Sparkles size={18} />
            <p>
              <strong>Beginners belong here.</strong>
              <br />
              No experience or equipment needed.
            </p>
          </div>
          <Button onClick={toggleJoin} variant={plan.joined ? "secondary" : "primary"}>
            {plan.joined ? (
              <>
                <Minus size={17} /> Leave this plan
              </>
            ) : plan.price ? (
              <>
                <WalletCards size={17} /> Book a spot
              </>
            ) : (
              <>
                <Plus size={17} /> Join this plan
              </>
            )}
          </Button>
          <small>
            {plan.joined
              ? "You’re on the list. We’ll remind you the day before."
              : `${spots} of ${plan.size} spots still open`}
          </small>
        </aside>
      </div>
    </div>
  );
}

function ExperiencesScreen({
  plans,
  openPlan,
  goExplore,
}: {
  plans: Plan[];
  openPlan: (x: number) => void;
  goExplore: () => void;
}) {
  const [tab, setTab] = useState<"upcoming" | "completed">("upcoming");
  const upcoming = plans.filter((p) => p.joined);
  const completed = [
    { title: "First sourdough bake", date: "Mar 8", location: "Bakers Nook, Saline" },
  ];
  return (
    <div className="page">
      <div className="page-heading">
        <p className="eyebrow">Your calendar of firsts</p>
        <h1>My Experiences</h1>
        <p className="lede">Plans you’ve joined and the small beginnings you’ve already made.</p>
      </div>
      <div className="tabs">
        <button className={tab === "upcoming" ? "active" : ""} onClick={() => setTab("upcoming")}>
          Upcoming <span>{upcoming.length}</span>
        </button>
        <button className={tab === "completed" ? "active" : ""} onClick={() => setTab("completed")}>
          Completed <span>{completed.length}</span>
        </button>
      </div>
      {tab === "upcoming" ? (
        upcoming.length ? (
          <div className="experience-list">
            {upcoming.map((p) => (
              <button key={p.id} onClick={() => openPlan(p.id)}>
                <img className="experience-photo" src={photoFor(p.interest)} alt={p.interest} />
                <div>
                  <Badge>{p.type}</Badge>
                  <h3>{p.title}</h3>
                  <p>
                    <MapPin size={15} /> {p.location}
                  </p>
                </div>
                <ArrowRight size={20} />
              </button>
            ))}
          </div>
        ) : (
          <Empty
            title="Nothing on the calendar yet."
            text="Explore what’s gathering momentum nearby, then join when something feels right."
            action={<Button onClick={goExplore}>Find a beginner-friendly plan</Button>}
          />
        )
      ) : (
        <div className="experience-list">
          {completed.map((p) => (
            <div className="completed-card" key={p.title}>
              <Check size={19} />
              <div>
                <Badge tone="ink">Completed</Badge>
                <h3>{p.title}</h3>
                <p>
                  {p.date} · {p.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileScreen({
  hostMode,
  setHostMode,
  goHost,
  notify,
}: {
  hostMode: boolean;
  setHostMode: (x: boolean) => void;
  goHost: () => void;
  notify: (x: string) => void;
}) {
  return (
    <div className="page narrow">
      <div className="page-heading">
        <p className="eyebrow">Your corner of NOVICE</p>
        <h1>Mara Reed</h1>
        <p className="lede">Ann Arbor, Michigan · 5 firsts since joining</p>
      </div>
      <div className="profile-card">
        <div className="avatar">MR</div>
        <div>
          <strong>Mara Reed</strong>
          <span>mara@example.com</span>
        </div>
        <button onClick={() => notify("Profile details saved")}>Edit profile</button>
      </div>
      <section className="settings">
        <div className="setting-row">
          <div>
            <Store size={21} />
            <span>
              <strong>Switch to host mode</strong>
              <small>See local demand and offer beginner-friendly experiences.</small>
            </span>
          </div>
          <button
            className={`switch ${hostMode ? "on" : ""}`}
            aria-label="Toggle host mode"
            onClick={() => {
              setHostMode(!hostMode);
              notify(!hostMode ? "Host mode is on" : "Back to member mode");
            }}
          >
            <span />
          </button>
        </div>
        {hostMode && (
          <div className="host-callout">
            <div>
              <p className="eyebrow">Host profile active</p>
              <h3>Yourist Studio Gallery</h3>
              <p>See demand for local experiences, publish workshops, and track bookings.</p>
            </div>
            <Button onClick={goHost}>
              Open host dashboard <ArrowRight size={17} />
            </Button>
          </div>
        )}
        <button className="setting-link" onClick={() => notify("Notification preferences opened")}>
          Notification preferences <ArrowRight size={17} />
        </button>
        <button className="setting-link" onClick={() => notify("Location is set to Ann Arbor, MI")}>
          Location & distance <ArrowRight size={17} />
        </button>
      </section>
    </div>
  );
}

function HostScreen({
  plans,
  back,
  postWorkshop,
}: {
  plans: Plan[];
  back: () => void;
  postWorkshop: (x: Omit<Plan, "id" | "joined" | "participants" | "host">) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [posted, setPosted] = useState(false);
  const hostPlans = plans.filter((p) => p.host === "Yourist Studio Gallery");
  const bookings = hostPlans.reduce((sum, p) => sum + p.participants.length, 0);
  const gross = hostPlans.reduce((sum, p) => sum + p.participants.length * (p.price || 0), 0);
  const publish = () => {
    postWorkshop({
      interest: "Wheel pottery",
      title: "Beginner wheel workshop",
      date: "2026-06-14",
      time: "13:00",
      location: "Yourist Studio Gallery",
      size: 8,
      type: "Hosted",
      price: 50,
    });
    setShowForm(false);
    setPosted(true);
  };
  return (
    <div className="page">
      <Back onClick={back} label="Member profile" />
      <div className="host-heading">
        <div>
          <p className="eyebrow">Yourist Studio Gallery · Host dashboard</p>
          <h1>
            Local curiosity,
            <br />
            ready to welcome.
          </h1>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={17} /> Post a workshop
        </Button>
      </div>
      {posted && (
        <div className="success-banner">
          <Check size={20} />
          <div>
            <strong>Workshop published.</strong>
            <span>34 people interested in pottery have been notified.</span>
          </div>
          <button onClick={() => setPosted(false)}>
            <X size={18} />
          </button>
        </div>
      )}
      <div className="demand-layout">
        <section className="demand-card">
          <div className="section-line">
            <div>
              <p className="eyebrow">Live demand</p>
              <h2>Wheel pottery</h2>
            </div>
            <Badge>Within 10 miles</Badge>
          </div>
          <div className="demand-bars">
            <div>
              <span>
                <b>24</b> Curious
              </span>
              <i>
                <b style={{ width: "100%" }} />
              </i>
            </div>
            <div>
              <span>
                <b>18</b> Want to join
              </span>
              <i>
                <b style={{ width: "75%" }} />
              </i>
            </div>
            <div>
              <span>
                <b>10</b> Ready to make plans
              </span>
              <i>
                <b style={{ width: "42%" }} />
              </i>
            </div>
          </div>
          <p className="host-insight">
            Ten nearby beginners are ready now. An 8-person workshop is likely to fill.
          </p>
        </section>
        <aside className="host-summary">
          <p className="eyebrow">Workshop earnings</p>
          <div>
            <strong>${gross || 200}</strong>
            <span>gross bookings</span>
          </div>
          <dl>
            <dt>{bookings || 4} booked spots</dt>
            <dd>${gross || 200}</dd>
            <dt>NOVICE commission (12%)</dt>
            <dd>−${Math.round((gross || 200) * 0.12)}</dd>
            <dt>Your payout</dt>
            <dd>${Math.round((gross || 200) * 0.88)}</dd>
          </dl>
        </aside>
      </div>
      <div className="section-title">
        <div>
          <p className="eyebrow">Your workshops</p>
          <h2>Bookings at a glance</h2>
        </div>
      </div>
      <div className="host-workshops">
        {hostPlans.map((p) => (
          <article key={p.id}>
            <img src={photoFor(p.interest)} alt={`Workshop for ${p.interest.toLowerCase()}`} />
            <div>
              <Badge tone="rust">Professionally hosted</Badge>
              <h3>{p.title}</h3>
              <p>
                {formatDate(p.date)} · {formatTime(p.time)} · ${p.price}
              </p>
            </div>
            <div className="fill-stat">
              <strong>
                {p.participants.length}/{p.size}
              </strong>
              <span>spots booked</span>
            </div>
            <div className="mini-progress">
              <span style={{ width: `${(p.participants.length / p.size) * 100}%` }} />
            </div>
          </article>
        ))}
      </div>
      {showForm && (
        <div
          className="modal-wrap"
          onMouseDown={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <div className="modal">
            <button className="modal-close" onClick={() => setShowForm(false)}>
              <X size={19} />
            </button>
            <p className="eyebrow">Respond to local demand</p>
            <h2>Post a pottery workshop</h2>
            <p>
              We’ve prefilled a workshop around the strongest local signal. You can adjust details
              after publishing.
            </p>
            <div className="workshop-preview">
              <div>
                <CalendarDays />
                <span>
                  <small>Date & time</small>
                  <strong>Sun, Jun 14 · 1:00 PM</strong>
                </span>
              </div>
              <div>
                <Users />
                <span>
                  <small>Capacity</small>
                  <strong>8 beginners</strong>
                </span>
              </div>
              <div>
                <WalletCards />
                <span>
                  <small>Price</small>
                  <strong>$50 per person</strong>
                </span>
              </div>
            </div>
            <div className="math-line">
              <span>Potential gross</span>
              <strong>8 × $50 = $400</strong>
            </div>
            <div className="math-line">
              <span>NOVICE commission</span>
              <strong>12% · $48</strong>
            </div>
            <Button onClick={publish}>Publish and notify 34 people</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan, onClick }: { plan: Plan; onClick: () => void }) {
  return (
    <button className="plan-card" onClick={onClick}>
      <img
        className="plan-card-photo"
        src={photoFor(plan.interest)}
        alt={`People trying ${plan.interest.toLowerCase()}`}
      />
      <div>
        <Badge tone={plan.type === "Hosted" ? "rust" : "sage"}>
          {plan.type === "Hosted" ? "Hosted · instructor-led" : "Peer plan · learn together"}
        </Badge>
        {plan.price && <strong className="card-price">${plan.price}</strong>}
      </div>
      <h3>{plan.title}</h3>
      <p>
        <CalendarDays size={16} /> {formatDate(plan.date)} · {formatTime(plan.time)}
      </p>
      <p>
        <MapPin size={16} /> {plan.location}
      </p>
      <footer>
        <span>
          {plan.participants.length}/{plan.size} joined
        </span>
        <ArrowRight size={18} />
      </footer>
    </button>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={error ? "field error" : "field"}>
      <span>{label}</span>
      {children}
      {error && <small>{error}</small>}
    </label>
  );
}

function Empty({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <Sparkles size={25} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

function Back({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button className="back" onClick={onClick}>
      <ArrowLeft size={17} /> {label}
    </button>
  );
}
