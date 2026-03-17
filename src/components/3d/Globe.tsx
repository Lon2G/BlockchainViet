import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Mesh } from 'three'
import * as THREE from 'three'

interface CampaignPin {
  id: string
  position: [number, number, number]
  title: string
  raised: bigint
  goal: bigint
}

interface GlobeProps {
  campaigns: CampaignPin[]
  onCampaignClick?: (campaignId: string) => void
}

function CampaignMarker({ 
  position, 
  title, 
  raised, 
  goal, 
  onClick 
}: CampaignPin & { onClick?: () => void }) {
  const meshRef = useRef<Mesh>(null)
  const percentage = (Number(raised) / Number(goal)) * 100

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5
    }
  })

  return (
    <group position={position}>
      <mesh ref={meshRef} onClick={onClick}>
        <boxGeometry args={[0.1, 0.3, 0.1]} />
        <meshStandardMaterial 
          color={percentage >= 100 ? 0x4ade80 : 0x3b82f6}
        />
      </mesh>
    </group>
  )
}

function EarthGlobe({ campaigns, onCampaignClick }: GlobeProps) {
  const globeRef = useRef<Mesh>(null)
  
  useFrame(() => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.002
    }
  })

  return (
    <group>
      <mesh ref={globeRef}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial 
          color={0x4FC3F7}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {campaigns.map((campaign) => (
        <CampaignMarker
          key={campaign.id}
          {...campaign}
          onClick={() => onCampaignClick?.(campaign.id)}
        />
      ))}
    </group>
  )
}

export default function Globe({ campaigns, onCampaignClick }: GlobeProps) {
  return (
    <div className="w-full h-[600px] rounded-xl overflow-hidden shadow-card-3d">
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <EarthGlobe campaigns={campaigns} onCampaignClick={onCampaignClick} />
        
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          maxDistance={10}
          minDistance={3}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  )
}