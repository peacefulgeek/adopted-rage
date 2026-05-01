import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Home as HomeIcon, Search as SearchIcon, Bookmark, Info, Menu, X } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [path] = useLocation();
  const [openMenu, setOpenMenu] = useState(false);
  // Close menu on route change
  useEffect(() => { setOpenMenu(false); }, [path]);

  // Scroll to top on navigation
  useEffect(() => { if (typeof window !== "undefined") window.scrollTo(0, 0); }, [path]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header openMenu={openMenu} setOpenMenu={setOpenMenu} />
      <main className="flex-1 pb-24 md:pb-0">{children}</main>
      <Footer />
      <BottomTabBar path={path} />
    </div>
  );
}

function Header({ openMenu, setOpenMenu }: { openMenu: boolean; setOpenMenu: (v: boolean) => void }) {
  const nav = [
    { href: "/", label: "Home" },
    { href: "/category/primal-wound", label: "Primal Wound" },
    { href: "/category/identity-and-search", label: "Identity & Search" },
    { href: "/category/reunion-and-re-wounding", label: "Reunion" },
    { href: "/assessments", label: "Assessments" },
    { href: "/remedies", label: "Remedies" },
    { href: "/toolkit", label: "Toolkit" },
    { href: "/library", label: "Library" },
    { href: "/about", label: "About" },
  ];
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[oklch(0.96_0.013_70/_0.85)] border-b border-border">
      <div className="container flex items-center justify-between py-3 md:py-4">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="inline-block w-9 h-9 rounded-full bg-gradient-to-br from-[var(--cream)] to-[var(--clay-soft)] ring-1 ring-border" />
          <span className="font-display text-lg md:text-xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Adopted Rage
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="text-muted-foreground hover:text-foreground transition-colors">
              {n.label}
            </Link>
          ))}
        </nav>
        <button
          aria-label={openMenu ? "Close menu" : "Open menu"}
          className="md:hidden p-2 rounded-lg hover:bg-muted transition"
          onClick={() => setOpenMenu(!openMenu)}
        >
          {openMenu ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {openMenu && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur">
          <div className="container py-3 flex flex-col gap-1">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="py-2 px-2 rounded-lg hover:bg-muted text-foreground"
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-[var(--paper)] mt-12">
      <div className="container py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2">
          <div className="font-display text-xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Adopted Rage
          </div>
          <p className="text-muted-foreground max-w-md">
            Adoption gave you a family. It also took something from you. We name the wound, the rage, and the long, quiet work of healing, with practical assessments, herbs, somatic tools, and writing for the adoptee experience.
          </p>
        </div>
        <div>
          <div className="font-medium mb-2">Read</div>
          <ul className="space-y-1 text-muted-foreground">
            <li><Link href="/" className="hover:text-foreground">Latest</Link></li>
            <li><Link href="/category/primal-wound" className="hover:text-foreground">Primal Wound</Link></li>
            <li><Link href="/category/identity-and-search" className="hover:text-foreground">Identity & Search</Link></li>
            <li><Link href="/library" className="hover:text-foreground">Adoptee Library</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-2">About</div>
          <ul className="space-y-1 text-muted-foreground">
            <li><Link href="/about" className="hover:text-foreground">About</Link></li>
            <li><Link href="/author/the-oracle-lover" className="hover:text-foreground">The Oracle Lover</Link></li>
            <li><Link href="/disclosures" className="hover:text-foreground">Disclosures</Link></li>
            <li><Link href="/privacy" className="hover:text-foreground">Privacy</Link></li>
            <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
          </ul>
        </div>
      </div>
      <div className="container pb-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Adopted Rage · Words by{" "}
        <a className="underline hover:text-foreground" href="https://theoraclelover.com" target="_blank" rel="noopener">
          The Oracle Lover
        </a>
      </div>
    </footer>
  );
}

function BottomTabBar({ path }: { path: string }) {
  const tabs = [
    { href: "/", label: "Home", icon: HomeIcon },
    { href: "/assessments", label: "Assess", icon: SearchIcon },
    { href: "/remedies", label: "Remedies", icon: Bookmark },
    { href: "/library", label: "Library", icon: Info },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-[oklch(0.96_0.013_70/_0.95)] backdrop-blur safe-area-pb">
      <div className="grid grid-cols-4">
        {tabs.map((t) => {
          const active = path === t.href || (t.href !== "/" && path.startsWith(t.href));
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] transition ${
                active ? "text-[var(--teal)]" : "text-muted-foreground"
              }`}
            >
              <Icon size={20} />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
