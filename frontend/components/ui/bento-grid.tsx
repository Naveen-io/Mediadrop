import { type ComponentPropsWithoutRef, type ReactNode } from "react"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { TextAnimate } from "@/components/ui/text-animate"

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode
  className?: string
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string
  className: string
  background: ReactNode
  Icon: React.ElementType
  description: string
  href: string
  cta: string
  onCtaClick?: () => void
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[19rem] sm:auto-rows-[20rem] grid-cols-1 md:grid-cols-3 gap-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  onCtaClick,
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    className={cn(
      "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#292929] bg-[#0A0A0A] p-6 transition-all duration-300 hover:border-white shadow-card",
      className
    )}
    {...props}
  >
    <div className="absolute inset-0 pointer-events-none">{background}</div>

    <div className="z-10 flex flex-col justify-between h-full">
      <div className="flex flex-col gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-[#111111] border border-[#292929] flex items-center justify-center text-white shrink-0 group-hover:border-white transition-colors duration-200">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <TextAnimate
            as="h3"
            by="word"
            animation="blurInUp"
            duration={0.5}
            once={true}
            className="text-base font-semibold text-white tracking-tight mb-1"
          >
            {name}
          </TextAnimate>
          <p className="text-xs text-[#A3A3A3] leading-relaxed max-w-sm">
            {description}
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-[#292929]/50 flex items-center justify-between">
        <a
          href={href}
          onClick={(e) => {
            if (onCtaClick) {
              e.preventDefault();
              onCtaClick();
            }
          }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-white hover:text-[#A3A3A3] transition-colors cursor-pointer"
        >
          <span>{cta}</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </a>
      </div>
    </div>
  </div>
)

export { BentoCard, BentoGrid }
