import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, X } from "lucide-react";
import ContactCard from "@/components/ContactCard";
import { getNudgeBadge } from "@/lib/nudges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const CircleDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [circle, setCircle] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");

  const fetchData = async () => {
    if (!user) return;
    const { data: c } = await supabase.from("circles").select("*").eq("id", id).single();
    setCircle(c);

    const { data: cc } = await supabase.from("contact_circles").select("contact_id").eq("circle_id", id);
    const contactIds = (cc || []).map((r: any) => r.contact_id);

    if (contactIds.length > 0) {
      const { data: contacts } = await supabase.from("contacts").select("*").in("id", contactIds);
      setMembers(contacts || []);
    } else {
      setMembers([]);
    }

    const { data: all } = await supabase.from("contacts").select("id, name").eq("user_id", user.id).order("name");
    setAllContacts((all || []).filter((c: any) => !contactIds.includes(c.id)));
  };

  useEffect(() => { fetchData(); }, [id, user]);

  const addMember = async () => {
    if (!selectedContactId || !user) return;
    await supabase.from("contact_circles").insert({
      contact_id: selectedContactId, circle_id: id, user_id: user.id,
    });
    setAdding(false);
    setSelectedContactId("");
    fetchData();
    toast({ title: "Member added" });
  };

  const removeMember = async (contactId: string) => {
    await supabase.from("contact_circles").delete().eq("contact_id", contactId).eq("circle_id", id);
    fetchData();
  };

  const deleteCircle = async () => {
    if (!confirm("Delete this circle?")) return;
    await supabase.from("circles").delete().eq("id", id);
    navigate("/circles");
  };

  if (!circle) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/circles")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">{circle.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button size="icon" variant="outline" className="rounded-xl" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={deleteCircle}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {adding && (
        <div className="flex gap-2 items-center">
          <Select value={selectedContactId} onValueChange={setSelectedContactId}>
            <SelectTrigger className="rounded-xl flex-1"><SelectValue placeholder="Choose contact..." /></SelectTrigger>
            <SelectContent>
              {allContacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button className="rounded-xl" onClick={addMember}>Add</Button>
          <Button variant="ghost" size="icon" onClick={() => setAdding(false)}><X className="h-4 w-4" /></Button>
        </div>
      )}

      {members.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No members yet. Add contacts to this circle.</p>
      ) : (
        <div className="space-y-2">
          {members.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <div className="flex-1">
                <ContactCard contact={c} badge={getNudgeBadge(c) ?? undefined} onReachOut={fetchData} />
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeMember(c.id)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CircleDetail;
