import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import ContactCard from "@/components/ContactCard";
import { getNudgeBadge } from "@/lib/nudges";
import { loadDefaultContacts, isDefaultContact } from "@/lib/defaultContacts";

const People = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showingDefaults, setShowingDefaults] = useState(false);

  const fetchContacts = async () => {
    if (!user) {
      setContacts(loadDefaultContacts());
      setShowingDefaults(true);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    const real = data || [];
    setContacts([...real, ...loadDefaultContacts()]);
    setShowingDefaults(true);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) fetchContacts();
  }, [user, authLoading]);

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.tags || []).some((t: string) => t.toLowerCase().includes(search.toLowerCase())) ||
    (c.location || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">People</h1>
        <Button size="icon" className="rounded-xl" onClick={() => navigate("/people/new")}>
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {showingDefaults && (
        <div className="rounded-xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
          These are sample contacts — add your own to get started
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, tag, or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-xl"
        />
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-3xl">👋</p>
          <p className="text-muted-foreground">
            {contacts.length === 0 ? "Add your first contact" : "No matches found"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <ContactCard
              key={c.id}
              contact={c}
              badge={getNudgeBadge(c) ?? undefined}
              onReachOut={fetchContacts}
              readOnly={isDefaultContact(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default People;
