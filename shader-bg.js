// --- ShaderGradient Background Engine (Three.js WebGL waterPlane) ---
(function () {
  'use strict';

  // Configurações do ShaderGradient fornecidas pelo usuário (ajustadas para maior velocidade e fundo escuro mais profundo)
  const PRESETS = {
    dark: {
      color1: [0.0, 0.0, 0.0],       // #000000 preto profundo
      color2: [0.50, 0.50, 0.62],     // realce sutil
      color3: [0.70, 0.70, 0.80],     // reflexo suave
      bgColor: [0.0, 0.0, 0.0],      // #000000
      brightness: 0.16,              // mais escuro e imersivo
      uSpeed: 0.32,                  // velocidade de animação aumentada
      uStrength: 3.4,
      uDensity: 1.2
    },
    light: {
      color1: [1.0, 0.992, 0.969],   // #fffdf7
      color2: [0.945, 0.929, 1.0],   // #f1edff
      color3: [1.0, 1.0, 1.0],       // #ffffff
      bgColor: [1.0, 1.0, 1.0],      // #ffffff
      brightness: 1.2,
      uSpeed: 0.2,                   // uSpeed=0.2
      uStrength: 3.4,                // uStrength=3.4
      uDensity: 1.2                  // uDensity=1.2
    }
  };

  // Congelar objetos para proteger os presets contra mutações de array por referência
  Object.freeze(PRESETS.dark);
  Object.freeze(PRESETS.dark.color1);
  Object.freeze(PRESETS.dark.color2);
  Object.freeze(PRESETS.dark.color3);
  Object.freeze(PRESETS.light);
  Object.freeze(PRESETS.light.color1);
  Object.freeze(PRESETS.light.color2);
  Object.freeze(PRESETS.light.color3);

  let renderer, scene, camera, mesh, material;
  let currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  let targetPreset = PRESETS[currentTheme] || PRESETS.light;
  let currentPreset = {
    color1: [...targetPreset.color1],
    color2: [...targetPreset.color2],
    color3: [...targetPreset.color3],
    brightness: targetPreset.brightness,
    uSpeed: targetPreset.uSpeed,
    uStrength: targetPreset.uStrength,
    uDensity: targetPreset.uDensity
  };

  const vertexShader = `
    uniform float uTime;
    uniform float uSpeed;
    uniform float uStrength;
    uniform float uDensity;
    varying vec2 vUv;
    varying float vElevation;

    // Classic Perlin 3D Noise
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
    vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

    float cnoise(vec3 P){
      vec3 Pi0 = floor(P);
      vec3 Pi1 = Pi0 + vec3(1.0);
      Pi0 = mod(Pi0, 289.0);
      Pi1 = mod(Pi1, 289.0);
      vec3 Pf0 = fract(P);
      vec3 Pf1 = Pf0 - vec3(1.0);
      vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
      vec4 iy = vec4(Pi0.yy, Pi1.yy);
      vec4 iz0 = Pi0.zzzz;
      vec4 iz1 = Pi1.zzzz;

      vec4 ixy = permute(permute(ix) + iy);
      vec4 ixy0 = permute(ixy + iz0);
      vec4 ixy1 = permute(ixy + iz1);

      vec4 gx0 = ixy0 / 7.0;
      vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
      gx0 = fract(gx0);
      vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
      vec4 sz0 = step(gz0, vec4(0.0));
      gx0 -= sz0 * (step(0.0, gx0) - 0.5);
      gy0 -= sz0 * (step(0.0, gy0) - 0.5);

      vec4 gx1 = ixy1 / 7.0;
      vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
      gx1 = fract(gx1);
      vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
      vec4 sz1 = step(gz1, vec4(0.0));
      gx1 -= sz1 * (step(0.0, gx1) - 0.5);
      gy1 -= sz1 * (step(0.0, gy1) - 0.5);

      vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
      vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
      vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
      vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
      vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
      vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
      vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
      vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

      vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
      g000 *= norm0.x;
      g010 *= norm0.y;
      g100 *= norm0.z;
      g110 *= norm0.w;
      vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
      g001 *= norm1.x;
      g011 *= norm1.y;
      g101 *= norm1.z;
      g111 *= norm1.w;

      float n000 = dot(g000, Pf0);
      float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
      float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
      float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
      float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
      float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
      float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
      float n111 = dot(g111, Pf1);

      vec3 fade_xyz = fade(Pf0);
      vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
      vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
      float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
      return 2.2 * n_xyz;
    }

    void main() {
      vUv = uv;
      vec3 pos = position;
      
      float t = uTime * uSpeed * 0.5;
      float noise = cnoise(vec3(pos.x * uDensity * 0.4, pos.y * uDensity * 0.4, t));
      float wave = sin(pos.x * uDensity + t) * cos(pos.y * uDensity + t);
      
      float elevation = (noise * 0.7 + wave * 0.3) * (uStrength * 0.25);
      pos.z += elevation;
      vElevation = elevation;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform float uBrightness;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
      // Mistura fluida das 3 cores com base na coordenada UV e elevação da onda
      float mixFactor1 = smoothstep(0.0, 0.6, vUv.x + vElevation * 0.3);
      float mixFactor2 = smoothstep(0.3, 1.0, vUv.y - vElevation * 0.2);

      vec3 col = mix(uColor1, uColor2, mixFactor1);
      col = mix(col, uColor3, mixFactor2);

      // Ajuste de brilho e iluminação suave com gradiente fluido
      col *= (uBrightness * 0.85 + vElevation * 0.15);
      col = clamp(col, 0.0, 1.0);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function init() {
    if (typeof THREE === 'undefined') {
      // Se Three.js ainda não estiver carregado, aguardar
      setTimeout(init, 50);
      return;
    }

    let canvas = document.getElementById('shader-gradient-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'shader-gradient-canvas';
      document.body.prepend(canvas);
    }

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.9, 4.4);
    camera.lookAt(0, 0.9, -0.3);

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Geometria waterPlane
    const geometry = new THREE.PlaneGeometry(16, 12, 64, 64);

    material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: targetPreset.uSpeed },
        uStrength: { value: targetPreset.uStrength },
        uDensity: { value: targetPreset.uDensity },
        uColor1: { value: new THREE.Color(targetPreset.color1[0], targetPreset.color1[1], targetPreset.color1[2]) },
        uColor2: { value: new THREE.Color(targetPreset.color2[0], targetPreset.color2[1], targetPreset.color2[2]) },
        uColor3: { value: new THREE.Color(targetPreset.color3[0], targetPreset.color3[1], targetPreset.color3[2]) },
        uBrightness: { value: targetPreset.brightness }
      },
      wireframe: false,
      side: THREE.DoubleSide
    });

    mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = THREE.MathUtils.degToRad(45);
    mesh.position.set(0, 0.9, -0.3);
    scene.add(mesh);

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('themechange', onThemeChange);

    // Observar diretamente o atributo data-theme na tag <html> para sincronização perfeita
    const observer = new MutationObserver(() => {
      const theme = document.documentElement.getAttribute('data-theme') || 'light';
      targetPreset = PRESETS[theme] || PRESETS.light;
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    animate();
  }

  function onThemeChange(e) {
    const theme = e.detail?.theme || document.documentElement.getAttribute('data-theme') || 'light';
    targetPreset = PRESETS[theme] || PRESETS.light;
  }

  function lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    if (material) {
      material.uniforms.uTime.value = elapsedTime;

      // Interpolação suave dos tons de cor entre Light e Dark mode
      const lerpSpeed = 0.08;
      for (let i = 0; i < 3; i++) {
        currentPreset.color1[i] = lerp(currentPreset.color1[i], targetPreset.color1[i], lerpSpeed);
        currentPreset.color2[i] = lerp(currentPreset.color2[i], targetPreset.color2[i], lerpSpeed);
        currentPreset.color3[i] = lerp(currentPreset.color3[i], targetPreset.color3[i], lerpSpeed);
      }
      currentPreset.brightness = lerp(currentPreset.brightness, targetPreset.brightness, lerpSpeed);
      currentPreset.uSpeed = lerp(currentPreset.uSpeed, targetPreset.uSpeed, lerpSpeed);

      material.uniforms.uSpeed.value = currentPreset.uSpeed;
      material.uniforms.uColor1.value.setRGB(currentPreset.color1[0], currentPreset.color1[1], currentPreset.color1[2]);
      material.uniforms.uColor2.value.setRGB(currentPreset.color2[0], currentPreset.color2[1], currentPreset.color2[2]);
      material.uniforms.uColor3.value.setRGB(currentPreset.color3[0], currentPreset.color3[1], currentPreset.color3[2]);
      material.uniforms.uBrightness.value = currentPreset.brightness;
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
