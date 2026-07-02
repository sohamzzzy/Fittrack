import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePost, getGetSocialFeedQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function CreatePostDialog({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  const [content, setContent] = useState("");
  const createPost = useCreatePost();
  const qc = useQueryClient();
  const { toast } = useToast();

  const handlePost = () => {
    if (!content.trim()) return;
    createPost.mutate({ data: { content } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSocialFeedQueryKey({ limit: 20, offset: 0 }) });
        setOpen(false); setContent("");
        toast({ title: "Posted!" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-card border-card-border">
        <DialogHeader><DialogTitle>New Post</DialogTitle></DialogHeader>
        <Textarea placeholder="Share your workout, progress, or thoughts..." value={content} onChange={(e) => setContent(e.target.value)} rows={4} data-testid="textarea-post-content" className="resize-none" />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handlePost} disabled={!content.trim() || createPost.isPending} className="font-bold" data-testid="button-submit-post">
            {createPost.isPending ? "Posting..." : "Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
