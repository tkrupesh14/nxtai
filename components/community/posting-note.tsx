import { Button } from "@/components/site/ui/button"
import { communityError, type MyCommunityStatus } from "@/lib/community/posts"

/** The "new post" button, or why the learner can't post yet (with the way to fix it). */
export function PostingNote({
  user,
  status,
  loginHref,
  accountHref,
  newHref,
  label,
}: {
  user: boolean
  status: MyCommunityStatus | null
  loginHref: string
  accountHref: string
  newHref: string
  label: string
}) {
  if (!user)
    return (
      <Button asChild size="sm" variant="outline">
        <a href={loginHref}>Log in to post</a>
      </Button>
    )
  if (status?.can_post)
    return (
      <Button asChild size="sm">
        <a href={newHref}>{label}</a>
      </Button>
    )
  if (status?.reason?.includes("need_handle"))
    return (
      <p className="text-sm text-muted-foreground">
        <a href={accountHref} className="font-medium text-primary hover:underline">
          Claim a handle
        </a>{" "}
        to post.
      </p>
    )
  return <p className="max-w-sm text-sm text-muted-foreground">{communityError(status?.reason ?? undefined, "You can't post right now.")}</p>
}
