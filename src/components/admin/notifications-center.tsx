import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
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
};

export function NotificationsCenter() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });

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

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      <Button variant="ghost" size="icon" className="relative" onClick={() => setOpen(true)}>
        <Bell className="h-4 w-4" />
        {unread > 0 && <Badge className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-[10px]">{unread}</Badge>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Centre de notifications</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!notifications.length && <p className="text-sm text-muted-foreground">Aucune notification pour le moment.</p>}
            {notifications.map((item) => (
              <div key={item.id} className={`rounded-lg border p-3 ${item.is_read ? "bg-background" : "bg-muted/40"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.message}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{new Date(item.created_at).toLocaleString("fr-FR")}</span>
                </div>
              </div>
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
