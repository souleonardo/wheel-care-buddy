import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { Car, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Login() {
  const { signIn, signUp, user, role: userRole } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole>("locador");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  useEffect(() => {
    if (user && userRole) {
      const homeMap: Record<AppRole, string> = {
        admin: "/",
        locador: "/revisoes",
        mecanico: "/oficina",
      };
      navigate(homeMap[userRole], { replace: true });
    }
  }, [user, userRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isSignUp) {
      if (!fullName.trim()) {
        setError("Informe o nome completo");
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName, role);
      if (error) setError(error);
      else setSignUpSuccess(true);
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    }
    setLoading(false);
  };

  if (signUpSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-card rounded-2xl border border-border/50 p-6 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
            <UserPlus className="h-7 w-7 text-primary-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Cadastro realizado!</h2>
          <p className="text-sm text-muted-foreground">
            Verifique seu e-mail para confirmar a conta antes de fazer login.
          </p>
          <button
            onClick={() => { setIsSignUp(false); setSignUpSuccess(false); }}
            className="w-full py-2.5 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm"
          >
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  const roles: { value: AppRole; label: string; desc: string }[] = [
    { value: "admin", label: "Administrador", desc: "Acesso total ao sistema" },
    { value: "locador", label: "Locador", desc: "Motorista que aluga veículos" },
    { value: "mecanico", label: "Mecânico", desc: "Oficina credenciada" },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto shadow-lg">
            <Car className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">X Locações</h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Crie sua conta" : "Acesse sua conta"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
          {isSignUp && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nome completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Seu nome"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isSignUp && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Perfil de acesso</label>
              <div className="space-y-2">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors",
                      role === r.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/50 bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className="font-medium">{r.label}</span>
                    <p className="text-[11px] opacity-70 mt-0.5">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-2.5 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.97] transition-transform"
          >
            {loading ? (
              <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                {isSignUp ? "Criar Conta" : "Entrar"}
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          {isSignUp ? "Já tem conta?" : "Não tem conta?"}{" "}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
            className="text-primary font-medium hover:underline"
          >
            {isSignUp ? "Faça login" : "Cadastre-se"}
          </button>
        </p>
      </div>
    </div>
  );
}
