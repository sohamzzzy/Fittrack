import { useState } from "react";
import {
  useGetSocialFeed, useCreatePost, useLikePost, useUnlikePost,
  useListComments, useCreateComment, getGetSocialFeedQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Heart, MessageCircle, Dumbbell, Plus, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function PostCard({ post, onLike }: { post: any; onLike: (id: number, liked: boolean) => void }) {
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const { data: comments } = useListComments(post.id, { query: { enabled: showComments, queryKey: ["/api/social/posts", post.id, "comments"] } });
  const createComment = useCreateComment();
  const qc = useQueryClient();

  const handleComment = () => {
    if (!comment.trim()) return;
    createComment.mutate({ postId: post.id, data: { content: comment } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/social/posts", post.id, "comments"] }); setComment(""); },
    });
  };

  return (
    <Card className="bg-card border-card-border" data-testid={`card-post-${post.id}`}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarImage src={post.user?.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">{(post.user?.username ?? "U")[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-sm">{post.user?.username}</span>
              <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
            </div>
            <p className="text-sm leading-relaxed mb-3">{post.content}</p>
            {post.workout && (
              <div className="mb-3 p-3 rounded-lg bg-secondary border border-border flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{post.workout.name}</p>
                  {post.workout.durationMinutes && <p className="text-xs text-muted-foreground">{post.workout.durationMinutes}min</p>}
                </div>
              </div>
            )}
            <div className="flex items-center gap-4">
              <button
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors group"
                onClick={() => onLike(post.id, post.isLiked)}
                data-testid={`button-like-${post.id}`}
              >
                <motion.div whileTap={{ scale: 1.4 }} transition={{ type: "spring", stiffness: 600, damping: 20 }}>
                  <Heart className={cn("w-4 h-4 transition-colors", post.isLiked ? "fill-primary text-primary" : "group-hover:text-primary")} />
                </motion.div>
                <span className="font-medium">{post.likesCount}</span>
              </button>
              <button
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowComments(!showComments)}
                data-testid={`button-comments-${post.id}`}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="font-medium">{post.commentsCount}</span>
              </button>
            </div>
          </div>
        </div>
        <AnimatePresence>
          {showComments && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 ml-12 space-y-2">
              {comments?.map((c: any) => (
                <div key={c.id} className="flex items-start gap-2">
                  <Avatar className="w-6 h-6 shrink-0">
                    <AvatarFallback className="bg-secondary text-[10px]">{(c.user?.username ?? "U")[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-secondary rounded-lg px-3 py-2">
                    <span className="text-xs font-semibold mr-2">{c.user?.username}</span>
                    <span className="text-xs">{c.content}</span>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <Input className="h-8 text-xs" placeholder="Add a comment..." value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleComment()} data-testid={`input-comment-${post.id}`} />
                <Button size="icon" className="w-8 h-8 shrink-0" onClick={handleComment} disabled={!comment.trim() || createComment.isPending} data-testid={`button-send-comment-${post.id}`}>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

export default function Feed() {
  const { data: posts, isLoading } = useGetSocialFeed({ limit: 20, offset: 0 });
  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const createPost = useCreatePost();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");

  const handleLike = (id: number, liked: boolean) => {
    const fn = liked ? unlikePost : likePost;
    fn.mutate({ postId: id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetSocialFeedQueryKey({ limit: 20, offset: 0 }) }) });
  };

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">Feed</h1>
        <Button size="sm" className="font-bold" onClick={() => setOpen(true)} data-testid="button-create-post">
          <Plus className="w-4 h-4 mr-1" /> Post
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[0,1,2].map(i => <Skeleton key={i} className="h-28" />)}</div>
      ) : posts && posts.length > 0 ? (
        <div className="space-y-3">
          {(Array.isArray(posts) ? posts : []).map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <PostCard post={post} onLike={handleLike} />
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-card-border">
          <CardContent className="py-16 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Your feed is empty</h3>
              <p className="text-sm text-muted-foreground">Follow others or post a workout to get started.</p>
            </div>
            <Button onClick={() => setOpen(true)} className="font-bold">Share Update</Button>
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
