import { MoreVertical, RotateCcw, Eraser, ShoppingBag } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";
import { selectCart, useAppStore } from "@/store";

type PendingAction = "reset" | "clear-messages" | "clear-cart" | null;

export interface SessionMenuProps {
  className?: string;
}

// Overflow menu in the top bar. Houses session-level destructive actions -
// start fresh, clear the conversation, clear the cart - each gated behind a
// confirmation dialog so accidental clicks never destroy the chat.
export function SessionMenu({ className }: SessionMenuProps) {
  const resetSession = useAppStore((s) => s.resetSession);
  const clearMessages = useAppStore((s) => s.clearMessages);
  const clearCart = useAppStore((s) => s.clearCart);
  const cart = useAppStore(selectCart);
  const messages = useAppStore((s) => s.messages);

  const [pending, setPending] = useState<PendingAction>(null);

  const hasMessages = messages.length > 0;
  const hasCart = cart.lines.length > 0;

  const confirm = () => {
    if (pending === "reset") resetSession();
    if (pending === "clear-messages") clearMessages();
    if (pending === "clear-cart") clearCart();
    setPending(null);
  };

  const dialogText: Record<
    Exclude<PendingAction, null>,
    { title: string; body: string; cta: string }
  > = {
    reset: {
      title: "Start a new session?",
      body: "This clears the conversation, empties the cart, and gives you a fresh session id. Your language and currency preferences stay.",
      cta: "Start fresh",
    },
    "clear-messages": {
      title: "Clear the conversation?",
      body: "This removes every message in this chat. Your cart and preferences stay where they are.",
      cta: "Clear conversation",
    },
    "clear-cart": {
      title: "Empty the cart?",
      body: "This removes every item from your cart. The conversation stays.",
      cta: "Empty cart",
    },
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Session menu"
            className={cn(
              "inline-flex items-center justify-center h-10 w-10 rounded-full cursor-pointer",
              "border border-white/20 bg-white/10 text-white backdrop-blur-md",
              "transition-[transform,background-color,border-color] duration-200 ease-[var(--easing-emphasized)]",
              "hover:-translate-y-[1px] hover:bg-white/15 hover:border-white/35",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
              className,
            )}
          >
            <MoreVertical size={16} strokeWidth={2.2} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-60">
          <DropdownMenuLabel className="text-[var(--text-xs)] uppercase tracking-[0.14em] text-muted">
            Session
          </DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() => setPending("reset")}
            className="cursor-pointer gap-2 py-2.5"
          >
            <RotateCcw size={14} className="text-cta" />
            <div className="flex flex-col">
              <span className="font-semibold">Start a new session</span>
              <span className="text-[var(--text-2xs)] text-muted">Fresh chat, Empty cart</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setPending("clear-messages")}
            disabled={!hasMessages}
            className="cursor-pointer gap-2 py-2.5"
          >
            <Eraser size={14} />
            <div className="flex flex-col">
              <span className="font-semibold">Clear conversation</span>
              <span className="text-[var(--text-2xs)] text-muted">
                {hasMessages ? `${messages.length} items` : "Nothing to clear"}
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setPending("clear-cart")}
            disabled={!hasCart}
            className="cursor-pointer gap-2 py-2.5"
          >
            <ShoppingBag size={14} />
            <div className="flex flex-col">
              <span className="font-semibold">Clear cart</span>
              <span className="text-[var(--text-2xs)] text-muted">
                {hasCart
                  ? `${cart.lines.reduce((n, l) => n + l.qty, 0)} items in cart`
                  : "Cart is empty"}
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          {pending && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{dialogText[pending].title}</AlertDialogTitle>
                <AlertDialogDescription>{dialogText[pending].body}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirm} className="btn-cta-gradient">
                  {dialogText[pending].cta}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
