import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Car, Wrench, LogOut, User, FileText,
  Users, Package, BarChart3, Receipt, MessageSquare, Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface TabDef {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
  roles: AppRole[];
}

const allTabs: TabDef[] = [
  { label: "Painel", icon: LayoutDashboard, path: "/", roles: ["admin"] },
  { label: "Veículos", icon: Car, path: "/veiculos", roles: ["admin"] },
  { label: "Revisões", icon: Wrench, path: "/revisoes", roles: ["admin", "locador"] },
  { label: "Documentos", icon: FileText, path: "/documentos", roles: ["locador"] },
  { label: "Faturas", icon: Receipt, path: "/faturas", roles: ["admin", "locador"] },
  { label: "Usuários", icon: Users, path: "/usuarios", roles: ["admin"] },
  { label: "Oficina", icon: Wrench, path: "/oficina", roles: ["admin", "mecanico"] },
  { label: "Estoque", icon: Package, path: "/suprimentos", roles: ["admin", "mecanico"] },
  { label: "Relatórios", icon: BarChart3, path: "/relatorios", roles: ["admin"] },
  { label: "Mensageria", icon: MessageSquare, path: "/mensageria", roles: ["admin"] },
];

const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  locador: "Locatário",
  mecanico: "Mecânico",
};

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

/* ───── Desktop Sidebar ───── */
function DesktopSidebar({ tabs }: { tabs: TabDef[] }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { role, fullName, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="flex flex-col h-full">
        {/* Logo */}
        <div className={cn("flex items-center gap-2 px-4 py-5 border-b border-sidebar-border", collapsed && "justify-center px-2")}>
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
            <Car className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && <span className="font-bold text-lg text-sidebar-foreground">X Locações</span>}
        </div>

        {/* Nav */}
        <SidebarGroup className="flex-1">
          <SidebarGroupLabel className={cn(collapsed && "sr-only")}>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tabs.map((tab) => (
                <SidebarMenuItem key={tab.path}>
                  <SidebarMenuButton asChild tooltip={tab.label}>
                    <NavLink
                      to={tab.path}
                      end={tab.path === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <tab.icon className="h-4 w-4 mr-2 flex-shrink-0" />
                      {!collapsed && <span>{tab.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User info + Logout */}
        <div className={cn("border-t border-sidebar-border p-3", collapsed && "px-2")}>
          {!collapsed && role && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <User className="h-4 w-4 text-sidebar-foreground/60 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{fullName}</p>
                <p className="text-[10px] text-sidebar-foreground/60">{roleLabels[role]}</p>
              </div>
            </div>
          )}
          <button
            onClick={async () => { await signOut(); navigate("/login"); }}
            className={cn(
              "w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm text-sidebar-foreground/70 hover:bg-destructive/15 hover:text-destructive transition-colors",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

/* ───── Mobile Bottom Nav ───── */
function MobileBottomNav({ tabs }: { tabs: TabDef[] }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 safe-area-bottom">
      <ScrollArea className="w-full">
        <div className="flex items-center min-w-max px-1">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 px-3 min-w-[60px] transition-colors flex-shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_hsl(35,92%,50%)]")} />
                <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-0" />
      </ScrollArea>
    </nav>
  );
}

/* ───── Mobile Header ───── */
function MobileHeader({ title }: { title?: string }) {
  const { role, fullName, signOut } = useAuth();
  const navigate = useNavigate();

  return (
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
  );
}

/* ───── Main Layout ───── */
export function AppLayout({ children, title }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const { role } = useAuth();
  const tabs = allTabs.filter((t) => role && t.roles.includes(role));

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <MobileHeader title={title} />
        <main className="flex-1 overflow-y-auto pb-20">{children}</main>
        <MobileBottomNav tabs={tabs} />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DesktopSidebar tabs={tabs} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border/50 px-4 bg-card/50 backdrop-blur-sm">
            <SidebarTrigger className="mr-3" />
            <h1 className="text-lg font-semibold text-foreground">{title || "X Locações"}</h1>
          </header>
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
