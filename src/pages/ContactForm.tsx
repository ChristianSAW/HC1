import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, X } from "lucide-react";
import { HAAS_TAGS, ENERGY_LEVELS } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";

const ContactForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: "", phone: "", email: "", linkedin: "", location: "",
    photo_url: "", where_met: "", shared_interests: "", important_dates: "",
    relationship_depth: 3, energy_level: "Neutral" as string,
    notes: "", follow_ups: "", tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      supabase.from("contacts").select("*").eq("id", id).single().then(({ data }) => {
        if (data) setForm({
          name: data.name || "", phone: data.phone || "", email: data.email || "",
          linkedin: data.linkedin || "", location: data.location || "",
          photo_url: data.photo_url || "", where_met: data.where_met || "",
          shared_interests: data.shared_interests || "", important_dates: data.important_dates || "",
          relationship_depth: data.relationship_depth || 3,
          energy_level: data.energy_level || "Neutral",
          notes: data.notes || "", follow_ups: data.follow_ups || "",
          tags: data.tags || [],
        });
      });
    }
  }, [id, isEdit]);

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) => set("tags", form.tags.filter((t) => t !== tag));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const payload = { ...form, user_id: user.id };

    try {
      if (isEdit) {
        const { user_id, ...updatePayload } = payload;
        const { error } = await supabase.from("contacts").update(updatePayload).eq("id", id);
        if (error) throw error;
        toast({ title: "Contact updated" });
        navigate(`/people/${id}`);
      } else {
        const { error } = await supabase.from("contacts").insert(payload);
        if (error) throw error;
        toast({ title: "Contact added!" });
        navigate("/people");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{isEdit ? "Edit Contact" : "Add Contact"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} required className="rounded-xl" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="rounded-xl" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>LinkedIn</Label>
            <Input value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="URL or username" className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Berkeley" className="rounded-xl" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Photo URL</Label>
          <Input value={form.photo_url} onChange={(e) => set("photo_url", e.target.value)} placeholder="https://..." className="rounded-xl" />
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.tags.map((t) => (
              <Badge key={t} variant="secondary" className="gap-1 rounded-full">
                {t}
                <button type="button" onClick={() => removeTag(t)}><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
              placeholder="Add custom tag..."
              className="rounded-xl"
            />
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {HAAS_TAGS.filter((t) => !form.tags.includes(t)).slice(0, 10).map((t) => (
              <button key={t} type="button" onClick={() => addTag(t)}>
                <Badge variant="outline" className="rounded-full text-xs cursor-pointer hover:bg-accent">{t}</Badge>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Where you met</Label>
          <Input value={form.where_met} onChange={(e) => set("where_met", e.target.value)} className="rounded-xl" />
        </div>

        <div className="space-y-2">
          <Label>Shared interests</Label>
          <Input value={form.shared_interests} onChange={(e) => set("shared_interests", e.target.value)} className="rounded-xl" />
        </div>

        <div className="space-y-2">
          <Label>Important dates</Label>
          <Input value={form.important_dates} onChange={(e) => set("important_dates", e.target.value)} placeholder="Birthday, etc." className="rounded-xl" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Relationship depth (1–5)</Label>
            <Select value={String(form.relationship_depth)} onValueChange={(v) => set("relationship_depth", Number(v))}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Energy level</Label>
            <Select value={form.energy_level} onValueChange={(v) => set("energy_level", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENERGY_LEVELS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="rounded-xl min-h-[80px]" />
        </div>

        <div className="space-y-2">
          <Label>Follow-ups</Label>
          <Textarea value={form.follow_ups} onChange={(e) => set("follow_ups", e.target.value)} className="rounded-xl min-h-[60px]" placeholder="Things to follow up on..." />
        </div>

        <Button type="submit" className="w-full rounded-xl" disabled={loading}>
          {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Contact"}
        </Button>
      </form>
    </div>
  );
};

export default ContactForm;
