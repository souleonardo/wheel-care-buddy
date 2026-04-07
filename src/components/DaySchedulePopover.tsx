import { useState, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const ALL_TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00",
];

interface ScheduleEntry {
  scheduled_time: string | null;
  type: string;
  status: string;
  vehicle_model?: string;
  vehicle_plate?: string;
}

interface DaySchedulePopoverProps {
  date: string;
  highlightTime?: string;
}

export function DaySchedulePopover({ date, highlightTime }: DaySchedulePopoverProps) {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchSchedule = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    const { data } = await supabase
      .from("revisions")
      .select("scheduled_time, type, status, vehicle_id")
      .eq("scheduled_date", date)
      .not("status", "in", '("rejected")');

    if (data) {
      // Fetch vehicle info for each
      const vehicleIds = [...new Set(data.map((d: any) => d.vehicle_id))];
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, model, plate")
        .in("id", vehicleIds);

      const vehicleMap = new Map((vehicles ?? []).map((v: any) => [v.id, v]));

      setEntries(
        data.map((d: any) => ({
          scheduled_time: d.scheduled_time,
          type: d.type,
          status: d.status,
          vehicle_model: vehicleMap.get(d.vehicle_id)?.model,
          vehicle_plate: vehicleMap.get(d.vehicle_id)?.plate,
        }))
      );
    }
    setLoading(false);
    setLoaded(true);
  }, [date, loaded]);

  const bookedTimes = new Set(entries.map((e) => e.scheduled_time).filter(Boolean));

  const statusLabels: Record<string, string> = {
    pending_approval: "Pendente",
    scheduled: "Agendada",
    in_progress: "Em andamento",
    completed: "Concluída",
  };

  return (
    <Popover onOpenChange={(open) => { if (open) fetchSchedule(); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-info/15 text-info hover:bg-info/25 transition-colors flex items-center gap-1"
        >
          <CalendarDays className="h-3 w-3" />
          Ver Agenda do Dia
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          Agenda — {new Date(date + "T12:00:00").toLocaleDateString("pt-BR")}
        </h4>

        {loading ? (
          <p className="text-xs text-muted-foreground py-3 text-center">Carregando...</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {ALL_TIME_SLOTS.map((slot) => {
              const entry = entries.find((e) => e.scheduled_time === slot);
              const isHighlighted = slot === highlightTime;
              return (
                <div
                  key={slot}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
                    isHighlighted && !entry && "bg-success/10 border border-success/30",
                    isHighlighted && entry && "bg-warning/10 border border-warning/30",
                    !isHighlighted && entry && "bg-muted/50",
                    !isHighlighted && !entry && "bg-transparent"
                  )}
                >
                  <Clock className={cn("h-3 w-3 shrink-0", entry ? "text-warning" : "text-muted-foreground/50")} />
                  <span className={cn("font-mono font-medium w-10", entry ? "text-foreground" : "text-muted-foreground/60")}>
                    {slot}
                  </span>
                  {entry ? (
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground font-medium truncate block">
                        {entry.vehicle_model ?? "—"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {entry.type} · {statusLabels[entry.status] ?? entry.status}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/50 italic">Livre</span>
                  )}
                  {isHighlighted && (
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                      entry ? "bg-warning/20 text-warning" : "bg-success/20 text-success"
                    )}>
                      {entry ? "CONFLITO" : "PROPOSTO"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && (
          <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{bookedTimes.size} ocupado(s)</span>
            <span>{ALL_TIME_SLOTS.length - bookedTimes.size} livre(s)</span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
