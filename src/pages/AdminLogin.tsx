import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Check if user has admin role
      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .limit(1);

      if (roleError || !roles?.length || roles[0].role !== "admin") {
        await supabase.auth.signOut();
        toast({ title: "Acesso negado", description: "Você não tem permissão de administrador.", variant: "destructive" });
        return;
      }

      navigate("/admin/dashboard");
    } catch (error: any) {
      toast({ title: "Erro no login", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-soft-cream to-champagne px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Admin</h1>
          <p className="text-sm text-muted-foreground">Acesso restrito</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="bg-white/80" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="bg-white/80" />
          </div>
          <Button type="submit" disabled={loading} className="w-full gradient-rose text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Entrar
          </Button>
        </form>

        <p className="text-center">
          <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Voltar ao site</a>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
