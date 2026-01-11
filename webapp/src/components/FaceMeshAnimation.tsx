"use client";

import { useEffect, useRef } from "react";

interface Point3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

interface FaceMeshAnimationProps {
  isAnalyzing: boolean;
}

export function FaceMeshAnimation({ isAnalyzing }: FaceMeshAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const pointsRef = useRef<Point3D[]>([]);
  const progressRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Configuration
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Créer les points du masque facial en 3D
    const createFaceMesh = () => {
      const points: Point3D[] = [];
      const layers = 25; // Nombre de couches verticales
      const pointsPerLayer = 30; // Nombre de points par couche

      // Générer les points pour former un masque facial
      for (let layer = 0; layer < layers; layer++) {
        const layerProgress = layer / (layers - 1);

        // Profil vertical du visage (forme ovoïde)
        const yPos = layerProgress * 2 - 1; // De -1 à 1

        for (let i = 0; i < pointsPerLayer; i++) {
          const angle = (i / pointsPerLayer) * Math.PI * 2;

          // Calculer le rayon en fonction de la position verticale pour créer une forme de visage
          let radius = 0.5;

          // Front et sommet du crâne (plus large)
          if (layerProgress < 0.3) {
            radius = 0.5 + (0.3 - layerProgress) * 0.3;
          }
          // Zone des yeux et nez (plus étroit)
          else if (layerProgress >= 0.3 && layerProgress < 0.6) {
            radius = 0.45 + Math.sin((layerProgress - 0.3) * Math.PI * 3) * 0.05;
          }
          // Bouche et menton (se rétrécit)
          else {
            radius = 0.5 - (layerProgress - 0.6) * 0.5;
          }

          // Ajouter plus de détails pour les traits du visage
          // Yeux
          if (layerProgress > 0.35 && layerProgress < 0.45) {
            if ((angle > Math.PI * 0.2 && angle < Math.PI * 0.4) ||
                (angle > Math.PI * 0.6 && angle < Math.PI * 0.8)) {
              radius *= 0.85;
            }
          }

          // Nez
          if (layerProgress > 0.45 && layerProgress < 0.65) {
            if (angle > Math.PI * 0.45 && angle < Math.PI * 0.55) {
              radius *= 0.7;
            }
          }

          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius * 0.7; // Profondeur réduite pour aspect plus plat

          points.push({
            x: x * 200,
            y: yPos * 250,
            z: z * 150,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            vz: (Math.random() - 0.5) * 0.5,
          });
        }
      }

      return points;
    };

    // Initialiser les points
    if (pointsRef.current.length === 0) {
      pointsRef.current = createFaceMesh();
    }

    // Animation
    const animate = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, width, height);

      // Progression de l'animation
      if (isAnalyzing && progressRef.current < 1) {
        progressRef.current += 0.003;
      } else if (!isAnalyzing && progressRef.current > 0) {
        progressRef.current -= 0.01;
      }

      const progress = Math.max(0, Math.min(1, progressRef.current));
      const visiblePoints = Math.floor(pointsRef.current.length * progress);

      // Rotation lente du masque
      const rotationY = Date.now() * 0.0002;
      const rotationX = Math.sin(Date.now() * 0.0001) * 0.1;

      // Dessiner les points
      pointsRef.current.forEach((point, index) => {
        if (index > visiblePoints) return;

        // Animation d'apparition pour chaque point
        const pointProgress = Math.max(0, Math.min(1, (progress * pointsRef.current.length - index) / 50));

        if (pointProgress <= 0) return;

        // Rotation 3D
        const cosY = Math.cos(rotationY);
        const sinY = Math.sin(rotationY);
        const cosX = Math.cos(rotationX);
        const sinX = Math.sin(rotationX);

        // Rotation autour de Y
        const x1 = point.x * cosY - point.z * sinY;
        const z1 = point.x * sinY + point.z * cosY;

        // Rotation autour de X
        const y1 = point.y * cosX - z1 * sinX;
        const z2 = point.y * sinX + z1 * cosX;

        // Projection perspective
        const perspective = 600;
        const scale = perspective / (perspective + z2);

        const screenX = centerX + x1 * scale;
        const screenY = centerY + y1 * scale;

        // Calculer la luminosité en fonction de la profondeur
        const brightness = Math.max(0.2, Math.min(1, (z2 + 200) / 400));

        // Taille des points en fonction de la profondeur et de la progression
        const pointSize = (2 + scale * 1.5) * pointProgress;

        // Dessiner le point avec glow effect
        const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, pointSize * 3);
        gradient.addColorStop(0, `rgba(99, 102, 241, ${brightness * pointProgress})`);
        gradient.addColorStop(0.5, `rgba(99, 102, 241, ${brightness * pointProgress * 0.3})`);
        gradient.addColorStop(1, "rgba(99, 102, 241, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, pointSize * 3, 0, Math.PI * 2);
        ctx.fill();

        // Point central plus lumineux
        ctx.fillStyle = `rgba(139, 92, 246, ${brightness * pointProgress})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, pointSize, 0, Math.PI * 2);
        ctx.fill();

        // Dessiner les connexions entre points proches
        if (index % 3 === 0) {
          pointsRef.current.slice(index + 1, index + 4).forEach((otherPoint, otherIndex) => {
            const actualOtherIndex = index + 1 + otherIndex;
            if (actualOtherIndex > visiblePoints) return;

            const otherPointProgress = Math.max(0, Math.min(1, (progress * pointsRef.current.length - actualOtherIndex) / 50));
            if (otherPointProgress <= 0) return;

            // Rotation du point de connexion
            const ox1 = otherPoint.x * cosY - otherPoint.z * sinY;
            const oz1 = otherPoint.x * sinY + otherPoint.z * cosY;
            const oy1 = otherPoint.y * cosX - oz1 * sinX;
            const oz2 = otherPoint.y * sinX + oz1 * cosX;

            const otherScale = perspective / (perspective + oz2);
            const otherScreenX = centerX + ox1 * otherScale;
            const otherScreenY = centerY + oy1 * otherScale;

            const distance = Math.sqrt(
              Math.pow(screenX - otherScreenX, 2) +
              Math.pow(screenY - otherScreenY, 2)
            );

            if (distance < 50) {
              const lineOpacity = (1 - distance / 50) * 0.3 * Math.min(pointProgress, otherPointProgress) * brightness;
              ctx.strokeStyle = `rgba(99, 102, 241, ${lineOpacity})`;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(screenX, screenY);
              ctx.lineTo(otherScreenX, otherScreenY);
              ctx.stroke();
            }
          });
        }

        // Animation subtile des points
        point.x += point.vx * 0.1;
        point.y += point.vy * 0.1;
        point.z += point.vz * 0.1;

        // Ramener les points vers leur position d'origine
        const originForce = 0.02;
        const targetX = point.x - point.vx * 10;
        const targetY = point.y - point.vy * 10;
        const targetZ = point.z - point.vz * 10;

        point.vx -= (point.x - targetX) * originForce;
        point.vy -= (point.y - targetY) * originForce;
        point.vz -= (point.z - targetZ) * originForce;

        // Friction
        point.vx *= 0.98;
        point.vy *= 0.98;
        point.vz *= 0.98;
      });

      // Texte de chargement
      if (isAnalyzing && progress > 0.3) {
        const textProgress = Math.min(1, (progress - 0.3) / 0.3);
        ctx.save();
        ctx.globalAlpha = textProgress;
        ctx.fillStyle = "#6366f1";
        ctx.font = "bold 24px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const loadingText = "Analyse en cours";
        const dots = ".".repeat(Math.floor((Date.now() / 500) % 4));
        ctx.fillText(loadingText + dots, centerX, height - 60);

        ctx.font = "14px system-ui";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(`${Math.floor(progress * 100)}%`, centerX, height - 30);
        ctx.restore();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnalyzing]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      <canvas
        ref={canvasRef}
        width={800}
        height={800}
        className="max-w-full max-h-full"
        style={{ imageRendering: "crisp-edges" }}
      />
    </div>
  );
}
