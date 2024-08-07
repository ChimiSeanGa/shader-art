import { glslComplex } from "../../util/glsl-complex";
import { pi } from "mathjs";

const sketch = (p) => {
   let funStr = "z";

   let inp = null;
   let button = null;

   let wrapper = null;

   let sh = null;
   let cnv = null;

   let uTheta1 = 2*pi/3;
   let uTheta1Speed = 1.0;
   let uDelta = 0.005;
   let uRad = 1.0;
   let uRadSpeed = 0.0;
   let uColorOffset = 0;
   let uColorSpeed = 0;

   let vs = `
      precision highp float;
      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;
      
      attribute vec3 aPosition;
      attribute vec2 aTexCoord;
      varying vec2 vTexCoord;
      
      void main() {
         vTexCoord = aTexCoord;
         vec4 positionVec4 = vec4(aPosition, 1.0);
         gl_Position = uProjectionMatrix * uModelViewMatrix * positionVec4;
      }
   `;

   const fs = () => `
      precision highp float;
      
      uniform vec2 uResolution;
      uniform float uTime;
      
      // Visual control panel
      uniform float uTheta1;
      uniform float uTheta1Speed;
      uniform float uDelta;
      uniform float uRad;
      uniform float uRadSpeed;
      uniform float uColorOffset;
      uniform float uColorSpeed;
      
      #define PI 3.14159265359
      #define E 2.718281828
      #define ITERS 150
      #define VIEW_RADIUS 3.2
      
      ${glslComplex}

      float theta1 = uTheta1 + uTime/20.0*PI*uTheta1Speed;
      // float theta1 = 5.0*PI/3.0;

      float theta2 = -3.0*PI/7.0;

      // float rad = 2.0;
      float rad = (sin((uTime/2.0*PI - PI*0.5)*uRadSpeed)+1.0)*1.5/2.0 + uRad;

      float delta = uDelta;

      vec3 rgb2hsv(vec3 c) {
         vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
         vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
         vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

         float d = q.x - min(q.w, q.y);
         float e = 1.0e-10;
         return vec3(abs(q.z+(q.w-q.y)/(6.0*d+e)), d/(q.x+e), q.x);
      }

      vec3 hsv2rgb(vec3 c) {
         vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
         vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
         return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      vec2 rotate(vec2 z, float angle) {
         return cx_mul(
            cx_pow(vec2(E,0.0), cx_mul(vec2(angle,0.0),vec2(0.0,1.0))), z);
      }

      vec2 rot1(vec2 z) {
         vec2 res;
         if (cx_modulus(cx_add(z, vec2(1.0,0.0))) <= rad) {
            res = cx_add(
               rotate(cx_add(z, vec2(1.0,0.0)), theta1), vec2(-1.0,0.0));
         } else {
            res = z;
         }
         return res;
      }

      vec2 rot2(vec2 z) {
         vec2 res;
         if (cx_modulus(cx_add(z, vec2(-1.0,0.0))) <= rad) {
            res = cx_add(
               rotate(cx_add(z, vec2(-1.0,0.0)), theta2), vec2(1.0,0.0));
         } else {
            res = z;
         }
         return res;
      }

      int is_near_atom_boundary(vec2 z) {
         int res;
         if (abs(cx_modulus(cx_add(z,vec2(1.0,0.0)))-rad) < delta) {
            res = 0;
         } else if (abs(cx_modulus(cx_add(z,vec2(-1.0,0.0)))-rad) < delta) {
            res = 1;
         } else {
            res = -1;
         }
         return res;
      }

      vec2 transform(vec2 z) {
         vec2 res;
         if (cx_modulus(cx_add(z,vec2(1.0,0.0))) <= rad &&
            cx_modulus(cx_add(rot1(z),vec2(-1.0,0.0))) <= rad) {
            res = rot2(rot1(z));
         } else if (cx_modulus(cx_add(z,vec2(1.0,0.0))) <= rad) {
            res = rot1(z);
         } else if (cx_modulus(cx_add(z,vec2(-1.0,0.0))) <= rad) {
            res = rot2(z);
         } else {
            res = z;
         }
         return res;
      }

      vec3 getColor(vec2 z) {
         vec2 w = z;
         for (int n = 0; n < ITERS; ++n) {
            int b = is_near_atom_boundary(w);
            if (b >= 0) {
               float bf = float(b);
               float nf = float(n);
               return hsv2rgb(vec3(bf/10.0*nf + uColorOffset + uColorSpeed*uTime/20.0,1.0,1.0));
            }
            w = transform(w);
         }
         return vec3(0.0,0.0,0.0);;
      }
      
      vec3 complexToHsv(vec2 z) {
         //return vec3(cx_arg(z)/(2.0*PI), 1.0, 2.0/PI*atan(cx_modulus(z)));
         return vec3(cx_arg(z)/(2.0*PI), 1.0, 1.0);
      }

      void main() {
         vec2 st = gl_FragCoord.xy/uResolution;
         vec2 z = (st - vec2(0.5, 0.5)) * VIEW_RADIUS * 2.0;

         gl_FragColor = vec4(getColor(z), 1.0);
      }
   `;

   const checkShaderError = (shaderObj, shaderText) => {
      let gl = shaderObj._renderer.GL;
      let glFragShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(glFragShader, shaderText);
      gl.compileShader(glFragShader);
      if (!gl.getShaderParameter(glFragShader, gl.COMPILE_STATUS)) {
         return gl.getShaderInfoLog(glFragShader);
      }
      return null;
   }

   // p.windowResized = () => {
   //    wrapper = document.getElementById("p5Wrapper");
   //    p.resizeCanvas(wrapper.offsetWidth, wrapper.offsetWidth);
   //    inp.position(p.width/2.0 + inp.width/2.0, p.height + 10, "static");
   //    button.position(inp.width + inp.x, p.height + 10, "static");
   // }

   p.setup = () => {
      wrapper = document.getElementById("p5Wrapper");
      document.getElementsByTagName('body')[0].style.backgroundColor = 'BLACK';
      cnv = p.createCanvas(wrapper.offsetWidth, wrapper.offsetWidth, p.WEBGL);
      p.pixelDensity(1);
      p.frameRate(60);

      sh = p.createShader(vs, fs());
      console.log(checkShaderError(sh, fs()));
      p.shader(sh);
      p.noStroke();

      sh.setUniform("uResolution", [p.width, p.height]);
      sh.setUniform("uTime", 0);

      sh.setUniform("uTheta1", uTheta1);
      sh.setUniform("uTheta1Speed", uTheta1Speed);
      sh.setUniform("uDelta", uDelta);
      sh.setUniform("uRad", uRad);
      sh.setUniform("uRadSpeed", uRadSpeed);
      sh.setUniform("uColorOffset", uColorOffset);
      sh.setUniform("uColorSpeed", uColorSpeed);

      window.addEventListener("keydown", (event) => {
         if (event.key === "a") {
            uRad -= 0.01;
         } else if (event.key === "d") {
            uRad += 0.01;
         } else if (event.key === "w") {
            uTheta1Speed += 0.001;
         } else if (event.key === "s") {
            uTheta1Speed -= 0.001;
         } else if (event.key === "z") {
            uTheta1 -= 0.01;
         } else if (event.key === "x") {
            uTheta1 += 0.01;
         } else if (event.key === "n") {
            uDelta -= 0.001;
         } else if (event.key === "m") {
            uDelta += 0.001;
         } else if (event.key === "b") {
            uColorOffset = (uColorOffset + 0.01) % 1;
         } else if (event.key === "v") {
            uColorSpeed = 30.0;
         } else if (event.key === "c") {
            uColorSpeed -= 0.0;
         }
      });

      // inp = p.createInput("z");
      // inp.position(p.width/2.0 + inp.width/2.0, p.height + 10, "static");

      // button = p.createButton("Generate");
      // button.mousePressed(() => {
      //    let inpStr = inp.value();
      //    funStr = complexParser(inpStr);
      //    console.log(funStr);
      //    if (funStr) {
      //       let newSh = p.createShader(vs, fs());
      //       let shaderError = checkShaderError(sh, fs());
      //       if (shaderError) {
      //          alert(shaderError);
      //       } else {
      //          sh = newSh;
      //          p.shader(sh);
      //       }
      //    } else {
      //       alert("Invalid complex equation");
      //    }
      // });
      // button.position(inp.width + inp.x, p.height + 10, "static");

      // p.saveGif('bicolor.gif', 500, { units: 'frames' });
   };

   p.draw = () => {
      sh.setUniform("uResolution", [p.width, p.height]);
      sh.setUniform("uTime", p.frameCount*0.004);

      sh.setUniform("uTheta1", uTheta1);
      sh.setUniform("uTheta1Speed", uTheta1Speed);
      sh.setUniform("uDelta", uDelta);
      sh.setUniform("uRad", uRad);
      sh.setUniform("uRadSpeed", uRadSpeed);
      sh.setUniform("uColorOffset", uColorOffset);
      sh.setUniform("uColorSpeed", uColorSpeed);

      p.plane(p.width, p.height);
   };
};

export default sketch;
