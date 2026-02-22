import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Edit, Trash2, Star, MapPin, Phone, Mail, Linkedin } from "lucide-react";
import { differenceInDays } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { getNudgeBadge } from "@/lib/nudges";

const ContactDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("contacts").select("*").eq("id", id).single();
      setContact(data);
      setLoading(false);
    };
    fetch();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this contact?")) return;
    await supabase.from("contacts").delete().eq("id", id);
    toast({ title: "Contact deleted" });
    navigate("/people");
  };

  const handleReachOut = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("interactions").insert({
      contact_id: id,
      user_id: user?.id,
      interaction_type: "reach_out",
    });
    await supabase
      .from("contacts")
      .update({ last_interaction_date: new Date().toISOString().split("T")[0] })
      .eq("id", id);
    toast({ title: "Interaction logged!" });
    const { data } = await supabase.from("contacts").select("*").eq("id", id).single();
    setContact(data);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-muted-foreground">Loading...</p></div>;
  if (!contact) return <div className="p-4"><p>Contact not found.</p></div>;

  const initials = contact.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const daysSince = contact.last_interaction_date ? differenceInDays(new Date(), new Date(contact.last_interaction_date)) : null;
  const nudge = getNudgeBadge(contact);

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate("/people")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/people/${id}/edit`)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="text-center space-y-3">
        <Avatar className="h-20 w-20 mx-auto">
          <AvatarImage src={contact.photo_url || undefined} />
          <AvatarFallback className="bg-accent text-accent-foreground text-xl font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{contact.name}</h1>
          {contact.location && (
            <p className="text-muted-foreground flex items-center justify-center gap-1 mt-1">
              <MapPin className="h-3 w-3" /> {contact.location}
            </p>
          )}
        </div>
        {nudge && <Badge variant="secondary">{nudge}</Badge>}
      </div>

      <div className="flex justify-center gap-3">
        <Button className="rounded-xl" onClick={handleReachOut}>
          Reach Out
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Card className="border-none shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-muted-foreground text-xs">Last contact</p>
            <p className="font-semibold">{daysSince !== null ? `${daysSince} days ago` : "Never"}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-muted-foreground text-xs">Depth</p>
            <p className="font-semibold flex items-center justify-center gap-1">
              {Array.from({ length: contact.relationship_depth || 0 }).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-primary text-primary" />
              ))}
            </p>
          </CardContent>
        </Card>
      </div>

      {(contact.phone || contact.email || contact.linkedin) && (
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 space-y-2 text-sm">
            {contact.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {contact.phone}</p>}
            {contact.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {contact.email}</p>}
            {contact.linkedin && <p className="flex items-center gap-2"><Linkedin className="h-3.5 w-3.5 text-muted-foreground" /> {contact.linkedin}</p>}
          </CardContent>
        </Card>
      )}

      {(contact.tags || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {contact.tags.map((tag: string) => (
            <Badge key={tag} variant="outline" className="rounded-full text-xs">{tag}</Badge>
          ))}
        </div>
      )}

      {(contact.where_met || contact.shared_interests || contact.notes || contact.follow_ups) && (
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 space-y-3 text-sm">
            {contact.where_met && <div><p className="text-muted-foreground text-xs mb-0.5">Where we met</p><p>{contact.where_met}</p></div>}
            {contact.shared_interests && <div><p className="text-muted-foreground text-xs mb-0.5">Shared interests</p><p>{contact.shared_interests}</p></div>}
            {contact.notes && <div><p className="text-muted-foreground text-xs mb-0.5">Notes</p><p className="whitespace-pre-wrap">{contact.notes}</p></div>}
            {contact.follow_ups && <div><p className="text-muted-foreground text-xs mb-0.5">Follow-ups</p><p className="whitespace-pre-wrap">{contact.follow_ups}</p></div>}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ContactDetail;
