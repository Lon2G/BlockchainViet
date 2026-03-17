import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface FlipCardProps {
  front: ReactNode
  back: ReactNode
  className?: string
}

export default function FlipCard({ front, back, className }: FlipCardProps) {
  return (
    <div className={cn("flip-card w-full h-64", className)}>
      <motion.div 
        className="flip-card-inner"
        whileHover={{ rotateY: 180 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      >
        <div className="flip-card-front bg-card border border-border rounded-xl p-6 shadow-card-3d">
          {front}
        </div>
        <div className="flip-card-back bg-gradient-primary text-primary-foreground rounded-xl p-6 shadow-blockchain">
          {back}
        </div>
      </motion.div>
    </div>
  )
}