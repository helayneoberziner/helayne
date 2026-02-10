import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Users, Loader2, Trash2, Mail, Phone, Instagram, MessageSquare, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  instagram: string | null;
  message: string | null;
  created_at: string;
}

const AdminDashboard = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchLeads();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/admin");
      return;
    }

    const { data: roles } = await supabase.from("user_roles").select("role").limit(1);
    if (!roles?.length || roles[0].role !== "admin") {
      await supabase.auth.signOut();
      navigate("/admin");
    }
  };

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching leads:", error);
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este contato?")) return;
    setDeletingId(id);

    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      setLeads(prev => prev.filter(l => l.id !== id));
      toast({ title: "Contato excluído" });
    }
    setDeletingId(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-soft-cream to-champagne">
      {/* Header */}
      <header className="bg-white/60 backdrop-blur-sm border-b border-border/50 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <h1 className="font-display text-lg font-semibold">Painel Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors mr-2">Ver site</a>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Total de Leads</p>
            <p className="text-3xl font-display font-semibold">{leads.length}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Últimos 7 dias</p>
            <p className="text-3xl font-display font-semibold">
              {leads.filter(l => new Date(l.created_at) > new Date(Date.now() - 7 * 86400000)).length}
            </p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
            <p className="text-3xl font-display font-semibold">
              {leads.filter(l => new Date(l.created_at) > new Date(Date.now() - 30 * 86400000)).length}
            </p>
          </div>
        </div>

        {/* Leads list */}
        <div className="space-y-3">
          <h2 className="font-display text-xl font-semibold">Contatos Recebidos</h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum contato recebido ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {leads.map(lead => (
                <div key={lead.id} className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-foreground">{lead.name}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(lead.id)}
                      disabled={deletingId === lead.id}
                      className="text-destructive hover:text-destructive"
                    >
                      {deletingId === lead.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4 shrink-0" />
                      <a href={`mailto:${lead.email}`} className="hover:text-foreground transition-colors truncate">{lead.email}</a>
                    </div>
                    {lead.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4 shrink-0" />
                        <a href={`tel:${lead.phone}`} className="hover:text-foreground transition-colors">{lead.phone}</a>
                      </div>
                    )}
                    {lead.instagram && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Instagram className="w-4 h-4 shrink-0" />
                        <a href={`https://instagram.com/${lead.instagram}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">@{lead.instagram}</a>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>{formatDate(lead.created_at)}</span>
                    </div>
                  </div>

                  {lead.message && (
                    <div className="flex gap-2 text-sm">
                      <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
                      <p className="text-muted-foreground">{lead.message}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
