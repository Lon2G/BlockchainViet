import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Group, Mesh, Quaternion, TextureLoader, Vector2, Vector3 } from 'three'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatEther } from '@/lib/web3'
import { Activity, ArrowRight, Clock3, Globe2, Target, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CampaignPin {
  id: string
  position: [number, number, number]
  title: string
  raised: bigint
  goal: bigint
  category?: string
  donorCount?: number
  deadline?: number
}

interface GlobeProps {
  campaigns: CampaignPin[]
  onCampaignClick?: (campaignId: string) => void
}

const worldUp = new Vector3(0, 1, 0)
const earthNormalScale = new Vector2(0.85, 0.85)

function CampaignMarker({
  campaign,
  isActive,
  isHovered,
  onSelect,
  onHover
}: {
  campaign: CampaignPin
  isActive: boolean
  isHovered: boolean
  onSelect: () => void
  onHover: (value: boolean) => void
}) {
  const markerRef = useRef<Group>(null)
  const pulseRef = useRef<Mesh>(null)
  const progress = Math.min(100, Math.max(0, (Number(campaign.raised) / Number(campaign.goal || 1n)) * 100))

  const { origin, rotation } = useMemo(() => {
    const direction = new Vector3(...campaign.position).normalize()
    const quaternion = new Quaternion().setFromUnitVectors(worldUp, direction)
    return {
      origin: direction.multiplyScalar(2.02),
      rotation: quaternion
    }
  }, [campaign.position])

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime

    if (markerRef.current) {
      markerRef.current.scale.setScalar(isActive ? 1.2 : isHovered ? 1.08 : 1)
    }

    if (pulseRef.current) {
      const pulse = 1 + ((Math.sin(elapsed * 2.4) + 1) / 2) * 0.8
      pulseRef.current.scale.setScalar(isActive ? pulse : isHovered ? 1.25 : 1)
      const material = pulseRef.current.material
      if ('opacity' in material) {
        material.opacity = isActive ? 0.42 : isHovered ? 0.28 : 0.16
      }
    }
  })

  return (
    <group
      position={origin}
      quaternion={rotation}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        onHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        onHover(false)
        document.body.style.cursor = 'default'
      }}
    >
      <group ref={markerRef}>
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.22, 10]} />
          <meshStandardMaterial color={0x9ecbff} emissive={0x1d4ed8} emissiveIntensity={0.55} />
        </mesh>

        <mesh position={[0, 0.31, 0]}>
          <sphereGeometry args={[0.06, 18, 18]} />
          <meshStandardMaterial
            color={progress >= 100 ? 0x22c55e : 0x3b82f6}
            emissive={progress >= 100 ? 0x16a34a : 0x2563eb}
            emissiveIntensity={isActive ? 1.2 : 0.75}
          />
        </mesh>

        <mesh ref={pulseRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.31, 0]}>
          <ringGeometry args={[0.09, 0.16, 32]} />
          <meshBasicMaterial
            color={progress >= 100 ? 0x4ade80 : 0x60a5fa}
            transparent
            opacity={0.16}
            side={2}
          />
        </mesh>
      </group>
    </group>
  )
}

function EarthGlobe({
  campaigns,
  selectedId,
  hoveredId,
  onCampaignSelect,
  onCampaignHover
}: {
  campaigns: CampaignPin[]
  selectedId: string | null
  hoveredId: string | null
  onCampaignSelect: (campaignId: string) => void
  onCampaignHover: (campaignId: string | null) => void
}) {
  const globeRef = useRef<Mesh>(null)
  const cloudRef = useRef<Mesh>(null)
  const [earthMap, earthNormalMap, earthSpecularMap, earthCloudMap] = useLoader(TextureLoader, [
    '/textures/earth/earth_atmos_2048.jpg',
    '/textures/earth/earth_normal_2048.jpg',
    '/textures/earth/earth_specular_2048.jpg',
    '/textures/earth/earth_clouds_1024.png'
  ])

  useFrame(() => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.0018
    }

    if (cloudRef.current) {
      cloudRef.current.rotation.y -= 0.0009
    }
  })

  return (
    <group>
      <Stars radius={80} depth={50} count={2000} factor={4} saturation={0} fade speed={0.5} />

      <mesh ref={globeRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          color={0xffffff}
          map={earthMap}
          normalMap={earthNormalMap}
          normalScale={earthNormalScale}
          roughnessMap={earthSpecularMap}
          roughness={0.82}
          metalness={0.06}
          emissive={0x0b1836}
          emissiveIntensity={0.26}
        />
      </mesh>

      <mesh scale={0.995}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshBasicMaterial color={0x07101f} />
      </mesh>

      <mesh ref={cloudRef}>
        <sphereGeometry args={[2.04, 40, 40]} />
        <meshStandardMaterial
          map={earthCloudMap}
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>

      <mesh scale={1.1}>
        <sphereGeometry args={[2, 48, 48]} />
        <meshBasicMaterial color={0x60a5fa} transparent opacity={0.08} />
      </mesh>

      {campaigns.map((campaign) => (
        <CampaignMarker
          key={campaign.id}
          campaign={campaign}
          isActive={selectedId === campaign.id}
          isHovered={hoveredId === campaign.id}
          onSelect={() => onCampaignSelect(campaign.id)}
          onHover={(value) => onCampaignHover(value ? campaign.id : null)}
        />
      ))}
    </group>
  )
}

export default function Globe({ campaigns, onCampaignClick }: GlobeProps) {
  const [selectedId, setSelectedId] = useState<string | null>(campaigns[0]?.id ?? null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    if (!campaigns.length) {
      setSelectedId(null)
      return
    }

    if (!selectedId || !campaigns.some((campaign) => campaign.id === selectedId)) {
      setSelectedId(campaigns[0].id)
    }
  }, [campaigns, selectedId])

  const selectedCampaign = campaigns.find((campaign) => campaign.id === (hoveredId || selectedId)) ?? campaigns[0]
  const topCampaigns = useMemo(
    () =>
      [...campaigns]
        .sort((left, right) => Number(right.raised) / Number(right.goal || 1n) - Number(left.raised) / Number(left.goal || 1n))
        .slice(0, 5),
    [campaigns]
  )

  if (campaigns.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center shadow-card-3d">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-blockchain">
          <Globe2 className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-semibold">Impact map is waiting for campaigns</h3>
        <p className="mt-2 text-muted-foreground">
          Once campaigns are available, their simulated global positions will appear here automatically.
        </p>
      </div>
    )
  }

  const selectedProgress = Math.min(
    100,
    Math.max(0, (Number(selectedCampaign.raised) / Number(selectedCampaign.goal || 1n)) * 100)
  )
  const daysLeft = selectedCampaign.deadline
    ? Math.max(0, Math.ceil((selectedCampaign.deadline * 1000 - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.7fr)_360px]">
        <div className="relative self-start overflow-hidden rounded-[28px] border border-border bg-card/70 shadow-card-3d">
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-white/10 bg-background/45 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-sm font-medium">Simulated Global Activity Layer</p>
            <p className="text-xs text-muted-foreground">
              Campaign nodes are placed on generated world coordinates for a stable impact-map experience.
            </p>
          </div>
          <Badge variant="secondary" className="gap-2">
            <Activity className="h-3.5 w-3.5" />
            {campaigns.length} live node(s)
          </Badge>
        </div>

        <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-background/60 backdrop-blur">
            Blue node: Active fundraising
          </Badge>
          <Badge variant="outline" className="bg-background/60 backdrop-blur">
            Green node: Goal reached
          </Badge>
        </div>

        <div className="h-[450px]">
          <Canvas camera={{ position: [0, 0, 5.1], fov: 48 }}>
            <ambientLight intensity={0.92} />
            <hemisphereLight intensity={0.6} color={0xb8d8ff} groundColor={0x0a1224} />
            <pointLight position={[10, 8, 6]} intensity={1.45} color={0x93c5fd} />
            <pointLight position={[-8, -6, -8]} intensity={0.7} color={0x4ade80} />

            <group position={[0, -0.24, 0]}>
              <EarthGlobe
                campaigns={campaigns}
                selectedId={selectedId}
                hoveredId={hoveredId}
                onCampaignSelect={(campaignId) => setSelectedId(campaignId)}
                onCampaignHover={setHoveredId}
              />
            </group>

            <OrbitControls
              enablePan={false}
              enableZoom
              maxDistance={8}
              minDistance={3.2}
              target={[0, -0.24, 0]}
              autoRotate
              autoRotateSpeed={0.55}
            />
          </Canvas>
        </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-border bg-card/80 p-5 shadow-card-3d">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Active campaign node</p>
                <h3 className="mt-1 text-xl font-semibold">{selectedCampaign.title}</h3>
              </div>
              {selectedCampaign.category && (
                <Badge variant="outline">{selectedCampaign.category}</Badge>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Funding progress</span>
                <span className="font-medium">{selectedProgress.toFixed(1)}%</span>
              </div>
              <Progress value={selectedProgress} variant="liquid" className="h-2.5" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-xs text-muted-foreground">Raised</p>
                  <p className="mt-1 text-lg font-semibold">{formatEther(selectedCampaign.raised)} ETH</p>
                </div>
                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-xs text-muted-foreground">Target</p>
                  <p className="mt-1 text-lg font-semibold">{formatEther(selectedCampaign.goal)} ETH</p>
                </div>
                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-xs text-muted-foreground">Donors</p>
                  <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
                    <Users className="h-4 w-4 text-primary" />
                    {selectedCampaign.donorCount ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-xs text-muted-foreground">Days left</p>
                  <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
                    <Clock3 className="h-4 w-4 text-primary" />
                    {daysLeft ?? '--'}
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="blockchain"
              className="mt-5 w-full justify-between rounded-2xl"
              onClick={() => onCampaignClick?.(selectedCampaign.id)}
            >
              Open campaign
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-border bg-card/80 p-5 shadow-card-3d">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Top impact nodes</p>
            <h3 className="text-lg font-semibold">Campaign map feed</h3>
          </div>
          <Badge variant="secondary" className="gap-2">
            <Target className="h-3.5 w-3.5" />
            Ranked
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {topCampaigns.map((campaign, index) => {
            const progress = Math.min(100, Math.max(0, (Number(campaign.raised) / Number(campaign.goal || 1n)) * 100))
            const isCurrent = campaign.id === selectedCampaign.id

            return (
              <button
                key={campaign.id}
                type="button"
                onClick={() => setSelectedId(campaign.id)}
                className={cn(
                  'w-full rounded-2xl border p-4 text-left transition-all',
                  isCurrent
                    ? 'border-primary/40 bg-primary/10 shadow-blockchain'
                    : 'border-border bg-background/50 hover:border-primary/30 hover:bg-background/80'
                )}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Node #{index + 1}</p>
                    <p className="truncate font-medium">{campaign.title}</p>
                  </div>
                  <Badge variant={progress >= 100 ? 'secondary' : 'outline'}>
                    {progress.toFixed(0)}%
                  </Badge>
                </div>
                <Progress value={progress} className="h-2" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
