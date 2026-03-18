import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import FlipCard from '@/components/3d/FlipCard'
import { formatEther } from '@/lib/web3'
import { Clock, Users, Target } from 'lucide-react'

interface CampaignCardProps {
  id: string
  title: string
  description: string
  source?: 'mock' | 'chain' | 'demo'
  category?: string
  coordinator: string
  goal: bigint
  raised: bigint
  deadline: number
  donorCount: number
  fundingStatus?: 'active' | 'goal-reached' | 'successful' | 'expired' | 'refunded'
  onDonate?: () => void
  onViewDetails?: () => void
}

export default function CampaignCard({
  id,
  title,
  description,
  source,
  category,
  coordinator,
  goal,
  raised,
  deadline,
  donorCount,
  fundingStatus,
  onDonate,
  onViewDetails
}: CampaignCardProps) {
  const progress = Number(raised) / Number(goal) * 100
  const daysLeft = Math.max(0, Math.ceil((deadline * 1000 - Date.now()) / (1000 * 60 * 60 * 24)))
  const isCompleted = progress >= 100
  const isRefunded = fundingStatus === 'refunded'
  const isExpired = (daysLeft === 0 && !isCompleted) || fundingStatus === 'expired'

  const frontContent = (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg leading-tight">{title}</h3>
          <div className="flex flex-wrap items-center gap-2">
            {category && (
              <Badge variant="outline" className="w-fit">
                {category}
              </Badge>
            )}
            {source === 'chain' && (
              <Badge variant="secondary" className="w-fit">
                On-chain
              </Badge>
            )}
            {source === 'mock' && (
              <Badge variant="outline" className="w-fit">
                Mock
              </Badge>
            )}
            {source === 'demo' && (
              <Badge variant="outline" className="w-fit">
                Demo
              </Badge>
            )}
          </div>
        </div>
        <Badge variant={isCompleted ? "default" : isExpired || isRefunded ? "destructive" : "secondary"}>
          {isRefunded ? "Refunded" : isCompleted ? "Completed" : isExpired ? "Expired" : `${daysLeft}d left`}
        </Badge>
      </div>
      
      <p className="text-muted-foreground text-sm line-clamp-3">{description}</p>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span className="font-medium">{formatEther(raised)} / {formatEther(goal)} ETH</span>
        </div>
        <Progress value={progress} variant="liquid" className="h-2" />
        <div className="text-xs text-muted-foreground">{progress.toFixed(1)}% funded</div>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>{donorCount} donors</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{daysLeft} days left</span>
        </div>
      </div>
    </div>
  )

  const backContent = (
    <div className="space-y-4 h-full flex flex-col justify-between">
      <div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <div className="space-y-2 text-sm">
          {category && (
            <div className="flex justify-between">
              <span>Category:</span>
              <span>{category}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Coordinator:</span>
            <span className="font-mono text-xs">{coordinator.slice(0, 10)}...</span>
          </div>
          <div className="flex justify-between">
            <span>Goal:</span>
            <span>{formatEther(goal)} ETH</span>
          </div>
          <div className="flex justify-between">
            <span>Raised:</span>
            <span>{formatEther(raised)} ETH</span>
          </div>
          <div className="flex justify-between">
            <span>Donors:</span>
            <span>{donorCount}</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <Button 
          variant="secondary" 
          className="w-full" 
          onClick={onViewDetails}
        >
          View Details
        </Button>
        {!isCompleted && !isExpired && !isRefunded && (
          <Button 
            variant="donate" 
            className="w-full" 
            onClick={onDonate}
          >
            <Target className="w-4 h-4 mr-2" />
            {source === 'chain' ? 'Donate On-Chain' : 'Donate Demo'}
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <FlipCard 
      front={frontContent} 
      back={backContent}
      className="h-80"
    />
  )
}
