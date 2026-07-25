import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  entity_type?: string | null;
  entity_id?: string | null;
};

export function NotificationsCenter() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    const channel = supabase.channel("notifications-realtime");

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications" },
      () => {
        qc.invalidateQueries({ queryKey: ["notifications"] });
      },
    );

    void channel.subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [qc]);

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      if (!unreadIds.length) return;
      const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notifications marquées comme lues");
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const markOneAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const unread = notifications.filter((n) => !n.is_read).length;
  const prevUnreadRef = useRef<number | null>(null);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (prevUnreadRef.current !== null && unread > prevUnreadRef.current) {
      const latest = notifications.find((n) => !n.is_read);
      if (latest) {
        toast(latest.title, { description: latest.message });
      }
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 4000);
      return () => clearTimeout(t);
    }
    prevUnreadRef.current = unread;
  }, [unread, notifications]);


  const handleNotificationClick = (item: NotificationRow) => {
    if (!item.is_read) {
      void markOneAsRead.mutateAsync(item.id);
    }

    const target = getNotificationRoute(item);
    if (target) {
      setOpen(false);
      void navigate({ to: target });
    }
  };

  const getNotificationRoute = (item: NotificationRow) => {
    switch (item.entity_type) {
      case "online_order":
        return "/admin/orders";
      case "sale":
        return "/admin/pos";
      case "customer":
        return "/admin/customers";
      case "product":
        return "/admin/products";
      default:
        return null;
    }
  };

  return (
    <>
      <Button variant="ghost" size="icon" className="relative" onClick={() => setOpen(true)}>
        <Bell className={`h-4 w-4 ${pulse ? "animate-bounce text-primary" : ""}`} />
        {unread > 0 && (
          <>
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center">
              {pulse && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />}
              <Badge className="relative h-5 min-w-5 rounded-full px-1 text-[10px]">{unread}</Badge>
            </span>
          </>
        )}
      </Button>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Centre de notifications</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!notifications.length && <p className="text-sm text-muted-foreground">Aucune notification pour le moment.</p>}
            {notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNotificationClick(item)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${item.is_read ? "bg-background" : "bg-muted/40 hover:bg-muted/60"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.message}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{new Date(item.created_at).toLocaleString("fr-FR")}</span>
                </div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Fermer</Button>
            {unread > 0 && (
              <Button onClick={() => markAllAsRead.mutate()} disabled={markAllAsRead.isPending}>
                <CheckCheck className="mr-2 h-4 w-4" /> Tout marquer lu
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
