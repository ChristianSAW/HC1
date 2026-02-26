import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { differenceInDays } from "date-fns";
import { getNudgeBadge, type Contact } from "@/lib/nudges";
import { getRingNodes, SVG_SIZE, SVG_CENTER, RING_RADII } from "@/lib/circleLayout";

const RING_LABELS: Record<number, string> = {
  1: "Weekly",
  2: "Monthly",
  3: "Quarterly",
  4: "Drifting",
};

const RING_STROKE: Record<number, string> = {
  1: "hsl(82 20% 55% / 0.35)",
  2: "hsl(30 33% 60% / 0.35)",
  3: "hsl(38 70% 55% / 0.4)",
  4: "hsl(16 55% 52% / 0.45)",
};

const NODE_FILL: Record<number, string> = {
  1: "hsl(82 30% 70%)",
  2: "hsl(30 40% 72%)",
  3: "hsl(38 85% 68%)",
  4: "hsl(16 55% 65%)",
};

interface Props {
  contacts: Contact[];
  onReachOut: () => void;
}

const WarmthCircleViz = ({ contacts, onReachOut }: Props) => {
  const [selected, setSelected] = useState<Contact | null>(null);
  const nodes = getRingNodes(contacts);

  const handleReachOut = async () => {
    if (!selected) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("interactions").insert({
      contact_id: selected.id,
      user_id: user?.id,
      interaction_type: "reach_out",
    });
    if (!error) {
      await supabase
        .from("contacts")
        .update({ last_interaction_date: new Date().toISOString().split("T")[0] })
        .eq("id", selected.id);
      toast({ title: "Logged!", description: `Interaction with ${selected.name} recorded.` });
      setSelected(null);
      onReachOut();
    }
  };

  const daysSince = selected?.last_interaction_date
    ? differenceInDays(new Date(), new Date(selected.last_interaction_date))
    : null;

  return (
    <>
      <svg
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        className="w-full max-w-md mx-auto"
        style={{ touchAction: "none" }}
      >
        {/* Rings */}
        {([1, 2, 3, 4] as const).map((ring) => (
          <g key={ring}>
            <circle
              cx={SVG_CENTER}
              cy={SVG_CENTER}
              r={RING_RADII[ring]}
              fill="none"
              stroke={RING_STROKE[ring]}
              strokeWidth={1.5}
            />
            <text
              x={SVG_CENTER + RING_RADII[ring] + 4}
              y={SVG_CENTER}
              fontSize={9}
              fill="hsl(var(--muted-foreground))"
              dominantBaseline="middle"
            >
              {RING_LABELS[ring]}
            </text>
          </g>
        ))}

        {/* Center — You */}
        <circle cx={SVG_CENTER} cy={SVG_CENTER} r={22} fill="hsl(var(--accent))" />
        <text
          x={SVG_CENTER}
          y={SVG_CENTER}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={11}
          fontWeight="600"
          fill="hsl(var(--accent-foreground))"
        >
          You
        </text>

        {/* Contact nodes */}
        {nodes.map(({ contact, ring, x, y }) => {
          const initials = contact.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return (
            <g
              key={contact.id}
              onClick={() => setSelected(contact)}
              style={{ cursor: "pointer" }}
            >
              <circle cx={x} cy={y} r={18} fill={NODE_FILL[ring]} />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={10}
                fontWeight="600"
                fill="hsl(var(--foreground))"
              >
                {initials}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tap sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left">{selected?.name}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            {selected && getNudgeBadge(selected) && (
              <Badge variant="secondary">{getNudgeBadge(selected)}</Badge>
            )}
            <p className="text-sm text-muted-foreground">
              {daysSince !== null
                ? `Last contact: ${daysSince} day${daysSince !== 1 ? "s" : ""} ago`
                : "No interactions recorded yet"}
            </p>
            <Button className="w-full" onClick={handleReachOut}>
              Reach Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default WarmthCircleViz;
