import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount, useBalance, useChainId } from 'wagmi'
import Navbar from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ArrowRight, Upload, Calendar, DollarSign, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createCampaignOnChain, getMockAccountAddress } from '@/lib/campaigns'
import { IS_MOCK_BACKEND, SEPOLIA_CHAIN, parseEther } from '@/lib/web3'

interface CampaignFormData {
  title: string
  description: string
  goal: string
  initialDeposit: string
  deadline: string
  category: string
  coverImage: File | null
}

const steps = [
  { id: 1, title: 'Basic Info', description: 'Campaign details and description' },
  { id: 2, title: 'Goals & Timeline', description: 'Funding goal and deadline' },
  { id: 3, title: 'Media & Category', description: 'Images and categorization' },
  { id: 4, title: 'Review & Deploy', description: 'Final review and blockchain deployment' }
]

const categories = [
  'Education', 'Healthcare', 'Environment', 'Disaster Relief', 
  'Poverty Alleviation', 'Technology', 'Arts & Culture', 'Sports'
]

export default function CreateCampaign() {
  const navigate = useNavigate()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { toast } = useToast()
  const canCreateCampaign = IS_MOCK_BACKEND || isConnected
  const { data: balance } = useBalance({
    address,
    chainId: SEPOLIA_CHAIN.id,
    query: {
      enabled: Boolean(address) && !IS_MOCK_BACKEND
    }
  })
  
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CampaignFormData>({
    title: '',
    description: '',
    goal: '',
    initialDeposit: '',
    deadline: '',
    category: '',
    coverImage: null
  })

  const updateFormData = (field: keyof CampaignFormData, value: string | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateStep = () => {
    if (currentStep === 1) {
      if (!formData.title.trim() || !formData.description.trim()) {
        toast({
          title: 'Missing campaign info',
          description: 'Please complete the title and description before continuing.',
          variant: 'destructive'
        })
        return false
      }
    }

    if (currentStep === 2) {
      if (!formData.goal || Number(formData.goal) <= 0) {
        toast({
          title: 'Invalid funding goal',
          description: 'Funding goal must be greater than 0 ETH.',
          variant: 'destructive'
        })
        return false
      }

      if (!formData.deadline) {
        toast({
          title: 'Deadline required',
          description: 'Please choose a future deadline for the campaign.',
          variant: 'destructive'
        })
        return false
      }

      const deadlineDate = new Date(formData.deadline)
      if (Number.isNaN(deadlineDate.getTime()) || deadlineDate.getTime() <= Date.now()) {
        toast({
          title: 'Invalid deadline',
          description: 'Campaign deadline must be in the future.',
          variant: 'destructive'
        })
        return false
      }

      if (formData.initialDeposit && Number(formData.initialDeposit) < 0) {
        toast({
          title: 'Invalid SepoliaETH amount',
          description: 'Initial deposit cannot be negative.',
          variant: 'destructive'
        })
        return false
      }

      if (
        !IS_MOCK_BACKEND &&
        balance &&
        formData.initialDeposit &&
        parseFloat(formData.initialDeposit) >= parseFloat(balance.formatted)
      ) {
        toast({
          title: 'Insufficient SepoliaETH for gas',
          description: 'Leave a small amount in MetaMask for gas instead of sending your full balance.',
          variant: 'destructive'
        })
        return false
      }
    }

    if (currentStep === 3 && !formData.category) {
      toast({
        title: 'Category required',
        description: 'Please select a category before continuing.',
        variant: 'destructive'
      })
      return false
    }

    return true
  }

  const handleNext = () => {
    if (currentStep < steps.length && validateStep()) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!canCreateCampaign) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create a campaign",
        variant: "destructive"
      })
      return
    }

    if (!validateStep()) {
      return
    }

    setIsSubmitting(true)
    
    try {
      const goal = parseEther(formData.goal)
      const initialDeposit = formData.initialDeposit ? parseEther(formData.initialDeposit) : 0n
      const deadline = Math.floor(new Date(formData.deadline).getTime() / 1000)
      const coordinator = address ?? getMockAccountAddress()

      const result = await createCampaignOnChain({
        coordinator,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        goal,
        deadline,
        initialDeposit
      })
      
      toast({
        title: "Campaign Created Successfully!",
        description: result.donationTxHash
          ? 'Your campaign is now live and its opening contribution has been recorded.'
          : 'Your campaign is now live and ready to receive donations.',
      })
      
      navigate('/')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.'
      toast({
        title: "Error creating campaign",
        description: message,
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Campaign Title</Label>
              <Input
                id="title"
                placeholder="Enter a compelling campaign title"
                value={formData.title}
                onChange={(e) => updateFormData('title', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your campaign, its goals, and impact"
                className="min-h-32"
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
              />
            </div>
          </div>
        )
      
      case 2:
        return (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Campaign Status</p>
                  <p className="text-sm text-muted-foreground">
                    {IS_MOCK_BACKEND
                      ? 'Your campaign workspace is ready and available for publishing.'
                      : 'Campaign deploy and initial funding both use Ethereum Sepolia.'}
                  </p>
                </div>
                <Badge variant={IS_MOCK_BACKEND || chainId === SEPOLIA_CHAIN.id ? 'default' : 'destructive'}>
                  {IS_MOCK_BACKEND ? 'Ready' : chainId === SEPOLIA_CHAIN.id ? 'Sepolia ready' : 'Switch MetaMask to Sepolia'}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {IS_MOCK_BACKEND
                  ? 'You can publish campaigns and track contributions immediately.'
                  : `Wallet balance: ${balance ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}` : 'Loading...'}`}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal">Funding Goal (ETH)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="goal"
                  type="number"
                  placeholder="5.0"
                  className="pl-10"
                  value={formData.goal}
                  onChange={(e) => updateFormData('goal', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="initialDeposit">Initial Deposit (SepoliaETH)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="initialDeposit"
                  type="number"
                  placeholder="0.05"
                  className="pl-10"
                  value={formData.initialDeposit}
                  onChange={(e) => updateFormData('initialDeposit', e.target.value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {IS_MOCK_BACKEND
                  ? 'Optional. Add an opening contribution when the campaign is created.'
                  : 'Optional. If you enter an amount here, MetaMask will send that SepoliaETH directly into the new campaign contract right after deployment.'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Campaign Deadline</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="deadline"
                  type="date"
                  className="pl-10"
                  value={formData.deadline}
                  onChange={(e) => updateFormData('deadline', e.target.value)}
                />
              </div>
            </div>
          </div>
        )
      
      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                className="w-full p-2 border border-border rounded-md bg-background"
                value={formData.category}
                onChange={(e) => updateFormData('category', e.target.value)}
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coverImage">Cover Image</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Upload campaign cover image</p>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => updateFormData('coverImage', e.target.files?.[0] || null)}
                />
              </div>
            </div>
          </div>
        )
      
      case 4:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Campaign Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <p className="font-medium">{formData.title || 'Not set'}</p>
                </div>
                <div>
                  <Label>Goal</Label>
                  <p className="font-medium">{formData.goal || '0'} ETH</p>
                </div>
                <div>
                  <Label>Initial SepoliaETH Deposit</Label>
                  <p className="font-medium">{formData.initialDeposit || '0'} SepoliaETH</p>
                </div>
                <div>
                  <Label>Deadline</Label>
                  <p className="font-medium">{formData.deadline || 'Not set'}</p>
                </div>
                <div>
                  <Label>Category</Label>
                  <Badge>{formData.category || 'Not set'}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      
      default:
        return null
    }
  }

  if (!canCreateCampaign) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Connect Wallet Required</CardTitle>
              <CardDescription>
                You need to connect your wallet to create a campaign
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Create New Campaign
            </h1>
            <p className="text-muted-foreground mt-2">
              {IS_MOCK_BACKEND
                ? 'Launch your charitable campaign and start receiving support'
                : 'Launch your charitable campaign on the blockchain'}
            </p>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              {steps.map((step) => (
                <div 
                  key={step.id}
                  className={`flex items-center gap-2 ${
                    currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {step.id}
                  </div>
                  <div className="hidden sm:block">
                    <p className="font-medium text-sm">{step.title}</p>
                  </div>
                </div>
              ))}
            </div>
            <Progress value={(currentStep / steps.length) * 100} variant="liquid" />
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>{steps[currentStep - 1].title}</CardTitle>
              <CardDescription>{steps[currentStep - 1].description}</CardDescription>
            </CardHeader>
            <CardContent>
              {renderStepContent()}
              
              <div className="flex justify-between pt-6">
                <Button 
                  variant="outline" 
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                >
                  Previous
                </Button>
                
                {currentStep === steps.length ? (
                  <Button 
                    variant="charity" 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Deploying...' : 'Deploy Campaign'}
                  </Button>
                ) : (
                  <Button 
                    variant="blockchain" 
                    onClick={handleNext}
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
