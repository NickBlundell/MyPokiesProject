'use client'

import { useEffect, useRef } from 'react'

export default function StarfieldBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined' || !containerRef.current) return

    // Dynamically import Three.js
    import('three').then((THREE) => {
      if (!containerRef.current) return

      let scene: any, camera: any, renderer: any, stars: any, starMaterial: any
      let circleStars: any, circleStarMaterial: any
      let scrollY = 0
      let targetX = 0, targetY = 0
      let shootingStars: any[] = []
      let lastShootingStarTime = 0
      let animationFrameId: number

      // Settings from user
      const settings = {
        stars: {
          count: 1000,
          size: 1,
          spreadRadius: 70,
          depth: 50,
          parallaxIntensity: 0.05,
          glowSoftness: 0.15,
          glowBlur: 0.08,
          concaveAmount: 0.2,
          cornerSharpness: 0.05,
          centerSize: 0.45,
          breatheSpeed: 5,
          breatheAmount: 1
        },
        shootingStars: {
          enabled: true,
          frequency: 9,
          speed: 1.9
        },
        finalStar: {
          size: 7.5,
          glowSoftness: 0.1,
          glowBlur: 0.08,
          concaveAmount: 0.2,
          cornerSharpness: 0.05,
          centerSize: 0.45,
          disappearSpeed: 0.5
        }
      }

      // Final star settings
      const finalStarSettings = {
        size: settings.finalStar.size,
        glowSoftness: settings.finalStar.glowSoftness,
        glowBlur: settings.finalStar.glowBlur,
        concaveAmount: settings.finalStar.concaveAmount,
        cornerSharpness: settings.finalStar.cornerSharpness,
        centerSize: settings.finalStar.centerSize,
        breatheInSpeed: settings.finalStar.disappearSpeed
      }

      // ShootingStar class
      class ShootingStar {
        startPosition: any
        position: any
        endPosition: any
        controlPoint1: any
        controlPoint2: any
        curve: any
        curveProgress: number
        curveSpeed: number
        velocity: any
        hasReachedStop: boolean
        phase: string
        phaseTime: number
        life: number
        fadeSpeed: number
        trailLength: number
        line: any
        blueStream: any
        glow: any
        staticStar: any
        staticStarMaterial: any
        stopX: number
        stopY: number
        stopZ: number

        constructor() {
          const direction = Math.random() > 0.5 ? 1 : -1
          const xPos = direction > 0 ? -120 : 120
          const yPos = -40 + Math.random() * 20
          const zPos = -20 - Math.random() * 10

          this.startPosition = new THREE.Vector3(xPos, yPos, zPos)
          this.position = this.startPosition.clone()

          this.stopX = (Math.random() - 0.5) * 140
          this.stopY = 15 + Math.random() * 45
          this.stopZ = -50 - Math.random() * 40
          this.endPosition = new THREE.Vector3(this.stopX, this.stopY, this.stopZ)

          const control1X = this.startPosition.x + (this.endPosition.x - this.startPosition.x) * 0.25
          const control1Y = this.startPosition.y + (this.endPosition.y - this.startPosition.y) * 0.25
          const control1Z = this.startPosition.z + (this.endPosition.z - this.startPosition.z) * 0.25
          const curveAmount1 = 40 + Math.random() * 60
          this.controlPoint1 = new THREE.Vector3(
            control1X,
            control1Y + curveAmount1,
            control1Z - curveAmount1 * 0.5
          )

          const control2X = this.startPosition.x + (this.endPosition.x - this.startPosition.x) * 0.75
          const control2Y = this.startPosition.y + (this.endPosition.y - this.startPosition.y) * 0.75
          const control2Z = this.startPosition.z + (this.endPosition.z - this.startPosition.z) * 0.75
          const curveAmount2 = 10 + Math.random() * 10
          this.controlPoint2 = new THREE.Vector3(
            control2X,
            control2Y + curveAmount2,
            control2Z - curveAmount2 * 0.5
          )

          this.curve = new THREE.CubicBezierCurve3(
            this.startPosition,
            this.controlPoint1,
            this.controlPoint2,
            this.endPosition
          )

          this.curveProgress = 0
          this.curveSpeed = 0.008
          const tangent = this.curve.getTangent(0)
          this.velocity = tangent.multiplyScalar(8)
          this.hasReachedStop = false
          this.phase = 'moving'
          this.phaseTime = 0
          this.life = 1.0
          this.fadeSpeed = 0.008
          this.trailLength = 15

          // Create trail geometries
          const trailGeometry = new THREE.CylinderGeometry(0.3, 0.1, this.trailLength, 8)
          const trailMaterial = new THREE.ShaderMaterial({
            uniforms: {
              color: { value: new THREE.Color(0xffffc7) },
              trailLength: { value: this.trailLength },
              globalAlpha: { value: 1.0 }
            },
            vertexShader: `
              varying float vOpacity;
              uniform float trailLength;
              uniform float globalAlpha;

              void main() {
                float normalizedY = (position.y + trailLength * 0.5) / trailLength;
                vOpacity = (1.0 - (normalizedY * 0.8)) * globalAlpha;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform vec3 color;
              varying float vOpacity;

              void main() {
                gl_FragColor = vec4(color, vOpacity);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          })

          this.line = new THREE.Mesh(trailGeometry, trailMaterial)
          this.line.position.copy(this.position)
          scene.add(this.line)

          const blueTrailGeometry = new THREE.CylinderGeometry(0.35, 0.12, this.trailLength, 8)
          const blueTrailMaterial = new THREE.ShaderMaterial({
            uniforms: {
              color: { value: new THREE.Color(0x66b3ff) },
              trailLength: { value: this.trailLength },
              baseOpacity: { value: 0.8 },
              globalAlpha: { value: 1.0 }
            },
            vertexShader: `
              varying float vOpacity;
              uniform float trailLength;
              uniform float baseOpacity;
              uniform float globalAlpha;

              void main() {
                float normalizedY = (position.y + trailLength * 0.5) / trailLength;
                vOpacity = baseOpacity * (1.0 - (normalizedY * 0.8)) * globalAlpha;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform vec3 color;
              varying float vOpacity;

              void main() {
                gl_FragColor = vec4(color, vOpacity);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          })

          this.blueStream = new THREE.Mesh(blueTrailGeometry, blueTrailMaterial)
          this.blueStream.position.copy(this.position)
          scene.add(this.blueStream)

          const starShape = new THREE.Shape()
          const outerRadius = 0.15
          const innerRadius = 0.06
          const spikes = 5

          for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius
            const angle = (i * Math.PI) / spikes
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            if (i === 0) {
              starShape.moveTo(x, y)
            } else {
              starShape.lineTo(x, y)
            }
          }
          starShape.closePath()

          const glowGeometry = new THREE.ShapeGeometry(starShape)
          const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1.0,
            side: THREE.DoubleSide
          })
          this.glow = new THREE.Mesh(glowGeometry, glowMaterial)
          this.glow.position.copy(this.position)
          scene.add(this.glow)

          const starGeometry = new THREE.BufferGeometry()
          const starPos = [0, 0, 0]
          const starColors = [1.0, 1.0, 1.0]
          const starSizes = [finalStarSettings.size]

          starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3))
          starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3))
          starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1))

          this.staticStarMaterial = new THREE.ShaderMaterial({
            uniforms: {
              time: { value: 0 },
              glowSoftness: { value: finalStarSettings.glowSoftness },
              glowFade: { value: finalStarSettings.glowBlur },
              concaveAmount: { value: finalStarSettings.concaveAmount },
              cornerSharpness: { value: finalStarSettings.cornerSharpness },
              centerSize: { value: finalStarSettings.centerSize },
              breatheSpeed: { value: 2.0 },
              breatheAmount: { value: 0.8 },
              customAlpha: { value: 0.0 },
              customSize: { value: 1.0 }
            },
            vertexShader: `
              attribute float size;
              attribute vec3 color;
              varying vec3 vColor;
              varying float vAlpha;
              uniform float time;
              uniform float customAlpha;
              uniform float customSize;

              void main() {
                vColor = color;
                vAlpha = customAlpha;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * customSize * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
              }
            `,
            fragmentShader: `
              varying vec3 vColor;
              varying float vAlpha;
              uniform float glowSoftness;
              uniform float glowFade;
              uniform float concaveAmount;
              uniform float cornerSharpness;
              uniform float centerSize;

              void main() {
                vec2 p = gl_PointCoord - vec2(0.5);

                float baseSize = 0.25;
                float cornerDist = max(abs(p.x), abs(p.y));
                float sideDist = min(abs(p.x), abs(p.y));
                float side = baseSize + cornerSharpness * (cornerDist / (cornerDist + 0.1));

                float top = p.y - side + concaveAmount * (1.0 - abs(p.x / side));
                float bottom = -p.y - side + concaveAmount * (1.0 - abs(p.x / side));
                float right = p.x - side + concaveAmount * (1.0 - abs(p.y / side));
                float left = -p.x - side + concaveAmount * (1.0 - abs(p.y / side));

                float d = max(max(top, bottom), max(left, right));

                float shape = 1.0 - smoothstep(-glowSoftness, glowSoftness, d);
                shape = pow(shape, glowFade);

                float dist = length(p);
                float yellowCenter = 1.0 - smoothstep(0.1, centerSize, dist);

                vec3 white = vec3(1.0, 1.0, 1.0);
                vec3 blue = vec3(0.34, 0.88, 1.0);
                vec3 color = mix(blue, white, pow(yellowCenter, 0.5));

                float alpha = shape * vAlpha;
                gl_FragColor = vec4(color, alpha);
              }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
          })

          this.staticStar = new THREE.Points(starGeometry, this.staticStarMaterial)
          this.staticStar.position.copy(this.position)
          this.staticStar.visible = false
          scene.add(this.staticStar)
        }

        update(speedMultiplier: number) {
          this.phaseTime += 0.016

          if (this.phase === 'moving') {
            this.curveProgress += this.curveSpeed * speedMultiplier

            if (this.curveProgress >= 0.85) {
              this.curveProgress = 0.85
              this.phase = 'stopping'
              this.phaseTime = 0
            }

            this.position.copy(this.curve.getPoint(this.curveProgress))
            const tangent = this.curve.getTangent(this.curveProgress)
            this.velocity = tangent.multiplyScalar(8)

            const glowScale = Math.max(0, 1.0 - (this.curveProgress / 0.85))
            this.glow.scale.set(glowScale, glowScale, glowScale)
          } else if (this.phase === 'stopping') {
            const stopDuration = 0.3
            const progress = Math.min(this.phaseTime / stopDuration, 1.0)

            if (progress >= 1.0) {
              this.phase = 'transforming'
              this.phaseTime = 0
            }
          } else if (this.phase === 'transforming') {
            const transformDuration = 0.3
            const progress = Math.min(this.phaseTime / transformDuration, 1.0)

            const shootingAlpha = 1.0 - progress
            this.line.material.uniforms.globalAlpha.value = shootingAlpha
            this.blueStream.material.uniforms.globalAlpha.value = shootingAlpha
            this.glow.material.opacity = shootingAlpha

            this.staticStar.visible = true
            this.staticStarMaterial.uniforms.customAlpha.value = progress

            if (progress >= 1.0) {
              this.glow.visible = false
              this.line.visible = false
              this.blueStream.visible = false
              this.phase = 'breathing'
              this.phaseTime = 0
            }
          } else if (this.phase === 'breathing') {
            const breatheDuration = finalStarSettings.breatheInSpeed
            const progress = Math.min(this.phaseTime / breatheDuration, 1.0)

            const size = 1.0 - progress
            this.staticStarMaterial.uniforms.customSize.value = size

            const alpha = 1.0 - progress
            this.staticStarMaterial.uniforms.customAlpha.value = alpha

            if (progress >= 1.0) {
              this.phase = 'dead'
              return false
            }
          }

          if (this.phase === 'moving') {
            this.glow.position.copy(this.position)
            this.glow.position.y += 0.075
          }

          this.staticStar.position.copy(this.position)

          if (this.phase === 'moving') {
            const velocityNorm = this.velocity.clone().normalize()
            const scale = 1.0 - (this.curveProgress / 0.85)
            const currentTrailLength = this.trailLength * Math.max(0, scale)

            const trailMidpoint = this.position.clone().sub(velocityNorm.clone().multiplyScalar(currentTrailLength / 2))
            this.line.position.copy(trailMidpoint)
            this.line.scale.set(scale, scale, scale)

            const up = new THREE.Vector3(0, 1, 0)
            const quaternion = new THREE.Quaternion()
            quaternion.setFromUnitVectors(up, velocityNorm)
            this.line.setRotationFromQuaternion(quaternion)

            const offsetPos = new THREE.Vector3(0, 0.15, 0)
            const blueTrailMidpoint = trailMidpoint.clone().add(offsetPos)
            this.blueStream.position.copy(blueTrailMidpoint)
            this.blueStream.scale.set(scale, scale, scale)
            this.blueStream.setRotationFromQuaternion(quaternion)
          }

          return true
        }

        destroy() {
          scene.remove(this.line)
          scene.remove(this.blueStream)
          scene.remove(this.glow)
          scene.remove(this.staticStar)
          this.line.geometry.dispose()
          this.line.material.dispose()
          this.blueStream.geometry.dispose()
          this.blueStream.material.dispose()
          this.glow.geometry.dispose()
          this.glow.material.dispose()
          this.staticStar.geometry.dispose()
          this.staticStarMaterial.dispose()
        }
      }

      function spawnShootingStar() {
        if (settings.shootingStars.enabled) {
          shootingStars.push(new ShootingStar())
        }
      }

      function createStars() {
        const geometry = new THREE.BufferGeometry()
        const positions = []
        const colors = []
        const sizes = []

        for (let i = 0; i < settings.stars.count; i++) {
          const x = (Math.random() - 0.5) * settings.stars.spreadRadius * 3
          const densityBias = 1.0 - Math.pow(Math.random(), 4.5)
          const y = -45 + (densityBias * 105)
          const z = -Math.random() * settings.stars.depth * 1.5

          positions.push(x, y, z)

          const starType = Math.random()
          const brightness = 0.85 + Math.random() * 0.15

          if (starType < 0.3) {
            colors.push(1.0 * brightness, 0.95 * brightness, 0.4 * brightness)
          } else {
            colors.push(0.99 * brightness, 1.0 * brightness, 0.52 * brightness)
          }

          sizes.push(settings.stars.size * (0.5 + Math.random() * 1.5))
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))

        starMaterial = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            glowSoftness: { value: settings.stars.glowSoftness },
            glowFade: { value: settings.stars.glowBlur },
            concaveAmount: { value: settings.stars.concaveAmount },
            cornerSharpness: { value: settings.stars.cornerSharpness },
            centerSize: { value: settings.stars.centerSize },
            breatheSpeed: { value: settings.stars.breatheSpeed },
            breatheAmount: { value: settings.stars.breatheAmount }
          },
          vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            varying float vAlpha;
            uniform float time;
            uniform float breatheSpeed;
            uniform float breatheAmount;

            void main() {
              vColor = color;

              float breathe = sin(time * breatheSpeed + position.x * 100.0) * 0.5 + 0.5;
              float sizeMultiplier = 0.6 + breathe * breatheAmount;
              vAlpha = 1.0 - (breathe * 0.5);

              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = size * sizeMultiplier * (300.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `,
          fragmentShader: `
            varying vec3 vColor;
            varying float vAlpha;
            uniform float glowSoftness;
            uniform float glowFade;
            uniform float concaveAmount;
            uniform float cornerSharpness;
            uniform float centerSize;

            void main() {
              vec2 p = gl_PointCoord - vec2(0.5);
              float shapeRandom = fract(vColor.r * 12.9898 + vColor.g * 78.233);
              bool isHexagon = shapeRandom < 0.33;
              bool isPentagon = shapeRandom >= 0.33 && shapeRandom < 0.66;

              float d;

              if (isHexagon) {
                float angle = atan(p.y, p.x);
                float dist = length(p);
                float sideAngle = mod(angle + 3.14159, 1.0472) - 0.5236;
                float sideDist = abs(sideAngle);
                float baseRadius = 0.25;
                float cornerSharp = 1.0 - (sideDist / 0.5236);
                float hexRadius = baseRadius + (cornerSharpness * pow(cornerSharp, 2.0));
                float concave = concaveAmount * 0.6 * (1.0 - cos(sideDist * 6.0));
                float radiusAtAngle = hexRadius - concave;
                d = dist - radiusAtAngle;
              } else if (isPentagon) {
                float angle = atan(p.y, p.x);
                float dist = length(p);
                float sideAngle = mod(angle + 3.14159, 1.25664) - 0.62832;
                float sideDist = abs(sideAngle);
                float baseRadius = 0.25;
                float cornerSharp = 1.0 - (sideDist / 0.62832);
                float pentRadius = baseRadius + (cornerSharpness * pow(cornerSharp, 2.0));
                float concave = concaveAmount * 0.6 * (1.0 - cos(sideDist * 5.0));
                float radiusAtAngle = pentRadius - concave;
                d = dist - radiusAtAngle;
              } else {
                float baseSize = 0.25;
                float cornerDist = max(abs(p.x), abs(p.y));
                float sideDist = min(abs(p.x), abs(p.y));
                float side = baseSize + cornerSharpness * (cornerDist / (cornerDist + 0.1));
                float top = p.y - side + concaveAmount * (1.0 - abs(p.x / side));
                float bottom = -p.y - side + concaveAmount * (1.0 - abs(p.x / side));
                float right = p.x - side + concaveAmount * (1.0 - abs(p.y / side));
                float left = -p.x - side + concaveAmount * (1.0 - abs(p.y / side));
                d = max(max(top, bottom), max(left, right));
              }

              float shape = 1.0 - smoothstep(-glowSoftness, glowSoftness, d);
              shape = pow(shape, glowFade);

              float dist = length(p);
              float yellowCenter = 1.0 - smoothstep(0.1, centerSize, dist);

              vec3 white = vec3(1.0, 1.0, 1.0);
              vec3 outerColor;
              bool isYellowStar = vColor.r > 0.98 && vColor.g > 0.9 && vColor.b < 0.6;

              if (isYellowStar) {
                outerColor = vec3(1.0, 0.85, 0.3);
              } else {
                outerColor = vec3(0.34, 0.88, 1.0);
              }

              vec3 color = mix(outerColor, white, pow(yellowCenter, 0.5));
              float alpha = shape * vAlpha;

              gl_FragColor = vec4(color, alpha);
            }
          `,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })

        stars = new THREE.Points(geometry, starMaterial)
        scene.add(stars)
      }

      function createCircleStars() {
        const count = Math.floor(settings.stars.count * 0.25)
        const geometry = new THREE.BufferGeometry()
        const positions = []
        const colors = []
        const sizes = []
        const phases = []

        for (let i = 0; i < count; i++) {
          const x = (Math.random() - 0.5) * settings.stars.spreadRadius * 3
          const densityBias = 1.0 - Math.pow(Math.random(), 4.5)
          const y = -45 + (densityBias * 105)
          const z = -Math.random() * settings.stars.depth * 1.5

          positions.push(x, y, z)
          colors.push(1.0, 1.0, 1.0)
          sizes.push(settings.stars.size * (0.5 + Math.random() * 1.5))
          phases.push(Math.random() * Math.PI * 2)
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))
        geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1))

        circleStarMaterial = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            breatheSpeed: { value: 2.0 }
          },
          vertexShader: `
            attribute float size;
            attribute vec3 color;
            attribute float phase;
            varying vec3 vColor;
            varying float vAlpha;
            uniform float time;
            uniform float breatheSpeed;

            void main() {
              vColor = color;
              float breathe = abs(sin(time * breatheSpeed + phase));
              float sizeMultiplier = breathe;
              vAlpha = breathe;

              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = size * sizeMultiplier * (300.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `,
          fragmentShader: `
            varying vec3 vColor;
            varying float vAlpha;

            void main() {
              vec2 p = gl_PointCoord - vec2(0.5);
              float dist = length(p);
              float circleRadius = 0.25;

              float core = 1.0 - smoothstep(0.0, circleRadius * 0.5, dist);
              float middle = 1.0 - smoothstep(circleRadius * 0.5, circleRadius, dist);
              float glow = 1.0 - smoothstep(circleRadius, circleRadius * 2.0, dist);

              float shape = core + middle * 0.6 + glow * 0.3;
              vec3 white = vec3(1.0, 1.0, 1.0);
              float alpha = shape * vAlpha;

              gl_FragColor = vec4(white, alpha);
            }
          `,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })

        circleStars = new THREE.Points(geometry, circleStarMaterial)
        scene.add(circleStars)
      }

      function onScroll() {
        scrollY = window.scrollY
      }

      function init() {
        if (!containerRef.current) return

        scene = new THREE.Scene()
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
        camera.position.z = 50

        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
        renderer.setSize(window.innerWidth, window.innerHeight)
        renderer.setPixelRatio(window.devicePixelRatio)
        containerRef.current.appendChild(renderer.domElement)

        createStars()
        createCircleStars()

        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onWindowResize, false)

        animate()
      }

      function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
      }

      function animate() {
        animationFrameId = requestAnimationFrame(animate)

        const parallaxIntensity = settings.stars.parallaxIntensity
        targetY = (scrollY / 1000) * parallaxIntensity * 20
        targetX = Math.sin(scrollY / 500) * parallaxIntensity * 5

        camera.position.x += (targetX - camera.position.x) * 0.05
        camera.position.y += (targetY - camera.position.y) * 0.05
        camera.lookAt(scene.position)

        if (stars && starMaterial) {
          starMaterial.uniforms.time.value += 0.016
        }
        if (circleStars && circleStarMaterial) {
          circleStarMaterial.uniforms.time.value += 0.016
        }

        const currentTime = Date.now()
        const frequency = settings.shootingStars.frequency * 1000

        if (currentTime - lastShootingStarTime > frequency) {
          spawnShootingStar()
          lastShootingStarTime = currentTime
        }

        const shootingSpeed = settings.shootingStars.speed
        shootingStars = shootingStars.filter((star: any) => {
          const alive = star.update(shootingSpeed)
          if (!alive) {
            star.destroy()
          }
          return alive
        })

        renderer.render(scene, camera)
      }

      init()

      // Cleanup function
      cleanupRef.current = () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId)
        }
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onWindowResize)

        shootingStars.forEach((star: any) => star.destroy())
        shootingStars = []

        if (renderer && containerRef.current) {
          containerRef.current.removeChild(renderer.domElement)
          renderer.dispose()
        }
        if (stars) scene.remove(stars)
        if (circleStars) scene.remove(circleStars)
        if (starMaterial) starMaterial.dispose()
        if (circleStarMaterial) circleStarMaterial.dispose()
      }
    })

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [])

  return (
    <>
      {/* Gradient Background Layer */}
      <div
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{
          zIndex: -10,
          background: 'linear-gradient(to bottom, #000000 0%, #000000 25%, #040916 100%)'
        }}
      />

      {/* Three.js Stars Layer */}
      <div
        ref={containerRef}
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: -9 }}
      />

      {/* Black Overlay - 30% opacity */}
      <div
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{
          zIndex: -8,
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        }}
      />
    </>
  )
}
