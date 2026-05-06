import * as React from 'react';

// ── vertex shader (full-screen quad) ──────────────────────────────────────
const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// ── fragment shader ────────────────────────────────────────────────────────
// Domain-warping technique: fbm(fbm(fbm(uv)))
// Each layer flows in a different direction & speed for an impressionistic feel.
const FRAG = `
precision mediump float;
uniform vec2  u_res;
uniform float u_time;
uniform float u_dark;

// gradient noise
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
}
float gnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dot(hash2(i+vec2(0,0)), f-vec2(0,0)),
        dot(hash2(i+vec2(1,0)), f-vec2(1,0)), u.x),
    mix(dot(hash2(i+vec2(0,1)), f-vec2(0,1)),
        dot(hash2(i+vec2(1,1)), f-vec2(1,1)), u.x),
  u.y);
}

// 5-octave fbm (fractal brownian motion)
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * gnoise(p);
    p  = m * p;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res * 2.8;
  float t  = u_time * 0.14;

  vec2 q = vec2(
    fbm(uv + t * vec2(0.7, 0.3)),
    fbm(uv + t * vec2(0.2, 0.8))
  );

  vec2 r = vec2(
    fbm(uv + 4.0*q + t*vec2(0.4, 0.5) + vec2(1.7, 9.2)),
    fbm(uv + 4.0*q + t*vec2(0.5, 0.2) + vec2(8.3, 2.8))
  );

  float f = 0.5 + 0.5 * fbm(uv + 3.5 * r);
  f = clamp(f, 0.0, 1.0);

  vec3 col;

  if (u_dark > 0.5) {
    vec3 c1 = vec3(0.035, 0.055, 0.130);
    vec3 c2 = vec3(0.075, 0.130, 0.420);
    vec3 c3 = vec3(0.035, 0.260, 0.380);
    vec3 c4 = vec3(0.120, 0.380, 0.600);
    vec3 c5 = vec3(0.280, 0.720, 0.900);

    col = mix(c1, c2, smoothstep(0.00, 0.28, f));
    col = mix(col, c3, smoothstep(0.28, 0.52, f));
    col = mix(col, c4, smoothstep(0.52, 0.76, f));
    col = mix(col, c5, smoothstep(0.76, 1.00, f) * 0.85);
  } else {
    vec3 c1 = vec3(0.945, 0.965, 0.995);
    vec3 c2 = vec3(0.800, 0.898, 0.992);
    vec3 c3 = vec3(0.491, 0.827, 0.980);
    vec3 c4 = vec3(0.737, 0.894, 0.988);
    vec3 c5 = vec3(0.975, 0.990, 1.000);

    col = mix(c1, c2, smoothstep(0.00, 0.30, f));
    col = mix(col, c3, smoothstep(0.30, 0.58, f));
    col = mix(col, c4, smoothstep(0.58, 0.80, f));
    col = mix(col, c5, smoothstep(0.80, 1.00, f));
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

// ── dark mode hook ────────────────────────────────────────────────────────
function useDocumentDark(): boolean {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    const read = () =>
      setDark(document.documentElement.classList.contains('dark'));
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => obs.disconnect();
  }, []);
  return dark;
}

// ── component ─────────────────────────────────────────────────────────────
const HeroShaderBackground: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const dark = useDocumentDark();
  const darkRef = React.useRef(dark);
  React.useEffect(() => {
    darkRef.current = dark;
  }, [dark]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uDark = gl.getUniformLocation(prog, 'u_dark');

    const dpr = Math.min(devicePixelRatio, 1.5);
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const start = performance.now();
    let rafId: number;

    const draw = () => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      gl.uniform1f(uDark, darkRef.current ? 1.0 : 0.0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      gl.deleteProgram(prog);
    };
  }, []);

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
};

export default HeroShaderBackground;
