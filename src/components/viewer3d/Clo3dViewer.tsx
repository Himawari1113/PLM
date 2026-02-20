'use client'

import { Suspense, useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Center, Html } from '@react-three/drei'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'

function normalizeModel(object: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  if (maxDim > 0) {
    const scale = 2 / maxDim
    object.scale.setScalar(scale)
    object.position.set(
      -center.x * scale,
      -center.y * scale,
      -center.z * scale,
    )
  }
}

function applyDefaultMaterial(object: THREE.Object3D) {
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      if (!mesh.material || (Array.isArray(mesh.material) && mesh.material.length === 0)) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0xcccccc,
          roughness: 0.5,
          metalness: 0.1,
        })
      }
    }
  })
}

function LoadingIndicator() {
  return (
    <Html center>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        color: 'var(--color-gray-500)',
        fontSize: 13,
      }}>
        <div className="bp-spinner" />
        <span>Loading 3D Model...</span>
      </div>
    </Html>
  )
}

function SceneContent({ sceneObject }: { sceneObject: THREE.Object3D }) {
  return (
    <Center>
      <primitive object={sceneObject} />
    </Center>
  )
}

function detectFormat(fileName?: string): 'glb' | 'obj' {
  const name = (fileName || '').toLowerCase()
  if (name.endsWith('.obj')) return 'obj'
  return 'glb'
}

function base64ToArrayBuffer(dataUrl: string): ArrayBuffer {
  const parts = dataUrl.split(',')
  const base64 = parts[1] || parts[0]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function base64ToText(dataUrl: string): string {
  const parts = dataUrl.split(',')
  const base64 = parts[1] || parts[0]
  return atob(base64)
}

interface Clo3dViewerProps {
  fileDataUrl: string
  fileName?: string
  height?: number
}

export function Clo3dViewer({ fileDataUrl, fileName, height = 400 }: Clo3dViewerProps) {
  const [autoRotate, setAutoRotate] = useState(true)
  const [sceneObject, setSceneObject] = useState<THREE.Object3D | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const format = useMemo(() => detectFormat(fileName), [fileName])

  const loadModel = useCallback(async () => {
    if (!fileDataUrl) {
      setSceneObject(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (format === 'obj') {
        // OBJ: parse as text
        let objText: string
        if (fileDataUrl.startsWith('data:')) {
          objText = base64ToText(fileDataUrl)
        } else {
          const resp = await fetch(fileDataUrl)
          objText = await resp.text()
        }

        const loader = new OBJLoader()
        const obj = loader.parse(objText)
        applyDefaultMaterial(obj)
        normalizeModel(obj)
        setSceneObject(obj)
      } else {
        // GLB / glTF: parse as ArrayBuffer
        let buffer: ArrayBuffer
        if (fileDataUrl.startsWith('data:')) {
          buffer = base64ToArrayBuffer(fileDataUrl)
        } else {
          const resp = await fetch(fileDataUrl)
          buffer = await resp.arrayBuffer()
        }

        const loader = new GLTFLoader()

        // Add Draco decoder support
        const dracoLoader = new DRACOLoader()
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
        loader.setDRACOLoader(dracoLoader)

        loader.parse(
          buffer,
          '',
          (gltf) => {
            const scene = gltf.scene
            normalizeModel(scene)
            setSceneObject(scene)
            setLoading(false)
          },
          (err) => {
            console.error('GLTF parse error:', err)
            setError('Failed to parse GLB/glTF file')
            setLoading(false)
          },
        )
        return // loading state is managed inside parse callbacks
      }
    } catch (e: any) {
      console.error('3D model load error:', e)
      setError(e?.message || 'Failed to load 3D file')
    }

    setLoading(false)
  }, [fileDataUrl, format])

  useEffect(() => {
    loadModel()
  }, [loadModel])

  if (error) {
    return (
      <div style={{
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-gray-50)',
        borderRadius: 8,
        border: '1px solid var(--color-gray-200)',
        color: 'var(--color-gray-500)',
        fontSize: 13,
        gap: 8,
      }}>
        <span>⚠️ {error}</span>
        <button
          type="button"
          className="bp-button bp-button--secondary bp-button--sm"
          onClick={loadModel}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!fileDataUrl) return null

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        height,
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid var(--color-gray-200)',
        background: 'linear-gradient(135deg, #f8f9fb 0%, #eef1f5 100%)',
      }}>
        <Canvas
          camera={{ position: [0, 1, 3], fov: 45, near: 0.1, far: 100 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
          <directionalLight position={[-3, 3, -3]} intensity={0.4} />
          <directionalLight position={[0, -2, 3]} intensity={0.2} />

          {loading && <LoadingIndicator />}

          {sceneObject && (
            <Suspense fallback={<LoadingIndicator />}>
              <SceneContent sceneObject={sceneObject} />
              <Environment preset="studio" />
            </Suspense>
          )}

          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            autoRotate={autoRotate}
            autoRotateSpeed={1.5}
            minDistance={0.5}
            maxDistance={15}
          />
          <gridHelper args={[4, 8, '#ddd', '#eee']} position={[0, -1.2, 0]} />
        </Canvas>
      </div>

      {/* Controls overlay */}
      <div style={{
        position: 'absolute',
        bottom: 8,
        left: 8,
        display: 'flex',
        gap: 6,
        alignItems: 'center',
      }}>
        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          style={{
            background: autoRotate ? 'var(--color-primary)' : 'rgba(255,255,255,0.9)',
            color: autoRotate ? '#fff' : 'var(--color-gray-600)',
            border: '1px solid var(--color-gray-300)',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11,
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
          }}
        >
          {autoRotate ? '⏸ Pause' : '▶ Rotate'}
        </button>
        {fileName && (
          <span style={{
            fontSize: 11,
            color: 'var(--color-gray-500)',
            background: 'rgba(255,255,255,0.85)',
            padding: '3px 8px',
            borderRadius: 4,
            backdropFilter: 'blur(4px)',
          }}>
            {fileName}
          </span>
        )}
      </div>
    </div>
  )
}
