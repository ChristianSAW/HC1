import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HAAS_CIRCLES } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";

const Circles = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [circles, setCircles] = useState<any[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [newCircle, setNewCircle] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchCircles = async () => {
    if (!user) return;
    const { data } = await supabase.from("circles").select("*").eq("user_id", user.id).order("name");
    setCircles(data || []);

    const { data: cc } = await supabase.from("contact_circles").select("circle_id").eq("user_id", user.id);
    const counts: Record<string, number> = {};
    (cc || []).forEach((r: any) => { counts[r.circle_id] = (counts[r.circle_id] || 0) + 1; });
    setMemberCounts(counts);
  };

  useEffect(() => { fetchCircles(); }, [user]);

  const createCircle = async (name: string) => {
    if (!user || !name.trim()) return;
    const { error } = await supabase.from("circles").insert({ name: name.trim(), user_id: user.id });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Circle created!" });
    setNewCircle("");
    setShowCreate(false);
    fetchCircles();
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Circles</h1>
        <Button size="icon" className="rounded-xl" onClick={() => setShowCreate(true)}>
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {showCreate && (
        <div className="flex gap-2">
          <Input
            value={newCircle}
            onChange={(e) => setNewCircle(e.target.value)}
            placeholder="Circle name..."
            className="rounded-xl"
            onKeyDown={(e) => e.key === "Enter" && createCircle(newCircle)}
            autoFocus
          />
          <Button className="rounded-xl" onClick={() => createCircle(newCircle)}>Add</Button>
          <Button variant="ghost" className="rounded-xl" onClick={() => setShowCreate(false)}>Cancel</Button>
        </div>
      )}

      {circles.length === 0 && !showCreate && (
        <div className="text-center py-12 space-y-3">
          <p className="text-3xl">🔗</p>
          <p className="font-medium">Create your first circle</p>
          <p className="text-muted-foreground text-sm">Organize contacts into meaningful groups.</p>
          <div className="flex flex-wrap justify-center gap-1.5 mt-4">
            {HAAS_CIRCLES.map((c) => (
              <button key={c} onClick={() => createCircle(c)}>
                <Badge variant="outline" className="rounded-full cursor-pointer hover:bg-accent">{c}</Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {circles.map((circle) => (
          <Card
            key={circle.id}
            className="border-none shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/circles/${circle.id}`)}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">{circle.name}</p>
                <p className="text-xs text-muted-foreground">{memberCounts[circle.id] || 0} members</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Circles;
