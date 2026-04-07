import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Car, CreditCard, Wrench, LogOut, User, FileText, Users, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, AppRole } from "@/hooks/useAuth";

interface TabDef {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
  roles: AppRole[];
}

const allTabs: TabDef[] = [
  { label: "Painel", icon: LayoutDashboard, path: "/", roles: ["admin"] },
  { label: "Veículos", icon: Car, path: "/veiculos", roles: ["admin"] },
  { label: "Pagamentos", icon: CreditCard, path: "/pagamentos", roles: ["admin"] },
  { label: "Revisões", icon: Wrench, path: "/revisoes", roles: ["admin", "locador"] },
  { label: "Documentos", icon: FileText, path: "/documentos", roles: ["locador"] },
  { label: "Usuários", icon: Users, path: "/usuarios", roles: ["admin"] },
  { label: "Oficina", icon: Wrench, path: "/oficina", roles: ["admin", "mecanico"] },
  { label: "Estoque", icon: Package, path: "/suprimentos", roles: ["admin", "mecanico"] },
];

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
}

export function MobileLayout({ children, title }: MobileLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, fullName, signOut } = useAuth();

  const tabs = allTabs.filter((t) => role && t.roles.includes(role));

  const roleLabels: Record<AppRole, string> = {
    admin: "Administrador",
    locador: "Locador",
    mecanico: "Mecânico",
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">{title || "X Locações"}</h1>
            {role && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">
                  {fullName} · {roleLabels[role]}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={async () => { await signOut(); navigate("/login"); }}
            className="h-8 w-8 rounded-lg flex items-center justify-center bg-secondary hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 px-3 min-w-[64px] transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_hsl(35,92%,50%)]")} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
