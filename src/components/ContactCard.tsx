import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { differenceInDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ContactCardProps {
  contact: {
    id: string;
    name: string;
    photo_url?: string | null;
    location?: string | null;
    last_interaction_date?: string | null;
    relationship_depth?: number | null;
    tags?: string[] | null;
  };
  badge?: string;
  onReachOut?: () => void;
}

const ContactCard = ({ contact, badge, onReachOut }: ContactCardProps) => {
  const navigate = useNavigate();
  const daysSince = contact.last_interaction_date
    ? differenceInDays(new Date(), new Date(contact.last_interaction_date))
    : null;

  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleReachOut = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("interactions").insert({
      contact_id: contact.id,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      interaction_type: "reach_out",
    });
    if (!error) {
      await supabase
        .from("contacts")
        .update({ last_interaction_date: new Date().toISOString().split("T")[0] })
        .eq("id", contact.id);
      toast({ title: "Logged!", description: `Interaction with ${contact.name} recorded.` });
      onReachOut?.();
    }
  };

  return (
    <div
      onClick={() => navigate(`/people/${contact.id}`)}
      className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm transition-shadow hover:shadow-md cursor-pointer"
    >
      <Avatar className="h-12 w-12">
        <AvatarImage src={contact.photo_url || undefined} />
        <AvatarFallback className="bg-accent text-accent-foreground font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{contact.name}</p>
          {badge && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {contact.location && `${contact.location} · `}
          {daysSince !== null ? `${daysSince}d ago` : "No interactions yet"}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 rounded-xl text-xs"
        onClick={handleReachOut}
      >
        Reach Out
      </Button>
    </div>
  );
};

export default ContactCard;
