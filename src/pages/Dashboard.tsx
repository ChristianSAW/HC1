import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ContactCard from "@/components/ContactCard";
import {
  getGoingCold,
  getCloseFriendsAtRisk,
  getLongDistance,
  getLocal,
  getWeeklyOutreach,
  getNudgeBadge,
  type Contact,
} from "@/lib/nudges";

const Section = ({
  title,
  emoji,
  contacts,
  emptyText,
  onReachOut,
}: {
  title: string;
  emoji: string;
  contacts: Contact[];
  emptyText: string;
  onReachOut: () => void;
}) => (
  <section className="space-y-3">
    <h2 className="text-lg font-semibold flex items-center gap-2">
      <span>{emoji}</span> {title}
      {contacts.length > 0 && (
        <span className="text-sm font-normal text-muted-foreground">({contacts.length})</span>
      )}
    </h2>
    {contacts.length === 0 ? (
      <p className="text-sm text-muted-foreground pl-1">{emptyText}</p>
    ) : (
      <div className="space-y-2">
        {contacts.slice(0, 5).map((c) => (
          <ContactCard
            key={c.id}
            contact={c}
            badge={getNudgeBadge(c) ?? undefined}
            onReachOut={onReachOut}
          />
        ))}
      </div>
    )}
  </section>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("contacts")
      .select("id, name, photo_url, location, last_interaction_date, relationship_depth, tags")
      .eq("user_id", user.id);
    setContacts((data as Contact[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchContacts();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Warmth</h1>
        <p className="text-muted-foreground mt-1">Nurture your relationships</p>
      </header>

      {contacts.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-4xl">🌱</p>
          <p className="text-lg font-medium">Your network starts here</p>
          <p className="text-muted-foreground text-sm">
            Add your first contact to get personalized insights.
          </p>
        </div>
      ) : (
        <>
          <Section
            emoji="🎯"
            title="This week's outreach"
            contacts={getWeeklyOutreach(contacts)}
            emptyText="You're all caught up!"
            onReachOut={fetchContacts}
          />
          <Section
            emoji="🔥"
            title="Going cold"
            contacts={getGoingCold(contacts)}
            emptyText="Everyone's warm!"
            onReachOut={fetchContacts}
          />
          <Section
            emoji="⭐"
            title="Close friends at risk"
            contacts={getCloseFriendsAtRisk(contacts)}
            emptyText="Your close friends are taken care of."
            onReachOut={fetchContacts}
          />
          <Section
            emoji="📍"
            title="Local"
            contacts={getLocal(contacts)}
            emptyText="No local contacts yet."
            onReachOut={fetchContacts}
          />
          <Section
            emoji="🌎"
            title="Long-distance"
            contacts={getLongDistance(contacts)}
            emptyText="No long-distance contacts."
            onReachOut={fetchContacts}
          />
        </>
      )}
    </div>
  );
};

export default Dashboard;
