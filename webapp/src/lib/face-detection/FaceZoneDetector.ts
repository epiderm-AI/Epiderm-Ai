/**
 * FaceZoneDetector - Détection automatique des zones faciales avec face-api.js
 *
 * Cette classe remplace le système MediaPipe défaillant par une approche
 * basée sur face-api.js avec 68 landmarks pour une meilleure robustesse.
 */

import * as faceapi from 'face-api.js';
import type {
  Point,
  ZoneTemplate,
  DetectedZone,
  ConfidenceDetails,
  FaceDetectionResult,
} from '@/types/zones';

export class FaceZoneDetector {
  private initialized = false;
  private modelsLoaded = false;

  /**
   * Initialise les modèles face-api.js
   * Charge les modèles nécessaires depuis /public/models/face-api/
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Charger les modèles depuis le dossier public
      const MODEL_URL = '/models/face-api';

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      ]);

      this.modelsLoaded = true;
      this.initialized = true;
      console.log('[FaceZoneDetector] Models loaded successfully');
    } catch (error) {
      console.error('[FaceZoneDetector] Failed to load models:', error);
      throw new Error('Failed to initialize face detection models');
    }
  }

  /**
   * Vérifie si les modèles sont chargés
   */
  isInitialized(): boolean {
    return this.initialized && this.modelsLoaded;
  }

  /**
   * Détecte un visage dans une image et retourne les landmarks
   */
  async detectFace(
    imageElement: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
  ): Promise<FaceDetectionResult> {
    if (!this.isInitialized()) {
      throw new Error('FaceZoneDetector not initialized. Call initialize() first.');
    }

    try {
      const detection = await faceapi
        .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      if (!detection) {
        throw new Error('No face detected in image');
      }

      return {
        landmarks: detection.landmarks,
        box: detection.detection.box,
        confidence: detection.detection.score,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('No face detected')) {
        throw error;
      }
      console.error('[FaceZoneDetector] Face detection error:', error);
      throw new Error('Face detection failed');
    }
  }

  /**
   * Mappe les landmarks détectés vers les zones templates
   * C'est la méthode principale pour la détection automatique des zones
   */
  mapLandmarksToZones(
    landmarks: faceapi.FaceLandmarks68,
    zoneTemplates: ZoneTemplate[],
    imageSize: { width: number; height: number }
  ): DetectedZone[] {
    const detectedZones: DetectedZone[] = [];

    // Calculer les dimensions du visage détecté
    const jaw = landmarks.getJawOutline();
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const nose = landmarks.getNose();
    const mouth = landmarks.getMouth();

    // Distance inter-pupillaire (IPD)
    const leftEyeCenter = this.calculateCentroid(
      leftEye.map((p) => [p.x, p.y] as Point)
    );
    const rightEyeCenter = this.calculateCentroid(
      rightEye.map((p) => [p.x, p.y] as Point)
    );
    const faceWidth = this.euclideanDistance(
      leftEyeCenter,
      rightEyeCenter
    ) * 3; // IPD * 3 ≈ largeur visage

    // Hauteur du visage (nez → menton)
    const noseTop = nose[0];
    const chin = jaw[8];
    const faceHeight = this.euclideanDistance(
      { x: noseTop.x, y: noseTop.y },
      { x: chin.x, y: chin.y }
    ) * 2; // * 2 pour inclure le front

    // Pour chaque template, adapter la géométrie au visage détecté
    for (const template of zoneTemplates) {
      try {
        const adaptedGeometry = this.adaptZoneToFace(
          template,
          landmarks,
          { faceWidth, faceHeight },
          imageSize
        );

        const confidence = this.calculateZoneConfidence(
          adaptedGeometry,
          template,
          landmarks,
          imageSize
        );

        detectedZones.push({
          zone_template_id: template.id,
          detected_geometry: adaptedGeometry,
          confidence_score: confidence.overall,
          confidence_details: confidence as ConfidenceDetails,
          detection_method: 'face-api',
          detection_timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.warn(
          `[FaceZoneDetector] Failed to detect zone ${template.label}:`,
          error
        );
        // Continue avec les autres zones
      }
    }

    return detectedZones;
  }

  /**
   * Adapte la géométrie d'un template de zone au visage détecté
   * Utilise les landmarks d'ancrage et applique une transformation proportionnelle
   */
  private adaptZoneToFace(
    template: ZoneTemplate,
    landmarks: faceapi.FaceLandmarks68,
    faceDimensions: { faceWidth: number; faceHeight: number },
    imageSize: { width: number; height: number }
  ): Point[] {
    const { landmark_anchors, expected_size_ratio } = template.detection_hints;

    // Si pas de landmarks d'ancrage, utiliser le centre du visage
    if (!landmark_anchors || landmark_anchors.length === 0) {
      return this.adaptZoneByFaceCenter(template, landmarks, faceDimensions, imageSize);
    }

    // Calculer le centre de la zone basé sur les landmarks d'ancrage
    const anchorPoints = landmark_anchors
      .filter((idx) => idx >= 0 && idx < 68) // Valider indices
      .map((idx) => landmarks.positions[idx]);

    if (anchorPoints.length === 0) {
      throw new Error(`No valid anchor points for zone ${template.label}`);
    }

    const zoneCenter = this.calculateCentroid(
      anchorPoints.map((p) => [p.x * imageSize.width, p.y * imageSize.height] as Point)
    );

    // Échelles proportionnelles séparées basées sur la largeur et la hauteur du visage
    // Utiliser une échelle Y basée sur la hauteur permet de préserver la verticalité
    const scaleX = faceDimensions.faceWidth * expected_size_ratio;
    const scaleY = faceDimensions.faceHeight * expected_size_ratio;

    // Préserver la verticalité : veiller à ce que la hauteur ne devienne pas
    // trop petite par rapport à la largeur (évite un masque aplati)
    const MIN_VERTICAL_RATIO = 0.85; // hauteur minimale relative à la largeur
    const adjustedScaleY = Math.max(scaleY, scaleX * MIN_VERTICAL_RATIO);

    // Géométrie du template (angle frontal par défaut)
    const templateGeometry = template.geometry.face || [];
    if (templateGeometry.length === 0) {
      throw new Error(`No geometry defined for zone ${template.label}`);
    }

    const templateCenter = this.calculateCentroid(templateGeometry);

    // Transformer les points du template
    const adaptedPoints = templateGeometry.map(([x, y]) => {
      // Normaliser par rapport au centre du template (coordonnées 0-100)
      const dx = (x - templateCenter.x) / 100;
      const dy = (y - templateCenter.y) / 100;

      // Appliquer échelle et translation vers le centre de la zone
      const adaptedX = zoneCenter.x + dx * scaleX * imageSize.width;
      const adaptedY = zoneCenter.y + dy * adjustedScaleY * imageSize.height;

      return [adaptedX, adaptedY] as Point;
    });

    return adaptedPoints;
  }

  /**
   * Méthode alternative: adapter zone en utilisant le centre du visage
   * Utilisé quand pas de landmarks d'ancrage définis
   */
  private adaptZoneByFaceCenter(
    template: ZoneTemplate,
    landmarks: faceapi.FaceLandmarks68,
    faceDimensions: { faceWidth: number; faceHeight: number },
    imageSize: { width: number; height: number }
  ): Point[] {
    // Centre du visage (moyenne des landmarks)
    const allPoints = landmarks.positions.map(
      (p) => [p.x * imageSize.width, p.y * imageSize.height] as Point
    );
    const faceCenter = this.calculateCentroid(allPoints);

    const templateGeometry = template.geometry.face || [];
    const templateCenter = this.calculateCentroid(templateGeometry);
    const scaleX = faceDimensions.faceWidth * template.detection_hints.expected_size_ratio;
    const scaleY = faceDimensions.faceHeight * template.detection_hints.expected_size_ratio;

    // Préserver la verticalité (éviter que le masque soit aplati)
    const MIN_VERTICAL_RATIO = 0.85;
    const adjustedScaleY = Math.max(scaleY, scaleX * MIN_VERTICAL_RATIO);

    const adaptedPoints = templateGeometry.map(([x, y]) => {
      const dx = (x - templateCenter.x) / 100;
      const dy = (y - templateCenter.y) / 100;

      const adaptedX = faceCenter.x + dx * scaleX * imageSize.width;
      const adaptedY = faceCenter.y + dy * adjustedScaleY * imageSize.height;

      return [adaptedX, adaptedY] as Point;
    });

    return adaptedPoints;
  }

  /**
   * Calcule le score de confiance pour une zone détectée
   * Retourne un score global et des sous-scores détaillés
   */
  private calculateZoneConfidence(
    detectedGeometry: Point[],
    template: ZoneTemplate,
    landmarks: faceapi.FaceLandmarks68,
    imageSize: { width: number; height: number }
  ): {
    geometric_match: number;
    landmark_coverage: number;
    size_ratio: number;
    position_accuracy: number;
    overall: number;
  } {
    // 1. Matching géométrique (forme similaire au template)
    const geometricMatch = this.compareShapes(
      detectedGeometry,
      template.geometry.face || []
    );

    // 2. Couverture landmarks (% de landmarks d'ancrage dans la zone)
    const landmarkCoverage = this.calculateLandmarkCoverage(
      detectedGeometry,
      landmarks,
      template.detection_hints.landmark_anchors,
      imageSize
    );

    // 3. Ratio de taille (zone détectée vs taille attendue)
    const detectedArea = this.calculatePolygonArea(detectedGeometry);
    const templateArea = this.calculatePolygonArea(template.geometry.face || []);
    const sizeRatio =
      templateArea > 0
        ? Math.min(detectedArea, templateArea) / Math.max(detectedArea, templateArea)
        : 0.5;

    // 4. Précision de position (centre détecté vs attendu)
    const positionAccuracy = this.calculatePositionAccuracy(
      detectedGeometry,
      template.geometry.face || [],
      landmarks,
      imageSize
    );

    // Score global (moyenne pondérée)
    const overall =
      geometricMatch * 0.3 +
      landmarkCoverage * 0.3 +
      sizeRatio * 0.2 +
      positionAccuracy * 0.2;

    return {
      geometric_match: Math.min(geometricMatch, 1.0),
      landmark_coverage: Math.min(landmarkCoverage, 1.0),
      size_ratio: Math.min(sizeRatio, 1.0),
      position_accuracy: Math.min(positionAccuracy, 1.0),
      overall: Math.min(overall, 1.0),
    };
  }

  // ========================================================================
  // MÉTHODES UTILITAIRES
  // ========================================================================

  /**
   * Distance euclidienne entre deux points
   */
  private euclideanDistance(
    p1: { x: number; y: number },
    p2: { x: number; y: number }
  ): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  /**
   * Calcul du centroïde (centre géométrique) d'un ensemble de points
   */
  private calculateCentroid(points: Point[] | faceapi.Point[]): { x: number; y: number } {
    if (points.length === 0) {
      return { x: 0, y: 0 };
    }

    const sum = points.reduce(
      (acc, p) => {
        const x = Array.isArray(p) ? p[0] : p.x;
        const y = Array.isArray(p) ? p[1] : p.y;
        return { x: acc.x + x, y: acc.y + y };
      },
      { x: 0, y: 0 }
    );

    return { x: sum.x / points.length, y: sum.y / points.length };
  }

  /**
   * Calcul de l'aire d'un polygone
   * Utilise la formule du lacet (shoelace formula)
   */
  private calculatePolygonArea(points: Point[]): number {
    if (points.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i][0] * points[j][1];
      area -= points[j][0] * points[i][1];
    }
    return Math.abs(area / 2);
  }

  /**
   * Compare deux formes (polygones) et retourne un score de similarité
   * Basé sur le ratio des aires normalisées
   */
  private compareShapes(shape1: Point[], shape2: Point[]): number {
    if (shape1.length < 3 || shape2.length < 3) return 0;

    const area1 = this.calculatePolygonArea(shape1);
    const area2 = this.calculatePolygonArea(shape2);

    if (area1 === 0 || area2 === 0) return 0;

    // Ratio des aires (plus proche de 1 = formes similaires)
    const areaRatio = Math.min(area1, area2) / Math.max(area1, area2);

    return areaRatio;
  }

  /**
   * Calcule le pourcentage de landmarks d'ancrage présents dans la zone
   */
  private calculateLandmarkCoverage(
    polygon: Point[],
    landmarks: faceapi.FaceLandmarks68,
    expectedLandmarks: number[],
    imageSize: { width: number; height: number }
  ): number {
    if (!expectedLandmarks || expectedLandmarks.length === 0) return 1.0;

    let inside = 0;
    for (const idx of expectedLandmarks) {
      if (idx < 0 || idx >= 68) continue; // Valider index

      const point = landmarks.positions[idx];
      const scaledPoint: Point = [point.x * imageSize.width, point.y * imageSize.height];

      if (this.isPointInPolygon(scaledPoint, polygon)) {
        inside++;
      }
    }

    return expectedLandmarks.length > 0 ? inside / expectedLandmarks.length : 1.0;
  }

  /**
   * Vérifie si un point est à l'intérieur d'un polygone
   * Utilise l'algorithme du rayon (ray casting)
   */
  private isPointInPolygon(point: Point, polygon: Point[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0],
        yi = polygon[i][1];
      const xj = polygon[j][0],
        yj = polygon[j][1];

      const intersect =
        yi > point[1] !== yj > point[1] &&
        point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Calcule la précision de position (distance normalisée entre les centres)
   */
  private calculatePositionAccuracy(
    detectedGeometry: Point[],
    templateGeometry: Point[],
    landmarks: faceapi.FaceLandmarks68,
    imageSize: { width: number; height: number }
  ): number {
    if (detectedGeometry.length < 3 || templateGeometry.length < 3) return 0.5;

    const detectedCenter = this.calculateCentroid(detectedGeometry);
    const templateCenter = this.calculateCentroid(templateGeometry);

    // Distance entre les centres
    const distance = this.euclideanDistance(detectedCenter, templateCenter);

    // Normaliser par rapport à la taille de l'image
    const maxDistance = Math.sqrt(
      Math.pow(imageSize.width, 2) + Math.pow(imageSize.height, 2)
    );
    const normalizedDistance = distance / maxDistance;

    // Score inversé (distance faible = score élevé)
    return Math.max(0, 1 - normalizedDistance * 10); // *10 pour amplifier les différences
  }

  /**
   * Nettoie les ressources
   */
  dispose(): void {
    this.initialized = false;
    this.modelsLoaded = false;
    console.log('[FaceZoneDetector] Disposed');
  }
}

// Export instance singleton (optionnel)
let detectorInstance: FaceZoneDetector | null = null;

export function getFaceZoneDetector(): FaceZoneDetector {
  if (!detectorInstance) {
    detectorInstance = new FaceZoneDetector();
  }
  return detectorInstance;
}
