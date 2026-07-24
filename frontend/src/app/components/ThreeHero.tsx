import React, { useEffect, useRef } from 'react';
import { 
  Scene, 
  PerspectiveCamera, 
  WebGLRenderer, 
  SphereGeometry, 
  MeshStandardMaterial, 
  Mesh, 
  AmbientLight, 
  PointLight 
} from 'three';

/**
 * ThreeHero Component
 * 
 * Renders a high-performance 3D visual element using Three.js.
 * This component adds a premium "3D-enhanced UI" feel to the landing page.
 * It features a rotating, floating metallic sphere with real-time lighting.
 */
export const ThreeHero = () => {
  // Reference to the container div for the Three.js canvas
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Exit if the container element isn't available yet
    if (!containerRef.current) return;

    // --- Scene Setup ---
    const scene = new Scene();
    const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Alpha: true allows the background of the canvas to be transparent
    const renderer = new WebGLRenderer({ alpha: true, antialias: true });
    
    /**
     * Updates the renderer and camera sizes to match the container's dimensions.
     * Ensures the 3D scene remains responsive during window resizing.
     */
    const updateSize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };

    updateSize();
    // Inject the canvas element into the DOM
    containerRef.current.appendChild(renderer.domElement);

    // --- Geometry & Materials ---
    // Create a high-detail sphere
    const geometry = new SphereGeometry(1.5, 64, 64);
    // Material configured with a metallic finish using the brand color #A14B58
    const material = new MeshStandardMaterial({
      color: 0xA14B58,
      roughness: 0.2,
      metalness: 0.8,
    });
    const sphere = new Mesh(geometry, material);
    scene.add(sphere);

    // --- Lighting ---
    // Ambient light provides base visibility for the entire scene
    const ambientLight = new AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    // Point light creates highlights and depth on the sphere's surface
    const pointLight = new PointLight(0xffffff, 2);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // Position camera far enough to see the sphere
    camera.position.z = 5;

    // --- Animation Loop ---
    let animationFrameId: number;
    /**
     * Recursive animation function that updates object rotations and positions.
     * @param time - The current timestamp provided by requestAnimationFrame
     */
    const animate = (time: number) => {
      const t = time * 0.001; // Convert to seconds
      
      // Constant rotation for visual dynamism
      sphere.rotation.x = t * 0.2;
      sphere.rotation.y = t * 0.3;
      
      // Gentle vertical floating effect using a sine wave
      sphere.position.y = Math.sin(t) * 0.2;
      
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate(0);

    // --- Event Handling ---
    const handleResize = () => updateSize();
    window.addEventListener('resize', handleResize);

    // --- Cleanup ---
    // Essential to prevent memory leaks and "Multiple Three.js instances" issues
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
      // Properly dispose of Three.js objects to free up GPU memory
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 -z-10 pointer-events-none opacity-30" 
      style={{ width: '100%', height: '100%' }}
    />
  );
};
