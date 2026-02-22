import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { format, startOfWeek } from "date-fns";

const questions = [
  { key: "made_week_better", emoji: "☀️", prompt: "Who made your week better?" },
  { key: "neglected", emoji: "😔", prompt: "Who did you neglect?" },
  { key: "invest_long_term", emoji: "🌱", prompt: "Who do you want to invest in long term?" },
] as const;

const Reflect = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [selections, setSelections] = useState<Record<string, string[]>>({
    made_week_better: [], neglected: [], invest_long_term: [],
  });
  const [notes, setNotes] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);

  const weekOf = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    supabase.from("contacts").select("id, name").eq("user_id", user.id).order("name").then(({ data }) => setContacts(data || []));
    supabase.from("reflections").select("*").eq("user_id", user.id).order("week_of", { ascending: false }).limit(10).then(({ data }) => setHistory(data || []));
  }, [user]);

  const toggleContact = (key: string, contactId: string) => {
    setSelections((s) => ({
      ...s,
      [key]: s[key].includes(contactId) ? s[key].filter((id) => id !== contactId) : [...s[key], contactId],
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("reflections").insert({
        user_id: user.id,
        week_of: weekOf,
        made_week_better: selections.made_week_better,
        neglected: selections.neglected,
        invest_long_term: selections.invest_long_term,
        notes,
      });
      if (error) throw error;
      toast({ title: "Reflection saved! 🌿" });
      setSelections({ made_week_better: [], neglected: [], invest_long_term: [] });
      setNotes("");
      const { data } = await supabase.from("reflections").select("*").eq("user_id", user.id).order("week_of", { ascending: false }).limit(10);
      setHistory(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getContactName = (id: string) => contacts.find((c) => c.id === id)?.name || "Unknown";

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reflect</h1>
        <Button variant="outline" className="rounded-xl text-sm" onClick={() => setShowHistory(!showHistory)}>
          {showHistory ? "New reflection" : "History"}
        </Button>
      </div>

      {showHistory ? (
        <div className="space-y-4">
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No reflections yet.</p>
          ) : (
            history.map((r) => (
              <Card key={r.id} className="border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Week of {format(new Date(r.week_of), "MMM d, yyyy")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {questions.map(({ key, emoji, prompt }) => {
                    const ids = (r as any)[key] || [];
                    return ids.length > 0 ? (
                      <div key={key}>
                        <p className="text-muted-foreground">{emoji} {prompt}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ids.map((id: string) => (
                            <Badge key={id} variant="secondary" className="rounded-full text-xs">{getContactName(id)}</Badge>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })}
                  {r.notes && <p className="text-muted-foreground mt-2 whitespace-pre-wrap">{r.notes}</p>}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-muted-foreground text-sm">Week of {format(new Date(weekOf), "MMM d, yyyy")}</p>

          {questions.map(({ key, emoji, prompt }) => (
            <div key={key} className="space-y-2">
              <p className="font-medium">{emoji} {prompt}</p>
              <div className="flex flex-wrap gap-1.5">
                {contacts.map((c) => (
                  <button key={c.id} onClick={() => toggleContact(key, c.id)}>
                    <Badge
                      variant={selections[key].includes(c.id) ? "default" : "outline"}
                      className="rounded-full cursor-pointer transition-colors"
                    >
                      {c.name}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-2">
            <p className="font-medium">📝 Any other thoughts?</p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What's on your mind..."
              className="rounded-xl min-h-[80px]"
            />
          </div>

          <Button className="w-full rounded-xl" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Reflection"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Reflect;
